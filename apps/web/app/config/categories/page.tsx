"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Cat = { id: string; name: string; is_active: boolean };

export default function CategoriesConfigPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const [items, setItems] = useState<Cat[]>([]);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setMsg(null);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return router.replace("/login");

    const { data, error } = await supabase
      .from("categories")
      .select("id, name, is_active")
      .order("name", { ascending: true });

    if (error) setMsg(error.message);
    setItems((data ?? []) as Cat[]);
  }

  useEffect(() => { load(); }, []);

  const active = useMemo(() => items.filter((x) => x.is_active), [items]);

  async function addCategory() {
    setMsg(null);
    const n = name.trim();
    if (!n) return setMsg("Enter a category name.");

    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return router.replace("/login");

    const { error } = await supabase.from("categories").insert({
      user_id: u.user.id,
      name: n,
      is_active: true,
    });

    if (error) return setMsg(error.message);

    setName("");
    await load();
  }

  async function toggle(id: string, next: boolean) {
    setMsg(null);
    const { error } = await supabase.from("categories").update({ is_active: next }).eq("id", id);
    if (error) return setMsg(error.message);
    await load();
  }

  async function del(id: string) {
    const ok = confirm("Delete this category? (Budgets tied to it will also be removed.)");
    if (!ok) return;

    setMsg(null);
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return setMsg(error.message);
    await load();
  }

  return (
    <main className="container">
      <h1 className="h1">Config · Categories</h1>
      <p className="sub">Create your own categories (Food, Travel, Cards, Savings, etc.)</p>

      {msg && <div className="toast" style={{ marginTop: 12 }}>{msg}</div>}

      <div className="card cardPad" style={{ marginTop: 14 }}>
        <div className="row">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Add category (e.g. Food)" />
          <button className="btn btnPrimary" onClick={addCategory}>Add</button>
        </div>
        <p className="faint" style={{ marginTop: 10, fontSize: 12 }}>
          Tip: Keep categories broad. Payment instruments are configured separately.
        </p>
      </div>

      <div className="card cardPad" style={{ marginTop: 12 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="pill"><span>🏷️</span><span className="muted">Your categories</span></div>
          <span className="badge">{active.length} active</span>
        </div>

        <div className="sep" />

        <div className="col" style={{ gap: 10 }}>
          {items.map((c) => (
            <div key={c.id} className="row" style={{ justifyContent: "space-between" }}>
              <div className="row">
                <span className={`badge ${c.is_active ? "badgeGood" : ""}`}>{c.is_active ? "Active" : "Off"}</span>
                <span style={{ fontWeight: 750 }}>{c.name}</span>
              </div>

              <div className="row">
                <button className="btn" onClick={() => toggle(c.id, !c.is_active)}>
                  {c.is_active ? "Disable" : "Enable"}
                </button>
                <button className="btn btnDanger" onClick={() => del(c.id)}>Delete</button>
              </div>
            </div>
          ))}
          {items.length === 0 ? <p className="muted">No categories yet.</p> : null}
        </div>
      </div>
    </main>
  );
}
