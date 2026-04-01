"use client";

import { useState } from "react";
import { useFinance } from "@/components/finance/FinanceProvider";
import { MetricCard, MotionPanel, PageHeader, SegmentedControl, StatTag } from "@/components/finance/Primitives";
import { buildFinanceSnapshot, formatCurrency, formatLongDate, getAccountById, type EntryType } from "@/lib/finance";

type Filter = "all" | EntryType;
type ViewMode = "spend" | "cashflow";

export default function TransactionsPage() {
  const { state } = useFinance();
  const snapshot = buildFinanceSnapshot(state);
  const [filter, setFilter] = useState<Filter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("spend");

  const orderedTransactions = [...state.transactions].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );

  const filteredTransactions = orderedTransactions.filter((transaction) => {
    if (filter === "all") return true;
    return transaction.type === filter;
  });

  const grouped = filteredTransactions.reduce<Array<{ label: string; items: typeof filteredTransactions }>>((groups, transaction) => {
    const label = new Intl.DateTimeFormat("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(new Date(transaction.createdAt));
    const bucket = groups.find((group) => group.label === label);
    if (bucket) {
      bucket.items.push(transaction);
      return groups;
    }
    groups.push({ label, items: [transaction] });
    return groups;
  }, []);

  const headlineValue =
    viewMode === "spend" ? snapshot.monthSummary.expense : snapshot.monthSummary.cashOutflow;

  return (
    <main className="page">
      <PageHeader
        eyebrow="Ledger that stays honest"
        title="Every movement, clearly classified."
        subtitle="Spend view shows consumption. Cash flow view shows bank outflow. The ledger keeps both lenses available without ever counting a credit-card repayment as new spend."
      />

      <div className="split-grid">
        <MotionPanel className="section-pad stack-md" delay={0.05}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Filters</h2>
              <p className="panel-subtitle">Switch the lens before reading the numbers.</p>
            </div>
          </div>
          <SegmentedControl
            value={viewMode}
            onChange={(value) => setViewMode(value as ViewMode)}
            items={[
              { value: "spend", label: "Spend view" },
              { value: "cashflow", label: "Cash flow view" },
            ]}
          />
          <SegmentedControl
            value={filter}
            onChange={(value) => setFilter(value as Filter)}
            items={[
              { value: "all", label: "All" },
              { value: "expense", label: "Expense" },
              { value: "income", label: "Income" },
              { value: "transfer", label: "Transfer" },
              { value: "repayment", label: "Repayment" },
            ]}
          />
          <div className="flow-note">
            {viewMode === "spend"
              ? "Spend view includes only actual expenses, whether they were paid by bank, debit card, UPI, or credit card."
              : "Cash flow view surfaces bank-backed expense outflow and card repayments together so liquidity pressure is easy to read."}
          </div>
        </MotionPanel>

        <div className="metric-grid">
          <MetricCard
            label={viewMode === "spend" ? "Spend in focus" : "Cash outflow in focus"}
            value={formatCurrency(headlineValue)}
            hint={viewMode === "spend" ? "Expenses only." : "Bank-backed spend plus repayments."}
            tone="accent"
          />
          <MetricCard
            label="Income this month"
            value={formatCurrency(snapshot.monthSummary.income)}
            hint="Used to calculate net movement."
            tone="good"
          />
          <MetricCard
            label="Transfers"
            value={formatCurrency(snapshot.monthSummary.transferVolume)}
            hint="Internal liquidity movements."
          />
          <MetricCard
            label="Repayments"
            value={formatCurrency(snapshot.monthSummary.repayments)}
            hint="Visible here, excluded from expense totals."
            tone="danger"
          />
        </div>
      </div>

      <div style={{ height: 16 }} />

      <div className="split-grid">
        <MotionPanel className="section-pad-lg stack-md" delay={0.1}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Timeline ledger</h2>
              <p className="panel-subtitle">{filteredTransactions.length} entries currently in view.</p>
            </div>
            <StatTag tone="neutral">{filter}</StatTag>
          </div>

          <div className="timeline-list">
            {grouped.map((group) => (
              <div key={group.label}>
                <div className="timeline-label">{group.label}</div>
                <div className="timeline-list">
                  {group.items.map((transaction) => {
                    const fromAccount = getAccountById(state, transaction.fromAccountId);
                    const toAccount = getAccountById(state, transaction.toAccountId);

                    return (
                      <div key={transaction.id} className="timeline-card">
                        <div className="ledger-row">
                          <div>
                            <p className="ledger-title">{transaction.title}</p>
                            <p className="ledger-meta">
                              {transaction.category} · {transaction.paymentRail.replace("_", " ")} · {transaction.origin}
                            </p>
                          </div>
                          <div
                            className={`ledger-amount ${
                              transaction.type === "income"
                                ? "amount-positive"
                                : transaction.type === "expense"
                                  ? "amount-negative"
                                  : ""
                            }`}
                          >
                            {transaction.type === "income" ? "+" : transaction.type === "expense" ? "-" : ""}
                            {formatCurrency(transaction.amount)}
                          </div>
                        </div>
                        <p className="ledger-meta" style={{ marginTop: "0.8rem" }}>
                          {fromAccount ? `From ${fromAccount.provider}` : "No source account"}{toAccount ? ` to ${toAccount.provider}` : ""} · {formatLongDate(transaction.createdAt)}
                        </p>
                        <p className="ledger-meta">{transaction.note}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </MotionPanel>

        <MotionPanel className="section-pad-lg stack-md" delay={0.16}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Classification rules</h2>
              <p className="panel-subtitle">These are the product guardrails that keep reports clean.</p>
            </div>
          </div>

          <div className="workflow-grid">
            {[
              {
                title: "Expense",
                body: "Counts toward category analytics immediately, including credit-card purchases and UPI on supported credit cards.",
              },
              {
                title: "Income",
                body: "Increases asset balances and feeds savings-rate visibility.",
              },
              {
                title: "Transfer",
                body: "Moves money between your own accounts and stays out of spend analytics.",
              },
              {
                title: "Repayment",
                body: "Reduces card outstanding and bank balance but does not inflate expense totals.",
              },
            ].map((item, index) => (
              <div key={item.title} className="workflow-step">
                <div className="workflow-index">{index + 1}</div>
                <h3 className="account-name">{item.title}</h3>
                <p className="account-provider">{item.body}</p>
              </div>
            ))}
          </div>

          <div className="flow-note">
            Users often feel the card repayment as a real cash pinch. That is why the app shows it in cash flow and due management, while spend view continues to anchor the purchase to the day the consumption actually happened.
          </div>
        </MotionPanel>
      </div>
    </main>
  );
}
