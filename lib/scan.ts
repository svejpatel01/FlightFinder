// The scan job: for the configured user, price every origin × destination ×
// weekend-date-pair via Duffel, store snapshots, evaluate triggers, dedup, and
// send a single digest email if there's anything new.

import { prisma } from "./db";
import { generateWeekendDatePairs } from "./weekends";
import { searchCheapestRoundTrip } from "./duffel";
import { googleFlightsUrl } from "./googleFlights";
import { getAirport } from "./airports";
import { isWeekendPattern, type TriggerType, type WeekendPatternKey } from "./constants";
import { sendDigestEmail, type Deal } from "./email";

// --- How much history counts as "enough" ---------------------------------
// On the first runs there's basically no history, so the price-drop trigger is
// intentionally conservative: it stays dormant until a given (origin, dest,
// weekendPattern) has been seen at least MIN_HISTORY_FOR_DROP times, and the
// average is a *short* rolling window so it reflects the current fare level
// rather than being anchored to stale data.
const HISTORY_WINDOW_DAYS = 45; // ignore snapshots older than this
const HISTORY_MAX_SNAPSHOTS = 8; // average over at most the 8 most recent priors
const MIN_HISTORY_FOR_DROP = 3; // need >= 3 priors before the drop trigger can fire
const DROP_RATIO = 0.7; // "30%+ below average" => price <= average * 0.7
// Re-alert a deal we've already emailed only if it's dropped a further 10%+
// below the price we last alerted on.
const RENOTIFY_RATIO = 0.9;
const COUNTRY_CACHE_TTL_DAYS = 30;

const DAY_MS = 86_400_000;

export interface ScanOptions {
  dryRun?: boolean; // don't write snapshots, don't send email, don't log
  now?: Date; // override "today" for date generation (tests / manual runs)
  verbose?: boolean;
}

export interface ScanSummary {
  ranAt: string;
  skipped?: string;
  origins: string[];
  destinations: string[];
  datePairs: number;
  combinations: number;
  pricesFetched: number;
  snapshotsWritten: number;
  dealsMatched: number;
  emailSent: boolean;
  emailId?: string | null;
  deals: Deal[];
}

function log(opts: ScanOptions, ...args: unknown[]) {
  if (opts.verbose) console.log("[scan]", ...args);
}

function labelFor(iata: string): string {
  const a = getAirport(iata);
  return a ? `${a.city} (${a.iata})` : iata;
}

async function resolveDestinations(
  destinations: {
    id: string;
    kind: string;
    iataCode: string | null;
    countryCode: string | null;
    resolvedAirports: string | null;
    resolvedAt: Date | null;
  }[],
): Promise<string[]> {
  const out = new Set<string>();
  for (const d of destinations) {
    if (d.kind === "AIRPORT") {
      if (d.iataCode) out.add(d.iataCode.toUpperCase());
      continue;
    }
    if (d.kind === "COUNTRY" && d.countryCode) {
      const stale =
        !d.resolvedAt ||
        Date.now() - d.resolvedAt.getTime() > COUNTRY_CACHE_TTL_DAYS * DAY_MS;
      let resolved: string[] = [];
      if (d.resolvedAirports && !stale) {
        try {
          const parsed = JSON.parse(d.resolvedAirports);
          if (Array.isArray(parsed)) resolved = parsed;
        } catch {
          /* fall through to re-resolve */
        }
      }
      if (resolved.length === 0) {
        const { airportsForCountry } = await import("./airports");
        resolved = airportsForCountry(d.countryCode);
        await prisma.wishlistDestination.update({
          where: { id: d.id },
          data: {
            resolvedAirports: JSON.stringify(resolved),
            resolvedAt: new Date(),
          },
        });
      }
      for (const a of resolved) out.add(a.toUpperCase());
    }
  }
  return [...out];
}

/** Should we actually send this (origin,dest,dates,trigger) alert right now? */
async function passesDedup(
  userId: string,
  originIata: string,
  destIata: string,
  departDate: string,
  returnDate: string,
  triggerType: TriggerType,
  price: number,
): Promise<boolean> {
  const last = await prisma.notificationLog.findFirst({
    where: { userId, originIata, destIata, departDate, returnDate, triggerType },
    orderBy: { sentAt: "desc" },
  });
  if (!last) return true; // never alerted for this exact deal
  return price <= last.priceUsd * RENOTIFY_RATIO; // only if meaningfully cheaper again
}

const EMPTY: Omit<ScanSummary, "ranAt" | "skipped"> = {
  origins: [],
  destinations: [],
  datePairs: 0,
  combinations: 0,
  pricesFetched: 0,
  snapshotsWritten: 0,
  dealsMatched: 0,
  emailSent: false,
  deals: [],
};

export async function runScan(opts: ScanOptions = {}): Promise<ScanSummary> {
  const ranAt = new Date().toISOString();

  const user = await prisma.user.findFirst({
    include: { origins: true, destinations: true, weekendPatterns: true },
  });
  if (!user) return { ranAt, skipped: "no user configured", ...EMPTY };

  const patterns = user.weekendPatterns
    .map((w) => w.pattern)
    .filter(isWeekendPattern) as WeekendPatternKey[];
  if (patterns.length === 0)
    return { ranAt, skipped: "no weekend patterns selected", ...EMPTY };

  const origins = [
    ...new Set(user.origins.map((o) => o.iataCode.toUpperCase())),
  ];
  if (origins.length === 0)
    return { ranAt, skipped: "no origin airports", ...EMPTY };

  const destinations = await resolveDestinations(user.destinations);
  if (destinations.length === 0)
    return { ranAt, skipped: "no destination airports", ...EMPTY };

  const datePairs = generateWeekendDatePairs(patterns, user.weeksAhead, {
    now: opts.now,
  });

  const combinations = origins.length * destinations.length * datePairs.length;
  log(
    opts,
    `${origins.length} origins × ${destinations.length} destinations × ${datePairs.length} date-pairs = ${combinations} searches`,
  );

  const deals: Deal[] = [];
  let pricesFetched = 0;
  let snapshotsWritten = 0;

  for (const origin of origins) {
    for (const dest of destinations) {
      if (origin === dest) continue;
      for (const pair of datePairs) {
        const result = await searchCheapestRoundTrip({
          origin,
          destination: dest,
          departDate: pair.departDate,
          returnDate: pair.returnDate,
        });
        if (!result) continue;
        pricesFetched++;
        const price = result.amount;

        const windowStart = new Date(Date.now() - HISTORY_WINDOW_DAYS * DAY_MS);
        const priors = await prisma.priceSnapshot.findMany({
          where: {
            originIata: origin,
            destIata: dest,
            weekendPattern: pair.weekendPattern,
            checkedAt: { gte: windowStart },
          },
          orderBy: { checkedAt: "desc" },
          take: HISTORY_MAX_SNAPSHOTS,
        });
        const avg =
          priors.length > 0
            ? priors.reduce((s, p) => s + p.priceUsd, 0) / priors.length
            : null;

        if (!opts.dryRun) {
          await prisma.priceSnapshot.create({
            data: {
              originIata: origin,
              destIata: dest,
              departDate: pair.departDate,
              returnDate: pair.returnDate,
              weekendPattern: pair.weekendPattern,
              priceUsd: price,
              currency: result.currency,
            },
          });
          snapshotsWritten++;
        }

        const triggers: TriggerType[] = [];
        if (user.alertOnBudget && price <= user.budgetUsd) triggers.push("BUDGET");
        if (
          user.alertOnPriceDrop &&
          avg !== null &&
          priors.length >= MIN_HISTORY_FOR_DROP &&
          price <= avg * DROP_RATIO
        ) {
          triggers.push("PRICE_DROP");
        }
        if (triggers.length === 0) continue;

        log(
          opts,
          `${origin}->${dest} ${pair.departDate}/${pair.returnDate}: $${price.toFixed(0)} triggers ${triggers.join("+")}`,
        );

        for (const triggerType of triggers) {
          const ok = await passesDedup(
            user.id,
            origin,
            dest,
            pair.departDate,
            pair.returnDate,
            triggerType,
            price,
          );
          if (!ok) {
            log(opts, `  deduped ${triggerType} (already alerted, not enough further drop)`);
            continue;
          }
          const pctBelowAvg =
            triggerType === "PRICE_DROP" && avg
              ? Math.round((1 - price / avg) * 100)
              : null;
          deals.push({
            originIata: origin,
            destIata: dest,
            originLabel: labelFor(origin),
            destLabel: labelFor(dest),
            departDate: pair.departDate,
            returnDate: pair.returnDate,
            weekendPattern: pair.weekendPattern,
            priceUsd: price,
            currency: result.currency,
            triggerType,
            averageUsd: triggerType === "PRICE_DROP" ? avg : null,
            pctBelowAvg,
            googleFlightsUrl: googleFlightsUrl(
              origin,
              dest,
              pair.departDate,
              pair.returnDate,
            ),
          });
        }
      }
    }
  }

  let emailSent = false;
  let emailId: string | null | undefined;

  if (deals.length > 0 && !opts.dryRun) {
    emailId = await sendDigestEmail(user.email, deals);
    emailSent = true;
    await prisma.notificationLog.createMany({
      data: deals.map((d) => ({
        userId: user.id,
        originIata: d.originIata,
        destIata: d.destIata,
        departDate: d.departDate,
        returnDate: d.returnDate,
        triggerType: d.triggerType,
        priceUsd: d.priceUsd,
      })),
    });
  }

  return {
    ranAt,
    origins,
    destinations,
    datePairs: datePairs.length,
    combinations,
    pricesFetched,
    snapshotsWritten,
    dealsMatched: deals.length,
    emailSent,
    emailId,
    deals,
  };
}
