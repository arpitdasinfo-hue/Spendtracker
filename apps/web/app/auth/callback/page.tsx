"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

function AuthCallbackContent() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const code = params.get("code");
    const error = params.get("error");
    const errorDesc = params.get("error_description");

    async function finish() {
      if (error) {
        console.error("OAuth error:", error, errorDesc);
        router.replace(`/login?error=${encodeURIComponent(errorDesc || error)}`);
        return;
      }

      if (!code) {
        // If no code, just go login
        router.replace("/login");
        return;
      }

      const supabase = supabaseBrowser();
      const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);

      if (exErr) {
        console.error("exchangeCodeForSession failed:", exErr.message);
        router.replace(`/login?error=${encodeURIComponent(exErr.message)}`);
        return;
      }

      router.replace("/dashboard");
    }

    void finish();
  }, [params, router]);

  return (
    <main style={{ padding: 24 }}>
      <h1>Signing you in…</h1>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main style={{ padding: 24 }}>
          <h1>Signing you in…</h1>
        </main>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
