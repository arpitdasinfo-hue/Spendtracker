import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import QuickAddDrawer from "@/components/QuickAddDrawer";
import ProgressRing from "@/components/ProgressRing";
import { currencySymbol, isCurrencyCode, type CurrencyCode } from "@/lib/currency";
import { formatMoney } from "@/lib/money";
import ProfileSetup from "@/components/ProfileSetup";

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

  const currencyCode: CurrencyCode = isCurrencyCode(prof?.currency_code) ? prof.currency_code : "INR";
  const sym = currencySymbol(currencyCode);
  const name = niceName(prof?.full_name, data.user.email);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: txns } = await supabase
    .from("transactions")
    .select("id, direction, amount, note, created_at")
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
      {/* client modal */}
      <ProfileSetup />

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

      {/* Net balance strip */}
      {(income > 0 || expense > 0) && (() => {
        const net = income - expense;
        const isPositive = net >= 0;
        return (
          <div
            className="card"
            style={{
              marginTop: 14,
              padding: "13px 18px",
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderColor: isPositive ? "rgba(16,185,129,.25)" : "rgba(244,63,94,.25)",
            }}
          >
            <span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>
              Net this month
            </span>
            <span
              className="money"
              style={{
                fontWeight: 800,
                fontSize: 16,
                color: isPositive ? "var(--goodLight)" : "var(--badLight)",
              }}
            >
              {isPositive ? "+" : ""}
              {formatMoney(net, currencyCode, "en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>
        );
      })()}

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

          <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <Link href="/transactions" className="pill">
              <span>≡</span><span className="muted">Transactions</span>
            </Link>
            <Link href="/analysis" className="pill">
              <span>⬡</span><span className="muted">Analysis</span>
            </Link>
            <Link href="/budget" className="pill">
              <span>◔</span><span className="muted">Budget</span>
            </Link>
            <Link href="/recurring" className="pill">
              <span>↺</span><span className="muted">Recurring</span>
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
                {formatMoney(income, currencyCode, "en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="row" style={{ justifyContent: "space-between", marginTop: 10 }}>
              <span className="muted">Expense</span>
              <span className="money" style={{ color: "var(--bad)", fontWeight: 800 }}>
                {formatMoney(expense, currencyCode, "en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>

            <div className="sep" />

            {monthlyBudget > 0 ? (
              <ProgressRing
                value={expense}
                total={monthlyBudget}
                label="Budget used (this month)"
                symbol={sym}
                currencyCode={currencyCode}
              />
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

      {/* Recent transactions */}
      {txns && txns.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".2px" }}>
              Recent this month
            </span>
            <Link href="/transactions" className="badge" style={{ cursor: "pointer" }}>
              See all →
            </Link>
          </div>

          <div className="col" style={{ gap: 8 }}>
            {txns.slice(0, 5).map((t) => (
              <div
                key={t.id}
                className="card"
                style={{ padding: "12px 16px", borderRadius: 16 }}
              >
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <div className="row" style={{ gap: 10 }}>
                    <span
                      className={`badge ${t.direction === "income" ? "badgeGood" : "badgeBad"}`}
                      style={{ fontSize: 12 }}
                    >
                      {t.direction === "income" ? "↘" : "↗"}
                    </span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {t.note || (t.direction === "income" ? "income" : "expense")}
                      </div>
                      <div className="faint" style={{ fontSize: 11, marginTop: 2 }}>
                        {new Date(t.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                  <div
                    className="money"
                    style={{
                      fontWeight: 800,
                      fontSize: 14,
                      color: t.direction === "income" ? "var(--goodLight)" : "var(--badLight)",
                    }}
                  >
                    {t.direction === "income" ? "+" : "-"}
                    {formatMoney(Number(t.amount ?? 0), currencyCode, "en-IN", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
