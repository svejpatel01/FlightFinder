"use client";

import { useMemo, useState } from "react";
import {
  WEEKEND_PATTERNS,
  WEEKEND_PATTERN_LABELS,
  MAX_WEEKS_AHEAD,
  type WeekendPatternKey,
} from "@/lib/constants";
import type { PreferencesView } from "@/lib/user";

interface AirportOpt {
  iata: string;
  city: string;
  name: string;
  country: string;
}
interface CountryOpt {
  code: string;
  name: string;
}
interface Props {
  airports: AirportOpt[];
  countries: CountryOpt[];
  initial: PreferencesView | null;
  defaultWeeksAhead: number;
}

interface DestItem {
  kind: "AIRPORT" | "COUNTRY";
  iataCode?: string;
  countryCode?: string;
  label: string;
}

export default function OnboardingForm({
  airports,
  countries,
  initial,
  defaultWeeksAhead,
}: Props) {
  const airportByIata = useMemo(
    () => new Map(airports.map((a) => [a.iata, a])),
    [airports],
  );

  const [origins, setOrigins] = useState<string[]>(initial?.origins ?? []);
  const [originInput, setOriginInput] = useState("");

  const [destinations, setDestinations] = useState<DestItem[]>(
    initial?.destinations.map((d) => ({
      kind: d.kind,
      iataCode: d.iataCode ?? undefined,
      countryCode: d.countryCode ?? undefined,
      label: d.label || d.iataCode || d.countryCode || "?",
    })) ?? [],
  );
  const [destMode, setDestMode] = useState<"COUNTRY" | "AIRPORT">("COUNTRY");
  const [destCountry, setDestCountry] = useState(countries[0]?.code ?? "");
  const [destAirportInput, setDestAirportInput] = useState("");

  const [budget, setBudget] = useState(
    initial?.budgetUsd != null ? String(initial.budgetUsd) : "",
  );
  const [patterns, setPatterns] = useState<Set<WeekendPatternKey>>(
    new Set(initial?.weekendPatterns ?? ["FRI_SUN"]),
  );
  const [weeksAhead, setWeeksAhead] = useState(
    String(initial?.weeksAhead ?? defaultWeeksAhead),
  );
  const [alertOnBudget, setAlertOnBudget] = useState(
    initial?.alertOnBudget ?? true,
  );
  const [alertOnPriceDrop, setAlertOnPriceDrop] = useState(
    initial?.alertOnPriceDrop ?? true,
  );
  const [email, setEmail] = useState(initial?.email ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<
    { type: "ok" | "err"; msg: string } | null
  >(null);

  function resolveIata(raw: string): string | null {
    const v = raw.trim().toUpperCase();
    if (!v) return null;
    if (airportByIata.has(v)) return v;
    // "JFK — New York" style paste
    const lead = v.slice(0, 3);
    if (airportByIata.has(lead)) return lead;
    if (/^[A-Z]{3}$/.test(v)) return v; // accept unknown-but-plausible code
    // try city match
    const byCity = airports.find((a) => a.city.toUpperCase() === v);
    return byCity?.iata ?? null;
  }

  function addOrigin() {
    const iata = resolveIata(originInput);
    if (!iata) {
      setStatus({ type: "err", msg: `Couldn't recognise "${originInput}"` });
      return;
    }
    setOrigins((cur) => (cur.includes(iata) ? cur : [...cur, iata]));
    setOriginInput("");
    setStatus(null);
  }

  function addDestination() {
    if (destMode === "COUNTRY") {
      if (!destCountry) return;
      const name = countries.find((c) => c.code === destCountry)?.name ?? destCountry;
      setDestinations((cur) =>
        cur.some((d) => d.kind === "COUNTRY" && d.countryCode === destCountry)
          ? cur
          : [...cur, { kind: "COUNTRY", countryCode: destCountry, label: name }],
      );
      setStatus(null);
    } else {
      const iata = resolveIata(destAirportInput);
      if (!iata) {
        setStatus({ type: "err", msg: `Couldn't recognise "${destAirportInput}"` });
        return;
      }
      const a = airportByIata.get(iata);
      const label = a ? `${a.city} (${a.iata})` : iata;
      setDestinations((cur) =>
        cur.some((d) => d.kind === "AIRPORT" && d.iataCode === iata)
          ? cur
          : [...cur, { kind: "AIRPORT", iataCode: iata, label }],
      );
      setDestAirportInput("");
      setStatus(null);
    }
  }

  function togglePattern(p: WeekendPatternKey) {
    setPatterns((cur) => {
      const next = new Set(cur);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  const canSubmit =
    origins.length > 0 &&
    destinations.length > 0 &&
    patterns.size > 0 &&
    (alertOnBudget || alertOnPriceDrop) &&
    Number(budget) > 0 &&
    /.+@.+\..+/.test(email) &&
    !submitting;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      const res = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          budgetUsd: Number(budget),
          weeksAhead: Number(weeksAhead),
          alertOnBudget,
          alertOnPriceDrop,
          weekendPatterns: [...patterns],
          origins,
          destinations: destinations.map((d) => ({
            kind: d.kind,
            iataCode: d.iataCode,
            countryCode: d.countryCode,
            label: d.label,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({
          type: "err",
          msg: data?.error ?? `Request failed (${res.status})`,
        });
      } else {
        setStatus({
          type: "ok",
          msg: "Saved. The next scan will pick up these settings.",
        });
      }
    } catch {
      setStatus({ type: "err", msg: "Network error — is the dev server running?" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <datalist id="airport-list">
        {airports.map((a) => (
          <option key={a.iata} value={a.iata}>
            {a.city} — {a.name} ({a.country})
          </option>
        ))}
      </datalist>

      {status && (
        <div
          className={`notice ${status.type === "ok" ? "notice-ok" : "notice-err"}`}
        >
          {status.msg}
        </div>
      )}

      <section className="card">
        <h2>1 · Origin airports</h2>
        <label htmlFor="origin">Where you&apos;d fly from</label>
        <p className="hint">Type an IATA code or city and pick from the list.</p>
        <div className="row">
          <input
            id="origin"
            type="text"
            list="airport-list"
            placeholder="JFK"
            value={originInput}
            onChange={(e) => setOriginInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addOrigin();
              }
            }}
          />
          <button type="button" className="btn" onClick={addOrigin}>
            Add
          </button>
        </div>
        <div className="chips">
          {origins.map((o) => {
            const a = airportByIata.get(o);
            return (
              <span key={o} className="chip">
                {a ? `${a.city} (${o})` : o}
                <button
                  type="button"
                  aria-label={`Remove ${o}`}
                  onClick={() =>
                    setOrigins((cur) => cur.filter((x) => x !== o))
                  }
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h2>2 · Wishlist destinations</h2>
        <div className="seg" role="group" aria-label="Destination type">
          <button
            type="button"
            aria-pressed={destMode === "COUNTRY"}
            onClick={() => setDestMode("COUNTRY")}
          >
            Whole country
          </button>
          <button
            type="button"
            aria-pressed={destMode === "AIRPORT"}
            onClick={() => setDestMode("AIRPORT")}
          >
            Specific city / airport
          </button>
        </div>

        {destMode === "COUNTRY" ? (
          <div className="row">
            <select
              aria-label="Country"
              value={destCountry}
              onChange={(e) => setDestCountry(e.target.value)}
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            <button type="button" className="btn" onClick={addDestination}>
              Add
            </button>
          </div>
        ) : (
          <div className="row">
            <input
              type="text"
              list="airport-list"
              placeholder="LIS"
              value={destAirportInput}
              onChange={(e) => setDestAirportInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addDestination();
                }
              }}
            />
            <button type="button" className="btn" onClick={addDestination}>
              Add
            </button>
          </div>
        )}

        <p className="hint">
          A country expands to its major airports (resolved once and cached).
        </p>
        <div className="chips">
          {destinations.map((d, i) => (
            <span key={`${d.kind}-${d.iataCode ?? d.countryCode}`} className="chip">
              {d.kind === "COUNTRY" ? `${d.label} · country` : d.label}
              <button
                type="button"
                aria-label={`Remove ${d.label}`}
                onClick={() =>
                  setDestinations((cur) => cur.filter((_, j) => j !== i))
                }
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>3 · Budget &amp; window</h2>
        <div className="two">
          <div className="field">
            <label htmlFor="budget">Round-trip budget (USD)</label>
            <p className="hint">Applies across the whole wishlist.</p>
            <input
              id="budget"
              type="number"
              min={1}
              step={10}
              placeholder="500"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="weeks">Weeks ahead to watch</label>
            <p className="hint">1–{MAX_WEEKS_AHEAD}. Default {defaultWeeksAhead}.</p>
            <input
              id="weeks"
              type="number"
              min={1}
              max={MAX_WEEKS_AHEAD}
              value={weeksAhead}
              onChange={(e) => setWeeksAhead(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="card">
        <h2>4 · Weekend patterns</h2>
        {WEEKEND_PATTERNS.map((p) => (
          <label key={p} className="check">
            <input
              type="checkbox"
              checked={patterns.has(p)}
              onChange={() => togglePattern(p)}
            />
            <span>
              <b>{WEEKEND_PATTERN_LABELS[p]}</b>
            </span>
          </label>
        ))}
      </section>

      <section className="card">
        <h2>5 · Alert types</h2>
        <label className="check">
          <input
            type="checkbox"
            checked={alertOnBudget}
            onChange={(e) => setAlertOnBudget(e.target.checked)}
          />
          <span>
            <b>Under my budget</b>
            <small>Email when a round-trip is at or below the budget above.</small>
          </span>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={alertOnPriceDrop}
            onChange={(e) => setAlertOnPriceDrop(e.target.checked)}
          />
          <span>
            <b>30%+ below average</b>
            <small>
              Email when a fare is ≤ 70% of the recent average for that
              route + weekend (needs a little price history first).
            </small>
          </span>
        </label>
      </section>

      <section className="card">
        <h2>6 · Where to email you</h2>
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </section>

      <button type="submit" className="btn-primary" disabled={!canSubmit}>
        {submitting ? "Saving…" : initial ? "Update preferences" : "Save preferences"}
      </button>
    </form>
  );
}
