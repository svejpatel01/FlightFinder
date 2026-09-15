// Standalone check of the flight search integration — no DB, no email, no scan job.
//
//   npm run flights:test
//   npm run flights:test -- JFK LHR 2026-10-16 2026-10-18
//
// Hits Google Flights' own (unofficial) API directly via the vendored `fli`
// library — no API key needed. Set FLIGHTS_MOCK=1 in .env to use deterministic
// fake prices instead.

import "dotenv/config";
import { searchCheapestRoundTrip } from "../lib/flightSearch";
import { generateWeekendDatePairs } from "../lib/weekends";

async function main() {
  const [origin, dest, depart, ret] = process.argv.slice(2);

  let queries: Array<{
    origin: string;
    destination: string;
    departDate: string;
    returnDate: string;
  }>;

  if (origin && dest && depart && ret) {
    queries = [{ origin, destination: dest, departDate: depart, returnDate: ret }];
  } else {
    // Default: next 3 Fri->Sun weekends, JFK -> a couple of destinations.
    const pairs = generateWeekendDatePairs(["FRI_SUN"], 3);
    queries = [];
    for (const d of ["LHR", "CDG"]) {
      for (const p of pairs) {
        queries.push({
          origin: "JFK",
          destination: d,
          departDate: p.departDate,
          returnDate: p.returnDate,
        });
      }
    }
  }

  console.log(`FLIGHTS_MOCK=${process.env.FLIGHTS_MOCK ?? ""}`);
  console.log(`Running ${queries.length} search(es)…\n`);

  for (const q of queries) {
    const t0 = Date.now();
    const result = await searchCheapestRoundTrip(q);
    const ms = Date.now() - t0;
    if (result) {
      console.log(
        `${q.origin} -> ${q.destination}  ${q.departDate} / ${q.returnDate}  ` +
          `=>  ${result.amount.toFixed(2)} ${result.currency}` +
          `${result.airline ? `  (${result.airline})` : ""}  [${ms}ms]`,
      );
    } else {
      console.log(
        `${q.origin} -> ${q.destination}  ${q.departDate} / ${q.returnDate}  =>  no price  [${ms}ms]`,
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
