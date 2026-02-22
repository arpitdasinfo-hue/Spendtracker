"use client";

import type { CurrencyCode } from "@/lib/currency";
import { formatMoney } from "@/lib/money";

export default function MiniRing({
  value,
  total,
  title,
  symbol = "₹",
  currencyCode,
}: {
  value: number;
  total: number;
  title: string;
  symbol?: string;
  currencyCode?: CurrencyCode;
}) {
  const pct = total > 0 ? Math.min(100, Math.max(0, (value / total) * 100)) : 0;
  const danger = pct >= 90;
  const fmt = (n: number) =>
    currencyCode
      ? formatMoney(n, currencyCode, "en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
      : `${symbol}${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  return (
    <div className="card" style={{ padding: 12, borderRadius: 18 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 750 }}>{title}</div>
          <div className="faint" style={{ fontSize: 12, marginTop: 4 }}>
            {fmt(value)} / {fmt(total)}
          </div>
        </div>
        <span className={`badge ${danger ? "badgeBad" : "badgeGood"}`}>{Math.round(pct)}%</span>
      </div>

      <div style={{ marginTop: 10, height: 10, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: danger ? "rgba(251,113,133,.9)" : "rgba(34,211,238,.9)",
          }}
        />
      </div>
    </div>
  );
}
