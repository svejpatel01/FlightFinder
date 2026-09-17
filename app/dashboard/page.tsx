import { getStaticDashboardRows } from "@/lib/dummyData";
import DashboardTable from "./dashboard-table";

export default function DashboardPage() {
  const rows = getStaticDashboardRows();
  const priced = rows.filter((r) => r.priceUsd !== null);
  const cheapest = priced[0] ?? null;
  const deals = rows.filter((r) => r.underBudget).length;

  return (
    <div className="wrap wrap-wide">
      <p className="kicker-tag">notiflyer · weekend watch</p>
      <h1>Dashboard</h1>
      <p className="sub">
        Weekend flight deals between a handful of sample routes. Click a row
        to see its (sample) price trend.
      </p>

      <div className="statgrid">
        <div className="stat">
          <span className="stat-num">
            {cheapest ? `$${Math.round(cheapest.priceUsd ?? 0)}` : "—"}
          </span>
          <span className="stat-label">
            {cheapest ? `cheapest shown — ${cheapest.destLabel}` : "no sample prices"}
          </span>
        </div>
        <div className="stat">
          <span className="stat-num">{deals}</span>
          <span className="stat-label">flagged as notable deals</span>
        </div>
        <div className="stat">
          <span className="stat-num">{rows.length}</span>
          <span className="stat-label">sample route-weekends</span>
        </div>
        <div className="stat">
          <span className="stat-num">$0</span>
          <span className="stat-label">spent on flight data</span>
        </div>
      </div>

      <p className="hint" style={{ marginBottom: 8 }}>
        Click a row to see that flight&apos;s (sample) price over time.
      </p>
      <DashboardTable rows={rows} totalRows={rows.length} budgetUsd={0} />
    </div>
  );
}
