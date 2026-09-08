import { z } from "zod";
import {
  MAX_WEEKS_AHEAD,
  WEEKEND_PATTERNS,
  DESTINATION_KINDS,
} from "@/lib/constants";
import { getPreferences, savePreferences } from "@/lib/user";

const destinationSchema = z
  .object({
    kind: z.enum(DESTINATION_KINDS),
    iataCode: z.string().trim().min(3).max(4).optional(),
    countryCode: z.string().trim().length(2).optional(),
    label: z.string().trim().max(120).optional(),
  })
  .refine(
    (d) => (d.kind === "AIRPORT" ? !!d.iataCode : !!d.countryCode),
    { message: "AIRPORT needs iataCode; COUNTRY needs countryCode" },
  );

const bodySchema = z.object({
  email: z.string().trim().email(),
  budgetUsd: z.number().positive().max(100_000),
  weeksAhead: z.number().int().min(1).max(MAX_WEEKS_AHEAD),
  alertOnBudget: z.boolean(),
  alertOnPriceDrop: z.boolean(),
  weekendPatterns: z.array(z.enum(WEEKEND_PATTERNS)).min(1),
  origins: z.array(z.string().trim().min(3).max(4)).min(1),
  destinations: z.array(destinationSchema).min(1),
});

export async function GET() {
  const prefs = await getPreferences();
  return Response.json({ preferences: prefs });
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  if (!parsed.data.alertOnBudget && !parsed.data.alertOnPriceDrop) {
    return Response.json(
      { error: "Enable at least one alert type" },
      { status: 422 },
    );
  }

  try {
    await savePreferences({
      ...parsed.data,
      origins: parsed.data.origins.map((o) => o.toUpperCase()),
    });
  } catch (err) {
    console.error("[preferences] save failed", err);
    return Response.json({ error: "Could not save preferences" }, { status: 500 });
  }

  const preferences = await getPreferences();
  return Response.json({ ok: true, preferences });
}
