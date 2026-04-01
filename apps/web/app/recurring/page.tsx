"use client";

import { useFinance } from "@/components/finance/FinanceProvider";
import { MotionPanel, PageHeader, StatTag } from "@/components/finance/Primitives";
import { formatCurrency } from "@/lib/finance";

export default function RecurringPage() {
  const { state } = useFinance();

  return (
    <main className="page">
      <PageHeader
        eyebrow="Mandates and subscriptions"
        title="Recurring money needs its own control tower."
        subtitle="Mandates are recurring authorizations, not generic transactions. They should be modeled separately and only create actual ledger entries when they fire."
      />

      <div className="split-grid">
        <MotionPanel className="section-pad-lg stack-md" delay={0.05}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Active mandates</h2>
              <p className="panel-subtitle">UPI AutoPay, debit card mandates, and credit card e-mandates all belong here.</p>
            </div>
          </div>

          <div className="mandate-list">
            {state.mandates.map((mandate) => (
              <div key={mandate.id} className="mandate-card">
                <div className="mandate-row">
                  <div>
                    <p className="mandate-title">{mandate.merchantName}</p>
                    <p className="mandate-meta">
                      {mandate.frequency} · {formatCurrency(mandate.amount)}
                    </p>
                  </div>
                  <StatTag tone={mandate.status === "active" ? "good" : "neutral"}>{mandate.status}</StatTag>
                </div>
                <p className="mandate-meta" style={{ marginTop: "0.8rem" }}>
                  {mandate.note}
                </p>
                <p className="mandate-meta">
                  Next trigger {new Date(mandate.nextTriggerAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {mandate.paymentRail.replace("_", " ")}
                </p>
              </div>
            ))}
          </div>
        </MotionPanel>

        <MotionPanel className="section-pad-lg stack-md" delay={0.1}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Design rules</h2>
              <p className="panel-subtitle">Recurring experiences stay trustworthy when they mirror the ledger model.</p>
            </div>
          </div>

          <div className="flow-note">
            A card subscription charge is an expense when it executes, not when the card bill is repaid later.
          </div>
          <div className="flow-note">
            A card bill AutoPay mandate should create a repayment entry, not an expense entry.
          </div>
          <div className="flow-note">
            UPI AutoPay keeps the rail as UPI, but the balance impact still belongs to the linked bank account or supported credit source.
          </div>
        </MotionPanel>
      </div>
    </main>
  );
}
