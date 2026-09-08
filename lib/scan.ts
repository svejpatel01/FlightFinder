// The scan job — multi-user, email alerts.
//
// Each run:
//   1. loads every scan-enabled, fully-configured user
//   2. builds the GLOBAL set of unique (origin, dest, departDate, returnDate)
//      searches across all users — two users watching the same route cost one
//      Duffel call
//   3. runs those searches (throttled inside lib/duffel), writes one
//      PriceSnapshot each
//   4. per user: evaluates BUDGET / PRICE_DROP triggers against the fresh
//      prices + rolling average, dedups against NotificationLog
//   5. sends one email digest per user with anything new

import { prisma } from "./db";
import { generateWeekendDatePairs } from "./weekends";
import { searchCheapestRoundTrip } from "./duffel";
import { googleFlightsUrl } from "./googleFlights";
import { getAirport, airportsForCountry } from "./airports";
import {
  isWeekendPattern,
  type TriggerType,
  type WeekendPatternKey,
} from "./constants";
import { sendDigestEmail, type Deal } from "./email";

// --- "How much history is enough" ---------------------------------------
const HISTORY_WINDOW_DAYS = 45;
const HISTORY_MAX_SNAPSHOTS = 8;
const MIN_HISTORY_FOR_DROP = 3;
const DROP_RATIO = 0.7; // "30%+ below average"
const RENOTIFY_RATIO = 0.9; // re-alert only if a further 10% cheaper
const COUNTRY_CACHE_TTL_DAYS = 30;

const DAY_MS = 86_400_000;

export interface ScanOptions {
  dryRun?: boolean;
  now?: Date;
  verbose?: boolean;
}

export interface ScanUserResult {
  userId: string;
  email: string;
  dealsMatched: number;
  emailSent: boolean;
}

export interface ScanSummary {
  ranAt: string;
  skipped?: string;
  users: number;
  configuredUsers: number;
  uniqueSearches: number;
  pricesFetched: number;
  snapshotsWritten: number;
  dealsMatched: number;
  emailsSent: number;
  perUser: ScanUserResult[];
}

interface Task {
  origin: string;
  dest: string;
  departDate: string;
  returnDate: string;
  weekendPattern: WeekendPatternKey;
}

function log(opts: ScanOptions, ...args: unknown[]) {
  if (opts.verbose) console.log("[scan]", ...args);
}

function labelFor(iata: string): string {
  const a = getAirport(iata);
  return a ? `${a.city} (${a.iata})` : iata;
}

function taskKey(origin: string, dest: string, d: string, r: string): string {
  return `${origin}|${dest}|${d}|${r}`;
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
          /* re-resolve */
        }
      }
      if (resolved.length === 0) {
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

/** Should we actually send this (user, route, dates, trigger) alert now? */
async function passesDedup(
  userId: string,
  t: Task,
  triggerType: TriggerType,
  price: number,
): Promise<boolean> {
  const last = await prisma.notificationLog.findFirst({
    where: {
      userId,
      originIata: t.origin,
      destIata: t.dest,
      departDate: t.departDate,
      returnDate: t.returnDate,
      triggerType,
    },
    orderBy: { sentAt: "desc" },
  });
  if (!last) return true;
  return price <= last.priceUsd * RENOTIFY_RATIO;
}

const EMPTY: Omit<ScanSummary, "ranAt" | "skipped"> = {
  users: 0,
  configuredUsers: 0,
  uniqueSearches: 0,
  pricesFetched: 0,
  snapshotsWritten: 0,
  dealsMatched: 0,
  emailsSent: 0,
  perUser: [],
};

export async function runScan(opts: ScanOptions = {}): Promise<ScanSummary> {
  const ranAt = new Date().toISOString();
  const scanStartedAt = new Date();

  const users = await prisma.user.findMany({
    where: { scanEnabled: true },
    include: { origins: true, destinations: true, weekendPatterns: true },
  });

  const active = users.filter(
    (u) =>
      u.budgetUsd > 0 &&
      u.origins.length > 0 &&
      u.destinations.length > 0 &&
      u.weekendPatterns.length > 0,
  );
  if (active.length === 0) {
    return { ranAt, skipped: "no configured users", ...EMPTY, users: users.length };
  }

  // 1 + 2: per-user tuples and the global unique search set
  const userTasks = new Map<string, Task[]>();
  const globalTasks = new Map<string, Task>();

  for (const u of active) {
    const patterns = u.weekendPatterns
      .map((w) => w.pattern)
      .filter(isWeekendPattern) as WeekendPatternKey[];
    const origins = [...new Set(u.origins.map((o) => o.iataCode.toUpperCase()))];
    const dests = await resolveDestinations(u.destinations);
    const pairs = generateWeekendDatePairs(patterns, u.weeksAhead, {
      now: opts.now,
    });

    const tasks: Task[] = [];
    for (const origin of origins) {
      for (const dest of dests) {
        if (origin === dest) continue;
        for (const p of pairs) {
          const t: Task = {
            origin,
            dest,
            departDate: p.departDate,
            returnDate: p.returnDate,
            weekendPattern: p.weekendPattern,
          };
          tasks.push(t);
          globalTasks.set(taskKey(origin, dest, p.departDate, p.returnDate), t);
        }
      }
    }
    userTasks.set(u.id, tasks);
  }

  log(
    opts,
    `${active.length} configured user(s), ${globalTasks.size} unique searches`,
  );

  // 3: run the unique searches
  const fresh = new Map<string, { price: number; currency: string }>();
  let pricesFetched = 0;
  let snapshotsWritten = 0;

  for (const [key, t] of globalTasks) {
    const r = await searchCheapestRoundTrip({
      origin: t.origin,
      destination: t.dest,
      departDate: t.departDate,
      returnDate: t.returnDate,
    });
    if (!r) continue;
    pricesFetched++;
    fresh.set(key, { price: r.amount, currency: r.currency });
    if (!opts.dryRun) {
      await prisma.priceSnapshot.create({
        data: {
          originIata: t.origin,
          destIata: t.dest,
          departDate: t.departDate,
          returnDate: t.returnDate,
          weekendPattern: t.weekendPattern,
          priceUsd: r.amount,
          currency: r.currency,
        },
      });
      snapshotsWritten++;
    }
  }

  // 4 + 5: per-user evaluation + delivery
  const windowStart = new Date(Date.now() - HISTORY_WINDOW_DAYS * DAY_MS);
  const perUser: ScanUserResult[] = [];
  let emailsSent = 0;
  let dealsMatched = 0;

  for (const u of active) {
    const deals: Deal[] = [];

    for (const t of userTasks.get(u.id) ?? []) {
      const fp = fresh.get(taskKey(t.origin, t.dest, t.departDate, t.returnDate));
      if (!fp) continue;
      const price = fp.price;

      const priors = await prisma.priceSnapshot.findMany({
        where: {
          originIata: t.origin,
          destIata: t.dest,
          weekendPattern: t.weekendPattern,
          checkedAt: { gte: windowStart, lt: scanStartedAt },
        },
        orderBy: { checkedAt: "desc" },
        take: HISTORY_MAX_SNAPSHOTS,
      });
      const avg =
        priors.length > 0
          ? priors.reduce((s, p) => s + p.priceUsd, 0) / priors.length
          : null;

      const triggers: TriggerType[] = [];
      if (u.alertOnBudget && price <= u.budgetUsd) triggers.push("BUDGET");
      if (
        u.alertOnPriceDrop &&
        avg !== null &&
        priors.length >= MIN_HISTORY_FOR_DROP &&
        price <= avg * DROP_RATIO
      ) {
        triggers.push("PRICE_DROP");
      }
      if (triggers.length === 0) continue;

      for (const triggerType of triggers) {
        if (!(await passesDedup(u.id, t, triggerType, price))) continue;

        const pctBelowAvg =
          triggerType === "PRICE_DROP" && avg
            ? Math.round((1 - price / avg) * 100)
            : null;

        deals.push({
          originIata: t.origin,
          destIata: t.dest,
          originLabel: labelFor(t.origin),
          destLabel: labelFor(t.dest),
          departDate: t.departDate,
          returnDate: t.returnDate,
          weekendPattern: t.weekendPattern,
          priceUsd: price,
          currency: fp.currency,
          triggerType,
          averageUsd: triggerType === "PRICE_DROP" ? avg : null,
          pctBelowAvg,
          googleFlightsUrl: googleFlightsUrl(
            t.origin,
            t.dest,
            t.departDate,
            t.returnDate,
          ),
        });
      }
    }

    dealsMatched += deals.length;
    let emailSent = false;

    if (deals.length > 0) {
      log(opts, `${u.email}: ${deals.length} deal(s)`);
    }

    if (!opts.dryRun && deals.length > 0) {
      try {
        await sendDigestEmail(u.email, deals);
        emailSent = true;
        emailsSent++;
        await prisma.notificationLog.createMany({
          data: deals.map((d) => ({
            userId: u.id,
            originIata: d.originIata,
            destIata: d.destIata,
            departDate: d.departDate,
            returnDate: d.returnDate,
            triggerType: d.triggerType,
            channel: "EMAIL",
            priceUsd: d.priceUsd,
          })),
        });
      } catch (err) {
        // One user's delivery failure must not abort the whole scan.
        console.error(`[scan] email to ${u.email} failed:`, err);
      }
    }

    perUser.push({
      userId: u.id,
      email: u.email,
      dealsMatched: deals.length,
      emailSent,
    });
  }

  return {
    ranAt,
    users: users.length,
    configuredUsers: active.length,
    uniqueSearches: globalTasks.size,
    pricesFetched,
    snapshotsWritten,
    dealsMatched,
    emailsSent,
    perUser,
  };
}
