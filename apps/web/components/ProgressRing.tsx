"use client";

import { useEffect, useState } from "react";
import type { CurrencyCode } from "@/lib/currency";
import { formatMoney } from "@/lib/money";

export default function ProgressRing({
  value,
  total,
  label,
  symbol = "₹",
  currencyCode,
}: {
  value: number;
  total: number;
  label?: string;
  symbol?: string;
  currencyCode?: CurrencyCode;
}) {
  const pct = total > 0 ? Math.min(100, Math.max(0, (value / total) * 100)) : 0;
  const isOver = pct >= 100;

  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimated(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);

  const size = 104;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (animated / 100) * circumference;

  const fillColor = isOver ? "rgba(244,63,94,.9)" : "rgba(34,211,238,.88)";
  const fillGlow = isOver
    ? "drop-shadow(0 0 6px rgba(244,63,94,.55))"
    : "drop-shadow(0 0 6px rgba(34,211,238,.45))";

  const fmt = (n: number) =>
    currencyCode
      ? formatMoney(n, currencyCode, "en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
      : `${symbol}${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  return (
    <div className="row" style={{ gap: 16, alignItems: "center" }}>
      {/* SVG Ring */}
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <svg
          width={size}
          height={size}
          aria-label="Budget progress ring"
          style={{ transform: "rotate(-90deg)", filter: fillGlow }}
        >
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,.06)"
            strokeWidth={stroke}
          />
          {/* Fill */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={fillColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 900ms cubic-bezier(.22,1,.36,1), stroke 400ms ease",
            }}
          />
        </svg>

        {/* Center label */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
          }}
        >
          <div
            className="money"
            style={{
              fontWeight: 800,
              fontSize: 15,
              color: isOver ? "var(--badLight)" : "var(--text)",
              transition: "color 400ms ease",
            }}
          >
            {Math.round(pct)}%
          </div>
        </div>
      </div>

      {/* Text */}
      <div>
        <div className="muted" style={{ fontSize: 12, fontWeight: 500 }}>
          {label ?? "Monthly budget used"}
        </div>
        <div className="money" style={{ fontWeight: 800, marginTop: 5, fontSize: 15 }}>
          {fmt(value)}{" "}
          <span className="faint" style={{ fontWeight: 400, fontSize: 12 }}>
            / {fmt(total)}
          </span>
        </div>
        <div
          style={{
            marginTop: 5,
            fontSize: 12,
            fontWeight: 600,
            color: isOver ? "var(--badLight)" : "var(--goodLight)",
            transition: "color 400ms ease",
          }}
        >
          {isOver
            ? `Over by ${fmt(value - total)}`
            : `${fmt(Math.max(0, total - value))} remaining`}
        </div>
      </div>
    </div>
  );
}
