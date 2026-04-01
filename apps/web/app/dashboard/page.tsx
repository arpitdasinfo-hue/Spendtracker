"use client";

import Link from "next/link";
import { useState } from "react";
import { useFinance } from "@/components/finance/FinanceProvider";
import { ActionLink, MetricCard, MotionPanel, PageHeader, StatTag } from "@/components/finance/Primitives";
import { buildFinanceSnapshot, formatCurrency, formatLongDate } from "@/lib/finance";

export default function DashboardPage() {
  const { state, resetDemo, status, userIdentity, error, hasSupabase } = useFinance();
  const snapshot = buildFinanceSnapshot(state);
  const [resetting, setResetting] = useState(false);

  const primaryActions = [
    { href: "/add?type=expense", label: "Log expense" },
    { href: "/add?type=income", label: "Add income" },
    { href: "/add?type=repayment", label: "Pay a card" },
  ];

  async function handleResetDemo() {
    setResetting(true);
    try {
      await resetDemo();
    } finally {
      setResetting(false);
    }
  }

  return (
    <main className="page">
      <PageHeader
        eyebrow="Overview"
        title="Your money, minus the noise."
        subtitle="See what you can spend, what needs attention, and what moved this month without digging through menus."
        action={(
          <div className="button-row">
            {status === "ready" ? (
              <button type="button" className="button button-secondary" onClick={handleResetDemo} disabled={resetting}>
                {resetting ? "Resetting…" : "Reset demo"}
              </button>
            ) : null}
          </div>
        )}
      />

      {status !== "ready" ? (
        <MotionPanel className="section-pad stack-md" delay={0.02}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">
                {status === "setup"
                  ? "Supabase is not configured yet"
                  : status === "loading"
                    ? "Connecting your finance workspace"
                    : status === "error"
                      ? "Supabase sync needs attention"
                      : "Sign in to sync your money data"}
              </h2>
              <p className="panel-subtitle">
                {status === "setup"
                  ? "Add the Supabase URL and anon key, then run the schema SQL to persist the product data."
                  : status === "loading"
                    ? "Checking your session and loading accounts, budgets, mandates, and transactions."
                    : status === "error"
                      ? error ?? "We hit a sync problem while loading your finance data."
                      : "Use your mobile number and password so every account and transaction is stored under your user with row-level security."}
              </p>
            </div>
            {userIdentity ? <StatTag tone="accent">{userIdentity}</StatTag> : null}
          </div>
          <div className="button-row">
            {hasSupabase ? (
              <Link href="/login" className="button button-primary">
                Open sign in
              </Link>
            ) : (
              <Link href="/settings" className="button button-secondary">
                Setup notes
              </Link>
            )}
          </div>
        </MotionPanel>
      ) : null}

      <div className="hero-grid">
        <MotionPanel className="hero-card" delay={0.05}>
          <div className="stack-lg">
            <div className="hero-note">
              <span>{status === "ready" ? `Synced${userIdentity ? ` · ${userIdentity}` : ""}` : "Preview shell with real product logic"}</span>
            </div>

            <div className="stack-sm">
              <div className="eyebrow">Available now</div>
              <div className="display-title" style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)" }}>
                {formatCurrency(snapshot.assetsTotal)}
              </div>
              <div className="page-subtitle" style={{ marginTop: 0 }}>
                Card dues are {formatCurrency(snapshot.liabilitiesTotal)} across your credit cards. This month net cash is {formatCurrency(snapshot.monthSummary.netCash)} after income and bank-backed outflow.
              </div>
            </div>

            <div className="hero-metrics">
              <div className="hero-stat">
                <div className="hero-stat-label">Spent</div>
                <div className="hero-stat-value">{formatCurrency(snapshot.monthSummary.expense)}</div>
                <div className="hero-stat-hint">Real expense only.</div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-label">Income</div>
                <div className="hero-stat-value">{formatCurrency(snapshot.monthSummary.income)}</div>
                <div className="hero-stat-hint">Money received.</div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-label">Card dues</div>
                <div className="hero-stat-value">{formatCurrency(snapshot.monthSummary.repayments)}</div>
                <div className="hero-stat-hint">Paid toward cards.</div>
              </div>
            </div>

            <div className="button-row">
              {primaryActions.map((item) => (
                <Link key={item.href} href={item.href} className="button button-secondary">
                  {item.label}
                </Link>
              ))}
              <Link href="/add" className="button button-primary">
                More flows
              </Link>
            </div>
          </div>
        </MotionPanel>

        <div className="stack-md">
          <MotionPanel className="section-pad stack-md" delay={0.12}>
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Needs attention</h2>
                <p className="panel-subtitle">The few things worth acting on soon.</p>
              </div>
              <StatTag tone="accent">{snapshot.dueCards.length} due</StatTag>
            </div>

            {snapshot.dueCards.length ? (
              <div className="stack-sm">
                {snapshot.dueCards.slice(0, 2).map(({ account, dueDate, daysLeft, utilization }) => (
                  <div key={account.id} className="account-card">
                    <div className="account-top">
                      <div>
                        <p className="account-name">{account.provider}</p>
                        <p className="account-provider">
                          Due {dueDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {daysLeft} day{daysLeft === 1 ? "" : "s"} left
                        </p>
                      </div>
                      <StatTag tone={daysLeft <= 5 ? "danger" : "good"}>{utilization}% used</StatTag>
                    </div>
                    <div className="account-balance amount-negative">{formatCurrency(account.currentBalance)}</div>
                    <div className="account-provider">Current outstanding against limit {formatCurrency(Number(account.creditLimit ?? 0))}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flow-note">No card dues are close right now. You are clear for the next few days.</div>
            )}

            {snapshot.upcomingMandates[0] ? (
              <div className="flow-note">
                Next AutoPay: {snapshot.upcomingMandates[0].merchantName} for {formatCurrency(snapshot.upcomingMandates[0].amount)} on {new Date(snapshot.upcomingMandates[0].nextTriggerAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}.
              </div>
            ) : null}

            <ActionLink href="/recurring">See all mandates</ActionLink>
          </MotionPanel>

          <MotionPanel className="section-pad stack-md" delay={0.18}>
            <div className="panel-header">
              <div>
                <h2 className="panel-title">This month</h2>
                <p className="panel-subtitle">A simpler read on the month so far.</p>
              </div>
            </div>

            <div className="summary-grid">
              <MetricCard
                label="Net cash"
                value={formatCurrency(snapshot.monthSummary.netCash)}
                hint="Income minus bank outflow."
                tone={snapshot.monthSummary.netCash >= 0 ? "good" : "danger"}
              />
              <MetricCard
                label="Cash outflow"
                value={formatCurrency(snapshot.monthSummary.cashOutflow)}
                hint="Bank spend plus repayments."
                tone="accent"
              />
              <MetricCard
                label="Card spend"
                value={formatCurrency(snapshot.monthSummary.cardSpend)}
                hint="Spent on cards so far."
              />
              <MetricCard
                label="Transfers"
                value={formatCurrency(snapshot.monthSummary.transferVolume)}
                hint="Your own account moves."
              />
            </div>

            <div className="button-row">
              <Link href="/analysis" className="button button-secondary">
                Open insights
              </Link>
              <Link href="/budget" className="button button-secondary">
                Open budgets
              </Link>
            </div>
          </MotionPanel>
        </div>
      </div>

      <div style={{ height: 16 }} />

      <div className="split-grid">
        <MotionPanel className="section-pad-lg stack-md" delay={0.24}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Recent activity</h2>
              <p className="panel-subtitle">The latest entries, grouped by what actually happened.</p>
            </div>
            <ActionLink href="/transactions">Open activity</ActionLink>
          </div>

          <div className="timeline-list">
            {snapshot.recentTransactions.slice(0, 5).map((transaction) => (
              <div key={transaction.id} className="timeline-card">
                <div className="ledger-row">
                  <div>
                    <p className="ledger-title">{transaction.title}</p>
                    <p className="ledger-meta">
                      {transaction.category} · {transaction.paymentRail.replace("_", " ")} · {formatLongDate(transaction.createdAt)}
                    </p>
                  </div>
                  <div className={`ledger-amount ${transaction.type === "income" ? "amount-positive" : transaction.type === "expense" ? "amount-negative" : ""}`}>
                    {transaction.type === "income" ? "+" : transaction.type === "expense" ? "-" : ""}
                    {formatCurrency(transaction.amount)}
                  </div>
                </div>
                <p className="ledger-meta" style={{ marginTop: "0.8rem" }}>
                  {transaction.note}
                </p>
              </div>
            ))}
          </div>
        </MotionPanel>

        <div className="stack-md">
          <MotionPanel className="section-pad stack-md" delay={0.28}>
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Budget pulse</h2>
                <p className="panel-subtitle">Only the categories pacing fastest.</p>
              </div>
              <ActionLink href="/budget">Open plan</ActionLink>
            </div>

            <div className="budget-list">
              {snapshot.budgetProgress.slice(0, 3).map((budget) => (
                <div key={budget.category} className="budget-card">
                  <div className="budget-row">
                    <div>
                      <p className="account-name">{budget.category}</p>
                      <p className="account-provider">
                        {formatCurrency(budget.spent)} of {formatCurrency(budget.limit)}
                      </p>
                    </div>
                    <StatTag tone={budget.ratio > 0.8 ? "danger" : "good"}>{Math.round(budget.ratio * 100)}%</StatTag>
                  </div>
                  <div className="budget-track">
                    <div
                      className="budget-fill"
                      style={{
                        width: `${Math.min(100, Math.round(budget.ratio * 100))}%`,
                        background: budget.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </MotionPanel>

          <MotionPanel className="section-pad stack-md" delay={0.32}>
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Account snapshot</h2>
                <p className="panel-subtitle">The split that matters most: money you have and money you owe.</p>
              </div>
            </div>

            <div className="summary-grid">
              <div className="flow-note">
                <strong>Assets</strong>
                <br />
                {snapshot.accounts.assets.length} cash and bank accounts totaling {formatCurrency(snapshot.assetsTotal)}.
              </div>
              <div className="flow-note">
                <strong>Liabilities</strong>
                <br />
                {snapshot.accounts.liabilities.length} cards totaling {formatCurrency(snapshot.liabilitiesTotal)} outstanding.
              </div>
              <div className="flow-note">
                <strong>Repayment rule</strong>
                <br />
                Card bill payments reduce dues and cash, but they do not create duplicate expense.
              </div>
              <div className="flow-note">
                <strong>Fast path</strong>
                <br />
                Use expense for purchases, transfer for your own account moves, and repayment only for card bills.
              </div>
            </div>

            <div className="button-row">
              <Link href="/add" className="button button-primary">
                Add a new entry
              </Link>
              <Link href="/settings" className="button button-secondary">
                Account settings
              </Link>
            </div>
          </MotionPanel>
        </div>
      </div>
    </main>
  );
}
