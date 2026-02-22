"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useCurrencySymbol } from "@/lib/useCurrency";

type Cat = { id: string; name: string };
type CatBudgetRow = { id: string; category_id: string; monthly_budget: number; updated_at?: string };

export default function BudgetRulesPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const { sym } = useCurrencySymbol();

  const [msg, setMsg] = useState<string | null>(null);

  const [cats, setCats] = useState<Cat[]>([]);
  const [catBudgets, setCatBudgets] = useState<CatBudgetRow[]>([]);

  const [monthlyBudget, setMonthlyBudget] = useState<string>("");
  const [savedMonthlyBudget, setSavedMonthlyBudget] = useState<number>(0);

  const [newCategoryId, setNewCategoryId] = useState<string>("");
  const [newCatBudget, setNewCatBudget] = useState<string>("");

  const allocated = useMemo(() => (catBudgets ?? []).reduce((s, r) => s + Number(r.monthly_budget ?? 0), 0), [catBudgets]);

  async function loadAll() {
    setMsg(null);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return router.replace("/login");

    // monthly budget
    const { data: b, error: bErr } = await supabase
      .from("budgets")
      .select("monthly_budget")
      .eq("user_id", u.user.id)
      .maybeSingle();
    if (bErr) setMsg(bErr.message);

    const mb = Number(b?.monthly_budget ?? 0);
    setSavedMonthlyBudget(mb);
    setMonthlyBudget(mb ? String(mb) : "");

    // categories
    const { data: cdata, error: cErr } = await supabase
      .from("categories")
      .select("id, name, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (cErr) setMsg(cErr.message);
    setCats((cdata ?? []).map((c: any) => ({ id: c.id, name: c.name })) as Cat[]);

    // category budgets
    const { data: cb, error: cbErr } = await supabase
      .from("category_budgets")
      .select("id, category_id, monthly_budget, updated_at")
      .order("updated_at", { ascending: false });
    if (cbErr) setMsg(cbErr.message);
    setCatBudgets((cb ?? []) as any);
  }

  useEffect(() => { loadAll(); }, []);

  async function saveMonthly() {
    setMsg(null);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return router.replace("/login");

    const n = Number(monthlyBudget);
    if (Number.isNaN(n) || n < 0) return setMsg("Enter a valid monthly budget.");

    if (allocated > n) {
      return setMsg(`Allocated category budgets exceed monthly budget (${sym}${allocated.toFixed(0)} > ${sym}${n.toFixed(0)}).`);
    }

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
      return setMsg(`Total category budgets would exceed monthly (${sym}${nextAllocated.toFixed(0)} > ${sym}${savedMonthlyBudget.toFixed(0)}).`);
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
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="h1">Config · Budget Rules</h1>
          <p className="sub">Configure monthly and category budgets here only.</p>
        </div>
        <span className="badge">Rules</span>
      </div>

      {msg && <div className="toast" style={{ marginTop: 12 }}>{msg}</div>}

      <div className="card cardPad" style={{ marginTop: 14 }}>
        <div className="pill"><span>◔</span><span className="muted">Monthly budget</span></div>
        <div className="sep" />
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="muted">Allocated to categories</span>
          <span className="money" style={{ fontWeight: 800 }}>{sym}{allocated.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
        </div>

        <label className="muted" style={{ marginTop: 12, display: "block" }}>Monthly budget ({sym})</label>
        <input className="input money" value={monthlyBudget} onChange={(e) => setMonthlyBudget(e.target.value)} placeholder="70000" inputMode="decimal" style={{ marginTop: 8, fontWeight: 800 }} />

        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn btnPrimary" style={{ flex: 1 }} onClick={saveMonthly}>Save monthly budget</button>
          <button className="btn" style={{ flex: 1 }} onClick={() => router.push("/budget")} type="button">Back to Budget</button>
        </div>
      </div>

      <div className="card cardPad" style={{ marginTop: 12 }}>
        <div className="pill"><span>🧩</span><span className="muted">Category budgets</span></div>
        <div className="sep" />

        <label className="muted">Category</label>
        <select className="input" value={newCategoryId} onChange={(e) => setNewCategoryId(e.target.value)} style={{ marginTop: 8 }}>
          <option value="">Select…</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <label className="muted" style={{ marginTop: 10, display: "block" }}>Category budget ({sym})</label>
        <input className="input money" value={newCatBudget} onChange={(e) => setNewCatBudget(e.target.value)} placeholder="5000" inputMode="decimal" style={{ marginTop: 8 }} />

        <button className="btn btnPrimary" style={{ width: "100%", marginTop: 12 }} onClick={upsertCategoryBudget}>
          Add / Update Category Budget
        </button>

        <div className="sep" />

        {catBudgets.length === 0 ? (
          <p className="muted">No category budgets yet.</p>
        ) : (
          <div className="col" style={{ gap: 10 }}>
            {catBudgets.map((c) => {
              const name = cats.find(x => x.id === c.category_id)?.name ?? "Category";
              return (
                <div key={c.id} className="row" style={{ justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{name}</div>
                    <div className="faint" style={{ fontSize: 12 }}>
                      Budget: {sym}{Number(c.monthly_budget ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <button className="btn btnDanger" onClick={() => deleteCategoryBudget(c.id)}>Delete</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
