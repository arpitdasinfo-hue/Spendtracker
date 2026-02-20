"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function sendMagicLink() {
    setMsg(null);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    if (error) setMsg(error.message);
    else setMsg("Check your email for the login link.");
  }

  return (
    <main style={{ padding: 24, maxWidth: 420 }}>
      <h1>Login</h1>
      <p>Enter your email. You’ll get a magic link.</p>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        style={{ width: "100%", padding: 10, marginTop: 8 }}
      />
      <button onClick={sendMagicLink} style={{ marginTop: 12, padding: 10 }}>
        Send login link
      </button>
      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </main>
  );
}
