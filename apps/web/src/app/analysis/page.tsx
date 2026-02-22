"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

type Txn = {
  direction: "expense" | "income";
  amount: number | null;
  category: string | null;
  created_at: string;
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfWeek(d: Date) {
  // Monday start (India-friendly)
  const day = (d.getDay() + 6) % 7; // Mon=0
  const s = startOfDay(d);
  s.setDate(s.getDate() - day);
  return s;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function sum(txns: Txn[], dir: "expense" | "income") {
  return txns
    .filter((t) => t.direction === dir)
    .reduce((s, t) => s + Number(t.amount ?? 0), 0);
}

function inr(n: number) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export default function AnalysisPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const [items, setItems] = useState<Txn[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        router.replace("/login");
        return;
      }

      // fetch last ~120 days for analysis
      const since = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("transactions")
        .select("direction, amount, category, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: true });

      if (error) setMsg(error.message);
      setItems((data ?? []) as Txn[]);
    })();
  }, [router]);

  const metrics = useMemo(() => {
    const now = new Date();

    const week0Start = startOfWeek(now);
    const week1Start = new Date(week0Start);
    week1Start.setDate(week1Start.getDate() - 7);

    const month0Start = startOfMonth(now);
    const month1Start = new Date(month0Start);
    month1Start.setMonth(month1Start.getMonth() - 1);

    const inRange = (t: Txn, a: Date, b: Date) => {
      const d = new Date(t.created_at);
      return d >= a && d < b;
    };

    const thisWeek = items.filter((t) => inRange(t, week0Start, now));
    const lastWeek = items.filter((t) => inRange(t, week1Start, week0Start));

    const thisMonth = items.filter((t) => inRange(t, month0Start, now));
    const lastMonth = items.filter((t) => inRange(t, month1Start, month0Start));

    const wowExpense = sum(thisWeek, "expense") - sum(lastWeek, "expense");
    const momExpense = sum(thisMonth, "expense") - sum(lastMonth, "expense");

    // Category spend (this month, expenses only)
    const catMap = new Map<string, number>();
    for (const t of thisMonth) {
      if (t.direction !== "expense") continue;
      const key = t.category?.trim() || "Uncategorized";
      catMap.set(key, (catMap.get(key) ?? 0) + Number(t.amount ?? 0));
    }
    const categoryData = Array.from(catMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Month trend: last 6 months
    const trend: { month: string; expense: number; income: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const a = startOfMonth(d);
      const b = new Date(a);
      b.setMonth(b.getMonth() + 1);

      const bucket = items.filter((t) => inRange(t, a, b));
      trend.push({
        month: a.toLocaleDateString("en-IN", { month: "short" }),
        expense: sum(bucket, "expense"),
        income: sum(bucket, "income"),
      });
    }

    // Weekly trend: last 8 weeks expense
    const weekly: { week: string; expense: number }[] = [];
    const w0 = startOfWeek(now);
    for (let i = 7; i >= 0; i--) {
      const a = new Date(w0);
      a.setDate(a.getDate() - i * 7);
      const b = new Date(a);
      b.setDate(b.getDate() + 7);

      const bucket = items.filter((t) => inRange(t, a, b));
      weekly.push({
        week: `${a.getDate()}/${a.getMonth() + 1}`,
        expense: sum(bucket, "expense"),
      });
    }

    return {
      thisWeekExpense: sum(thisWeek, "expense"),
      lastWeekExpense: sum(lastWeek, "expense"),
      thisMonthExpense: sum(thisMonth, "expense"),
      lastMonthExpense: sum(lastMonth, "expense"),
      wowExpense,
      momExpense,
      categoryData,
      trend,
      weekly,
    };
  }, [items]);

  return (
    <main className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="h1">Analysis</h1>
          <p className="sub">Week-on-week, month-on-month and category charts.</p>
        </div>
        <span className="badge">Last 120 days</span>
      </div>

      {msg && <div className="toast" style={{ marginTop: 12 }}>{msg}</div>}

      <div className="grid2" style={{ marginTop: 14 }}>
        <div className="card cardPad">
          <div className="pill"><span>📆</span><span className="muted">Week on Week</span></div>
          <div className="sep" />
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="muted">This week expense</span>
            <span className="money" style={{ fontWeight: 800 }}>₹{inr(metrics.thisWeekExpense)}</span>
          </div>
          <div className="row" style={{ justifyContent: "space-between", marginTop: 10 }}>
            <span className="muted">Last week expense</span>
            <span className="money" style={{ fontWeight: 800, color: "var(--muted)" }}>₹{inr(metrics.lastWeekExpense)}</span>
          </div>
          <div className="sep" />
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="muted">Change</span>
            <span className={`badge ${metrics.wowExpense <= 0 ? "badgeGood" : "badgeBad"}`}>
              {metrics.wowExpense >= 0 ? "+" : "-"}₹{inr(Math.abs(metrics.wowExpense))}
            </span>
          </div>
        </div>

        <div className="card cardPad">
          <div className="pill"><span>🗓️</span><span className="muted">Month on Month</span></div>
          <div className="sep" />
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="muted">This month expense</span>
            <span className="money" style={{ fontWeight: 800 }}>₹{inr(metrics.thisMonthExpense)}</span>
          </div>
          <div className="row" style={{ justifyContent: "space-between", marginTop: 10 }}>
            <span className="muted">Last month expense</span>
            <span className="money" style={{ fontWeight: 800, color: "var(--muted)" }}>₹{inr(metrics.lastMonthExpense)}</span>
          </div>
          <div className="sep" />
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="muted">Change</span>
            <span className={`badge ${metrics.momExpense <= 0 ? "badgeGood" : "badgeBad"}`}>
              {metrics.momExpense >= 0 ? "+" : "-"}₹{inr(Math.abs(metrics.momExpense))}
            </span>
          </div>
        </div>
      </div>

      <div className="card cardPad" style={{ marginTop: 12 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="pill"><span>🧩</span><span className="muted">Top Categories (This Month)</span></div>
          <span className="badge">Expense only</span>
        </div>
        <div className="sep" />
        {metrics.categoryData.length === 0 ? (
          <p className="muted">No categorized expenses yet. Add a category while editing a transaction.</p>
        ) : (
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={metrics.categoryData} dataKey="value" nameKey="name" />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid2" style={{ marginTop: 12 }}>
        <div className="card cardPad">
          <div className="pill"><span>📊</span><span className="muted">Month Trend (6 months)</span></div>
          <div className="sep" />
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={metrics.trend}>
                <CartesianGrid strokeOpacity={0.15} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="expense" />
                <Bar dataKey="income" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card cardPad">
          <div className="pill"><span>〰️</span><span className="muted">Weekly Expense (8 weeks)</span></div>
          <div className="sep" />
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={metrics.weekly}>
                <CartesianGrid strokeOpacity={0.15} />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="expense" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </main>
  );
}
