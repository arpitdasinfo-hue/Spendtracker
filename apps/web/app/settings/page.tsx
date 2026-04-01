"use client";

import { useState } from "react";
import Link from "next/link";
import { useFinance } from "@/components/finance/FinanceProvider";
import { MotionPanel, PageHeader } from "@/components/finance/Primitives";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const { resetDemo, status, hasSupabase, userIdentity, error } = useFinance();
  const [resetting, setResetting] = useState(false);

  async function handleResetDemo() {
    setResetting(true);
    try {
      await resetDemo();
    } finally {
      setResetting(false);
    }
  }

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase?.auth.signOut();
  }

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
              <h2 className="panel-title">Sync and platform notes</h2>
              <p className="panel-subtitle">This environment now expects Supabase as the system of record.</p>
            </div>
          </div>
          <div className="flow-note">
            {hasSupabase
              ? `Supabase environment is configured.${userIdentity ? ` Signed in as ${userIdentity}.` : " Sign in is required to persist data."}`
              : "Supabase environment variables are missing. Add them before expecting persistence."}
          </div>
          <div className="flow-note">
            Login now uses mobile number + password in the UI, backed by a private email/password identifier in Supabase so the product does not depend on Twilio or phone OTP setup.
          </div>
          {error ? <div className="flow-note">{error}</div> : null}
          <div className="flow-note">
            Android can support richer transaction ingestion through device-side SMS parsing flows.
          </div>
          <div className="flow-note">
            iPhone should not rely on full inbox SMS parsing as a core ingestion path. A stronger approach is statement sync, email parsing, or manual share/import.
          </div>
          <div className="button-row">
            <button type="button" className="button button-secondary" onClick={handleResetDemo} disabled={status !== "ready" || resetting}>
              {resetting ? "Resetting…" : "Seed demo data in Supabase"}
            </button>
            {status === "ready" ? (
              <button type="button" className="button button-secondary" onClick={handleSignOut}>
                Sign out
              </button>
            ) : (
              <Link href="/login" className="button button-primary">
                Open login
              </Link>
            )}
          </div>
        </MotionPanel>
      </div>
    </main>
  );
}
