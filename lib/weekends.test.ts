import { describe, it, expect } from "vitest";
import { generateWeekendDatePairs } from "./weekends";

// A fixed reference so results are deterministic. 2026-01-01 is a Thursday (UTC).
const NOW = new Date("2026-01-01T12:00:00Z");

function dow(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}
function daysBetween(a: string, b: string): number {
  return (
    (new Date(`${b}T00:00:00Z`).getTime() -
      new Date(`${a}T00:00:00Z`).getTime()) /
    86_400_000
  );
}

describe("generateWeekendDatePairs", () => {
  it("returns one pair per week for the requested horizon", () => {
    const pairs = generateWeekendDatePairs(["FRI_SUN"], 12, { now: NOW });
    expect(pairs).toHaveLength(12);
  });

  it("FRI_SUN departs Friday, returns the following Sunday (2 nights)", () => {
    const pairs = generateWeekendDatePairs(["FRI_SUN"], 4, { now: NOW });
    for (const p of pairs) {
      expect(p.weekendPattern).toBe("FRI_SUN");
      expect(dow(p.departDate)).toBe(5);
      expect(dow(p.returnDate)).toBe(0);
      expect(daysBetween(p.departDate, p.returnDate)).toBe(2);
    }
  });

  it("SAT_SUN departs Saturday, returns Sunday (1 night)", () => {
    const pairs = generateWeekendDatePairs(["SAT_SUN"], 3, { now: NOW });
    for (const p of pairs) {
      expect(dow(p.departDate)).toBe(6);
      expect(dow(p.returnDate)).toBe(0);
      expect(daysBetween(p.departDate, p.returnDate)).toBe(1);
    }
  });

  it("THU_SUN departs Thursday, returns Sunday (3 nights)", () => {
    const pairs = generateWeekendDatePairs(["THU_SUN"], 3, { now: NOW });
    for (const p of pairs) {
      expect(dow(p.departDate)).toBe(4);
      expect(dow(p.returnDate)).toBe(0);
      expect(daysBetween(p.departDate, p.returnDate)).toBe(3);
    }
  });

  it("consecutive pairs are exactly 7 days apart", () => {
    const pairs = generateWeekendDatePairs(["FRI_SUN"], 5, { now: NOW });
    for (let i = 1; i < pairs.length; i++) {
      expect(daysBetween(pairs[i - 1].departDate, pairs[i].departDate)).toBe(7);
    }
  });

  it("respects minLeadDays (skips weekends that are too soon)", () => {
    // NOW is Thu 2026-01-01. With lead=3, earliest considered date is Jan 4
    // (Sunday), so the first Friday is Jan 9 — not Jan 2.
    const soon = generateWeekendDatePairs(["FRI_SUN"], 1, {
      now: NOW,
      minLeadDays: 3,
    });
    expect(soon[0].departDate).toBe("2026-01-09");

    const veryShortLead = generateWeekendDatePairs(["FRI_SUN"], 1, {
      now: NOW,
      minLeadDays: 0,
    });
    expect(veryShortLead[0].departDate).toBe("2026-01-02");
  });

  it("combines multiple patterns", () => {
    const pairs = generateWeekendDatePairs(["FRI_SUN", "SAT_SUN"], 6, {
      now: NOW,
    });
    expect(pairs).toHaveLength(12);
    expect(pairs.filter((p) => p.weekendPattern === "FRI_SUN")).toHaveLength(6);
    expect(pairs.filter((p) => p.weekendPattern === "SAT_SUN")).toHaveLength(6);
  });

  it("returns nothing for a zero-week horizon", () => {
    expect(generateWeekendDatePairs(["FRI_SUN"], 0, { now: NOW })).toEqual([]);
  });
});
