"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useCurrencySymbol } from "@/lib/useCurrency";
import { formatMoney } from "@/lib/money";
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
  Legend,
} from "recharts";

type Txn = {
  direction: "expense" | "income";
  amount: number | null;
  category: string | null;
  category_id: string | null;
  created_at: string;
};

type CatBudget = { category_id: string; monthly_budget: number };
type Cat = { id: string; name: string };

const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function startOfWeek(d: Date) {
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

export default function AnalysisPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const { sym, code } = useCurrencySymbol();

  const [items, setItems] = useState<Txn[]>([]);
  const [catBudgets, setCatBudgets] = useState<CatBudget[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { router.replace("/login"); return; }

      // 400 days covers 13+ months for YoY
      const since = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("transactions")
        .select("direction, amount, category, category_id, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: true });

      if (error) setMsg(error.message);
      setItems((data ?? []) as Txn[]);

      const { data: cb } = await supabase
        .from("category_budgets")
        .select("category_id, monthly_budget");
      setCatBudgets((cb ?? []) as CatBudget[]);

      const { data: cdata } = await supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true);
      setCats((cdata ?? []) as Cat[]);
    })();
  }, [router]);

  const money = (n: number) =>
    formatMoney(n, code, "en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

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

    // Year-over-Year data
    const yoy = MONTH_ABBR.map((month, i) => {
      const tyStart = new Date(now.getFullYear(), i, 1);
      const tyEnd   = new Date(now.getFullYear(), i + 1, 1);
      const lyStart = new Date(now.getFullYear() - 1, i, 1);
      const lyEnd   = new Date(now.getFullYear() - 1, i + 1, 1);
      const thisYear = items
        .filter(t => t.direction === "expense" && inRange(t, tyStart, tyEnd))
        .reduce((s, t) => s + Number(t.amount ?? 0), 0);
      const lastYear = items
        .filter(t => t.direction === "expense" && inRange(t, lyStart, lyEnd))
        .reduce((s, t) => s + Number(t.amount ?? 0), 0);
      return { month, thisYear, lastYear };
    });

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
      yoy,
    };
  }, [items]);

  const insights = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const thisMonthExpenses = items.filter(
      t => t.direction === "expense" && new Date(t.created_at) >= monthStart
    );
    const lastMonthExpenses = items.filter(
      t => t.direction === "expense" &&
        new Date(t.created_at) >= lastMonthStart &&
        new Date(t.created_at) < monthStart
    );

    // Over-budget categories
    const catBudgetMap = new Map(catBudgets.map(b => [b.category_id, Number(b.monthly_budget)]));
    const catNameMap = new Map(cats.map(c => [c.id, c.name]));
    const catSpend = new Map<string, number>();
    for (const t of thisMonthExpenses) {
      if (t.category_id) catSpend.set(t.category_id, (catSpend.get(t.category_id) ?? 0) + Number(t.amount ?? 0));
    }
    const overBudget = Array.from(catSpend.entries())
      .filter(([id, spent]) => catBudgetMap.has(id) && spent > (catBudgetMap.get(id) ?? Infinity))
      .map(([id]) => catNameMap.get(id) ?? "Unknown");

    // Top spend day of week
    const dayTotals = new Array(7).fill(0);
    for (const t of items) {
      if (t.direction !== "expense") continue;
      dayTotals[new Date(t.created_at).getDay()] += Number(t.amount ?? 0);
    }
    const topDayIdx = dayTotals.indexOf(Math.max(...dayTotals));
    const topDay = DAY_NAMES[topDayIdx];

    // Biggest single expense this month
    const biggest = thisMonthExpenses.length > 0
      ? thisMonthExpenses.reduce((max, t) =>
          Number(t.amount ?? 0) > Number(max.amount ?? 0) ? t : max
        )
      : null;

    // Month-over-month % change
    const thisTotal = thisMonthExpenses.reduce((s, t) => s + Number(t.amount ?? 0), 0);
    const lastTotal = lastMonthExpenses.reduce((s, t) => s + Number(t.amount ?? 0), 0);
    const momPct = lastTotal > 0 ? ((thisTotal - lastTotal) / lastTotal) * 100 : null;

    return { overBudget, topDay, biggest, thisTotal, lastTotal, momPct };
  }, [items, catBudgets, cats]);

  return (
    <main className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="h1">Analysis</h1>
          <p className="sub">Insights, trends and year-on-year breakdown.</p>
        </div>
        <span className="badge">Last 400 days</span>
      </div>

      {msg && <div className="toast" style={{ marginTop: 12 }}>{msg}</div>}

      {/* ── Smart Insights ── */}
      <div
        style={{
          display: "flex",
          gap: 10,
          overflowX: "auto",
          padding: "4px 0 8px",
          marginTop: 14,
          scrollbarWidth: "none",
        }}
      >
        {/* MoM change */}
        <div
          className="card cardPad fadeUp"
          style={{ minWidth: 160, flexShrink: 0, padding: "14px 16px" }}
        >
          <div style={{ fontSize: 22, marginBottom: 4 }}>
            {insights.momPct === null ? "📊" : insights.momPct >= 0 ? "📈" : "📉"}
          </div>
          <div className="muted" style={{ fontSize: 11, fontWeight: 500 }}>Month vs last</div>
          <div
            className="money"
            style={{
              fontWeight: 800,
              fontSize: 16,
              marginTop: 4,
              color: insights.momPct === null
                ? "var(--text)"
                : insights.momPct >= 0 ? "var(--badLight)" : "var(--goodLight)",
            }}
          >
            {insights.momPct === null
              ? "—"
              : `${insights.momPct >= 0 ? "+" : ""}${insights.momPct.toFixed(1)}%`}
          </div>
          <div className="faint" style={{ fontSize: 11, marginTop: 3 }}>
            vs {money(insights.lastTotal)}
          </div>
        </div>

        {/* Top spend day */}
        <div
          className="card cardPad fadeUp"
          style={{ minWidth: 150, flexShrink: 0, padding: "14px 16px", animationDelay: "60ms" }}
        >
          <div style={{ fontSize: 22, marginBottom: 4 }}>📅</div>
          <div className="muted" style={{ fontSize: 11, fontWeight: 500 }}>Top spend day</div>
          <div className="money" style={{ fontWeight: 800, fontSize: 16, marginTop: 4 }}>
            {insights.topDay}
          </div>
          <div className="faint" style={{ fontSize: 11, marginTop: 3 }}>across all time</div>
        </div>

        {/* Biggest expense */}
        <div
          className="card cardPad fadeUp"
          style={{ minWidth: 172, flexShrink: 0, padding: "14px 16px", animationDelay: "120ms" }}
        >
          <div style={{ fontSize: 22, marginBottom: 4 }}>🔥</div>
          <div className="muted" style={{ fontSize: 11, fontWeight: 500 }}>Biggest this month</div>
          <div className="money" style={{ fontWeight: 800, fontSize: 16, marginTop: 4 }}>
            {insights.biggest ? money(Number(insights.biggest.amount ?? 0)) : "—"}
          </div>
          <div
            className="faint"
            style={{ fontSize: 11, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}
          >
            {insights.biggest?.category ?? "—"}
          </div>
        </div>

        {/* Over-budget categories */}
        <div
          className="card cardPad fadeUp"
          style={{ minWidth: 172, flexShrink: 0, padding: "14px 16px", animationDelay: "180ms" }}
        >
          <div style={{ fontSize: 22, marginBottom: 4 }}>🚨</div>
          <div className="muted" style={{ fontSize: 11, fontWeight: 500 }}>Over-budget</div>
          <div
            className="money"
            style={{
              fontWeight: 800,
              fontSize: 16,
              marginTop: 4,
              color: insights.overBudget.length > 0 ? "var(--badLight)" : "var(--goodLight)",
            }}
          >
            {insights.overBudget.length > 0 ? `${insights.overBudget.length} category` : "All clear"}
          </div>
          <div
            className="faint"
            style={{ fontSize: 11, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}
          >
            {insights.overBudget.length > 0 ? insights.overBudget.join(", ") : "within budget"}
          </div>
        </div>
      </div>

      {/* ── WoW + MoM cards ── */}
      <div className="grid2" style={{ marginTop: 4 }}>
        <div className="card cardPad">
          <div className="pill"><span>📆</span><span className="muted">Week on Week</span></div>
          <div className="sep" />
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="muted">This week expense</span>
            <span className="money" style={{ fontWeight: 800 }}>{money(metrics.thisWeekExpense)}</span>
          </div>
          <div className="row" style={{ justifyContent: "space-between", marginTop: 10 }}>
            <span className="muted">Last week expense</span>
            <span className="money" style={{ fontWeight: 800, color: "var(--muted)" }}>{money(metrics.lastWeekExpense)}</span>
          </div>
          <div className="sep" />
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="muted">Change</span>
            <span className={`badge ${metrics.wowExpense <= 0 ? "badgeGood" : "badgeBad"}`}>
              {metrics.wowExpense >= 0 ? "+" : "-"}{money(Math.abs(metrics.wowExpense))}
            </span>
          </div>
        </div>

        <div className="card cardPad">
          <div className="pill"><span>🗓️</span><span className="muted">Month on Month</span></div>
          <div className="sep" />
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="muted">This month expense</span>
            <span className="money" style={{ fontWeight: 800 }}>{money(metrics.thisMonthExpense)}</span>
          </div>
          <div className="row" style={{ justifyContent: "space-between", marginTop: 10 }}>
            <span className="muted">Last month expense</span>
            <span className="money" style={{ fontWeight: 800, color: "var(--muted)" }}>{money(metrics.lastMonthExpense)}</span>
          </div>
          <div className="sep" />
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="muted">Change</span>
            <span className={`badge ${metrics.momExpense <= 0 ? "badgeGood" : "badgeBad"}`}>
              {metrics.momExpense >= 0 ? "+" : "-"}{money(Math.abs(metrics.momExpense))}
            </span>
          </div>
        </div>
      </div>

      {/* ── Category Pie ── */}
      <div className="card cardPad" style={{ marginTop: 12 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="pill"><span>🧩</span><span className="muted">Top Categories (This Month)</span></div>
          <span className="badge">Expense only</span>
        </div>
        <div className="sep" />
        {metrics.categoryData.length === 0 ? (
          <p className="muted">No categorized expenses yet.</p>
        ) : (
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={metrics.categoryData} dataKey="value" nameKey="name" />
                <Tooltip formatter={(value: any) => money(Number(value ?? 0))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── 6-month trend + 8-week line ── */}
      <div className="grid2" style={{ marginTop: 12 }}>
        <div className="card cardPad">
          <div className="pill"><span>📊</span><span className="muted">Month Trend (6 months)</span></div>
          <div className="sep" />
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={metrics.trend}>
                <CartesianGrid strokeOpacity={0.15} />
                <XAxis dataKey="month" tick={{ fill: "var(--muted)", fontSize: 11 }} />
                <YAxis tickFormatter={(v) => money(Number(v ?? 0))} tick={{ fill: "var(--muted)", fontSize: 10 }} width={72} />
                <Tooltip
                  formatter={(value: any) => money(Number(value ?? 0))}
                  contentStyle={{ background: "var(--cardSolid)", border: "1px solid var(--stroke)", borderRadius: 12 }}
                />
                <Bar dataKey="expense" fill="rgba(244,63,94,.75)" radius={[4,4,0,0]} name="Expense" />
                <Bar dataKey="income"  fill="rgba(34,211,238,.75)" radius={[4,4,0,0]} name="Income" />
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
                <XAxis dataKey="week" tick={{ fill: "var(--muted)", fontSize: 11 }} />
                <YAxis tickFormatter={(v) => money(Number(v ?? 0))} tick={{ fill: "var(--muted)", fontSize: 10 }} width={72} />
                <Tooltip
                  formatter={(value: any) => money(Number(value ?? 0))}
                  contentStyle={{ background: "var(--cardSolid)", border: "1px solid var(--stroke)", borderRadius: 12 }}
                />
                <Line type="monotone" dataKey="expense" dot={false} stroke="rgba(244,63,94,.85)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Year on Year ── */}
      <div className="card cardPad" style={{ marginTop: 12 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="pill"><span>📅</span><span className="muted">Year on Year · Expenses</span></div>
          <span className="badge">{new Date().getFullYear() - 1} vs {new Date().getFullYear()}</span>
        </div>
        <div className="sep" />
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <BarChart data={metrics.yoy} barGap={2}>
              <CartesianGrid strokeOpacity={0.15} />
              <XAxis dataKey="month" tick={{ fill: "var(--muted)", fontSize: 11 }} />
              <YAxis tickFormatter={(v) => money(Number(v ?? 0))} tick={{ fill: "var(--muted)", fontSize: 10 }} width={72} />
              <Tooltip
                formatter={(value: any) => money(Number(value ?? 0))}
                contentStyle={{ background: "var(--cardSolid)", border: "1px solid var(--stroke)", borderRadius: 12 }}
              />
              <Legend
                formatter={(value) => (
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>{value}</span>
                )}
              />
              <Bar dataKey="lastYear"  fill="rgba(124,58,237,.55)" radius={[4,4,0,0]} name={String(new Date().getFullYear() - 1)} />
              <Bar dataKey="thisYear"  fill="rgba(34,211,238,.80)" radius={[4,4,0,0]} name={String(new Date().getFullYear())} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </main>
  );
}
