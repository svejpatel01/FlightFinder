// Send a sample deal SMS.  (In mock mode it just prints.)
//
//   npm run sms:test -- +14155551234

import "dotenv/config";
import { sendDealSms, smsConfigured } from "../lib/sms";
import { googleFlightsUrl } from "../lib/googleFlights";
import type { Deal } from "../lib/email";

const to = process.argv[2];
if (!to) {
  console.error("usage: npm run sms:test -- +14155551234");
  process.exit(1);
}

const deals: Deal[] = [
  {
    originIata: "JFK",
    destIata: "KEF",
    originLabel: "New York (JFK)",
    destLabel: "Reykjavík (KEF)",
    departDate: "2026-11-06",
    returnDate: "2026-11-08",
    weekendPattern: "FRI_SUN",
    priceUsd: 402,
    currency: "USD",
    triggerType: "PRICE_DROP",
    averageUsd: 640,
    pctBelowAvg: 37,
    googleFlightsUrl: googleFlightsUrl("JFK", "KEF", "2026-11-06", "2026-11-08"),
  },
];

console.log(`smsConfigured=${smsConfigured()}`);
sendDealSms(to, deals)
  .then((sid) => {
    console.log(sid ? `sent — Twilio sid ${sid}` : "mock mode — nothing sent");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
