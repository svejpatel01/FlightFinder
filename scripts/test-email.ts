// Send a sample digest through Resend to confirm email delivery works.
//
//   npm run email:test -- you@example.com

import "dotenv/config";
import { sendDigestEmail, type Deal } from "../lib/email";
import { googleFlightsUrl } from "../lib/googleFlights";

const to = process.argv[2];
if (!to) {
  console.error("usage: npm run email:test -- you@example.com");
  process.exit(1);
}

const sample: Deal[] = [
  {
    originIata: "JFK",
    destIata: "LIS",
    originLabel: "New York (JFK)",
    destLabel: "Lisbon (LIS)",
    departDate: "2026-10-16",
    returnDate: "2026-10-18",
    weekendPattern: "FRI_SUN",
    priceUsd: 388,
    currency: "USD",
    triggerType: "BUDGET",
    averageUsd: null,
    pctBelowAvg: null,
    googleFlightsUrl: googleFlightsUrl("JFK", "LIS", "2026-10-16", "2026-10-18"),
  },
  {
    originIata: "BOS",
    destIata: "KEF",
    originLabel: "Boston (BOS)",
    destLabel: "Reykjavík (KEF)",
    departDate: "2026-11-06",
    returnDate: "2026-11-08",
    weekendPattern: "FRI_SUN",
    priceUsd: 402,
    currency: "USD",
    triggerType: "PRICE_DROP",
    averageUsd: 640,
    pctBelowAvg: 37,
    googleFlightsUrl: googleFlightsUrl("BOS", "KEF", "2026-11-06", "2026-11-08"),
  },
];

sendDigestEmail(to, sample)
  .then((id) => {
    console.log("sent — Resend id:", id);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
