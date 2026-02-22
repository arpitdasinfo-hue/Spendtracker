import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import QuickAddDrawer from "@/components/QuickAddDrawer";
import ProgressRing from "@/components/ProgressRing";
import { currencySymbol } from "@/lib/currency";

function fmt(sym: string, n: number) {
  return `${sym}${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function niceName(fullName: string | null | undefined, email: string | null | undefined) {
  if (fullName && fullName.trim()) return fullName.trim();
  if (email && email.includes("@")) return email.split("@")[0];
  return "there";
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const { data: prof } = await supabase
    .from("profiles")
    .select("full_name, currency_code")
    .eq("id", data.user.id)
    .maybeSingle();

  const sym = currencySymbol(prof?.currency_code ?? "INR");
  const name = niceName(prof?.full_name, data.user.email);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: txns } = await supabase
    .from("transactions")
    .select("id, direction, amount, note, created_at, category_id")
    .gte("created_at", monthStart)
    .order("created_at", { ascending: false })
    .limit(12);

  const expense = (txns ?? [])
    .filter((t) => t.direction === "expense")
    .reduce((s, t) => s + Number(t.amount ?? 0), 0);

  const income = (txns ?? [])
    .filter((t) => t.direction === "income")
    .reduce((s, t) => s + Number(t.amount ?? 0), 0);

  const { data: b } = await supabase
    .from("budgets")
    .select("monthly_budget")
    .eq("user_id", data.user.id)
    .maybeSingle();

  const monthlyBudget = Number(b?.monthly_budget ?? 0);

  const niceDate = now.toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <main className="container">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="h1">Hello, {name} 👋</h1>
          <p className="sub">
            {niceDate} · <span className="muted">{data.user.email}</span>
          </p>
        </div>

        <Link href="/add" className="btn btnPrimary" style={{ whiteSpace: "nowrap" }}>
          ＋ Add
        </Link>
      </div>

      <div className="grid2" style={{ marginTop: 14 }}>
        <div className="card cardPad">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="pill">
              <span>✨</span>
              <span className="muted">Quick Capture</span>
              <span className="kbd">{sym}</span>
            </div>
            <span className="badge">This month</span>
          </div>

          <p className="muted" style={{ marginTop: 10, marginBottom: 10 }}>
            Fast entry: amount + note + category.
          </p>

          <QuickAddDrawer />

          <div className="sep" />

          <div className="row" style={{ justifyContent: "space-between" }}>
            <Link href="/transactions" className="pill">
              <span>≡</span><span className="muted">Transactions</span>
            </Link>
            <Link href="/analysis" className="pill">
              <span>⬡</span><span className="muted">Analysis</span>
            </Link>
            <Link href="/budget" className="pill">
              <span>◔</span><span className="muted">Budget</span>
            </Link>
            <Link href="/config" className="pill">
              <span>⚙︎</span><span className="muted">Config</span>
            </Link>
          </div>
        </div>

        <div className="card cardPad">
          <div className="pill">
            <span>📈</span>
            <span className="muted">Snapshot</span>
            <span className="kbd">{sym}</span>
          </div>

          <div style={{ marginTop: 14 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="muted">Income</span>
              <span className="money" style={{ color: "var(--good)", fontWeight: 800 }}>
                {fmt(sym, income)}
              </span>
            </div>
            <div className="row" style={{ justifyContent: "space-between", marginTop: 10 }}>
              <span className="muted">Expense</span>
              <span className="money" style={{ color: "var(--bad)", fontWeight: 800 }}>
                {fmt(sym, expense)}
              </span>
            </div>

            <div className="sep" />

            {monthlyBudget > 0 ? (
              <ProgressRing value={expense} total={monthlyBudget} label="Budget used (this month)" symbol={sym} />
            ) : (
              <div className="toast" style={{ marginTop: 10 }}>
                <span className="muted">Set your budget in </span>
                <Link href="/budget">Budget</Link>
                <span className="muted"> to unlock the ring.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card cardPad" style={{ marginTop: 12 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="pill">
            <span>🧾</span><span className="muted">Recent</span>
          </div>
          <Link href="/transactions" className="badge">Open list →</Link>
        </div>

        <div className="sep" />

        {(!txns || txns.length === 0) ? (
          <p className="muted">No transactions yet. Add your first one ✨</p>
        ) : (
          <div className="col" style={{ gap: 10 }}>
            {txns.map((t) => (
              <div key={t.id} className="row" style={{ justifyContent: "space-between" }}>
                <div className="row" style={{ gap: 10 }}>
                  <span className={`badge ${t.direction === "income" ? "badgeGood" : "badgeBad"}`}>
                    {t.direction === "income" ? "↘ IN" : "↗ OUT"}
                  </span>
                  <div>
                    <div style={{ fontWeight: 650 }}>{t.note}</div>
                    <div className="faint" style={{ fontSize: 12 }}>
                      {new Date(t.created_at).toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>

                <div
                  className="money"
                  style={{ fontWeight: 800, color: t.direction === "income" ? "var(--good)" : "var(--bad)" }}
                >
                  {t.direction === "income" ? "+" : "-"}{sym}{Number(t.amount ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
