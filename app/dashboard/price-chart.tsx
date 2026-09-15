"use client";

interface Point {
  checkedAt: string;
  priceUsd: number;
  currency: string;
}

interface Props {
  points: Point[];
  budgetUsd: number;
  averageUsd: number | null;
}

const W = 640;
const H = 260;
const PAD = { l: 56, r: 16, t: 16, b: 32 };
const PLOT_W = W - PAD.l - PAD.r;
const PLOT_H = H - PAD.t - PAD.b;

const AXIS_DFMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});
const TIP_DFMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default function PriceChart({ points, budgetUsd, averageUsd }: Props) {
  if (points.length === 0) {
    return (
      <p className="hint">
        No price history yet for this exact flight — check back after the next
        scan.
      </p>
    );
  }

  const latest = points[points.length - 1];

  if (points.length === 1) {
    return (
      <p className="hint">
        Only one price recorded so far —{" "}
        <strong>
          ${Math.round(latest.priceUsd)} {latest.currency !== "USD" && latest.currency}
        </strong>{" "}
        on {TIP_DFMT.format(new Date(latest.checkedAt))}. The chart fills in as
        more scans run.
      </p>
    );
  }

  const times = points.map((p) => new Date(p.checkedAt).getTime());
  const prices = points.map((p) => p.priceUsd);
  const refValues = [...prices, budgetUsd, ...(averageUsd != null ? [averageUsd] : [])];
  const minPrice = Math.min(...refValues);
  const maxPrice = Math.max(...refValues);
  const priceRange = maxPrice - minPrice || Math.max(1, minPrice * 0.1);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const timeRange = maxTime - minTime || 1;

  const x = (t: number) => PAD.l + ((t - minTime) / timeRange) * PLOT_W;
  const y = (v: number) =>
    PAD.t + (1 - (v - minPrice + priceRange * 0.08) / (priceRange * 1.16)) * PLOT_H;

  const coords = points.map((p) => ({
    ...p,
    cx: x(new Date(p.checkedAt).getTime()),
    cy: y(p.priceUsd),
  }));
  const path = coords.map((c) => `${c.cx.toFixed(1)},${c.cy.toFixed(1)}`).join(" L");

  const cheapest = coords.reduce((min, c) => (c.priceUsd < min.priceUsd ? c : min), coords[0]);

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="price-chart"
        role="img"
        aria-label="Price over time"
      >
        {/* y gridlines + labels */}
        {[minPrice, (minPrice + maxPrice) / 2, maxPrice].map((v, i) => (
          <g key={i}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(v)}
              y2={y(v)}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <text x={PAD.l - 8} y={y(v)} textAnchor="end" dominantBaseline="middle" className="chart-label">
              ${Math.round(v)}
            </text>
          </g>
        ))}

        {/* x labels: first / last */}
        <text x={x(minTime)} y={H - 10} textAnchor="start" className="chart-label">
          {AXIS_DFMT.format(new Date(minTime))}
        </text>
        <text x={x(maxTime)} y={H - 10} textAnchor="end" className="chart-label">
          {AXIS_DFMT.format(new Date(maxTime))}
        </text>

        {/* average reference line */}
        {averageUsd != null && (
          <line
            x1={PAD.l}
            x2={W - PAD.r}
            y1={y(averageUsd)}
            y2={y(averageUsd)}
            stroke="var(--muted)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        )}

        {/* budget reference line */}
        {budgetUsd > 0 && (
          <line
            x1={PAD.l}
            x2={W - PAD.r}
            y1={y(budgetUsd)}
            y2={y(budgetUsd)}
            stroke="var(--ok)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        )}

        {/* price line */}
        <path d={`M${path}`} fill="none" stroke="var(--accent)" strokeWidth={2} />

        {/* points */}
        {coords.map((c, i) => (
          <circle
            key={i}
            cx={c.cx}
            cy={c.cy}
            r={c === cheapest ? 5 : 3}
            fill={c === cheapest ? "var(--ok)" : "var(--accent)"}
            stroke="var(--card)"
            strokeWidth={1.5}
          >
            <title>
              ${Math.round(c.priceUsd)} {c.currency !== "USD" && c.currency} —{" "}
              {TIP_DFMT.format(new Date(c.checkedAt))}
            </title>
          </circle>
        ))}
      </svg>

      <div className="chart-legend">
        <span>
          <i className="dot" style={{ background: "var(--accent)" }} /> price
        </span>
        <span>
          <i className="dot" style={{ background: "var(--ok)" }} /> cheapest seen
          {" · $"}
          {Math.round(cheapest.priceUsd)}
        </span>
        {averageUsd != null && (
          <span>
            <i className="dash" style={{ background: "var(--muted)" }} /> route
            average · ${Math.round(averageUsd)}
          </span>
        )}
        {budgetUsd > 0 && (
          <span>
            <i className="dash" style={{ background: "var(--ok)" }} /> your budget
            · ${Math.round(budgetUsd)}
          </span>
        )}
      </div>
    </div>
  );
}
