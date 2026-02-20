"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  // This is the important part: if we come back with #access_token, store session then go dashboard
  useEffect(() => {
    const supabase = supabaseBrowser();

    async function recoverSessionFromHash() {
      // If tokens exist in the URL hash, Supabase will read them and persist the session.
      const { data } = await supabase.auth.getSession();

      // If session exists after parsing, go to dashboard
      if (data.session) {
        router.replace("/dashboard");
      }
    }

    void recoverSessionFromHash();
  }, [router]);

  async function loginWithGoogle() {
    setMsg(null);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // keep this; Supabase may still return hash tokens, which we now handle
        redirectTo: `${location.origin}/login`,
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
