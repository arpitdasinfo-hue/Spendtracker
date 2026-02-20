import { supabaseServer } from "@/lib/supabase/server";

function random6() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async function LinkTelegramPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user!;

  const code = random6();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // Insert link code (RLS ensures only the logged-in user can create for themselves)
  const { error } = await supabase.from("telegram_link_codes").insert({
    code,
    user_id: user.id,
    expires_at: expiresAt,
  });

  return (
    <main style={{ padding: 24 }}>
      <h1>Link Telegram</h1>
      <p>Open Telegram and send this command to your bot:</p>

      <pre style={{ padding: 12, background: "#eee" }}>/link {code}</pre>

      <p>This code expires in 10 minutes.</p>
      {error && <p style={{ color: "crimson" }}>Error: {error.message}</p>}
    </main>
  );
}
