import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  return (
    <main style={{ padding: 24 }}>
      <h1>Settings</h1>
      <p>Copy this User ID into your iPhone Shortcut:</p>
      <pre style={{ padding: 12, background: "#eee" }}>{data.user.id}</pre>
    </main>
  );
}
