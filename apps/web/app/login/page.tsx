"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [msg, setMsg] = useState<string | null>(null);

  async function loginWithGoogle() {
    setMsg(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
    if (error) setMsg(error.message);
  }

  return (
    <main className="container" style={{ paddingTop: 44 }}>
      <div
        className="card cardPad"
        style={{
          maxWidth: 520,
          margin: "0 auto",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: -120,
            background:
              "radial-gradient(600px 260px at 20% 20%, rgba(34,211,238,.20), transparent 60%)," +
              "radial-gradient(520px 220px at 80% 30%, rgba(124,58,237,.28), transparent 60%)," +
              "radial-gradient(520px 260px at 50% 90%, rgba(251,113,133,.16), transparent 65%)",
            filter: "blur(10px)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative" }}>
          <div className="pill">
            <span>⚡</span>
            <span className="muted">SpendTracker</span>
            <span className="kbd">INR</span>
          </div>

          <h1 className="h1" style={{ marginTop: 14 }}>
            Track money at the speed of life.
          </h1>
          <p className="sub">
            Dark neon dashboard. Private by design. No spreadsheets.
          </p>

          <div className="sep" />

          <button className="btn btnPrimary" style={{ width: "100%" }} onClick={loginWithGoogle}>
            Continue with Google
          </button>

          <p className="faint" style={{ marginTop: 12, fontSize: 12, lineHeight: 1.4 }}>
            🔒 Your data is protected with per-user database security. No one can see another profile.
          </p>

          {msg && (
            <div className="toast" style={{ marginTop: 12 }}>
              <span style={{ color: "var(--bad)" }}>⚠</span>{" "}
              <span className="muted">{msg}</span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
