"use client";

import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const enabled = hasSupabaseEnv();

  async function loginWithGoogle() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setMessage("Add your Supabase URL and anon key first.");
      return;
    }

    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
    }
  }

  return (
    <main className="page" style={{ display: "grid", placeItems: "center", minHeight: "100dvh" }}>
      <section className="panel section-pad-lg" style={{ maxWidth: "38rem", width: "100%" }}>
        <div className="stack-lg">
          <div>
            <div className="eyebrow">Supabase sync</div>
            <h1 className="display-title" style={{ fontSize: "clamp(2.4rem, 7vw, 4.2rem)" }}>
              Sign in to save money data for real.
            </h1>
            <p className="page-subtitle">
              This build now persists accounts, transactions, budgets, goals, and mandates in Supabase with row-level security per user.
            </p>
          </div>

          {enabled ? (
            <>
              <div className="flow-note">
                Use Google sign-in to create a secure per-user workspace. Once you are in, the provider seeds a starter dataset the first time and then all new entries sync to Supabase.
              </div>
              <div className="button-row">
                <button type="button" className="button button-primary" onClick={loginWithGoogle} disabled={loading}>
                  {loading ? "Redirecting…" : "Continue with Google"}
                </button>
                <Link href="/dashboard" className="button button-secondary">
                  Back to app
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="flow-note">
                Supabase environment variables are missing. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, then run the SQL in `apps/web/scripts/supabase_finance_schema.sql`.
              </div>
              <div className="button-row">
                <Link href="/dashboard" className="button button-secondary">
                  View app shell
                </Link>
              </div>
            </>
          )}

          {message ? <div className="flow-note">{message}</div> : null}
        </div>
      </section>
    </main>
  );
}
