// Digest email formatting + sending (Resend).

import { Resend } from "resend";
import {
  WEEKEND_PATTERN_LABELS,
  type TriggerType,
  type WeekendPatternKey,
} from "./constants";

export interface Deal {
  originIata: string;
  destIata: string;
  originLabel: string;
  destLabel: string;
  departDate: string; // "YYYY-MM-DD"
  returnDate: string; // "YYYY-MM-DD"
  weekendPattern: WeekendPatternKey;
  priceUsd: number;
  currency: string;
  triggerType: TriggerType;
  /** rolling average at trigger time — only set for PRICE_DROP */
  averageUsd: number | null;
  /** e.g. 34 means "34% below average" — only set for PRICE_DROP */
  pctBelowAvg: number | null;
  googleFlightsUrl: string;
}

const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function fmtDate(iso: string): string {
  return DATE_FMT.format(new Date(`${iso}T00:00:00Z`));
}

function dateRange(depart: string, ret: string): string {
  const year = ret.slice(0, 4);
  return `${fmtDate(depart)} – ${fmtDate(ret)}, ${year}`;
}

function money(n: number, currency = "USD"): string {
  const s = `$${n.toFixed(0)}`;
  return currency && currency !== "USD" ? `${n.toFixed(0)} ${currency}` : s;
}

function triggerBlurb(d: Deal): string {
  if (d.triggerType === "BUDGET") return "under your budget";
  if (d.pctBelowAvg != null && d.averageUsd != null) {
    return `${d.pctBelowAvg}% below the recent average of ${money(d.averageUsd)}`;
  }
  return "below the recent average";
}

export interface Digest {
  subject: string;
  text: string;
  html: string;
}

export function formatDigest(toEmail: string, deals: Deal[]): Digest {
  const cheapest = Math.min(...deals.map((d) => d.priceUsd));
  const n = deals.length;
  const subject = `${n} weekend flight deal${n === 1 ? "" : "s"} — from ${money(cheapest)}`;

  const textLines: string[] = [
    `${n} matching weekend flight deal${n === 1 ? "" : "s"}:`,
    "",
  ];
  for (const d of deals) {
    textLines.push(
      `${d.originIata} → ${d.destIata}  (${d.originLabel} → ${d.destLabel})`,
    );
    textLines.push(
      `  ${dateRange(d.departDate, d.returnDate)}  ·  ${WEEKEND_PATTERN_LABELS[d.weekendPattern]}`,
    );
    textLines.push(
      `  ${money(d.priceUsd, d.currency)} round-trip — ${triggerBlurb(d)}`,
    );
    textLines.push(`  Search: ${d.googleFlightsUrl}`);
    textLines.push("");
  }
  textLines.push("— Notiflyer");
  const text = textLines.join("\n");

  const rows = deals
    .map(
      (d) => `
      <tr>
        <td style="padding:12px 0;border-top:1px solid #e5e5e5;">
          <div style="font-size:16px;font-weight:600;">
            ${d.originIata} &rarr; ${d.destIata}
            <span style="font-weight:400;color:#666;">— ${escapeHtml(d.originLabel)} to ${escapeHtml(d.destLabel)}</span>
          </div>
          <div style="color:#444;margin:4px 0;">
            ${dateRange(d.departDate, d.returnDate)} &middot; ${WEEKEND_PATTERN_LABELS[d.weekendPattern]}
          </div>
          <div style="margin:4px 0;">
            <strong style="font-size:18px;">${money(d.priceUsd, d.currency)}</strong> round-trip
            <span style="color:#137333;"> — ${triggerBlurb(d)}</span>
          </div>
          <a href="${d.googleFlightsUrl}" style="color:#1a73e8;">Search this route on Google Flights &rarr;</a>
        </td>
      </tr>`,
    )
    .join("");

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;color:#111;">
    <h2 style="margin:0 0 4px;">${n} weekend flight deal${n === 1 ? "" : "s"}</h2>
    <p style="color:#666;margin:0 0 12px;">Cheapest right now: <strong>${money(cheapest)}</strong></p>
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
    <p style="color:#999;font-size:12px;margin-top:20px;border-top:1px solid #e5e5e5;padding-top:12px;">
      Sent by Notiflyer to ${escapeHtml(toEmail)}. Prices are the cheapest economy round-trip found on Google Flights and can change at any time.
    </p>
  </div>`;

  return { subject, text, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export class EmailConfigError extends Error {}

function resend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new EmailConfigError("RESEND_API_KEY is not set");
  return new Resend(key);
}

function fromAddress(): string {
  return process.env.EMAIL_FROM ?? "Notiflyer <onboarding@resend.dev>";
}

/** Magic-link sign-in email. */
export async function sendLoginLink(
  toEmail: string,
  url: string,
): Promise<string | null> {
  const { data, error } = await resend().emails.send({
    from: fromAddress(),
    to: [toEmail],
    subject: "Your Notiflyer sign-in link",
    text: `Sign in to Notiflyer:\n\n${url}\n\nThis link works once and expires in 15 minutes. If you didn't request it, ignore this email.`,
    html: `
      <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;color:#111;">
        <h2 style="margin:0 0 12px;">Sign in to Notiflyer</h2>
        <p style="margin:0 0 20px;color:#444;">Click the button below. The link works once and expires in 15 minutes.</p>
        <p style="margin:0 0 24px;">
          <a href="${url}" style="background:#1a63d8;color:#fff;padding:11px 18px;border-radius:8px;text-decoration:none;font-weight:600;">Sign in</a>
        </p>
        <p style="margin:0;color:#999;font-size:12px;word-break:break-all;">Or paste this URL: ${url}</p>
      </div>`,
  });
  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`);
  return data?.id ?? null;
}

/** Send one digest email. Throws on misconfiguration or Resend failure. */
export async function sendDigestEmail(
  toEmail: string,
  deals: Deal[],
): Promise<string | null> {
  const { subject, text, html } = formatDigest(toEmail, deals);

  if (process.env.EMAIL_MOCK === "1") {
    console.log(`[email:mock] -> ${toEmail}  "${subject}"  (${deals.length} deal(s))`);
    return null;
  }

  const { data, error } = await resend().emails.send({
    from: fromAddress(),
    to: [toEmail],
    subject,
    text,
    html,
  });
  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`);
  return data?.id ?? null;
}
