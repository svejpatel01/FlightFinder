// Isolated Duffel integration.
//
// The ONLY thing this app does with Duffel is search offers (create an offer
// request and read back the cheapest offer). That is free — Duffel only charges
// when an *order* is created, which this module never does.
//
// Public surface: `searchCheapestRoundTrip()` -> cheapest price or `null` on any
// failure. Everything else is internal (auth, throttling, retries, parsing).

const DUFFEL_BASE = "https://api.duffel.com";
const DUFFEL_VERSION = "v2"; // required header

export interface RoundTripQuery {
  origin: string; // IATA
  destination: string; // IATA
  departDate: string; // "YYYY-MM-DD"
  returnDate: string; // "YYYY-MM-DD"
}

export interface RoundTripResult {
  amount: number;
  currency: string;
  offerId: string;
  airline: string | null;
  offerRequestId: string;
}

export class DuffelConfigError extends Error {}

function apiKey(): string {
  const env = (process.env.DUFFEL_ENV ?? "test").toLowerCase();
  const key =
    env === "live"
      ? process.env.DUFFEL_API_KEY_LIVE || process.env.DUFFEL_API_KEY
      : process.env.DUFFEL_API_KEY_TEST || process.env.DUFFEL_API_KEY;
  if (!key) {
    throw new DuffelConfigError(
      `No Duffel API key found for DUFFEL_ENV=${env}. Set DUFFEL_API_KEY_${env.toUpperCase()} in .env.`,
    );
  }
  return key;
}

// --- Throttle -------------------------------------------------------------
// Duffel's limit is 60 requests / 60s. We serialize all requests through one
// chain and keep a minimum gap between them (default 1100ms => <=55/min).
const MIN_INTERVAL_MS = Number(process.env.DUFFEL_MIN_INTERVAL_MS ?? 1100);
let chain: Promise<unknown> = Promise.resolve();
let lastStart = 0;

function schedule<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const wait = Math.max(0, lastStart + MIN_INTERVAL_MS - Date.now());
    if (wait > 0) await sleep(wait);
    lastStart = Date.now();
    return fn();
  });
  // keep the chain alive regardless of individual outcomes
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// --- Mock mode -----------------------------------------------------------
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
  const dateJitter = hash(q.departDate + q.returnDate); // varies run-to-run-ish by date
  // Base fare $220–$900 by route, +/- ~25% by date, occasional "deal" dip.
  const base = 220 + route * 680;
  const dip = dateJitter < 0.12 ? 0.55 : 1; // ~12% of date-pairs are cheap
  const amount = Math.round(base * (0.78 + dateJitter * 0.44) * dip);
  return {
    amount,
    currency: "USD",
    offerId: "off_mock",
    airline: "MockAir",
    offerRequestId: "orq_mock",
  };
}

// --- Low-level request with retry --------------------------------------------
interface DuffelResponse {
  data?: {
    id: string;
    offers?: Array<{
      id: string;
      total_amount: string;
      total_currency: string;
      owner?: { name?: string; iata_code?: string };
    }>;
  };
  errors?: Array<{ title?: string; message?: string; code?: string }>;
}

const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = Number(process.env.DUFFEL_TIMEOUT_MS ?? 30_000);

async function duffelFetch(path: string, body: unknown): Promise<DuffelResponse> {
  let attempt = 0;
  for (;;) {
    attempt++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(`${DUFFEL_BASE}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey()}`,
          "Duffel-Version": DUFFEL_VERSION,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (res.status === 429 || res.status >= 500) {
        if (attempt < MAX_ATTEMPTS) {
          const retryAfter = Number(res.headers.get("retry-after"));
          const backoff = Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : 1000 * 2 ** (attempt - 1);
          console.warn(
            `[duffel] ${res.status} on ${path}, retrying in ${backoff}ms (attempt ${attempt}/${MAX_ATTEMPTS})`,
          );
          await sleep(backoff);
          continue;
        }
      }

      const json = (await res.json().catch(() => ({}))) as DuffelResponse;
      if (!res.ok) {
        const msg =
          json.errors?.map((e) => e.message || e.title).join("; ") ||
          `HTTP ${res.status}`;
        throw new Error(`Duffel error: ${msg}`);
      }
      return json;
    } catch (err) {
      if (attempt < MAX_ATTEMPTS && err instanceof Error && err.name === "AbortError") {
        console.warn(`[duffel] timeout on ${path}, retry ${attempt}/${MAX_ATTEMPTS}`);
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}

// --- Public ----------------------------------------------------------------
function offerRequestBody(q: RoundTripQuery) {
  return {
    data: {
      slices: [
        {
          origin: q.origin,
          destination: q.destination,
          departure_date: q.departDate,
        },
        {
          origin: q.destination,
          destination: q.origin,
          departure_date: q.returnDate,
        },
      ],
      passengers: [{ type: "adult" }],
      cabin_class: "economy",
    },
  };
}

/**
 * Search a round-trip (economy, 1 adult) and return the cheapest offer.
 * Returns `null` on any failure — no throwing, so the scan job can carry on.
 * (A missing API key still throws `DuffelConfigError`: that's a setup bug, not
 * a transient failure.)
 */
export async function searchCheapestRoundTrip(
  q: RoundTripQuery,
): Promise<RoundTripResult | null> {
  // Offline/dev mode: return a deterministic pseudo-price so the rest of the
  // pipeline (snapshots, averages, triggers, digest email) can be exercised
  // without a working Duffel token. Set DUFFEL_MOCK=1 in .env.
  if (process.env.DUFFEL_MOCK) return mockPrice(q);

  try {
    const json = await schedule(() =>
      duffelFetch("/air/offer_requests?return_offers=true", offerRequestBody(q)),
    );
    const offers = json.data?.offers ?? [];
    if (offers.length === 0) {
      console.warn(
        `[duffel] no offers for ${q.origin}->${q.destination} ${q.departDate}/${q.returnDate}`,
      );
      return null;
    }
    let best = offers[0];
    for (const o of offers) {
      if (parseFloat(o.total_amount) < parseFloat(best.total_amount)) best = o;
    }
    return {
      amount: parseFloat(best.total_amount),
      currency: best.total_currency,
      offerId: best.id,
      airline: best.owner?.name ?? best.owner?.iata_code ?? null,
      offerRequestId: json.data?.id ?? "",
    };
  } catch (err) {
    if (err instanceof DuffelConfigError) throw err;
    console.warn(
      `[duffel] search failed for ${q.origin}->${q.destination} ${q.departDate}/${q.returnDate}:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}
