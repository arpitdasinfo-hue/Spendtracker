"use client";

import { useMemo } from "react";

export type AmountMode = "any" | "gt" | "lt" | "between";
export type DateMode = "any" | "this_week" | "this_month" | "custom";
export type DirectionMode = "any" | "expense" | "income";
export type TxnTag = "personal" | "official" | "receivable" | "payable";
export type Channel = "upi" | "card" | "netbanking" | "cash" | "other";

export type TxnFilters = {
  amountMode: AmountMode;
  amountGt: string;
  amountLt: string;
  amountMin: string;
  amountMax: string;

  channels: Channel[];
  tags: TxnTag[];
  direction: DirectionMode;

  dateMode: DateMode;
  dateFrom: string; // yyyy-mm-dd
  dateTo: string;   // yyyy-mm-dd
};

const TAGS: { id: TxnTag; label: string }[] = [
  { id: "personal", label: "Personal" },
  { id: "official", label: "Official" },
  { id: "receivable", label: "Receivable" },
  { id: "payable", label: "Payable" },
];

const CHANNELS: { id: Channel; label: string }[] = [
  { id: "upi", label: "UPI" },
  { id: "card", label: "Card" },
  { id: "netbanking", label: "Netbanking" },
  { id: "cash", label: "Cash" },
  { id: "other", label: "Other" },
];

export function countActiveFilters(f: TxnFilters) {
  let n = 0;
  if (f.amountMode !== "any") n++;
  if (f.channels.length) n++;
  if (f.tags.length) n++;
  if (f.direction !== "any") n++;
  if (f.dateMode !== "any") n++;
  return n;
}

function toggleInArray<T extends string>(arr: T[], v: T) {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

export default function TxnFilterModal({
  open,
  onClose,
  filters,
  onChange,
  onClear,
  onApply,
  currencySymbol = "₹",
}: {
  open: boolean;
  onClose: () => void;
  filters: TxnFilters;
  onChange: (next: TxnFilters) => void;
  onClear: () => void;
  onApply: () => void;
  currencySymbol?: string;
}) {
  const f = filters;

  const amountHint = useMemo(() => {
    if (f.amountMode === "gt") return `More than (${currencySymbol})`;
    if (f.amountMode === "lt") return `Less than (${currencySymbol})`;
    if (f.amountMode === "between") return `Between (${currencySymbol})`;
    return `Any amount`;
  }, [f.amountMode, currencySymbol]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,.55)",
        backdropFilter: "blur(10px)",
        display: "grid",
        placeItems: "center",
        padding: 12,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* PANEL: scrollable body + sticky footer */}
      <div
        className="card"
        style={{
          width: "min(760px, 100%)",
          maxHeight: "92vh",
          borderRadius: 22,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header (sticky) */}
        <div
          style={{
            padding: 16,
            borderBottom: "1px solid rgba(255,255,255,.08)",
            position: "sticky",
            top: 0,
            background: "rgba(10,12,24,.72)",
            backdropFilter: "blur(14px)",
            zIndex: 2,
          }}
        >
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <div className="pill">
                <span>⛭</span>
                <span className="muted">Filters</span>
                <span className="kbd">{countActiveFilters(f)}</span>
              </div>
              <div className="faint" style={{ fontSize: 12, marginTop: 8 }}>
                Narrow down transactions instantly.
              </div>
            </div>

            <button className="btn" onClick={onClose} type="button">
              Close
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div
          style={{
            padding: 16,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {/* Amount */}
          <div className="card" style={{ padding: 12, borderRadius: 18 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div style={{ fontWeight: 800 }}>Amount</div>
              <span className="badge">{amountHint}</span>
            </div>

            <div className="row" style={{ marginTop: 10, flexWrap: "wrap" }}>
              {[
                { id: "any", label: "Any" },
                { id: "gt", label: "More than" },
                { id: "lt", label: "Less than" },
                { id: "between", label: "Between" },
              ].map((x) => (
                <button
                  key={x.id}
                  type="button"
                  className={`btn ${f.amountMode === (x.id as any) ? "btnPrimary" : ""}`}
                  onClick={() =>
                    onChange({
                      ...f,
                      amountMode: x.id as any,
                      amountGt: "",
                      amountLt: "",
                      amountMin: "",
                      amountMax: "",
                    })
                  }
                >
                  {x.label}
                </button>
              ))}
            </div>

            {f.amountMode === "gt" && (
              <div style={{ marginTop: 10 }}>
                <input
                  className="input money"
                  placeholder={`e.g. ${currencySymbol}500`}
                  value={f.amountGt}
                  inputMode="decimal"
                  onChange={(e) => onChange({ ...f, amountGt: e.target.value })}
                />
              </div>
            )}

            {f.amountMode === "lt" && (
              <div style={{ marginTop: 10 }}>
                <input
                  className="input money"
                  placeholder={`e.g. ${currencySymbol}1000`}
                  value={f.amountLt}
                  inputMode="decimal"
                  onChange={(e) => onChange({ ...f, amountLt: e.target.value })}
                />
              </div>
            )}

            {f.amountMode === "between" && (
              <div className="row" style={{ marginTop: 10 }}>
                <input
                  className="input money"
                  placeholder={`Min (${currencySymbol})`}
                  value={f.amountMin}
                  inputMode="decimal"
                  onChange={(e) => onChange({ ...f, amountMin: e.target.value })}
                />
                <input
                  className="input money"
                  placeholder={`Max (${currencySymbol})`}
                  value={f.amountMax}
                  inputMode="decimal"
                  onChange={(e) => onChange({ ...f, amountMax: e.target.value })}
                />
              </div>
            )}
          </div>

          <div style={{ height: 12 }} />

          {/* Channel */}
          <div className="card" style={{ padding: 12, borderRadius: 18 }}>
            <div style={{ fontWeight: 800 }}>Payment channel</div>
            <div className="row" style={{ marginTop: 10, flexWrap: "wrap" }}>
              {CHANNELS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`btn ${f.channels.includes(c.id) ? "btnPrimary" : ""}`}
                  onClick={() => onChange({ ...f, channels: toggleInArray(f.channels, c.id) })}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="faint" style={{ fontSize: 12, marginTop: 8 }}>
              Filters by payment method channel (UPI/Card/Netbanking/Cash/Other).
            </div>
          </div>

          <div style={{ height: 12 }} />

          {/* Tags */}
          <div className="card" style={{ padding: 12, borderRadius: 18 }}>
            <div style={{ fontWeight: 800 }}>Tag</div>
            <div className="row" style={{ marginTop: 10, flexWrap: "wrap" }}>
              {TAGS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`btn ${f.tags.includes(t.id) ? "btnPrimary" : ""}`}
                  onClick={() => onChange({ ...f, tags: toggleInArray(f.tags, t.id) })}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ height: 12 }} />

          {/* Direction */}
          <div className="card" style={{ padding: 12, borderRadius: 18 }}>
            <div style={{ fontWeight: 800 }}>Direction</div>
            <div className="row" style={{ marginTop: 10, flexWrap: "wrap" }}>
              {[
                { id: "any", label: "Any" },
                { id: "expense", label: "Expense" },
                { id: "income", label: "Income" },
              ].map((x) => (
                <button
                  key={x.id}
                  type="button"
                  className={`btn ${f.direction === (x.id as any) ? "btnPrimary" : ""}`}
                  onClick={() => onChange({ ...f, direction: x.id as any })}
                >
                  {x.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ height: 12 }} />

          {/* Date Range */}
          <div className="card" style={{ padding: 12, borderRadius: 18 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div style={{ fontWeight: 800 }}>Date range</div>
              <span className="badge">{f.dateMode.replaceAll("_", " ")}</span>
            </div>

            <div className="row" style={{ marginTop: 10, flexWrap: "wrap" }}>
              {[
                { id: "any", label: "Any" },
                { id: "this_week", label: "This week" },
                { id: "this_month", label: "This month" },
                { id: "custom", label: "Custom" },
              ].map((x) => (
                <button
                  key={x.id}
                  type="button"
                  className={`btn ${f.dateMode === (x.id as any) ? "btnPrimary" : ""}`}
                  onClick={() =>
                    onChange({
                      ...f,
                      dateMode: x.id as any,
                      dateFrom: "",
                      dateTo: "",
                    })
                  }
                >
                  {x.label}
                </button>
              ))}
            </div>

            {f.dateMode === "custom" && (
              <div className="row" style={{ marginTop: 10 }}>
                <input
                  className="input"
                  type="date"
                  value={f.dateFrom}
                  onChange={(e) => onChange({ ...f, dateFrom: e.target.value })}
                />
                <input
                  className="input"
                  type="date"
                  value={f.dateTo}
                  onChange={(e) => onChange({ ...f, dateTo: e.target.value })}
                />
              </div>
            )}

            <div className="faint" style={{ fontSize: 12, marginTop: 8 }}>
              Custom uses From/To dates (inclusive).
            </div>
          </div>

          {/* breathing room so last card doesn't hide under sticky footer */}
          <div style={{ height: 90 }} />
        </div>

        {/* Sticky footer (always visible) */}
        <div
          style={{
            padding: 16,
            borderTop: "1px solid rgba(255,255,255,.08)",
            position: "sticky",
            bottom: 0,
            background: "rgba(10,12,24,.78)",
            backdropFilter: "blur(14px)",
            zIndex: 2,
          }}
        >
          <div className="row" style={{ justifyContent: "space-between" }}>
            <button className="btn" onClick={onClear} type="button">
              Clear all
            </button>
            <button className="btn btnPrimary" onClick={onApply} type="button">
              Apply filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
