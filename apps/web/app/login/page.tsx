"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [msg, setMsg] = useState<string | null>(null);

  async function loginWithGoogle() {
    setMsg(null);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
    if (error) setMsg(error.message);
  }

  return (
    <main style={{ padding: 24, maxWidth: 420 }}>
      <h1>Login</h1>
      <p>Sign in with Google.</p>

      <button onClick={loginWithGoogle} style={{ marginTop: 12, padding: 10 }}>
        Continue with Google
      </button>

      {msg && <p style={{ marginTop: 12, color: "crimson" }}>{msg}</p>}
    </main>
  );
}
