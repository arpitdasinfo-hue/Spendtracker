"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ProfileSetup() {
  const supabase = createSupabaseBrowserClient();

  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", u.user.id)
        .maybeSingle();

      if (!prof?.full_name || !prof.full_name.trim()) {
        setOpen(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setMsg(null);
    const name = fullName.trim();
    if (name.length < 2) return setMsg("Enter a name (min 2 characters).");

    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setLoading(false);
      return setMsg("Not logged in.");
    }

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name })
      .eq("id", u.user.id);

    setLoading(false);
    if (error) return setMsg(error.message);

    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(0,0,0,.55)",
        backdropFilter: "blur(10px)",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div className="card cardPad" style={{ width: "min(560px, 100%)" }}>
        <div className="pill">
          <span>👋</span>
          <span className="muted">Quick setup</span>
          <span className="kbd">profile</span>
        </div>

        <h2 style={{ margin: "14px 0 6px", fontSize: 20 }}>What should we call you?</h2>
        <p className="sub" style={{ marginTop: 0 }}>
          This name appears on the Home screen.
        </p>

        <div style={{ height: 8 }} />

        <input
          className="input"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="e.g., Arpit"
          autoFocus
        />

        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn btnPrimary" style={{ flex: 1 }} onClick={save} disabled={loading}>
            {loading ? "Saving…" : "Save"}
          </button>
          <button className="btn" style={{ flex: 1 }} onClick={() => setOpen(false)} disabled={loading}>
            Skip
          </button>
        </div>

        {msg && <div className="toast" style={{ marginTop: 12 }}>{msg}</div>}
      </div>
    </div>
  );
}
