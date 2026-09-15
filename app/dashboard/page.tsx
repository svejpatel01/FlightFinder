import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDashboard } from "@/lib/dashboard";
import DashboardTable from "./dashboard-table";

export const dynamic = "force-dynamic";

function ago(iso: string | null): string {
  if (!iso) return "never";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
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
        <>
          <p className="hint" style={{ marginBottom: 8 }}>
            Click a row to see that flight&apos;s price over time.
          </p>
          <DashboardTable rows={shown} totalRows={data.rows.length} budgetUsd={data.budgetUsd} />
        </>
      )}
    </div>
  );
}
