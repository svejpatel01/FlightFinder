"use client";

import { useEffect, useState } from "react";
import type { DashboardRow } from "@/lib/dashboard";
import { WEEKEND_PATTERN_LABELS } from "@/lib/constants";
import PriceChart from "./price-chart";

interface Props {
  rows: DashboardRow[];
  totalRows: number;
  budgetUsd: number;
}

interface HistoryResponse {
  points: { checkedAt: string; priceUsd: number; currency: string }[];
  budgetUsd: number;
  averageUsd: number | null;
}

type FetchResult =
  | { key: string; status: "ok"; data: HistoryResponse }
  | { key: string; status: "error" };

function rowKey(row: DashboardRow): string {
  return `${row.originIata}|${row.destIata}|${row.departDate}|${row.returnDate}`;
}

const DFMT = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
function fmtDate(iso: string) {
  return DFMT.format(new Date(`${iso}T00:00:00Z`));
}
function fmtRange(d: string, r: string) {
  return `${fmtDate(d)} – ${fmtDate(r)}`;
}

function PriceCell({ row }: { row: DashboardRow }) {
  if (row.priceUsd === null) return <span className="muted">—</span>;
  return (
    <>
      <strong>${Math.round(row.priceUsd)}</strong>
      {row.currency !== "USD" && ` ${row.currency}`}
    </>
  );
}

export default function DashboardTable({ rows, totalRows, budgetUsd }: Props) {
  const [selected, setSelected] = useState<DashboardRow | null>(null);
  const [result, setResult] = useState<FetchResult | null>(null);

  const selectedKey = selected ? rowKey(selected) : null;
  const loading = selected !== null && result?.key !== selectedKey;
  const error =
    selected !== null && result?.key === selectedKey && result.status === "error";
  const history =
    selected !== null && result?.key === selectedKey && result.status === "ok"
      ? result.data
      : null;

  useEffect(() => {
    if (!selected) return;
    const key = rowKey(selected);
    let cancelled = false;

    const params = new URLSearchParams({
      origin: selected.originIata,
      dest: selected.destIata,
      departDate: selected.departDate,
      returnDate: selected.returnDate,
      weekendPattern: selected.weekendPattern,
    });

    fetch(`/api/price-history?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        return res.json();
      })
      .then((data: HistoryResponse) => {
        if (!cancelled) setResult({ key, status: "ok", data });
      })
      .catch(() => {
        if (!cancelled) setResult({ key, status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelected(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return (
    <>
      <div className="tablewrap">
        <table className="grid">
          <thead>
            <tr>
              <th>Route</th>
              <th>Weekend</th>
              <th className="r">Price</th>
              <th className="r">vs avg</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${row.originIata}-${row.destIata}-${row.departDate}`}
                className={`clickable${row.underBudget ? " hit" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(row)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(row);
                  }
                }}
              >
                <td>
                  <strong>
                    {row.originIata} → {row.destIata}
                  </strong>
                  <span className="muted"> {row.destLabel}</span>
                </td>
                <td>
                  {fmtRange(row.departDate, row.returnDate)}
                  <span className="muted"> · {WEEKEND_PATTERN_LABELS[row.weekendPattern]}</span>
                </td>
                <td className="r">
                  <PriceCell row={row} />
                </td>
                <td className="r">
                  {row.pctVsAvg === null ? (
                    <span className="muted">—</span>
                  ) : (
                    <span className={row.pctVsAvg < 0 ? "down" : "up"}>
                      {row.pctVsAvg < 0 ? "" : "+"}
                      {row.pctVsAvg}%
                    </span>
                  )}
                </td>
                <td className="r">
                  <a
                    href={row.googleFlightsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    search ↗
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalRows > rows.length && (
          <p className="hint">
            Showing the {rows.length} cheapest of {totalRows} route-weekends.
          </p>
        )}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="Price history"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <strong>
                  {selected.originIata} → {selected.destIata}
                </strong>
                <span className="muted"> {selected.destLabel}</span>
                <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                  {fmtRange(selected.departDate, selected.returnDate)} ·{" "}
                  {WEEKEND_PATTERN_LABELS[selected.weekendPattern]}
                </div>
              </div>
              <button
                type="button"
                className="modal-close"
                aria-label="Close"
                onClick={() => setSelected(null)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              {loading && <p className="hint">Loading price history…</p>}
              {error && (
                <div className="notice notice-err">Couldn&apos;t load price history.</div>
              )}
              {history && !loading && !error && (
                <PriceChart
                  points={history.points}
                  budgetUsd={history.budgetUsd ?? budgetUsd}
                  averageUsd={history.averageUsd}
                />
              )}
            </div>

            <a
              className="btn"
              style={{ display: "inline-block", width: "auto" }}
              href={selected.googleFlightsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Search on Google Flights ↗
            </a>
          </div>
        </div>
      )}
    </>
  );
}
