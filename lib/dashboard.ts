// Read model for the logged-in dashboard: the latest known price for every
// route + weekend this user watches, plus how it compares to the rolling
// average and the user's budget.

import { prisma } from "./db";
import { generateWeekendDatePairs } from "./weekends";
import { googleFlightsUrl } from "./googleFlights";
import { getAirport, airportsForCountry } from "./airports";
import { isWeekendPattern, type WeekendPatternKey } from "./constants";

const HISTORY_WINDOW_DAYS = 45;
const HISTORY_MAX_SNAPSHOTS = 8;
const DAY_MS = 86_400_000;

export interface DashboardRow {
  originIata: string;
  destIata: string;
  destLabel: string;
  weekendPattern: WeekendPatternKey;
  departDate: string;
  returnDate: string;
  priceUsd: number | null;
  currency: string;
  averageUsd: number | null;
  pctVsAvg: number | null; // negative = below average
  underBudget: boolean;
  checkedAt: string | null;
  googleFlightsUrl: string;
}

export interface DashboardData {
  configured: boolean;
  scanEnabled: boolean;
  budgetUsd: number;
  rows: DashboardRow[];
  lastCheckedAt: string | null;
  stats: {
    routesWatched: number;
    pricedRoutes: number;
    underBudget: number;
    cheapest: DashboardRow | null;
    dealsLast7Days: number;
  };
}

function labelFor(iata: string): string {
  const a = getAirport(iata);
  return a ? `${a.city} (${a.iata})` : iata;
}

export async function getDashboard(userId: string): Promise<DashboardData> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { origins: true, destinations: true, weekendPatterns: true },
  });

  const empty: DashboardData = {
    configured: false,
    scanEnabled: user?.scanEnabled ?? true,
    budgetUsd: user?.budgetUsd ?? 0,
    rows: [],
    lastCheckedAt: null,
    stats: {
      routesWatched: 0,
      pricedRoutes: 0,
      underBudget: 0,
      cheapest: null,
      dealsLast7Days: 0,
    },
  };
  if (!user) return empty;

  const patterns = user.weekendPatterns
    .map((w) => w.pattern)
    .filter(isWeekendPattern) as WeekendPatternKey[];
  const origins = [...new Set(user.origins.map((o) => o.iataCode.toUpperCase()))];

  const destSet = new Set<string>();
  for (const d of user.destinations) {
    if (d.kind === "AIRPORT" && d.iataCode) {
      destSet.add(d.iataCode.toUpperCase());
    } else if (d.kind === "COUNTRY" && d.countryCode) {
      let resolved: string[] = [];
      try {
        if (d.resolvedAirports) resolved = JSON.parse(d.resolvedAirports);
      } catch {
        /* ignore */
      }
      if (resolved.length === 0) resolved = airportsForCountry(d.countryCode);
      for (const a of resolved) destSet.add(a.toUpperCase());
    }
  }
  const dests = [...destSet];

  const configured =
    user.budgetUsd > 0 &&
    origins.length > 0 &&
    dests.length > 0 &&
    patterns.length > 0;
  if (!configured) return { ...empty, configured: false, budgetUsd: user.budgetUsd };

  const pairs = generateWeekendDatePairs(patterns, user.weeksAhead);
  const windowStart = new Date(Date.now() - HISTORY_WINDOW_DAYS * DAY_MS);

  const rows: DashboardRow[] = [];
  for (const origin of origins) {
    for (const dest of dests) {
      if (origin === dest) continue;
      for (const p of pairs) {
        const latest = await prisma.priceSnapshot.findFirst({
          where: {
            originIata: origin,
            destIata: dest,
            departDate: p.departDate,
            returnDate: p.returnDate,
          },
          orderBy: { checkedAt: "desc" },
        });

        const priors = await prisma.priceSnapshot.findMany({
          where: {
            originIata: origin,
            destIata: dest,
            weekendPattern: p.weekendPattern,
            checkedAt: { gte: windowStart },
          },
          orderBy: { checkedAt: "desc" },
          take: HISTORY_MAX_SNAPSHOTS,
        });
        const avg =
          priors.length > 0
            ? priors.reduce((s, x) => s + x.priceUsd, 0) / priors.length
            : null;

        const price = latest?.priceUsd ?? null;
        rows.push({
          originIata: origin,
          destIata: dest,
          destLabel: labelFor(dest),
          weekendPattern: p.weekendPattern,
          departDate: p.departDate,
          returnDate: p.returnDate,
          priceUsd: price,
          currency: latest?.currency ?? "USD",
          averageUsd: avg,
          pctVsAvg:
            price !== null && avg
              ? Math.round(((price - avg) / avg) * 100)
              : null,
          underBudget: price !== null && price <= user.budgetUsd,
          checkedAt: latest?.checkedAt.toISOString() ?? null,
          googleFlightsUrl: googleFlightsUrl(
            origin,
            dest,
            p.departDate,
            p.returnDate,
          ),
        });
      }
    }
  }

  // cheapest priced first, then unpriced
  rows.sort((a, b) => {
    if (a.priceUsd === null) return 1;
    if (b.priceUsd === null) return -1;
    return a.priceUsd - b.priceUsd;
  });

  const priced = rows.filter((r) => r.priceUsd !== null);
  const lastCheckedAt =
    priced
      .map((r) => r.checkedAt)
      .filter((x): x is string => Boolean(x))
      .sort()
      .at(-1) ?? null;

  const dealsLast7Days = await prisma.notificationLog.count({
    where: { userId, sentAt: { gte: new Date(Date.now() - 7 * DAY_MS) } },
  });

  return {
    configured: true,
    scanEnabled: user.scanEnabled,
    budgetUsd: user.budgetUsd,
    rows,
    lastCheckedAt,
    stats: {
      routesWatched: rows.length,
      pricedRoutes: priced.length,
      underBudget: rows.filter((r) => r.underBudget).length,
      cheapest: priced[0] ?? null,
      dealsLast7Days,
    },
  };
}
