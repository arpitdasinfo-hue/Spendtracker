"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function UserConfigPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return router.replace("/login");

      setEmail(u.user.email ?? "");

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", u.user.id)
        .maybeSingle();

      setFullName(prof?.full_name ?? "");
    })();
  }, [router]);

  async function save() {
    setMsg(null);
    const name = fullName.trim();
    if (name.length < 2) return setMsg("Enter a name (min 2 characters).");

    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setLoading(false);
      return router.replace("/login");
    }

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name })
      .eq("id", u.user.id);

    setLoading(false);
    if (error) return setMsg(error.message);

    setMsg("Saved ✅");
    setTimeout(() => setMsg(null), 900);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <main className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="h1">Config · User</h1>
          <p className="sub">Edit profile details and sign out.</p>
        </div>
        <span className="badge">Profile</span>
      </div>

      {msg && <div className="toast" style={{ marginTop: 12 }}>{msg}</div>}

      <div className="card cardPad" style={{ marginTop: 14 }}>
        <div className="pill">
          <span>👤</span>
          <span className="muted">{email || "—"}</span>
        </div>

        <div className="sep" />

        <label className="muted">Name</label>
        <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" style={{ marginTop: 8 }} />

        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn btnPrimary" style={{ flex: 1 }} onClick={save} disabled={loading}>
            {loading ? "Saving…" : "Save"}
          </button>
          <button className="btn btnDanger" style={{ flex: 1 }} onClick={signOut} type="button">
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}
