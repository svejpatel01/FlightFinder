// SMS alerts via Twilio's REST API (no SDK — just a form POST with basic auth).
// SMS is reserved for the *noteworthy* subset of deals (see lib/scan.ts); email
// still gets everything.

import type { Deal } from "./email";

function creds() {
  return {
    sid: process.env.TWILIO_ACCOUNT_SID ?? "",
    token: process.env.TWILIO_AUTH_TOKEN ?? "",
    from: process.env.TWILIO_FROM_NUMBER ?? "",
  };
}

export function smsConfigured(): boolean {
  const { sid, token, from } = creds();
  return Boolean(sid && token && from) && process.env.SMS_MOCK !== "1";
}

export function formatDealSms(deals: Deal[]): string {
  const top = deals.slice(0, 3).map((d) => {
    const drop =
      d.pctBelowAvg != null ? `, ${d.pctBelowAvg}% below avg` : "";
    return `${d.originIata}→${d.destIata} $${Math.round(d.priceUsd)} ${d.departDate}${drop}`;
  });
  const more = deals.length > 3 ? `\n+${deals.length - 3} more` : "";
  const url = process.env.APP_URL ? `\n${process.env.APP_URL}/dashboard` : "";
  return `FlightFinder deal${deals.length > 1 ? "s" : ""}:\n${top.join("\n")}${more}${url}`;
}

/**
 * Send a deal SMS. In mock mode (SMS_MOCK=1 or missing creds) it just logs and
 * returns null. Throws on a real Twilio error.
 */
export async function sendDealSms(
  toE164: string,
  deals: Deal[],
): Promise<string | null> {
  const body = formatDealSms(deals);
  const { sid, token, from } = creds();

  if (!smsConfigured()) {
    console.log(`[sms:mock] -> ${toE164}\n${body}\n`);
    return null;
  }

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: toE164, From: from, Body: body }),
    },
  );
  const json = (await res.json().catch(() => ({}))) as {
    sid?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(`Twilio ${res.status}: ${json.message ?? "unknown error"}`);
  }
  return json.sid ?? null;
}
