"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import ProgressRing from "@/components/ProgressRing";
import MiniRing from "@/components/MiniRing";
import { useCurrencySymbol } from "@/lib/useCurrency";

type Cat = { id: string; name: string };
type CatBudgetRow = { id: string; category_id: string; monthly_budget: number };
type Txn = { direction: "expense" | "income"; amount: number | null; category_id: string | null; created_at: string };

export default function BudgetPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const { sym } = useCurrencySymbol();

  const [monthlyBudget, setMonthlyBudget] = useState<string>("");
  const [savedMonthlyBudget, setSavedMonthlyBudget] = useState<number>(0);

  const [cats, setCats] = useState<Cat[]>([]);
  const [catBudgets, setCatBudgets] = useState<CatBudgetRow[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);

  const [newCategoryId, setNewCategoryId] = useState<string>("");
  const [newCatBudget, setNewCatBudget] = useState<string>("");

  const [msg, setMsg] = useState<string | null>(null);

  const monthStartISO = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }, []);

  const spentThisMonth = useMemo(() => {
    return (txns ?? [])
      .filter((t) => t.direction === "expense")
      .reduce((s, t) => s + Number(t.amount ?? 0), 0);
  }, [txns]);

  const categorySpend = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of txns) {
      if (t.direction !== "expense") continue;
      const key = t.category_id ?? "__uncat__";
      m.set(key, (m.get(key) ?? 0) + Number(t.amount ?? 0));
    }
    return m;
  }, [txns]);

  const allocated = useMemo(() => {
    return (catBudgets ?? []).reduce((s, r) => s + Number(r.monthly_budget ?? 0), 0);
  }, [catBudgets]);

  const catNameById = useMemo(() => {
    const m = new Map<string, string>();
    cats.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [cats]);

  async function loadAll() {
    setMsg(null);

    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return router.replace("/login");

    const { data: b, error: bErr } = await supabase
      .from("budgets")
      .select("monthly_budget")
      .eq("user_id", u.user.id)
      .maybeSingle();
    if (bErr) setMsg(bErr.message);

    const mb = Number(b?.monthly_budget ?? 0);
    setSavedMonthlyBudget(mb);
    setMonthlyBudget(mb ? String(mb) : "");

    const { data: cdata, error: cErr } = await supabase
      .from("categories")
      .select("id, name, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (cErr) setMsg(cErr.message);
    setCats((cdata ?? []) as any);

    const { data: cb, error: cbErr } = await supabase
      .from("category_budgets")
      .select("id, category_id, monthly_budget")
      .order("updated_at", { ascending: false });
    if (cbErr) setMsg(cbErr.message);
    setCatBudgets((cb ?? []) as any);

    const { data: t, error: tErr } = await supabase
      .from("transactions")
      .select("direction, amount, category_id, created_at")
      .gte("created_at", monthStartISO)
      .order("created_at", { ascending: false });
    if (tErr) setMsg(tErr.message);
    setTxns((t ?? []) as any);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthStartISO]);

  async function saveMonthly() {
    setMsg(null);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return router.replace("/login");

    const n = Number(monthlyBudget);
    if (Number.isNaN(n) || n < 0) return setMsg("Enter a valid monthly budget.");
    if (allocated > n) return setMsg(`Allocated exceeds monthly (${sym}${allocated.toFixed(0)} > ${sym}${n.toFixed(0)}).`);

    const { error } = await supabase.from("budgets").upsert({
      user_id: u.user.id,
      monthly_budget: n,
      updated_at: new Date().toISOString(),
    });

    if (error) return setMsg(error.message);
    setSavedMonthlyBudget(n);
    setMsg("Saved ✅");
    setTimeout(() => setMsg(null), 900);
  }

  async function upsertCategoryBudget() {
    setMsg(null);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return router.replace("/login");

    if (!newCategoryId) return setMsg("Choose a category.");
    const n = Number(newCatBudget);
    if (Number.isNaN(n) || n <= 0) return setMsg("Enter a valid category budget.");

    const existing = catBudgets.find((x) => x.category_id === newCategoryId);
    const nextAllocated = allocated - Number(existing?.monthly_budget ?? 0) + n;
    if (savedMonthlyBudget > 0 && nextAllocated > savedMonthlyBudget) {
      return setMsg(`Total category budgets exceed monthly (${sym}${nextAllocated.toFixed(0)} > ${sym}${savedMonthlyBudget.toFixed(0)}).`);
    }

    const { error } = await supabase.from("category_budgets").upsert({
      user_id: u.user.id,
      category_id: newCategoryId,
      monthly_budget: n,
      updated_at: new Date().toISOString(),
    });

    if (error) return setMsg(error.message);

    setNewCategoryId("");
    setNewCatBudget("");
    await loadAll();
    setMsg("Category budget saved ✅");
    setTimeout(() => setMsg(null), 900);
  }

  async function deleteCategoryBudget(id: string) {
    const ok = confirm("Delete this category budget?");
    if (!ok) return;

    setMsg(null);
    const { error } = await supabase.from("category_budgets").delete().eq("id", id);
    if (error) return setMsg(error.message);

    setCatBudgets((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <main className="container">
      <h1 className="h1">Budget</h1>
      <p className="sub">Monthly + category budgets. Totals cannot exceed monthly.</p>

      {msg && <div className="toast" style={{ marginTop: 12 }}>{msg}</div>}

      <div className="card cardPad" style={{ marginTop: 14 }}>
        {savedMonthlyBudget > 0 ? (
          <ProgressRing value={spentThisMonth} total={savedMonthlyBudget} symbol={sym} />
        ) : (
          <div className="toast"><span className="muted">Set a monthly budget to unlock the ring.</span></div>
        )}

        <div className="sep" />

        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="muted">Allocated to categories</span>
          <span className="money" style={{ fontWeight: 800 }}>{sym}{allocated.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
        </div>

        <label className="muted" style={{ marginTop: 12, display: "block" }}>Monthly budget ({sym})</label>
        <input className="input money" value={monthlyBudget} onChange={(e) => setMonthlyBudget(e.target.value)} placeholder="20000" inputMode="decimal" style={{ marginTop: 8, fontWeight: 800 }} />

        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn btnPrimary" style={{ flex: 1 }} onClick={saveMonthly}>
            Save monthly budget
          </button>
          <button className="btn" style={{ flex: 1 }} onClick={() => router.push("/dashboard")} type="button">
            Back
          </button>
        </div>
      </div>

      <div className="card cardPad" style={{ marginTop: 12 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="pill"><span>🧩</span><span className="muted">Category Budgets</span></div>
          <span className="badge">This month usage</span>
        </div>

        <div className="sep" />

        <label className="muted">Category</label>
        <select className="input" value={newCategoryId} onChange={(e) => setNewCategoryId(e.target.value)} style={{ marginTop: 8 }}>
          <option value="">Select…</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <label className="muted" style={{ marginTop: 10, display: "block" }}>Category budget ({sym})</label>
        <input className="input money" value={newCatBudget} onChange={(e) => setNewCatBudget(e.target.value)} placeholder="6000" inputMode="decimal" style={{ marginTop: 8 }} />

        <button className="btn btnPrimary" style={{ width: "100%", marginTop: 12 }} onClick={upsertCategoryBudget}>
          Add / Update Category Budget
        </button>

        <div className="sep" />

        {catBudgets.length === 0 ? (
          <p className="muted">No category budgets yet.</p>
        ) : (
          <div className="col" style={{ gap: 10 }}>
            {catBudgets.map((c) => {
              const title = catNameById.get(c.category_id) ?? "Category";
              const spent = categorySpend.get(c.category_id) ?? 0;
              return (
                <div key={c.id} className="row" style={{ gap: 10, alignItems: "stretch" }}>
                  <div style={{ flex: 1 }}>
                    <MiniRing title={title} value={spent} total={Number(c.monthly_budget ?? 0)} symbol={sym} />
                  </div>
                  <button className="btn btnDanger" style={{ alignSelf: "center" }} onClick={() => deleteCategoryBudget(c.id)}>
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
