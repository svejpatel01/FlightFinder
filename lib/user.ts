// Per-user watch preferences. The User row itself is created at first sign-in
// (lib/auth); this module manages the watch config attached to it.

import { prisma } from "./db";
import { airportsForCountry, countryNameFor, getAirport } from "./airports";
import {
  DEFAULT_WEEKS_AHEAD,
  MAX_DESTINATIONS,
  MAX_ORIGINS,
  MAX_PATTERNS,
  type DestinationKind,
  type WeekendPatternKey,
} from "./constants";

export interface DestinationInput {
  kind: DestinationKind;
  iataCode?: string;
  countryCode?: string;
  label?: string;
}

export interface PreferencesInput {
  name?: string;
  phone?: string | null;
  smsOptIn: boolean;
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
  name: string;
  phone: string;
  smsOptIn: boolean;
  budgetUsd: number | null;
  weeksAhead: number;
  alertOnBudget: boolean;
  alertOnPriceDrop: boolean;
  scanEnabled: boolean;
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

export async function getUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { origins: true, destinations: true, weekendPatterns: true },
  });
}

export async function getPreferences(
  userId: string,
): Promise<PreferencesView | null> {
  const user = await getUser(userId);
  if (!user) return null;
  return {
    email: user.email,
    name: user.name ?? "",
    phone: user.phone ?? "",
    smsOptIn: user.smsOptIn,
    budgetUsd: user.budgetUsd || null,
    weeksAhead: user.weeksAhead,
    alertOnBudget: user.alertOnBudget,
    alertOnPriceDrop: user.alertOnPriceDrop,
    scanEnabled: user.scanEnabled,
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

/** True once a user has enough config for the scan to include them. */
export function isConfigured(p: {
  budgetUsd: number | null;
  origins: unknown[];
  destinations: unknown[];
  weekendPatterns: unknown[];
}): boolean {
  return (
    (p.budgetUsd ?? 0) > 0 &&
    p.origins.length > 0 &&
    p.destinations.length > 0 &&
    p.weekendPatterns.length > 0
  );
}

/** Replace this user's watch config. Child rows are wiped and rebuilt. */
export async function savePreferences(
  userId: string,
  input: PreferencesInput,
) {
  const origins = [
    ...new Set(input.origins.map((o) => o.trim().toUpperCase()).filter(Boolean)),
  ].slice(0, MAX_ORIGINS);
  const patterns = [...new Set(input.weekendPatterns)].slice(0, MAX_PATTERNS);
  const destInputs = input.destinations.slice(0, MAX_DESTINATIONS);

  const destinationRows = destInputs.map((d) => {
    const kind = d.kind;
    const iataCode =
      kind === "AIRPORT" ? (d.iataCode?.trim().toUpperCase() ?? null) : null;
    const countryCode =
      kind === "COUNTRY" ? (d.countryCode?.trim().toUpperCase() ?? null) : null;
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

  return prisma.$transaction(async (tx) => {
    await tx.origin.deleteMany({ where: { userId } });
    await tx.wishlistDestination.deleteMany({ where: { userId } });
    await tx.weekendPattern.deleteMany({ where: { userId } });
    return tx.user.update({
      where: { id: userId },
      data: {
        name: input.name?.trim() || null,
        phone: input.phone?.trim() || null,
        smsOptIn: input.smsOptIn,
        budgetUsd: input.budgetUsd,
        weeksAhead: input.weeksAhead,
        alertOnBudget: input.alertOnBudget,
        alertOnPriceDrop: input.alertOnPriceDrop,
        origins: { create: origins.map((iataCode) => ({ iataCode })) },
        weekendPatterns: { create: patterns.map((pattern) => ({ pattern })) },
        destinations: { create: destinationRows },
      },
      include: { origins: true, destinations: true, weekendPatterns: true },
    });
  });
}

export async function setScanEnabled(userId: string, enabled: boolean) {
  return prisma.user.update({
    where: { id: userId },
    data: { scanEnabled: enabled },
  });
}

export { DEFAULT_WEEKS_AHEAD };
