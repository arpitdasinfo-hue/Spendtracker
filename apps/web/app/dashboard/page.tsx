import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import QuickAddDrawer from "@/components/QuickAddDrawer";
import ProgressRing from "@/components/ProgressRing";
import { currencySymbol, isCurrencyCode, type CurrencyCode } from "@/lib/currency";
import { formatMoney } from "@/lib/money";
import ProfileSetup from "@/components/ProfileSetup";

function niceName(fullName: string | null | undefined, email: string | null | undefined) {
  if (fullName && fullName.trim()) return fullName.trim().split(" ")[0];
  if (email && email.includes("@")) return email.split("@")[0];
  return "there";
}

function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
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
  const net = income - expense;
  const isPositive = net >= 0;

  const fmt = (n: number) =>
    formatMoney(n, currencyCode, "en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const niceDate = now.toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const monthName = now.toLocaleDateString("en-IN", { month: "long" });

  return (
    <main className="container">
      <ProfileSetup />

      {/* ── Header ── */}
      <div className="row fadeUp" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p className="muted" style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".8px" }}>
            {timeGreeting()}
          </p>
          <h1 className="h1" style={{ fontSize: 26 }}>{name}</h1>
          <p className="sub" style={{ marginTop: 4 }}>{niceDate}</p>
        </div>
        <Link
          href="/config"
          className="btn"
          style={{ padding: "10px 12px", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center" }}
          aria-label="Settings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
        </Link>
      </div>

      {/* ── Hero net balance ── */}
      {(income > 0 || expense > 0) && (
        <div
          className="card fadeUp delay1"
          style={{
            marginTop: 16,
            padding: "18px 22px",
            borderRadius: 20,
            borderColor: isPositive ? "rgba(16,185,129,.22)" : "rgba(244,63,94,.22)",
            background: isPositive
              ? "linear-gradient(135deg, rgba(16,185,129,.09) 0%, rgba(9,11,32,.82) 60%)"
              : "linear-gradient(135deg, rgba(244,63,94,.09) 0%, rgba(9,11,32,.82) 60%)",
          }}
        >
          <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".7px" }}>
                Net · {monthName}
              </div>
              <div
                className="money statNum"
                style={{
                  fontSize: 32,
                  marginTop: 6,
                  color: isPositive ? "var(--goodLight)" : "var(--badLight)",
                }}
              >
                {isPositive ? "+" : ""}{fmt(net)}
              </div>
            </div>
            <div style={{ display: "flex", gap: 20 }}>
              <div>
                <div className="faint" style={{ fontSize: 11, fontWeight: 500 }}>Income</div>
                <div className="money" style={{ fontWeight: 700, fontSize: 15, color: "var(--goodLight)", marginTop: 4 }}>
                  {fmt(income)}
                </div>
              </div>
              <div>
                <div className="faint" style={{ fontSize: 11, fontWeight: 500 }}>Expense</div>
                <div className="money" style={{ fontWeight: 700, fontSize: 15, color: "var(--badLight)", marginTop: 4 }}>
                  {fmt(expense)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main grid ── */}
      <div className="grid2 fadeUp delay2" style={{ marginTop: 12 }}>

        {/* Quick Capture */}
        <div className="card cardPad">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="pill">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              <span className="muted">Quick Capture</span>
            </div>
            <span className="badge">{monthName}</span>
          </div>

          <p className="muted" style={{ marginTop: 10, marginBottom: 10, fontSize: 13 }}>
            Fast entry — amount, note, category.
          </p>

          <QuickAddDrawer />

          <div className="sep" />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Link href="/transactions" className="pill" style={{ justifyContent: "center" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              <span className="muted">Txns</span>
            </Link>
            <Link href="/analysis" className="pill" style={{ justifyContent: "center" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>
              <span className="muted">Analysis</span>
            </Link>
            <Link href="/recurring" className="pill" style={{ justifyContent: "center" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
              <span className="muted">Recurring</span>
            </Link>
            <Link href="/goals" className="pill" style={{ justifyContent: "center" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
              <span className="muted">Goals</span>
            </Link>
            <Link href="/config" className="pill" style={{ justifyContent: "center", gridColumn: "1 / -1" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
              <span className="muted">Settings</span>
            </Link>
          </div>
        </div>

        {/* Snapshot */}
        <div className="card cardPad">
          <div className="pill">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
            <span className="muted">Snapshot · {monthName}</span>
          </div>

          <div style={{ marginTop: 14 }}>
            {[
              { label: "Income",  val: income,  color: "var(--goodLight)" },
              { label: "Expense", val: expense, color: "var(--badLight)" },
            ].map(({ label, val, color }) => (
              <div key={label} className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
                <span className="muted" style={{ fontSize: 13 }}>{label}</span>
                <span className="money" style={{ color, fontWeight: 800, fontSize: 16 }}>{fmt(val)}</span>
              </div>
            ))}

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
              <div className="toast" style={{ fontSize: 13 }}>
                <span className="muted">Set your budget in </span>
                <Link href="/budget" style={{ color: "var(--neonB2)" }}>Budget</Link>
                <span className="muted"> to unlock the ring.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Recent transactions ── */}
      {txns && txns.length > 0 && (
        <div className="fadeUp delay3" style={{ marginTop: 18 }}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".6px", textTransform: "uppercase", color: "var(--muted)" }}>
              Recent
            </span>
            <Link href="/transactions" className="badge" style={{ cursor: "pointer" }}>
              See all →
            </Link>
          </div>

          <div className="col" style={{ gap: 6 }}>
            {txns.slice(0, 5).map((t) => (
              <div
                key={t.id}
                className="card cardLift"
                style={{ padding: "11px 16px", borderRadius: 16 }}
              >
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <div className="row" style={{ gap: 10, minWidth: 0, flex: 1 }}>
                    <span
                      className={`badge ${t.direction === "income" ? "badgeGood" : "badgeBad"}`}
                      style={{ fontSize: 11, flexShrink: 0, padding: "3px 8px" }}
                    >
                      {t.direction === "income" ? "↓" : "↑"}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.note || (t.direction === "income" ? "income" : "expense")}
                      </div>
                      <div className="faint" style={{ fontSize: 11, marginTop: 1 }}>
                        {new Date(t.created_at).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                  <div
                    className="money"
                    style={{
                      fontWeight: 800,
                      fontSize: 14,
                      flexShrink: 0,
                      marginLeft: 8,
                      color: t.direction === "income" ? "var(--goodLight)" : "var(--badLight)",
                    }}
                  >
                    {t.direction === "income" ? "+" : "-"}{fmt(Number(t.amount ?? 0))}
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
