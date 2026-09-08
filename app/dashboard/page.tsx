import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDashboard, type DashboardRow } from "@/lib/dashboard";
import { WEEKEND_PATTERN_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

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
function ago(iso: string | null): string {
  if (!iso) return "never";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function PriceCell({ row }: { row: DashboardRow }) {
  if (row.priceUsd === null) {
    return <span className="muted">—</span>;
  }
  return (
    <>
      <strong>${Math.round(row.priceUsd)}</strong>
      {row.currency !== "USD" && ` ${row.currency}`}
    </>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboard(user.id);

  if (!data.configured) {
    return (
      <div className="wrap">
        <h1>Dashboard</h1>
        <div className="notice notice-err">
          Your watch isn&apos;t set up yet. Add at least one origin, one
          destination, a budget, and a weekend pattern in{" "}
          <Link href="/settings">Settings</Link>.
        </div>
      </div>
    );
  }

  const { stats } = data;
  const shown = data.rows.slice(0, 80);

  return (
    <div className="wrap wrap-wide">
      <h1>Dashboard</h1>
      <p className="sub">
        Last price check: {ago(data.lastCheckedAt)}
        {!data.scanEnabled && " · scanning is paused"} ·{" "}
        <Link href="/settings">Settings</Link>
      </p>

      <div className="statgrid">
        <div className="stat">
          <span className="stat-num">
            {stats.cheapest ? `$${Math.round(stats.cheapest.priceUsd ?? 0)}` : "—"}
          </span>
          <span className="stat-label">
            {stats.cheapest
              ? `cheapest now — ${stats.cheapest.destLabel}`
              : "no prices yet"}
          </span>
        </div>
        <div className="stat">
          <span className="stat-num">{stats.underBudget}</span>
          <span className="stat-label">weekends under ${data.budgetUsd}</span>
        </div>
        <div className="stat">
          <span className="stat-num">
            {stats.pricedRoutes}/{stats.routesWatched}
          </span>
          <span className="stat-label">route-weekends priced</span>
        </div>
        <div className="stat">
          <span className="stat-num">{stats.dealsLast7Days}</span>
          <span className="stat-label">alerts sent (7d)</span>
        </div>
      </div>

      {stats.pricedRoutes === 0 ? (
        <div className="notice notice-ok">
          No prices yet — the first scan runs within 6 hours of setup (or run{" "}
          <code>npm run scan</code> now).
        </div>
      ) : (
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
              {shown.map((row) => (
                <tr
                  key={`${row.originIata}-${row.destIata}-${row.departDate}`}
                  className={row.underBudget ? "hit" : undefined}
                >
                  <td>
                    <strong>
                      {row.originIata} → {row.destIata}
                    </strong>
                    <span className="muted"> {row.destLabel}</span>
                  </td>
                  <td>
                    {fmtRange(row.departDate, row.returnDate)}
                    <span className="muted">
                      {" "}
                      · {WEEKEND_PATTERN_LABELS[row.weekendPattern]}
                    </span>
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
                    >
                      search ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.rows.length > shown.length && (
            <p className="hint">
              Showing the {shown.length} cheapest of {data.rows.length}{" "}
              route-weekends.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
