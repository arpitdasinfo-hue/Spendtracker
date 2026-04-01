"use client";

import { motion } from "framer-motion";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getMobileLoginEmail, normalizeMobileNumber } from "@/lib/auth-phone";
import { createSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";

interface AuthSettingsResponse {
  external?: {
    email?: boolean;
  };
  mailer_autoconfirm?: boolean;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "create-account">("sign-in");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showCreateAccountHint, setShowCreateAccountHint] = useState(false);
  const enabled = hasSupabaseEnv();
  const primaryCtaLabel = loading ? "Working…" : mode === "sign-in" ? "Sign in" : "Create account";

  function explainAuthError(rawMessage: string) {
    const lower = rawMessage.toLowerCase();

    if (lower.includes("invalid login credentials")) {
      return "We couldn't sign you in with that mobile number and password. Either this account hasn't been created yet, or the password is incorrect.";
    }

    if (lower.includes("already registered")) {
      return "This mobile number already has an account. Switch to sign in instead.";
    }

    if (lower.includes("email not confirmed")) {
      return "Account creation reached Supabase, but instant sign-in is still blocked by email confirmation. Add SUPABASE_SERVICE_ROLE_KEY on the server or disable email confirmation in Supabase Auth -> Email.";
    }

    if (lower.includes("email provider is disabled") || lower.includes("email logins are disabled")) {
      return "Supabase email auth is disabled. Enable Authentication -> Email or add SUPABASE_SERVICE_ROLE_KEY to keep this mobile-number login design working.";
    }

    if (lower.includes("phone")) {
      return "Enter a valid mobile number, including country code if it is not an Indian 10-digit number.";
    }

    return rawMessage;
  }

  async function loadAuthSettings() {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as AuthSettingsResponse;
  }

  async function handlePrimarySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowCreateAccountHint(false);

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

    const loginEmail = getMobileLoginEmail(normalizedPhone);
    if (!loginEmail) {
      setMessage("Unable to prepare sign-in for that mobile number.");
      return;
    }

    if (password.trim().length < 8) {
      setMessage("Use at least 8 characters for the password.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password,
        });

        if (error) {
          throw error;
        }

        router.replace("/dashboard");
        router.refresh();
        return;
      }

      const signupResponse = await fetch("/api/auth/mobile-signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: normalizedPhone,
          password,
        }),
      });

      const signupPayload = (await signupResponse.json().catch(() => null)) as
        | {
            code?: string;
            error?: string;
          }
        | null;

      if (!signupResponse.ok) {
        if (signupPayload?.code === "missing_service_role") {
          const authSettings = await loadAuthSettings();
          const emailAuthEnabled = Boolean(authSettings?.external?.email);
          const mailerAutoconfirm = Boolean(authSettings?.mailer_autoconfirm);

          if (!emailAuthEnabled) {
            throw new Error("Supabase email auth is disabled. Enable Authentication -> Email or add SUPABASE_SERVICE_ROLE_KEY to keep this mobile-number login design working.");
          }

          if (!mailerAutoconfirm) {
            throw new Error(
              "Direct no-OTP signup is not fully configured yet. Add SUPABASE_SERVICE_ROLE_KEY on the server or disable email confirmation in Supabase Auth -> Email. No account was created."
            );
          }

          const { error } = await supabase.auth.signUp({
            email: loginEmail,
            password,
            options: {
              data: {
                login_phone: normalizedPhone,
                auth_design: "mobile-password-email-bridge",
              },
            },
          });

          if (error) {
            throw error;
          }
        } else if (signupPayload?.error) {
          throw new Error(signupPayload.error);
        } else {
          throw new Error("Unable to create an account right now.");
        }
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      const nextMessage = error instanceof Error ? explainAuthError(error.message) : "Unable to complete sign-in right now.";
      const shouldSuggestCreateAccount =
        mode === "sign-in" &&
        error instanceof Error &&
        error.message.toLowerCase().includes("invalid login credentials");

      setShowCreateAccountHint(shouldSuggestCreateAccount);
      setMessage(nextMessage);
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
              This build persists accounts, transactions, budgets, goals, and mandates in Supabase with row-level security per user. You use your number and password, while the product maps that identity privately behind the scenes.
            </p>
          </div>

          {enabled ? (
            <>
              <div className="segmented-control" role="tablist" aria-label="Authentication mode">
                <button
                  type="button"
                  className={`segment ${mode === "sign-in" ? "segment-active" : ""}`}
                  onClick={() => {
                    setMode("sign-in");
                    setMessage(null);
                    setShowCreateAccountHint(false);
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
                    setShowCreateAccountHint(false);
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
                    ? "Sign in with the mobile number you used when you created your account. Your data stays scoped to that account in Supabase."
                    : "First time here? Create your account with a mobile number and password. No OTP, no SMS provider, and your mobile number is stored in your Supabase user metadata."}
                </div>

                {message ? <div className="flow-note" aria-live="polite">{message}</div> : null}

                {showCreateAccountHint ? (
                  <div className="flow-note" aria-live="polite">
                    New here? Use `Create account` first. Returning users can stay on `Sign in` and retry with the password they set earlier.
                    <div className="button-row" style={{ marginTop: "0.85rem" }}>
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => {
                          setMode("create-account");
                          setMessage(null);
                          setShowCreateAccountHint(false);
                        }}
                      >
                        Switch to create account
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="button-row">
                  <button
                    type="submit"
                    className="button button-primary"
                    disabled={loading}
                    aria-disabled={loading}
                  >
                    {primaryCtaLabel}
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
