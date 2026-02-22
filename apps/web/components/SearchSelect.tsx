"use client";

import { useMemo, useRef, useState } from "react";

export type SearchItem = { id: string; label: string; sublabel?: string };

export default function SearchSelect({
  label,
  placeholder,
  items,
  valueId,
  onChange,
}: {
  label: string;
  placeholder: string;
  items: SearchItem[];
  valueId: string | null;
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(() => items.find((x) => x.id === valueId) ?? null, [items, valueId]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((x) => x.label.toLowerCase().includes(s) || (x.sublabel ?? "").toLowerCase().includes(s));
  }, [q, items]);

  return (
    <div ref={wrapRef} className="col" style={{ gap: 8, position: "relative" }}>
      <div className="muted" style={{ fontSize: 12 }}>{label}</div>

      <button
        type="button"
        className="btn"
        style={{ width: "100%", textAlign: "left", justifyContent: "space-between", display: "flex" }}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <span className="faint">⌄</span>
      </button>

      {open && (
        <div
          className="card"
          style={{
            position: "absolute",
            top: 66,
            left: 0,
            right: 0,
            zIndex: 30,
            padding: 10,
            borderRadius: 18,
          }}
        >
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            autoFocus
          />

          <div style={{ maxHeight: 240, overflow: "auto", marginTop: 10 }} className="col">
            <button
              type="button"
              className="btn"
              onClick={() => { onChange(null); setOpen(false); setQ(""); }}
            >
              (No category)
            </button>

            {filtered.map((x) => (
              <button
                key={x.id}
                type="button"
                className="btn"
                onClick={() => { onChange(x.id); setOpen(false); setQ(""); }}
                style={{ textAlign: "left" }}
              >
                <div style={{ fontWeight: 700 }}>{x.label}</div>
                {x.sublabel ? <div className="faint" style={{ fontSize: 12 }}>{x.sublabel}</div> : null}
              </button>
            ))}

            {filtered.length === 0 ? (
              <div className="toast"><span className="muted">No matches.</span></div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
