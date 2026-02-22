"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import ProgressRing from "@/components/ProgressRing";

export default function BudgetPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const [budget, setBudget] = useState<string>("");
  const [spentThisMonth, setSpentThisMonth] = useState<number>(0);
  const [savedBudget, setSavedBudget] = useState<number>(0);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return router.replace("/login");

      // Load budget
      const { data: b } = await supabase
        .from("budgets")
        .select("monthly_budget")
        .eq("user_id", u.user.id)
        .maybeSingle();

      const mb = Number(b?.monthly_budget ?? 0);
      setSavedBudget(mb);
      setBudget(mb ? String(mb) : "");

      // Spent this month
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data: txns } = await supabase
        .from("transactions")
        .select("amount, direction, created_at")
        .gte("created_at", monthStart)
        .order("created_at", { ascending: false });

      const spent = (txns ?? [])
        .filter((t: any) => t.direction === "expense")
        .reduce((s: number, t: any) => s + Number(t.amount ?? 0), 0);

      setSpentThisMonth(spent);
    })();
  }, [router]);

  async function saveBudget() {
    setMsg(null);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return router.replace("/login");

    const n = Number(budget);
    if (Number.isNaN(n) || n < 0) return setMsg("Enter a valid budget amount.");

    const { error } = await supabase.from("budgets").upsert({
      user_id: u.user.id,
      monthly_budget: n,
      updated_at: new Date().toISOString(),
    });

    if (error) return setMsg(error.message);
    setSavedBudget(n);
    setMsg("Saved ✅");
    setTimeout(() => setMsg(null), 1200);
  }

  return (
    <main className="container">
      <h1 className="h1">Budget</h1>
      <p className="sub">Set a monthly budget and track progress in neon.</p>

      <div className="card cardPad" style={{ marginTop: 14 }}>
        <ProgressRing value={spentThisMonth} total={savedBudget || 0} />

        <div className="sep" />

        <label className="muted">Monthly budget (INR)</label>
        <input
          className="input money"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          inputMode="decimal"
          placeholder="20000"
          style={{ marginTop: 8, fontWeight: 800 }}
        />

        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn btnPrimary" style={{ flex: 1 }} onClick={saveBudget}>
            Save budget
          </button>
          <button className="btn" style={{ flex: 1 }} onClick={() => router.push("/dashboard")}>
            Back
          </button>
        </div>

        {msg && <div className="toast" style={{ marginTop: 12 }}>{msg}</div>}
      </div>
    </main>
  );
}
