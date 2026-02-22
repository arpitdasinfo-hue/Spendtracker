"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import SearchSelect, { SearchItem } from "@/components/SearchSelect";
import { useCurrencySymbol } from "@/lib/useCurrency";

export default function AddPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const { sym } = useCurrencySymbol();

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
      if (!u.user) return router.replace("/login");

      const { data, error } = await supabase
        .from("categories")
        .select("id, name, is_active")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (!error) setCategories((data ?? []).map((c: any) => ({ id: c.id, label: c.name })));
    })();
  }, [router]);

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
      return setMsg(`Enter a valid amount (e.g., ${sym}250).`);
    }

    const { error } = await supabase.from("transactions").insert({
      user_id: u.user.id,
      direction,
      amount: amt,
      note: (note || (direction === "expense" ? "expense" : "income")).slice(0, 80),
      category_id: categoryId,
      occurred_at: new Date().toISOString(),
      payment_method: "manual_form",
    });

    setLoading(false);
    if (error) return setMsg(error.message);

    router.replace("/dashboard");
  }

  return (
    <main className="container">
      <h1 className="h1">Add</h1>
      <p className="sub">Clean entry. Neon vibe. Done in 3 seconds.</p>

      <div className="card cardPad" style={{ marginTop: 14 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className={`pill ${direction === "expense" ? "dirPillOut" : "dirPillIn"}`}>
            <span className={direction === "expense" ? "directionOut" : "directionIn"}>
              {direction === "expense" ? "↗" : "↘"}
            </span>
            <span className="muted">{direction === "expense" ? "Expense" : "Income"}</span>
          </div>

          <div className="row">
            <button className={`btn ${direction === "expense" ? "btnDanger" : ""}`} onClick={() => setDirection("expense")} type="button">
              Expense
            </button>
            <button className={`btn ${direction === "income" ? "btnPrimary" : ""}`} onClick={() => setDirection("income")} type="button">
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
          style={{ fontSize: 18, fontWeight: 800, marginTop: 8 }}
        />

        <div style={{ height: 12 }} />

        <label className="muted">Note</label>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="chai, rent, groceries…" style={{ marginTop: 8 }} />

        <div style={{ height: 12 }} />

        <SearchSelect label="Category" placeholder="Select category…" items={categories} valueId={categoryId} onChange={setCategoryId} />

        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn btnPrimary" style={{ flex: 1 }} onClick={save} disabled={loading}>
            {loading ? "Saving…" : "Save"}
          </button>
          <button className="btn" style={{ flex: 1 }} onClick={() => router.replace("/dashboard")} disabled={loading} type="button">
            Cancel
          </button>
        </div>

        {msg && <div className="toast" style={{ marginTop: 12 }}>{msg}</div>}
      </div>
    </main>
  );
}
