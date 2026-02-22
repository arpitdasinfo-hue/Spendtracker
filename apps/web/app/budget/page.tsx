"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import ProgressRing from "@/components/ProgressRing";
import MiniRing from "@/components/MiniRing";

type CatBudget = {
  id: string;
  category: string;
  monthly_budget: number;
};

type Txn = {
  direction: "expense" | "income";
  amount: number | null;
  category: string | null;
  created_at: string;
};

export default function BudgetPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const [monthlyBudget, setMonthlyBudget] = useState<string>("");
  const [savedMonthlyBudget, setSavedMonthlyBudget] = useState<number>(0);

  const [cats, setCats] = useState<CatBudget[]>([]);
  const [newCat, setNewCat] = useState("");
  const [newCatBudget, setNewCatBudget] = useState("");

  const [txns, setTxns] = useState<Txn[]>([]);
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

  const categorySpendMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of txns) {
      if (t.direction !== "expense") continue;
      const key = (t.category?.trim() || "Uncategorized");
      m.set(key, (m.get(key) ?? 0) + Number(t.amount ?? 0));
    }
    return m;
  }, [txns]);

  useEffect(() => {
    (async () => {
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

      const { data: cb, error: cbErr } = await supabase
        .from("category_budgets")
        .select("id, category, monthly_budget")
        .order("category", { ascending: true });

      if (cbErr) setMsg(cbErr.message);
      setCats((cb ?? []) as CatBudget[]);

      const { data: t, error: tErr } = await supabase
        .from("transactions")
        .select("direction, amount, category, created_at")
        .gte("created_at", monthStartISO)
        .order("created_at", { ascending: false });

      if (tErr) setMsg(tErr.message);
      setTxns((t ?? []) as Txn[]);
    })();
  }, [router, monthStartISO]);

  async function saveMonthly() {
    setMsg(null);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return router.replace("/login");

    const n = Number(monthlyBudget);
    if (Number.isNaN(n) || n < 0) return setMsg("Enter a valid monthly budget.");

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

  async function addCategoryBudget() {
    setMsg(null);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return router.replace("/login");

    const cat = newCat.trim();
    const n = Number(newCatBudget);

    if (!cat) return setMsg("Category name required.");
    if (Number.isNaN(n) || n <= 0) return setMsg("Enter a valid category budget.");

    const { error } = await supabase.from("category_budgets").upsert({
      user_id: u.user.id,
      category: cat,
      monthly_budget: n,
      updated_at: new Date().toISOString(),
    });

    if (error) return setMsg(error.message);

    const { data: cb } = await supabase
      .from("category_budgets")
      .select("id, category, monthly_budget")
      .order("category", { ascending: true });

    setCats((cb ?? []) as CatBudget[]);
    setNewCat("");
    setNewCatBudget("");
    setMsg("Category budget saved ✅");
    setTimeout(() => setMsg(null), 900);
  }

  async function deleteCategoryBudget(id: string) {
    const ok = confirm("Delete this category budget?");
    if (!ok) return;

    setMsg(null);
    const { error } = await supabase.from("category_budgets").delete().eq("id", id);
    if (error) return setMsg(error.message);

    setCats((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <main className="container">
      <h1 className="h1">Budget</h1>
      <p className="sub">Set overall monthly budget + category budgets. Track progress instantly.</p>

      {msg && <div className="toast" style={{ marginTop: 12 }}>{msg}</div>}

      <div className="card cardPad" style={{ marginTop: 14 }}>
        {savedMonthlyBudget > 0 ? (
          <ProgressRing value={spentThisMonth} total={savedMonthlyBudget} />
        ) : (
          <div className="toast">
            <span className="muted">Set a monthly budget to unlock the progress ring.</span>
          </div>
        )}

        <div className="sep" />

        <label className="muted">Monthly budget (INR)</label>
        <input
          className="input money"
          value={monthlyBudget}
          onChange={(e) => setMonthlyBudget(e.target.value)}
          placeholder="20000"
          inputMode="decimal"
          style={{ marginTop: 8, fontWeight: 800 }}
        />

        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn btnPrimary" style={{ flex: 1 }} onClick={saveMonthly}>
            Save monthly budget
          </button>
          <button className="btn" style={{ flex: 1 }} onClick={() => router.push("/dashboard")}>
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

        <div className="grid2" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <input className="input" value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Food" />
          <input className="input money" value={newCatBudget} onChange={(e) => setNewCatBudget(e.target.value)} placeholder="6000" inputMode="decimal" />
        </div>

        <button className="btn btnPrimary" style={{ width: "100%", marginTop: 12 }} onClick={addCategoryBudget}>
          Add / Update Category Budget
        </button>

        <div className="sep" />

        {cats.length === 0 ? (
          <p className="muted">No category budgets yet. Add “Food 6000” to start.</p>
        ) : (
          <div className="col" style={{ gap: 10 }}>
            {cats.map((c) => {
              const spent = categorySpendMap.get(c.category) ?? 0;
              return (
                <div key={c.id} className="row" style={{ gap: 10, alignItems: "stretch" }}>
                  <div style={{ flex: 1 }}>
                    <MiniRing title={c.category} value={spent} total={Number(c.monthly_budget ?? 0)} />
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
