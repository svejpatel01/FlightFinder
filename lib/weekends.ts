// Pure weekend date-pair generation. No I/O — unit tested in lib/weekends.test.ts.

import {
  WEEKEND_PATTERN_SPEC,
  type WeekendPatternKey,
} from "./constants";

export interface WeekendDatePair {
  weekendPattern: WeekendPatternKey;
  /** "YYYY-MM-DD" (UTC date-only) */
  departDate: string;
  /** "YYYY-MM-DD" (UTC date-only) */
  returnDate: string;
}

const MS_PER_DAY = 86_400_000;

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function utcMidnight(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * MS_PER_DAY);
}

/** First date >= `from` whose UTC day-of-week === `dow`. */
function onOrAfterWeekday(from: Date, dow: number): Date {
  const delta = (dow - from.getUTCDay() + 7) % 7;
  return addDays(from, delta);
}

export interface GenerateOptions {
  /** Defaults to `new Date()`. */
  now?: Date;
  /**
   * Minimum days between "now" and the earliest departure we'll consider.
   * Weekends closer than this are skipped (no point alerting on a trip you
   * can't realistically take). Default 3.
   */
  minLeadDays?: number;
}

/**
 * For each selected weekend pattern, produce one (departDate, returnDate) pair
 * per week for the next `weeksAhead` weeks.
 *
 * Example: FRI_SUN with weeksAhead=12 -> the next 12 Friday→Sunday pairs.
 * All arithmetic is done in UTC so results don't shift with the local timezone
 * or DST.
 */
export function generateWeekendDatePairs(
  patterns: WeekendPatternKey[],
  weeksAhead: number,
  opts: GenerateOptions = {},
): WeekendDatePair[] {
  const now = opts.now ?? new Date();
  const minLeadDays = opts.minLeadDays ?? 3;
  const weeks = Math.max(0, Math.trunc(weeksAhead));

  const earliest = addDays(utcMidnight(now), minLeadDays);
  const pairs: WeekendDatePair[] = [];

  for (const pattern of patterns) {
    const spec = WEEKEND_PATTERN_SPEC[pattern];
    if (!spec) continue;

    const firstDepart = onOrAfterWeekday(earliest, spec.departDow);
    for (let i = 0; i < weeks; i++) {
      const depart = addDays(firstDepart, i * 7);
      const back = addDays(depart, spec.nights);
      pairs.push({
        weekendPattern: pattern,
        departDate: toIsoDate(depart),
        returnDate: toIsoDate(back),
      });
    }
  }

  return pairs;
}
