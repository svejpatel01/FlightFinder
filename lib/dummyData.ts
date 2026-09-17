// Static sample data for the public dashboard.
//
// Live pricing is off (see README — the free `fli` data source broke and the
// paid alternative costs real money per search). Rather than show a dead
// page, the dashboard displays these fixed, clearly-labeled sample numbers so
// visitors can see the shape of the product. Nothing here is fetched or
// re-generated at request time; there is no network call and no cron job
// behind these numbers.

import { googleFlightsUrl } from "./googleFlights";
import type { WeekendPatternKey } from "./constants";
import type { DashboardRow } from "./dashboard";

interface SampleRoute {
  originIata: string;
  destIata: string;
  destLabel: string;
  weekendPattern: WeekendPatternKey;
  departDate: string;
  returnDate: string;
  priceUsd: number;
  averageUsd: number;
  // A short fake trend leading up to priceUsd, oldest first. Powers the
  // per-row chart so that feature still has something to show.
  historyUsd: number[];
}

const SAMPLE_ROUTES: SampleRoute[] = [
  {
    originIata: "JFK",
    destIata: "MIA",
    destLabel: "Miami (MIA)",
    weekendPattern: "FRI_SUN",
    departDate: "2026-10-16",
    returnDate: "2026-10-18",
    priceUsd: 148,
    averageUsd: 212,
    historyUsd: [238, 225, 231, 219, 205, 190, 148],
  },
  {
    originIata: "JFK",
    destIata: "CUN",
    destLabel: "Cancún (CUN)",
    weekendPattern: "THU_SUN",
    departDate: "2026-10-15",
    returnDate: "2026-10-18",
    priceUsd: 261,
    averageUsd: 340,
    historyUsd: [355, 349, 362, 330, 298, 261],
  },
  {
    originIata: "EWR",
    destIata: "LAX",
    destLabel: "Los Angeles (LAX)",
    weekendPattern: "SAT_SUN",
    departDate: "2026-10-17",
    returnDate: "2026-10-18",
    priceUsd: 302,
    averageUsd: 289,
    historyUsd: [270, 281, 265, 279, 295, 302],
  },
  {
    originIata: "EWR",
    destIata: "SJU",
    destLabel: "San Juan (SJU)",
    weekendPattern: "FRI_SUN",
    departDate: "2026-10-23",
    returnDate: "2026-10-25",
    priceUsd: 187,
    averageUsd: 231,
    historyUsd: [244, 240, 226, 233, 210, 187],
  },
  {
    originIata: "BOS",
    destIata: "DEN",
    destLabel: "Denver (DEN)",
    weekendPattern: "SAT_SUN",
    departDate: "2026-10-24",
    returnDate: "2026-10-25",
    priceUsd: 216,
    averageUsd: 199,
    historyUsd: [188, 194, 201, 190, 205, 216],
  },
  {
    originIata: "BOS",
    destIata: "LIS",
    destLabel: "Lisbon (LIS)",
    weekendPattern: "THU_SUN",
    departDate: "2026-10-29",
    returnDate: "2026-11-01",
    priceUsd: 398,
    averageUsd: 512,
    historyUsd: [545, 530, 561, 498, 470, 398],
  },
  {
    originIata: "JFK",
    destIata: "AUS",
    destLabel: "Austin (AUS)",
    weekendPattern: "FRI_SUN",
    departDate: "2026-10-30",
    returnDate: "2026-11-01",
    priceUsd: 176,
    averageUsd: 168,
    historyUsd: [155, 161, 159, 170, 165, 176],
  },
  {
    originIata: "EWR",
    destIata: "MCO",
    destLabel: "Orlando (MCO)",
    weekendPattern: "SAT_SUN",
    departDate: "2026-11-07",
    returnDate: "2026-11-08",
    priceUsd: 121,
    averageUsd: 179,
    historyUsd: [190, 183, 175, 168, 150, 121],
  },
];

export function getStaticDashboardRows(): DashboardRow[] {
  return SAMPLE_ROUTES.map((r) => ({
    originIata: r.originIata,
    destIata: r.destIata,
    destLabel: r.destLabel,
    weekendPattern: r.weekendPattern,
    departDate: r.departDate,
    returnDate: r.returnDate,
    priceUsd: r.priceUsd,
    currency: "USD",
    averageUsd: r.averageUsd,
    pctVsAvg: Math.round(((r.priceUsd - r.averageUsd) / r.averageUsd) * 100),
    underBudget: r.priceUsd < r.averageUsd * 0.85, // "notable deal" flag for row highlighting
    checkedAt: null,
    googleFlightsUrl: googleFlightsUrl(r.originIata, r.destIata, r.departDate, r.returnDate),
  })).sort((a, b) => (a.priceUsd ?? 0) - (b.priceUsd ?? 0));
}

export interface StaticHistoryPoint {
  checkedAt: string;
  priceUsd: number;
  currency: string;
}

export function getStaticHistory(
  originIata: string,
  destIata: string,
  departDate: string,
  returnDate: string,
): { points: StaticHistoryPoint[]; averageUsd: number | null } | null {
  const route = SAMPLE_ROUTES.find(
    (r) =>
      r.originIata === originIata.toUpperCase() &&
      r.destIata === destIata.toUpperCase() &&
      r.departDate === departDate &&
      r.returnDate === returnDate,
  );
  if (!route) return null;

  // Spread the fake history over the weeks leading up to "now" so the chart's
  // x-axis looks like real elapsed time rather than a flat line.
  const days = route.historyUsd.length;
  const points: StaticHistoryPoint[] = route.historyUsd.map((priceUsd, i) => ({
    checkedAt: new Date(Date.now() - (days - 1 - i) * 4 * 86_400_000).toISOString(),
    priceUsd,
    currency: "USD",
  }));

  return { points, averageUsd: route.averageUsd };
}
