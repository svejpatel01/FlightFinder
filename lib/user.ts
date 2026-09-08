// Single-user preference storage. There is one `User` row; the onboarding form
// creates it on first submit and overwrites it (and its child rows) after that.

import { prisma } from "./db";
import { airportsForCountry, countryNameFor, getAirport } from "./airports";
import {
  DEFAULT_WEEKS_AHEAD,
  type DestinationKind,
  type WeekendPatternKey,
} from "./constants";

export interface DestinationInput {
  kind: DestinationKind;
  /** required when kind === "AIRPORT" */
  iataCode?: string;
  /** required when kind === "COUNTRY" (ISO-3166 alpha-2) */
  countryCode?: string;
  label?: string;
}

export interface PreferencesInput {
  email: string;
  budgetUsd: number;
  weeksAhead: number;
  alertOnBudget: boolean;
  alertOnPriceDrop: boolean;
  weekendPatterns: WeekendPatternKey[];
  origins: string[];
  destinations: DestinationInput[];
}

export interface PreferencesView {
  email: string;
  budgetUsd: number | null;
  weeksAhead: number;
  alertOnBudget: boolean;
  alertOnPriceDrop: boolean;
  weekendPatterns: WeekendPatternKey[];
  origins: string[];
  destinations: Array<{
    kind: DestinationKind;
    iataCode: string | null;
    countryCode: string | null;
    label: string;
  }>;
}

function labelForDestination(d: DestinationInput): string {
  if (d.label) return d.label;
  if (d.kind === "AIRPORT" && d.iataCode) {
    const a = getAirport(d.iataCode);
    return a ? `${a.city} (${a.iata})` : d.iataCode.toUpperCase();
  }
  if (d.kind === "COUNTRY" && d.countryCode) return countryNameFor(d.countryCode);
  return "?";
}

export async function getUser() {
  return prisma.user.findFirst({
    include: { origins: true, destinations: true, weekendPatterns: true },
  });
}

/** Shape the stored preferences for the onboarding form's initial values. */
export async function getPreferences(): Promise<PreferencesView | null> {
  const user = await getUser();
  if (!user) return null;
  return {
    email: user.email,
    budgetUsd: user.budgetUsd,
    weeksAhead: user.weeksAhead,
    alertOnBudget: user.alertOnBudget,
    alertOnPriceDrop: user.alertOnPriceDrop,
    weekendPatterns: user.weekendPatterns.map(
      (w) => w.pattern as WeekendPatternKey,
    ),
    origins: user.origins.map((o) => o.iataCode),
    destinations: user.destinations.map((d) => ({
      kind: d.kind as DestinationKind,
      iataCode: d.iataCode,
      countryCode: d.countryCode,
      label: d.label ?? "",
    })),
  };
}

/**
 * Create or replace the single user's preferences. Child rows (origins,
 * destinations, weekend patterns) are wiped and rebuilt so the form is the
 * single source of truth. COUNTRY destinations get their airport list resolved
 * and cached now, so the first scan doesn't have to.
 */
export async function savePreferences(input: PreferencesInput) {
  const origins = [
    ...new Set(input.origins.map((o) => o.trim().toUpperCase()).filter(Boolean)),
  ];
  const patterns = [...new Set(input.weekendPatterns)];

  const destinationRows = input.destinations.map((d) => {
    const kind = d.kind;
    const iataCode = kind === "AIRPORT" ? d.iataCode?.trim().toUpperCase() ?? null : null;
    const countryCode =
      kind === "COUNTRY" ? d.countryCode?.trim().toUpperCase() ?? null : null;
    const resolved =
      kind === "AIRPORT"
        ? iataCode
          ? [iataCode]
          : []
        : countryCode
          ? airportsForCountry(countryCode)
          : [];
    return {
      kind,
      iataCode,
      countryCode,
      label: labelForDestination(d),
      resolvedAirports: JSON.stringify(resolved),
      resolvedAt: new Date(),
    };
  });

  const scalars = {
    email: input.email.trim(),
    budgetUsd: input.budgetUsd,
    weeksAhead: input.weeksAhead,
    alertOnBudget: input.alertOnBudget,
    alertOnPriceDrop: input.alertOnPriceDrop,
  };

  const existing = await prisma.user.findFirst();

  if (!existing) {
    return prisma.user.create({
      data: {
        ...scalars,
        origins: { create: origins.map((iataCode) => ({ iataCode })) },
        weekendPatterns: { create: patterns.map((pattern) => ({ pattern })) },
        destinations: { create: destinationRows },
      },
      include: { origins: true, destinations: true, weekendPatterns: true },
    });
  }

  return prisma.$transaction(async (tx) => {
    await tx.origin.deleteMany({ where: { userId: existing.id } });
    await tx.wishlistDestination.deleteMany({ where: { userId: existing.id } });
    await tx.weekendPattern.deleteMany({ where: { userId: existing.id } });
    return tx.user.update({
      where: { id: existing.id },
      data: {
        ...scalars,
        origins: { create: origins.map((iataCode) => ({ iataCode })) },
        weekendPatterns: { create: patterns.map((pattern) => ({ pattern })) },
        destinations: { create: destinationRows },
      },
      include: { origins: true, destinations: true, weekendPatterns: true },
    });
  });
}

export { DEFAULT_WEEKS_AHEAD };
