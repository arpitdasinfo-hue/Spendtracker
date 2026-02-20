import { supabaseServer } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await supabaseServer();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user!;

  const { data: txns } = await supabase
    .from("transactions")
    .select("id, direction, amount, note, created_at")
    .order("created_at", { ascending: false })
    .limit(25);

  return (
    <main style={{ padding: 24 }}>
      <h1>Dashboard</h1>
      <p>Logged in as: {user.email}</p>

      <p>
        Go to <a href="/settings/link-telegram">Link Telegram</a>
      </p>

      <h2>Latest transactions</h2>
      <ul>
        {(txns ?? []).map((t) => (
          <li key={t.id}>
            {t.direction} - Rs {t.amount ?? "?"} - {t.note} -{" "}
            {new Date(t.created_at).toLocaleString("en-IN")}
          </li>
        ))}
      </ul>
    </main>
  );
}
