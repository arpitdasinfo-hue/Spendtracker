import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  return (
    <main className="container">
      <h1 className="h1">Settings</h1>
      <p className="sub">Your account details and integration info.</p>

      <div className="card cardPad" style={{ marginTop: 14 }}>
        <p className="muted" style={{ margin: "0 0 8px" }}>User ID (for iPhone Shortcut)</p>
        <pre style={{
          background: "rgba(255,255,255,.06)",
          border: "1px solid rgba(255,255,255,.1)",
          borderRadius: 10,
          padding: "12px 14px",
          margin: 0,
          fontSize: 13,
          color: "var(--neonB)",
          overflowX: "auto",
          wordBreak: "break-all",
        }}>
          {data.user.id}
        </pre>
      </div>
    </main>
  );
}
