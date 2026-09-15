// Flight price search — powered by `fli` (github.com/punitarani/fli), vendored
// into lib/fli/ (MIT licensed; see lib/fli/LICENSE). `fli` talks directly to
// Google Flights' own frontend API (the same one google.com/travel/flights
// uses), not an official partner API — there's no key, no account, and no
// per-search cost, but it's also not a sanctioned integration: Google could
// change that internal API or rate-limit/block an IP with no warning. That
// trade-off (free + real prices, vs. an unofficial/unstable dependency) was a
// deliberate choice over Duffel's live-mode pricing, which charges per search
// once you place zero bookings (see the project history for the numbers).
//
// Public surface: `searchCheapestRoundTrip()` -> cheapest round-trip price or
// `null` on any failure. Never throws — a bad route or a transient failure
// should not take down the scan job.

import {
  Airport,
  FlightSegment,
  FlightSearchFilters,
  SearchFlights,
  SeatType,
  SortBy,
  TripType,
  type FlightResult,
} from "./fli/index.ts";

export interface RoundTripQuery {
  origin: string; // IATA
  destination: string; // IATA
  departDate: string; // "YYYY-MM-DD"
  returnDate: string; // "YYYY-MM-DD"
}

export interface RoundTripResult {
  amount: number;
  currency: string;
  airline: string | null;
}

// --- Throttle ---------------------------------------------------------------
// No published rate limit (there's no contract at all), but this is an
// unofficial endpoint — stay well under what a browser doing occasional
// searches would generate. Serialize all requests through one chain with a
// minimum gap between them.
const MIN_INTERVAL_MS = Number(process.env.FLIGHTS_MIN_INTERVAL_MS ?? 1500);
let chain: Promise<unknown> = Promise.resolve();
let lastStart = 0;

function schedule<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const wait = Math.max(0, lastStart + MIN_INTERVAL_MS - Date.now());
    if (wait > 0) await sleep(wait);
    lastStart = Date.now();
    return fn();
  });
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// --- Mock mode ---------------------------------------------------------------
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff; // 0..1
}

function mockPrice(q: RoundTripQuery): RoundTripResult {
  const route = hash(q.origin + q.destination);
  const dateJitter = hash(q.departDate + q.returnDate);
  const base = 220 + route * 680;
  const dip = dateJitter < 0.12 ? 0.55 : 1; // ~12% of date-pairs are cheap
  const amount = Math.round(base * (0.78 + dateJitter * 0.44) * dip);
  return { amount, currency: "USD", airline: "MockAir" };
}

// --- Public ------------------------------------------------------------------

function toAirport(iata: string): Airport | null {
  const code = iata.toUpperCase();
  return code in Airport ? (Airport as Record<string, Airport>)[code] : null;
}

/**
 * Search a round-trip (economy, 1 adult) and return the cheapest itinerary.
 * Returns `null` on any failure or unsupported airport — no throwing, so the
 * scan job can carry on to the next route.
 */
export async function searchCheapestRoundTrip(
  q: RoundTripQuery,
): Promise<RoundTripResult | null> {
  // Offline/dev mode: deterministic pseudo-price so the rest of the pipeline
  // (snapshots, averages, triggers, digest email) can be exercised without
  // hitting the network. Set FLIGHTS_MOCK=1 in .env.
  if (process.env.FLIGHTS_MOCK) return mockPrice(q);

  const origin = toAirport(q.origin);
  const destination = toAirport(q.destination);
  if (!origin || !destination) {
    console.warn(`[flights] unsupported airport in ${q.origin}->${q.destination}`);
    return null;
  }

  try {
    const filters = new FlightSearchFilters({
      trip_type: TripType.ROUND_TRIP,
      passenger_info: { adults: 1, children: 0, infants_in_seat: 0, infants_on_lap: 0 },
      flight_segments: [
        new FlightSegment({
          departure_airport: [[[origin, 0]]],
          arrival_airport: [[[destination, 0]]],
          travel_date: q.departDate,
        }),
        new FlightSegment({
          departure_airport: [[[destination, 0]]],
          arrival_airport: [[[origin, 0]]],
          travel_date: q.returnDate,
        }),
      ],
      seat_type: SeatType.ECONOMY,
      sort_by: SortBy.CHEAPEST,
    });

    const results = await schedule(() =>
      new SearchFlights().search(filters, { currency: "USD" }),
    );
    if (!results || results.length === 0) {
      console.warn(`[flights] no results for ${q.origin}->${q.destination} ${q.departDate}/${q.returnDate}`);
      return null;
    }

    // Round-trip results are combos ([outboundLeg, returnLeg]); the total
    // round-trip price lives on the last leg, matching how Google Flights'
    // own UI attributes price once both directions are selected.
    let best: RoundTripResult | null = null;
    for (const combo of results) {
      const legs: FlightResult[] = Array.isArray(combo) ? combo : [combo];
      const last = legs[legs.length - 1];
      if (last?.price == null) continue; // priceUnknown() — Google didn't surface a price
      if (best === null || last.price < best.amount) {
        best = {
          amount: last.price,
          currency: last.currency ?? "USD",
          airline: legs[0]?.primary_airline_name ?? null,
        };
      }
    }
    if (!best) {
      console.warn(`[flights] all results priceless for ${q.origin}->${q.destination} ${q.departDate}/${q.returnDate}`);
    }
    return best;
  } catch (err) {
    console.warn(
      `[flights] search failed for ${q.origin}->${q.destination} ${q.departDate}/${q.returnDate}:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}
