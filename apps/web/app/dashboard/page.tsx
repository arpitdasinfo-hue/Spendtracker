"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { useFinance } from "@/components/finance/FinanceProvider";
import { ActionLink, MetricCard, MotionPanel, PageHeader, StatTag } from "@/components/finance/Primitives";
import { buildFinanceSnapshot, formatCurrency, formatLongDate, percent } from "@/lib/finance";

export default function DashboardPage() {
  const { state, resetDemo, status, userIdentity, error, hasSupabase } = useFinance();
  const snapshot = buildFinanceSnapshot(state);
  const [resetting, setResetting] = useState(false);

  const quickLinks = [
    { href: "/add?type=expense", label: "Log expense" },
    { href: "/add?type=income", label: "Add income" },
    { href: "/add?type=transfer", label: "Move money" },
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
        eyebrow="India-first finance command center"
        title="Spend without losing the plot."
        subtitle="A product-led money system for income, expense, UPI, debit cards, credit cards, and repayments. Spend view stays truthful, cash flow stays visible, and card dues stay calm."
        action={(
          <div className="button-row">
            {status === "ready" ? (
              <button type="button" className="button button-secondary" onClick={handleResetDemo} disabled={resetting}>
                {resetting ? "Resetting…" : "Reset demo"}
              </button>
            ) : null}
            <Link href="/add" className="button button-primary">
              Open workflow
            </Link>
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
              <span>{status === "ready" ? `Synced with Supabase${userIdentity ? ` · ${userIdentity}` : ""}` : "Preview shell with real product logic"}</span>
            </div>

            <div className="stack-sm">
              <div className="eyebrow">Available liquidity</div>
              <div className="display-title" style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)" }}>
                {formatCurrency(snapshot.assetsTotal)}
              </div>
              <div className="page-subtitle" style={{ marginTop: 0 }}>
                Credit outstanding is {formatCurrency(snapshot.liabilitiesTotal)} across cards, with {snapshot.utilization}% total utilization. Repayments are tracked as liability reduction, never as duplicate expense.
              </div>
            </div>

            <div className="hero-metrics">
              <div className="hero-stat">
                <div className="hero-stat-label">Spend view</div>
                <div className="hero-stat-value">{formatCurrency(snapshot.monthSummary.expense)}</div>
                <div className="hero-stat-hint">Booked on purchase date.</div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-label">Cash outflow</div>
                <div className="hero-stat-value">{formatCurrency(snapshot.monthSummary.cashOutflow)}</div>
                <div className="hero-stat-hint">Bank-backed spend plus repayments.</div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-label">Income landed</div>
                <div className="hero-stat-value">{formatCurrency(snapshot.monthSummary.income)}</div>
                <div className="hero-stat-hint">Salary, side income, and reimbursements.</div>
              </div>
            </div>

            <div className="chip-row">
              {quickLinks.map((item) => (
                <Link key={item.href} href={item.href} className="button button-secondary">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </MotionPanel>

        <div className="stack-md">
          <MotionPanel className="section-pad stack-md" delay={0.12}>
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Upcoming moments</h2>
                <p className="panel-subtitle">Card due dates and mandate triggers that shape the month ahead.</p>
              </div>
              <StatTag tone="accent">{snapshot.dueCards.length} cards</StatTag>
            </div>

            <div className="stack-sm">
              {snapshot.dueCards.slice(0, 3).map(({ account, dueDate, daysLeft, utilization }) => (
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

            <ActionLink href="/recurring">See mandates and AutoPay</ActionLink>
          </MotionPanel>

          <MotionPanel className="section-pad stack-md" delay={0.18}>
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Why this model works</h2>
                <p className="panel-subtitle">The workflow keeps rails, funding sources, and liabilities separate.</p>
              </div>
            </div>
            <div className="flow-note">
              UPI is the rail, not always the source account. A UPI expense can be funded by bank or a supported RuPay credit card. Card bill payment is a repayment, not another spend event.
            </div>
            <div className="flow-note">
              Budgeting and analytics stay anchored to the purchase date, while cash flow view still surfaces bank debits and card bill outflows.
            </div>
          </MotionPanel>
        </div>
      </div>

      <div style={{ height: 16 }} />

      <div className="metric-grid">
        <MetricCard
          label="Net cash this month"
          value={formatCurrency(snapshot.monthSummary.netCash)}
          hint="Income minus bank-backed outflow."
          tone={snapshot.monthSummary.netCash >= 0 ? "good" : "danger"}
        />
        <MetricCard
          label="Card-funded spend"
          value={formatCurrency(snapshot.monthSummary.cardSpend)}
          hint="Captured immediately, repaid later."
          tone="accent"
        />
        <MetricCard
          label="Transfer volume"
          value={formatCurrency(snapshot.monthSummary.transferVolume)}
          hint="Liquidity movement between your own accounts."
        />
        <MetricCard
          label="Repayments"
          value={formatCurrency(snapshot.monthSummary.repayments)}
          hint="Debt reduction, not expense duplication."
        />
      </div>

      <div style={{ height: 16 }} />

      <div className="split-grid">
        <MotionPanel className="section-pad-lg stack-md" delay={0.24}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Accounts and liabilities</h2>
              <p className="panel-subtitle">Balances are grouped by assets and cards so liquidity and dues never blur together.</p>
            </div>
            <StatTag tone="neutral">{state.accounts.length} accounts</StatTag>
          </div>

          <div className="accounts-grid">
            {snapshot.accounts.assets.map((account) => (
              <div key={account.id} className="account-card">
                <div className="account-top">
                  <div>
                    <p className="account-name">{account.name}</p>
                    <p className="account-provider">{account.provider} · {account.mask}</p>
                  </div>
                  <StatTag tone="good">Asset</StatTag>
                </div>
                <div className="account-balance">{formatCurrency(account.currentBalance)}</div>
                <div className="account-provider">{account.railHint}</div>
              </div>
            ))}

            {snapshot.accounts.liabilities.map((account) => (
              <div key={account.id} className="account-card">
                <div className="account-top">
                  <div>
                    <p className="account-name">{account.name}</p>
                    <p className="account-provider">{account.provider} · {account.mask}</p>
                  </div>
                  <StatTag tone="danger">Liability</StatTag>
                </div>
                <div className="account-balance amount-negative">{formatCurrency(account.currentBalance)}</div>
                <div className="account-provider">
                  {percent(account.currentBalance, Number(account.creditLimit ?? 0))}% of {formatCurrency(Number(account.creditLimit ?? 0))} used
                </div>
              </div>
            ))}
          </div>
        </MotionPanel>

        <MotionPanel className="section-pad-lg stack-md" delay={0.28}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Workflow choreography</h2>
              <p className="panel-subtitle">The app separates intent from funding source so users do not double count card repayments.</p>
            </div>
            <ActionLink href="/add">Try it live</ActionLink>
          </div>

          <div className="workflow-grid">
            {[
              ["1", "Choose the intent", "Expense, income, transfer, or repayment."],
              ["2", "Choose the rail", "UPI, card, cash, bank transfer, or AutoPay."],
              ["3", "Choose the source", "Bank account, card, wallet, or liability destination."],
              ["4", "Preview the effect", "See analytics and balance impact before saving."],
            ].map(([index, title, description]) => (
              <div key={title} className="workflow-step">
                <div className="workflow-index">{index}</div>
                <h3 className="account-name">{title}</h3>
                <p className="account-provider">{description}</p>
              </div>
            ))}
          </div>
        </MotionPanel>
      </div>

      <div style={{ height: 16 }} />

      <div className="insight-grid">
        <MotionPanel className="section-pad stack-md" delay={0.32}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Budget signal</h2>
              <p className="panel-subtitle">Focus categories that are pacing fastest this month.</p>
            </div>
            <ActionLink href="/budget">Open budgets</ActionLink>
          </div>

          <div className="budget-list">
            {snapshot.budgetProgress.map((budget) => (
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

        <MotionPanel className="section-pad stack-md" delay={0.36}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Mandate radar</h2>
              <p className="panel-subtitle">Recurring charges should be visible before they become invisible leakage.</p>
            </div>
          </div>
          <div className="mandate-list">
            {snapshot.upcomingMandates.map((mandate) => (
              <div key={mandate.id} className="mandate-card">
                <div className="mandate-row">
                  <div>
                    <p className="mandate-title">{mandate.merchantName}</p>
                    <p className="mandate-meta">
                      {mandate.frequency} · {formatCurrency(mandate.amount)}
                    </p>
                  </div>
                  <StatTag tone={mandate.status === "active" ? "good" : "neutral"}>
                    {mandate.status}
                  </StatTag>
                </div>
                <p className="mandate-meta" style={{ marginTop: "0.8rem" }}>
                  {mandate.note}
                </p>
                <p className="mandate-meta">
                  Next run {new Date(mandate.nextTriggerAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} from {mandate.sourceAccount?.provider}
                </p>
              </div>
            ))}
          </div>
        </MotionPanel>

        <MotionPanel className="section-pad stack-md" delay={0.4}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Latest ledger movement</h2>
              <p className="panel-subtitle">Every entry tells you what moved, which rail was used, and whether analytics changed.</p>
            </div>
            <ActionLink href="/transactions">Open ledger</ActionLink>
          </div>

          <div className="timeline-list">
            {snapshot.recentTransactions.slice(0, 4).map((transaction) => (
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
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.44, duration: 0.5 }}
        className="flow-note"
        style={{ marginTop: "1rem" }}
      >
        Product rule to protect at all costs: a credit card swipe is the spend event, while the card bill payment is only a repayment event. That single separation keeps dashboards, analytics, and bank cash flow honest.
      </motion.div>
    </main>
  );
}
