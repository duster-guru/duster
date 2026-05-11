import { useMemo } from "react";

/**
 * Compact portfolio distribution: a horizontal stacked bar (one segment
 * per top holding) plus a legend with symbol, USD value and percentage.
 *
 * Top-5 logic:
 *   - Take the 5 holdings with the highest USD value.
 *   - Aggregate the rest into a single "Other" bucket (skipped if there
 *     are <=5 holdings total, to avoid a useless 0% Other row).
 *
 * Accepts the same `holdings` shape that `useDustScan` exposes.
 */
export default function PortfolioChart({ holdings, totalUsd }) {
  const segments = useMemo(() => {
    if (!holdings?.length || !totalUsd) return [];
    const sorted = [...holdings].sort((a, b) => b.valueUsd - a.valueUsd);
    const top = sorted.slice(0, 5);
    const rest = sorted.slice(5);
    const restUsd = rest.reduce((s, h) => s + h.valueUsd, 0);
    const out = top.map((h) => ({
      key: h.mint,
      symbol: h.symbol,
      logoURI: h.logoURI,
      color: h.color,
      valueUsd: h.valueUsd,
      pct: totalUsd > 0 ? (h.valueUsd / totalUsd) * 100 : 0,
    }));
    if (restUsd > 0) {
      out.push({
        key: "__other__",
        symbol: `Other (${rest.length})`,
        logoURI: null,
        color: "#5A6175",
        valueUsd: restUsd,
        pct: (restUsd / totalUsd) * 100,
      });
    }
    return out;
  }, [holdings, totalUsd]);

  if (segments.length === 0) return null;

  return (
    <div className="flex flex-col gap-2.5">
      {/* Horizontal stacked bar. Min-width ensures tiny slices stay visible. */}
      <div className="flex h-2 w-full rounded-full overflow-hidden bg-white/5">
        {segments.map((s) => (
          <div
            key={s.key}
            className="h-full"
            style={{
              width: `${Math.max(2, s.pct)}%`,
              background: s.color,
            }}
            title={`${s.symbol} · ${s.pct.toFixed(1)}%`}
          />
        ))}
      </div>

      {/* Legend rows: dot, symbol, USD value, percent. */}
      <ul className="flex flex-col gap-1.5">
        {segments.map((s) => (
          <li
            key={s.key}
            className="flex items-center gap-2 text-[12px]"
          >
            {s.logoURI ? (
              <img
                src={s.logoURI}
                alt=""
                className="w-4 h-4 rounded-full"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            ) : (
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: s.color }}
              />
            )}
            <span className="font-display font-semibold text-text-primary truncate flex-1">
              {s.symbol}
            </span>
            <span className="font-mono tabular-nums text-text-secondary">
              ${s.valueUsd < 0.01 ? "<0.01" : s.valueUsd.toFixed(2)}
            </span>
            <span className="font-mono tabular-nums text-text-muted w-12 text-right">
              {s.pct.toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
