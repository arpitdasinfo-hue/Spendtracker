"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function loginWithGoogle() {
    setMsg(null);
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) { setMsg(error.message); setLoading(false); }
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <div
        className="card fadeUp"
        style={{
          width: "100%",
          maxWidth: 440,
          padding: "40px 36px",
          position: "relative",
          overflow: "hidden",
          borderColor: "rgba(124,58,237,.22)",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 400px 260px at 15% 10%, rgba(34,211,238,.10), transparent 60%)," +
              "radial-gradient(ellipse 360px 220px at 85% 15%, rgba(124,58,237,.16), transparent 55%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "linear-gradient(145deg, var(--neonA), var(--neonB2))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                boxShadow: "0 0 24px rgba(124,58,237,.45), 0 0 48px rgba(34,211,238,.15)",
                flexShrink: 0,
              }}
            >
              ⚡
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-.3px" }}>SpendTracker</div>
              <div className="faint" style={{ fontSize: 12, marginTop: 1 }}>Dark neon finance</div>
            </div>
          </div>

          <h1 className="h1" style={{ lineHeight: 1.1, marginBottom: 10 }}>
            Track money at the{" "}
            <span style={{
              background: "linear-gradient(120deg, var(--neonB2) 0%, var(--neonA2) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              speed of life.
            </span>
          </h1>
          <p className="sub" style={{ marginBottom: 28 }}>
            Private by design. No spreadsheets. No clutter.
          </p>

          <button
            className="btn"
            style={{
              width: "100%",
              padding: "14px 20px",
              fontSize: 15,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              borderColor: "rgba(255,255,255,.14)",
              background: "rgba(255,255,255,.06)",
            }}
            onClick={loginWithGoogle}
            disabled={loading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {loading ? "Connecting…" : "Continue with Google"}
          </button>

          <div className="sep" style={{ margin: "20px 0" }} />

          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(52,211,153,.65)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2, flexShrink: 0 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <p className="faint" style={{ fontSize: 12, lineHeight: 1.5, margin: 0 }}>
              Per-user row-level security. Your data is completely private.
            </p>
          </div>

          {msg && (
            <div className="toast" style={{ marginTop: 16, borderColor: "rgba(244,63,94,.3)" }}>
              <span style={{ color: "var(--bad)" }}>⚠ </span>
              <span className="muted">{msg}</span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
