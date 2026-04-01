"use client";

import { motion } from "framer-motion";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMobileNumber, normalizeMobileNumber } from "@/lib/auth-phone";
import { createSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "create-account">("sign-in");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingVerificationPhone, setPendingVerificationPhone] = useState<string | null>(null);
  const [phoneAuthEnabled, setPhoneAuthEnabled] = useState<boolean | null>(null);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const enabled = hasSupabaseEnv();
  const authBlocked = enabled && phoneAuthEnabled === false;

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
        };

        if (!active) {
          return;
        }

        const phoneEnabled = Boolean(data?.external?.phone);
        setPhoneAuthEnabled(phoneEnabled);
        setSetupMessage(
          phoneEnabled
            ? null
            : "Phone auth is disabled in Supabase. Enable Authentication -> Phone before using mobile number sign-in or account creation."
        );
      } catch {
        if (!active) {
          return;
        }

        setPhoneAuthEnabled(null);
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
      setMessage("Phone auth is disabled in Supabase. Enable Authentication -> Phone before using mobile number sign-in or account creation.");
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

      setPendingVerificationPhone(normalizedPhone);
      setOtp("");
      setMessage(`We sent a verification code to ${formatMobileNumber(normalizedPhone) ?? normalizedPhone}. Enter it below to finish creating the workspace.`);
    } catch (error) {
      setMessage(error instanceof Error ? explainAuthError(error.message) : "Unable to complete sign-in right now.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const supabase = createSupabaseBrowserClient();
    if (!supabase || !pendingVerificationPhone) {
      setMessage("Start by creating an account.");
      return;
    }

    if (!otp.trim()) {
      setMessage("Enter the verification code sent to your phone.");
      return;
    }

    if (authBlocked) {
      setMessage("Phone auth is disabled in Supabase. Enable Authentication -> Phone before using mobile number sign-in or account creation.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: pendingVerificationPhone,
        token: otp.trim(),
        type: "sms",
      });

      if (error) {
        throw error;
      }

      if (!data.session) {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          phone: pendingVerificationPhone,
          password,
        });

        if (loginError) {
          throw loginError;
        }
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? explainAuthError(error.message) : "Unable to verify the code right now.");
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
                    setPendingVerificationPhone(null);
                    setOtp("");
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
                    setPendingVerificationPhone(null);
                    setOtp("");
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
                    : "Create an account with your number and password. If phone confirmation is enabled in Supabase, this screen will ask for the SMS code next."}
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

              {pendingVerificationPhone ? (
                <form className="stack-md" onSubmit={handleOtpVerification}>
                  <div className="preview-panel">
                    <div className="preview-kicker">Verify number</div>
                    <p className="page-subtitle" style={{ marginTop: 0 }}>
                      Finish account setup for {formatMobileNumber(pendingVerificationPhone) ?? pendingVerificationPhone}.
                    </p>
                    <div className="field" style={{ marginTop: "1rem" }}>
                      <span className="field-label">SMS code</span>
                      <input
                        className="input"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="Enter the 6-digit code"
                        value={otp}
                        onChange={(event) => setOtp(event.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="button-row">
                    <button type="submit" className="button button-primary" disabled={loading || authBlocked}>
                      {loading ? "Verifying…" : "Verify and continue"}
                    </button>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => {
                        setPendingVerificationPhone(null);
                        setOtp("");
                        setMessage(null);
                      }}
                      disabled={loading}
                    >
                      Use a different number
                    </button>
                  </div>
                </form>
              ) : null}
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
