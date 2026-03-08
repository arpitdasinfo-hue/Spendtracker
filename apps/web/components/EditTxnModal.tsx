"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import SearchSelect, { SearchItem } from "@/components/SearchSelect";
import { useCurrencySymbol } from "@/lib/useCurrency";
import TagChips, { TxnTag } from "@/components/TagChips";

export type EditableTxn = {
  id: string;
  direction: "expense" | "income";
  amount: number | null;
  note: string;
  category_id: string | null;
  payment_method_id: string | null;
  tag: TxnTag | null;
};

export default function EditTxnModal({
  txn,
  onClose,
  onSaved,
  onDeleted,
}: {
  txn: EditableTxn | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const supabase = createSupabaseBrowserClient();
  const { sym } = useCurrencySymbol();

  const [direction, setDirection] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [tag, setTag] = useState<TxnTag>("personal");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);

  const [categories, setCategories] = useState<SearchItem[]>([]);
  const [methods, setMethods] = useState<SearchItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Populate form when txn changes
  useEffect(() => {
    if (!txn) return;
    setDirection(txn.direction);
    setAmount(String(txn.amount ?? ""));
    setNote(txn.note ?? "");
    setTag(txn.tag ?? "personal");
    setCategoryId(txn.category_id);
    setPaymentMethodId(txn.payment_method_id);
    setDelConfirm(false);
    setMsg(null);
  }, [txn]);

  // Load dropdowns once on mount
  useEffect(() => {
    (async () => {
      const { data: c } = await supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name", { ascending: true });
      setCategories((c ?? []).map((x: any) => ({ id: x.id, label: x.name })));

      const { data: m } = await supabase
        .from("payment_methods")
        .select("id, name, channel, payment_type")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      setMethods(
        (m ?? []).map((x: any) => ({
          id: x.id,
          label: x.name,
          sublabel: `${x.payment_type ?? ""} · ${x.channel}`.trim(),
        }))
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    if (!txn) return;
    setMsg(null);
    setLoading(true);

    const amt = Number(amount);
    if (!amt || Number.isNaN(amt) || amt <= 0) {
      setLoading(false);
      return setMsg(`Enter a valid amount (e.g. ${sym}250).`);
    }

    const { error } = await supabase
      .from("transactions")
      .update({
        direction,
        amount: amt,
        note: (note || direction).slice(0, 80),
        category_id: categoryId,
        payment_method_id: paymentMethodId,
        tag,
      })
      .eq("id", txn.id);

    setLoading(false);
    if (error) return setMsg(error.message);
    onSaved();
  }

  async function deleteTxn() {
    if (!txn) return;
    setLoading(true);
    const { error } = await supabase.from("transactions").delete().eq("id", txn.id);
    setLoading(false);
    if (error) return setMsg(error.message);
    onDeleted();
  }

  if (!txn) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,.58)",
        backdropFilter: "blur(10px)",
        display: "grid",
        placeItems: "center",
        padding: 12,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: "min(520px, 100%)",
          maxHeight: "92vh",
          borderRadius: 22,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: 16,
            borderBottom: "1px solid rgba(255,255,255,.08)",
            background: "rgba(10,12,24,.75)",
            backdropFilter: "blur(14px)",
          }}
        >
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="pill">
              <span>✎</span>
              <span className="muted">Edit transaction</span>
            </div>
            <button className="btn" onClick={onClose} type="button">Close</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 16, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
          <div className="col">
            {/* Direction */}
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className={`pill ${direction === "expense" ? "dirPillOut" : "dirPillIn"}`}>
                <span className={direction === "expense" ? "directionOut" : "directionIn"}>
                  {direction === "expense" ? "↗" : "↘"}
                </span>
                <span className="muted">{direction === "expense" ? "Expense" : "Income"}</span>
              </div>
              <div className="row">
                <button
                  className={`btn ${direction === "expense" ? "btnDanger" : ""}`}
                  type="button"
                  onClick={() => setDirection("expense")}
                >
                  Expense
                </button>
                <button
                  className={`btn ${direction === "income" ? "btnPrimary" : ""}`}
                  type="button"
                  onClick={() => setDirection("income")}
                >
                  Income
                </button>
              </div>
            </div>

            <div className="sep" />

            <label className="muted">Amount ({sym})</label>
            <input
              className="input money"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="250"
              style={{ fontSize: 18, fontWeight: 800 }}
            />

            <label className="muted">Note</label>
            <input
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="chai, rent, groceries…"
            />

            <SearchSelect
              label="Category"
              placeholder="Select category…"
              items={categories}
              valueId={categoryId}
              onChange={setCategoryId}
            />

            <SearchSelect
              label="Payment method"
              placeholder="Select payment method…"
              items={methods}
              valueId={paymentMethodId}
              onChange={setPaymentMethodId}
            />

            <TagChips value={tag} onChange={setTag} />

            {msg && <div className="toast"><span className="muted">{msg}</span></div>}

            {/* Delete confirmation */}
            {delConfirm && (
              <div
                className="card"
                style={{
                  padding: 14,
                  borderRadius: 14,
                  borderColor: "rgba(244,63,94,.35)",
                }}
              >
                <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
                  Delete this transaction? This cannot be undone.
                </div>
                <div className="row">
                  <button
                    className="btn btnDanger"
                    style={{ flex: 1 }}
                    onClick={deleteTxn}
                    disabled={loading}
                    type="button"
                  >
                    {loading ? "Deleting…" : "Yes, delete"}
                  </button>
                  <button
                    className="btn"
                    style={{ flex: 1 }}
                    onClick={() => setDelConfirm(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div style={{ height: 60 }} />
          </div>
        </div>

        {/* Sticky footer */}
        <div
          style={{
            padding: 16,
            borderTop: "1px solid rgba(255,255,255,.08)",
            background: "rgba(10,12,24,.78)",
            backdropFilter: "blur(14px)",
          }}
        >
          <div className="row" style={{ justifyContent: "space-between" }}>
            <button
              className="btn btnDanger"
              onClick={() => setDelConfirm(true)}
              disabled={loading || delConfirm}
              type="button"
            >
              Delete
            </button>
            <button
              className="btn btnPrimary"
              onClick={save}
              disabled={loading}
              type="button"
            >
              {loading ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
