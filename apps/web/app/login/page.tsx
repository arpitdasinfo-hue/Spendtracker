"use client";

import { motion } from "framer-motion";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { normalizeMobileNumber } from "@/lib/auth-phone";
import { createSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "create-account">("sign-in");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [phoneAuthEnabled, setPhoneAuthEnabled] = useState<boolean | null>(null);
  const [phoneAutoconfirmEnabled, setPhoneAutoconfirmEnabled] = useState<boolean | null>(null);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const enabled = hasSupabaseEnv();
  const authBlocked = enabled && (phoneAuthEnabled === false || phoneAutoconfirmEnabled === false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let active = true;

    async function loadAuthSettings() {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          external?: {
            phone?: boolean;
          };
          phone_autoconfirm?: boolean;
        };

        if (!active) {
          return;
        }

        const phoneEnabled = Boolean(data?.external?.phone);
        const phoneAutoconfirm = Boolean(data?.phone_autoconfirm);
        setPhoneAuthEnabled(phoneEnabled);
        setPhoneAutoconfirmEnabled(phoneAutoconfirm);
        setSetupMessage(
          !phoneEnabled
            ? "Phone auth is disabled in Supabase. Enable Authentication -> Phone before using mobile number sign-in or account creation."
            : !phoneAutoconfirm
              ? "Phone confirmation is still required in Supabase. Turn on auto-confirm for phone users if you want pure mobile number + password signup with no OTP."
              : null
        );
      } catch {
        if (!active) {
          return;
        }

        setPhoneAuthEnabled(null);
        setPhoneAutoconfirmEnabled(null);
      }
    }

    void loadAuthSettings();

    return () => {
      active = false;
    };
  }, [enabled]);

  function explainAuthError(rawMessage: string) {
    const lower = rawMessage.toLowerCase();

    if (lower.includes("invalid login credentials")) {
      return "That mobile number and password do not match.";
    }

    if (lower.includes("already registered")) {
      return "This mobile number already has an account. Switch to sign in instead.";
    }

    if (
      lower.includes("phone logins are disabled") ||
      lower.includes("unsupported phone provider") ||
      lower.includes("phone provider is disabled")
    ) {
      return "Phone auth is disabled in Supabase. Enable Authentication -> Phone before using mobile number sign-in or account creation.";
    }

    if (lower.includes("sms") && lower.includes("provider")) {
      return "Supabase phone auth is on, but SMS delivery is not configured correctly yet. Check the SMS provider settings in Supabase Auth.";
    }

    if (lower.includes("phone")) {
      return "Enter a valid mobile number, including country code if it is not an Indian 10-digit number.";
    }

    return rawMessage;
  }

  async function handlePrimarySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setMessage("Add your Supabase URL and anon key first.");
      return;
    }

    const normalizedPhone = normalizeMobileNumber(phone);
    if (!normalizedPhone) {
      setMessage("Enter a valid mobile number. A standard 10-digit Indian number works too.");
      return;
    }

    if (password.trim().length < 8) {
      setMessage("Use at least 8 characters for the password.");
      return;
    }

    if (authBlocked) {
      setMessage("Enable Supabase phone auth and phone auto-confirm before using this mobile number + password flow.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({
          phone: normalizedPhone,
          password,
        });

        if (error) {
          throw error;
        }

        router.replace("/dashboard");
        router.refresh();
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        phone: normalizedPhone,
        password,
        options: {
          data: {
            login_phone: normalizedPhone,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      setMessage("Account created, but Supabase did not return a session. For this no-OTP experience, enable phone auto-confirm in Supabase Auth.");
    } catch (error) {
      setMessage(error instanceof Error ? explainAuthError(error.message) : "Unable to complete sign-in right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page" style={{ display: "grid", placeItems: "center", minHeight: "100dvh" }}>
      <motion.section
        className="panel section-pad-lg"
        initial={{ opacity: 0, y: 22, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        style={{ maxWidth: "38rem", width: "100%" }}
      >
        <div className="stack-lg">
          <div>
            <div className="eyebrow">Secure workspace access</div>
            <h1 className="display-title" style={{ fontSize: "clamp(2.4rem, 7vw, 4.2rem)" }}>
              Sign in with your mobile number.
            </h1>
            <p className="page-subtitle">
              This build persists accounts, transactions, budgets, goals, and mandates in Supabase with row-level security per user. Just your number and password.
            </p>
          </div>

          {enabled ? (
            <>
              {setupMessage ? <div className="flow-note" aria-live="polite">{setupMessage}</div> : null}

              <div className="segmented-control" role="tablist" aria-label="Authentication mode">
                <button
                  type="button"
                  className={`segment ${mode === "sign-in" ? "segment-active" : ""}`}
                  onClick={() => {
                    setMode("sign-in");
                    setMessage(null);
                  }}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className={`segment ${mode === "create-account" ? "segment-active" : ""}`}
                  onClick={() => {
                    setMode("create-account");
                    setMessage(null);
                  }}
                >
                  Create account
                </button>
              </div>

              <form className="stack-md" onSubmit={handlePrimarySubmit}>
                <div className="form-grid">
                  <label className="field field-full">
                    <span className="field-label">Mobile number</span>
                    <input
                      className="input"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="98765 43210 or +91 98765 43210"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      disabled={loading}
                    />
                    <span className="helper-text">
                      Ten-digit Indian numbers are automatically normalized to `+91`.
                    </span>
                  </label>

                  <label className="field field-full">
                    <span className="field-label">Password</span>
                    <input
                      className="input"
                      type="password"
                      autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                      placeholder="Minimum 8 characters"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={loading}
                    />
                  </label>
                </div>

                <div className="flow-note">
                  {mode === "sign-in"
                    ? "Use the same number and password you set for this workspace. Your finance data stays scoped to your account in Supabase."
                    : "Create an account with your number and password. This product expects a direct no-OTP signup flow when Supabase phone auth and phone auto-confirm are enabled."}
                </div>

                {message ? <div className="flow-note" aria-live="polite">{message}</div> : null}

                <div className="button-row">
                  <button type="submit" className="button button-primary" disabled={loading || authBlocked}>
                    {loading ? "Working…" : mode === "sign-in" ? "Sign in" : "Create account"}
                  </button>
                  <Link href="/dashboard" className="button button-secondary">
                    Back to app
                  </Link>
                </div>
              </form>
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
        </div>
      </motion.section>
    </main>
  );
}
