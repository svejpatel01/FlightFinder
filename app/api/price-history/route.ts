// Price history for one exact (origin, dest, departDate, returnDate) sample
// flight — powers the chart behind a dashboard row. Public, static data (see
// lib/dummyData.ts) — there is no live scanning behind this anymore.

import { z } from "zod";
import { getStaticHistory } from "@/lib/dummyData";

const IATA = /^[A-Za-z]{3}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const querySchema = z.object({
  origin: z.string().regex(IATA),
  dest: z.string().regex(IATA),
  departDate: z.string().regex(DATE),
  returnDate: z.string().regex(DATE),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    origin: url.searchParams.get("origin") ?? "",
    dest: url.searchParams.get("dest") ?? "",
    departDate: url.searchParams.get("departDate") ?? "",
    returnDate: url.searchParams.get("returnDate") ?? "",
  });
  if (!parsed.success) {
    return Response.json({ error: "Invalid query" }, { status: 400 });
  }
  const { origin, dest, departDate, returnDate } = parsed.data;

  const history = getStaticHistory(origin, dest, departDate, returnDate);
  if (!history) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({
    points: history.points,
    budgetUsd: 0,
    averageUsd: history.averageUsd,
  });
}
