"use client";

export default function ProgressRing({
  value,
  total,
  label,
}: {
  value: number;
  total: number;
  label?: string;
}) {
  const pct = total > 0 ? Math.min(100, Math.max(0, (value / total) * 100)) : 0;

  return (
    <div className="row" style={{ gap: 14, alignItems: "center" }}>
      <div
        aria-label="Budget progress ring"
        style={{
          width: 92,
          height: 92,
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,.10)",
          background: `conic-gradient(var(--neonB) ${pct}%, rgba(255,255,255,.08) 0)`,
          display: "grid",
          placeItems: "center",
          boxShadow: "0 10px 30px rgba(0,0,0,.45)",
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 999,
            background: "rgba(10,12,26,.72)",
            border: "1px solid rgba(255,255,255,.10)",
            display: "grid",
            placeItems: "center",
            backdropFilter: "blur(10px)",
          }}
        >
          <div className="money" style={{ fontWeight: 850, fontSize: 14 }}>
            {Math.round(pct)}%
          </div>
        </div>
      </div>

      <div>
        <div className="muted" style={{ fontSize: 12 }}>
          {label ?? "Monthly budget used"}
        </div>
        <div className="money" style={{ fontWeight: 850, marginTop: 6 }}>
          ₹{value.toLocaleString("en-IN", { maximumFractionDigits: 0 })} / ₹
          {total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
        </div>
        <div className="faint" style={{ fontSize: 12, marginTop: 6 }}>
          Remaining: ₹
          {Math.max(0, total - value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
        </div>
      </div>
    </div>
  );
}
