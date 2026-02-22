"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import SearchSelect, { SearchItem } from "@/components/SearchSelect";
import { useCurrencySymbol } from "@/lib/useCurrency";

export default function QuickAddDrawer() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const { sym } = useCurrencySymbol();

  const [open, setOpen] = useState(false);

  const [direction, setDirection] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const [categories, setCategories] = useState<SearchItem[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;

      const { data, error } = await supabase
        .from("categories")
        .select("id, name, is_active")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (!error) {
        setCategories((data ?? []).map((c: any) => ({ id: c.id, label: c.name })));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hint = useMemo(() => (open ? "Fast entry: choose category + hit save." : "Tap to quick add"), [open]);

  async function save() {
    setMsg(null);
    setLoading(true);

    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setLoading(false);
      router.replace("/login");
      return;
    }

    const amt = Number(amount);
    if (!amt || Number.isNaN(amt) || amt <= 0) {
      setLoading(false);
      setMsg(`Enter a valid amount (e.g. ${sym}250).`);
      return;
    }

    const finalNote = (note || (direction === "expense" ? "expense" : "income")).slice(0, 80);

    const { error } = await supabase.from("transactions").insert({
      user_id: u.user.id,
      direction,
      amount: amt,
      note: finalNote,
      category_id: categoryId,
      occurred_at: new Date().toISOString(),
      payment_method: "quick_drawer",
    });

    setLoading(false);
    if (error) return setMsg(error.message);

    setAmount("");
    setNote("");
    setCategoryId(null);
    setMsg("Saved ✅");
    router.refresh();
    setTimeout(() => { setMsg(null); setOpen(false); }, 900);
  }

  return (
    <div className="card" style={{ padding: 12, borderRadius: 18 }}>
      <button
        className={`btn ${open ? "btnPrimary" : ""}`}
        style={{ width: "100%" }}
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        {open ? "Close Quick Add" : "＋ Quick Add"}
      </button>

      <div className="faint" style={{ fontSize: 12, marginTop: 8 }}>{hint}</div>

      {open && (
        <div className="col" style={{ marginTop: 10 }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className={`pill ${direction === "expense" ? "dirPillOut" : "dirPillIn"}`}>
              <span className={direction === "expense" ? "directionOut" : "directionIn"}>
                {direction === "expense" ? "↗" : "↘"}
              </span>
              <span className="muted">{direction === "expense" ? "Expense" : "Income"}</span>
            </div>

            <div className="row">
              <button className={`btn ${direction === "expense" ? "btnDanger" : ""}`} type="button" onClick={() => setDirection("expense")}>
                Expense
              </button>
              <button className={`btn ${direction === "income" ? "btnPrimary" : ""}`} type="button" onClick={() => setDirection("income")}>
                Income
              </button>
            </div>
          </div>

          <label className="muted">Amount ({sym})</label>
          <input className="input money" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="250" />

          <label className="muted">Note</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="chai, groceries…" />

          <SearchSelect
            label="Category"
            placeholder="Select category…"
            items={categories}
            valueId={categoryId}
            onChange={setCategoryId}
          />

          <div className="row">
            <button className="btn btnPrimary" style={{ flex: 1 }} onClick={save} disabled={loading}>
              {loading ? "Saving…" : "Save"}
            </button>
            <button className="btn" style={{ flex: 1 }} onClick={() => { setAmount(""); setNote(""); setCategoryId(null); }} disabled={loading} type="button">
              Clear
            </button>
          </div>

          {msg && <div className="toast"><span className="muted">{msg}</span></div>}
        </div>
      )}
    </div>
  );
}
