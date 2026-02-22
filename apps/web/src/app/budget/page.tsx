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

  const [msg, setMsg] = useState<string | null>(null);

  const [monthlyBudget, setMonthlyBudget] = useState<number>(0);
  const [cats, setCats] = useState<Cat[]>([]);
  const [catBudgets, setCatBudgets] = useState<CatBudgetRow[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);

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

  const catNameById = useMemo(() => {
    const m = new Map<string, string>();
    cats.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [cats]);

  const budgetRows = useMemo(() => {
    const rows = catBudgets.map((b) => {
      const spent = categorySpend.get(b.category_id) ?? 0;
      const total = Number(b.monthly_budget ?? 0);
      const name = catNameById.get(b.category_id) ?? "Category";
      const pct = total > 0 ? (spent / total) : 0;
      return { ...b, name, spent, total, pct };
    });
    // sort by % used desc
    rows.sort((a, b) => (b.pct - a.pct));
    return rows;
  }, [catBudgets, categorySpend, catNameById]);

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
    setMonthlyBudget(Number(b?.monthly_budget ?? 0));

    const { data: cdata, error: cErr } = await supabase
      .from("categories")
      .select("id, name, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (cErr) setMsg(cErr.message);
    setCats((cdata ?? []).map((c: any) => ({ id: c.id, name: c.name })) as Cat[]);

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

  useEffect(() => { loadAll(); }, [monthStartISO]);

  return (
    <main className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="h1">Budget</h1>
          <p className="sub">Progress only. Edit rules in Config.</p>
        </div>

        <button className="btn btnPrimary" onClick={() => router.push("/config/budget-rules")} type="button">
          Edit rules
        </button>
      </div>

      {msg && <div className="toast" style={{ marginTop: 12 }}>{msg}</div>}

      <div className="card cardPad" style={{ marginTop: 14 }}>
        {monthlyBudget > 0 ? (
          <ProgressRing value={spentThisMonth} total={monthlyBudget} symbol={sym} label="Monthly budget used (this month)" />
        ) : (
          <div className="toast">
            <span className="muted">No monthly budget set. </span>
            <button className="btn btnPrimary" onClick={() => router.push("/config/budget-rules")} type="button">
              Set budget rules
            </button>
          </div>
        )}
      </div>

      <div className="card cardPad" style={{ marginTop: 12 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="pill"><span>🧩</span><span className="muted">Category budget usage</span></div>
          <span className="badge">This month</span>
        </div>

        <div className="sep" />

        {budgetRows.length === 0 ? (
          <p className="muted">No category budgets set. Add them in Config → Budget Rules.</p>
        ) : (
          <div className="col" style={{ gap: 10 }}>
            {budgetRows.map((r) => (
              <MiniRing
                key={r.id}
                title={r.name}
                value={r.spent}
                total={r.total}
                symbol={sym}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
