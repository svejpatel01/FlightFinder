// String-constant "enums" shared across the app (SQLite has no enum type).

export const WEEKEND_PATTERNS = ["FRI_SUN", "SAT_SUN", "THU_SUN"] as const;
export type WeekendPatternKey = (typeof WEEKEND_PATTERNS)[number];

export const WEEKEND_PATTERN_LABELS: Record<WeekendPatternKey, string> = {
  FRI_SUN: "Friday → Sunday",
  SAT_SUN: "Saturday → Sunday",
  THU_SUN: "Thursday → Sunday (long weekend)",
};

// Departure day-of-week (0 = Sunday … 6 = Saturday) and number of nights away.
export const WEEKEND_PATTERN_SPEC: Record<
  WeekendPatternKey,
  { departDow: number; nights: number }
> = {
  FRI_SUN: { departDow: 5, nights: 2 },
  SAT_SUN: { departDow: 6, nights: 1 },
  THU_SUN: { departDow: 4, nights: 3 },
};

export const TRIGGER_TYPES = ["BUDGET", "PRICE_DROP"] as const;
export type TriggerType = (typeof TRIGGER_TYPES)[number];

export const DESTINATION_KINDS = ["AIRPORT", "COUNTRY"] as const;
export type DestinationKind = (typeof DESTINATION_KINDS)[number];

export const MAX_WEEKS_AHEAD = 26;
export const DEFAULT_WEEKS_AHEAD = 12;

// Per-user caps. These bound the shared Duffel request budget
// (60 req/min, shared across all users) — see lib/scan.ts.
// Sized for ≤5 users: 5 × 15 × 3 = 675 route-weekends/user worst case,
// ~500–600 unique searches/scan after overlap ≈ 9 min at the 1.1s throttle.
export const MAX_ORIGINS = 5;
export const MAX_DESTINATIONS = 15;
export const MAX_PATTERNS = 3;

export function isWeekendPattern(v: string): v is WeekendPatternKey {
  return (WEEKEND_PATTERNS as readonly string[]).includes(v);
}
