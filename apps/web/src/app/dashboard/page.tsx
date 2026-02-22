import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) redirect("/login");

  return (
    <main style={{ padding: 24 }}>
      <h1>Dashboard ✅</h1>
      <p>Logged in as: {data.user.email}</p>
      <p>
        <a href="/add">➕ Add transaction</a>
      </p>
    </main>
  );
}
