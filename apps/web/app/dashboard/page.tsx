import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import QuickAdd from "@/components/QuickAdd";

function inr(n: number) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  // last 30 days totals
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: txns } = await supabase
    .from("transactions")
    .select("id, direction, amount, note, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(12);

  const expense = (txns ?? [])
    .filter((t) => t.direction === "expense")
    .reduce((s, t) => s + Number(t.amount ?? 0), 0);

  const income = (txns ?? [])
    .filter((t) => t.direction === "income")
    .reduce((s, t) => s + Number(t.amount ?? 0), 0);

  const net = income - expense;

  const today = new Date();
  const niceDate = today.toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <main className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="h1">Home</h1>
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
              <span className="muted">Quick Add</span>
              <span className="kbd">fast</span>
            </div>
            <span className="badge">30d view</span>
          </div>

          <p className="muted" style={{ marginTop: 10, marginBottom: 10 }}>
            Type like <span className="kbd">spent 250 groceries</span> or{" "}
            <span className="kbd">income 5000 salary</span>.
          </p>

          <QuickAdd />

          <div className="sep" />

          <div className="row" style={{ justifyContent: "space-between" }}>
            <Link href="/transactions" className="pill">
              <span>≡</span>
              <span className="muted">View all transactions</span>
            </Link>
            <Link href="/settings" className="pill">
              <span>⚙︎</span>
              <span className="muted">Settings</span>
            </Link>
          </div>
        </div>

        <div className="card cardPad">
          <div className="pill">
            <span>📈</span>
            <span className="muted">Snapshot</span>
            <span className="kbd">INR</span>
          </div>

          <div style={{ marginTop: 14 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="muted">Income</span>
              <span className="money" style={{ color: "var(--good)", fontWeight: 700 }}>
                ₹{inr(income)}
              </span>
            </div>

            <div className="row" style={{ justifyContent: "space-between", marginTop: 10 }}>
              <span className="muted">Expense</span>
              <span className="money" style={{ color: "var(--bad)", fontWeight: 700 }}>
                ₹{inr(expense)}
              </span>
            </div>

            <div className="sep" />

            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="muted">Net</span>
              <span
                className={`money ${net >= 0 ? "badgeGood" : "badgeBad"}`}
                style={{
                  fontWeight: 800,
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: "1px solid var(--stroke)",
                }}
              >
                {net >= 0 ? "＋" : "－"}₹{inr(Math.abs(net))}
              </span>
            </div>

            <p className="faint" style={{ marginTop: 12, fontSize: 12, lineHeight: 1.4 }}>
              Tip: keep notes short. You can add accounts & categories later.
            </p>
          </div>
        </div>
      </div>

      <div className="card cardPad" style={{ marginTop: 12 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="pill">
            <span>🧾</span>
            <span className="muted">Recent</span>
          </div>
          <Link href="/transactions" className="badge">
            Open list →
          </Link>
        </div>

        <div className="sep" />

        {!txns || txns.length === 0 ? (
          <p className="muted">No transactions yet. Add your first one ✨</p>
        ) : (
          <div className="col" style={{ gap: 10 }}>
            {txns.map((t) => (
              <div key={t.id} className="row" style={{ justifyContent: "space-between" }}>
                <div className="row" style={{ gap: 10 }}>
                  <span className={`badge ${t.direction === "income" ? "badgeGood" : "badgeBad"}`}>
                    {t.direction === "income" ? "IN" : "OUT"}
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
                  style={{
                    fontWeight: 800,
                    color: t.direction === "income" ? "var(--good)" : "var(--bad)",
                  }}
                >
                  {t.direction === "income" ? "+" : "-"}₹{inr(Number(t.amount ?? 0))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
