// Standalone check of the Duffel integration — no DB, no email, no scan job.
//
//   npm run duffel:test
//   npm run duffel:test -- JFK LHR 2026-10-16 2026-10-18
//
// Uses the sandbox key by default (DUFFEL_ENV=test). Set DUFFEL_ENV=live in .env
// to hit live search (still free — we never create an order).

import "dotenv/config";
import { searchCheapestRoundTrip } from "../lib/duffel";
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

  console.log(`DUFFEL_ENV=${process.env.DUFFEL_ENV ?? "test"}`);
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
