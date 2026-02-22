"use client";

const TAGS = [
  { id: "personal", label: "Personal" },
  { id: "official", label: "Official" },
  { id: "receivable", label: "Receivable" },
  { id: "payable", label: "Payable" },
] as const;

export type TxnTag = typeof TAGS[number]["id"];

export default function TagChips({
  value,
  onChange,
}: {
  value: TxnTag;
  onChange: (v: TxnTag) => void;
}) {
  return (
    <div className="col" style={{ gap: 8 }}>
      <div className="muted" style={{ fontSize: 12 }}>Tag</div>
      <div className="row" style={{ flexWrap: "wrap" }}>
        {TAGS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`btn ${value === t.id ? "btnPrimary" : ""}`}
            onClick={() => onChange(t.id)}
            style={{ padding: "10px 12px" }}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
