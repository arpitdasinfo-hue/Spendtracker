import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) redirect("/login");

  const { data: txns, error } = await supabase
    .from("transactions")
    .select("id, direction, amount, note, created_at")
    .order("created_at", { ascending: false })
    .limit(25);

  return (
    <main style={{ padding: 24 }}>
      <h1>Dashboard</h1>
      <p>Logged in as: {userData.user.email}</p>
      <p>
        Go to <a href="/settings/link-telegram">Link Telegram</a>
      </p>

      <h2>Latest transactions</h2>
      {error && <p style={{ color: "crimson" }}>Error: {error.message}</p>}
      <ul>
        {(txns ?? []).map((t) => (
          <li key={t.id}>
            {t.direction} — ₹{t.amount ?? "?"} — {t.note} —{" "}
            {new Date(t.created_at).toLocaleString("en-IN")}
          </li>
        ))}
      </ul>
    </main>
  );
}
