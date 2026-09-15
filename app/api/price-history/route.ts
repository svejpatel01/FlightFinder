// Price history for one exact (origin, dest, departDate, returnDate) flight —
// powers the chart behind a dashboard row. Shared price data, so any signed-in
// user can view any route's history; not scoped to the requester.

import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { WEEKEND_PATTERNS } from "@/lib/constants";

const HISTORY_WINDOW_DAYS = 45;
const HISTORY_MAX_SNAPSHOTS = 8;
const MAX_POINTS = 500;
const DAY_MS = 86_400_000;

const IATA = /^[A-Za-z]{3}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const querySchema = z.object({
  origin: z.string().regex(IATA),
  dest: z.string().regex(IATA),
  departDate: z.string().regex(DATE),
  returnDate: z.string().regex(DATE),
  weekendPattern: z.enum(WEEKEND_PATTERNS).optional(),
});

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    origin: url.searchParams.get("origin") ?? "",
    dest: url.searchParams.get("dest") ?? "",
    departDate: url.searchParams.get("departDate") ?? "",
    returnDate: url.searchParams.get("returnDate") ?? "",
    weekendPattern: url.searchParams.get("weekendPattern") ?? undefined,
  });
  if (!parsed.success) {
    return Response.json({ error: "Invalid query" }, { status: 400 });
  }
  const { departDate, returnDate, weekendPattern } = parsed.data;
  const origin = parsed.data.origin.toUpperCase();
  const dest = parsed.data.dest.toUpperCase();

  const snapshots = await prisma.priceSnapshot.findMany({
    where: { originIata: origin, destIata: dest, departDate, returnDate },
    orderBy: { checkedAt: "asc" },
    take: MAX_POINTS,
  });

  let averageUsd: number | null = null;
  if (weekendPattern) {
    const windowStart = new Date(Date.now() - HISTORY_WINDOW_DAYS * DAY_MS);
    const priors = await prisma.priceSnapshot.findMany({
      where: {
        originIata: origin,
        destIata: dest,
        weekendPattern,
        checkedAt: { gte: windowStart },
      },
      orderBy: { checkedAt: "desc" },
      take: HISTORY_MAX_SNAPSHOTS,
    });
    if (priors.length > 0) {
      averageUsd = priors.reduce((s, p) => s + p.priceUsd, 0) / priors.length;
    }
  }

  return Response.json({
    points: snapshots.map((s) => ({
      checkedAt: s.checkedAt.toISOString(),
      priceUsd: s.priceUsd,
      currency: s.currency,
    })),
    budgetUsd: user.budgetUsd,
    averageUsd,
  });
}
