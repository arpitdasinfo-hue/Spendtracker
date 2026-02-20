import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function random6() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async function LinkTelegramPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const code = random6();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error } = await supabase.from("telegram_link_codes").insert({
    code,
    user_id: data.user.id,
    expires_at: expiresAt,
  });

  return (
    <main style={{ padding: 24 }}>
      <h1>Link Telegram</h1>
      <p>Send this command to your bot in Telegram:</p>

      <pre style={{ padding: 12, background: "#eee" }}>/link {code}</pre>

      <p>This code expires in 10 minutes.</p>
      {error && <p style={{ color: "crimson" }}>Error: {error.message}</p>}
    </main>
  );
}
