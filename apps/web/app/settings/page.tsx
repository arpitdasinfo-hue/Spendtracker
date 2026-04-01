"use client";

import { useFinance } from "@/components/finance/FinanceProvider";
import { MotionPanel, PageHeader } from "@/components/finance/Primitives";

export default function SettingsPage() {
  const { resetDemo } = useFinance();

  return (
    <main className="page">
      <PageHeader
        eyebrow="Product settings"
        title="The operating rules behind the experience."
        subtitle="These settings are intentionally opinionated. The product is optimized for accurate spend tracking, clear cash flow, and responsible credit-card handling."
      />

      <div className="split-grid">
        <MotionPanel className="section-pad-lg stack-md" delay={0.05}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Accounting model</h2>
              <p className="panel-subtitle">This product defaults to purchase-date tracking for real spend.</p>
            </div>
          </div>
          <div className="flow-note">
            Credit card purchases count as expense on the purchase date.
          </div>
          <div className="flow-note">
            Credit card repayments reduce cash and card outstanding, but do not count as another expense.
          </div>
          <div className="flow-note">
            Transfers between your own accounts stay out of income and spend analytics.
          </div>
        </MotionPanel>

        <MotionPanel className="section-pad-lg stack-md" delay={0.1}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Import and platform notes</h2>
              <p className="panel-subtitle">The product strategy differs by platform capability.</p>
            </div>
          </div>
          <div className="flow-note">
            Android can support richer transaction ingestion through device-side SMS parsing flows.
          </div>
          <div className="flow-note">
            iPhone should not rely on full inbox SMS parsing as a core ingestion path. A stronger approach is statement sync, email parsing, or manual share/import.
          </div>
          <button type="button" className="button button-secondary" onClick={resetDemo}>
            Reset local demo data
          </button>
        </MotionPanel>
      </div>
    </main>
  );
}
