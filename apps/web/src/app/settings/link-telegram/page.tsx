"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

function random6() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function LinkTelegramPage() {
  const router = useRouter();
  const [code, setCode] = useState<string>("");
  const [msg, setMsg] = useState<string>("Generating code...");

  useEffect(() => {
    const supabase = supabaseBrowser();

    async function run() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login");
        return;
      }

      const c = random6();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { error } = await supabase.from("telegram_link_codes").insert({
        code: c,
        user_id: userData.user.id,
        expires_at: expiresAt,
      });

      if (error) {
        setMsg(`Error: ${error.message}`);
        return;
      }

      setCode(c);
      setMsg("Send this command to your Telegram bot:");
    }

    run();
  }, [router]);

  return (
    <main style={{ padding: 24 }}>
      <h1>Link Telegram</h1>
      <p>{msg}</p>

      {code && (
        <pre style={{ padding: 12, background: "#eee" }}>/link {code}</pre>
      )}

      <p>This code expires in 10 minutes.</p>
    </main>
  );
}
