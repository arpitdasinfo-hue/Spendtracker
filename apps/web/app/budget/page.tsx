"use client";

import { useFinance } from "@/components/finance/FinanceProvider";
import { MetricCard, MotionPanel, PageHeader, StatTag } from "@/components/finance/Primitives";
import { buildFinanceSnapshot, formatCurrency } from "@/lib/finance";

export default function BudgetPage() {
  const { state } = useFinance();
  const snapshot = buildFinanceSnapshot(state);

  const safeToSave = snapshot.monthSummary.income - snapshot.monthSummary.cashOutflow;

  return (
    <main className="page">
      <PageHeader
        eyebrow="Spending guardrails"
        title="Budgets that understand cash and cards."
        subtitle="Category budgets use purchase-date spend, not repayment-date noise. That means you can see true behavior even when the card bill lands later."
      />

      <div className="metric-grid">
        <MetricCard
          label="Total budgeted"
          value={formatCurrency(state.budgets.reduce((sum, budget) => sum + budget.limit, 0))}
          hint="Across the categories you actively guard."
          tone="accent"
        />
        <MetricCard
          label="Spent so far"
          value={formatCurrency(snapshot.monthSummary.expense)}
          hint="Current month spend view."
        />
        <MetricCard
          label="Still safe to save"
          value={formatCurrency(safeToSave)}
          hint="Income minus cash-backed outflow."
          tone={safeToSave >= 0 ? "good" : "danger"}
        />
        <MetricCard
          label="Card pressure"
          value={formatCurrency(snapshot.liabilitiesTotal)}
          hint="Outstanding that will turn into future cash outflow."
          tone="danger"
        />
      </div>

      <div style={{ height: 16 }} />

      <div className="split-grid">
        <MotionPanel className="section-pad-lg stack-md" delay={0.05}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Category pacing</h2>
              <p className="panel-subtitle">The most important budget job is to show what needs attention before the month gets away.</p>
            </div>
          </div>

          <div className="budget-list">
            {snapshot.budgetProgress.map((budget) => (
              <div key={budget.category} className="budget-card">
                <div className="budget-row">
                  <div>
                    <p className="account-name">{budget.category}</p>
                    <p className="account-provider">
                      {formatCurrency(budget.spent)} spent of {formatCurrency(budget.limit)}
                    </p>
                  </div>
                  <StatTag tone={budget.ratio > 0.85 ? "danger" : "good"}>
                    {Math.round(budget.ratio * 100)}%
                  </StatTag>
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
                <p className="account-provider" style={{ marginTop: "0.8rem" }}>
                  {budget.ratio > 0.85
                    ? "Pacing hot. Review next spends or shift funds."
                    : "Healthy pacing for now."}
                </p>
              </div>
            ))}
          </div>
        </MotionPanel>

        <MotionPanel className="section-pad-lg stack-md" delay={0.1}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Savings goals</h2>
              <p className="panel-subtitle">Goals turn extra cash flow into something intentional.</p>
            </div>
          </div>

          <div className="budget-list">
            {state.goals.map((goal) => {
              const progress = goal.saved / goal.target;

              return (
                <div key={goal.id} className="goal-card">
                  <div className="goal-row">
                    <div>
                      <p className="goal-title">{goal.name}</p>
                      <p className="goal-meta">Target {formatCurrency(goal.target)} · due {goal.dueMonth}</p>
                    </div>
                    <StatTag tone="accent">{Math.round(progress * 100)}%</StatTag>
                  </div>
                  <div className="budget-track">
                    <div
                      className="budget-fill"
                      style={{
                        width: `${Math.min(100, Math.round(progress * 100))}%`,
                        background: "linear-gradient(90deg, var(--accent) 0%, var(--ink) 100%)",
                      }}
                    />
                  </div>
                  <p className="goal-meta" style={{ marginTop: "0.8rem" }}>
                    {formatCurrency(goal.saved)} already ring-fenced.
                  </p>
                </div>
              );
            })}
          </div>

          <div className="flow-note">
            Budgeting is based on actual consumption, not on when the repayment hits the bank account. That means a March card swipe belongs to March spend, even if the cash leaves in April.
          </div>
        </MotionPanel>
      </div>
    </main>
  );
}
