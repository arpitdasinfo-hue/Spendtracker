"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Inst = {
  id: string;
  type: string;
  name: string;
  bank_name: string | null;
  last4: string | null;
  upi_id: string | null;
  parent_instrument_id: string | null;
  is_active: boolean;
};

export default function InstrumentsConfigPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const [items, setItems] = useState<Inst[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const [type, setType] = useState("credit_card");
  const [name, setName] = useState("");
  const [bank, setBank] = useState("");
  const [last4, setLast4] = useState("");
  const [upi, setUpi] = useState("");

  async function load() {
    setMsg(null);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return router.replace("/login");

    const { data, error } = await supabase
      .from("instruments")
      .select("id,type,name,bank_name,last4,upi_id,parent_instrument_id,is_active")
      .order("created_at", { ascending: false });

    if (error) setMsg(error.message);
    setItems((data ?? []) as Inst[]);
  }

  useEffect(() => { load(); }, []);

  async function add() {
    setMsg(null);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return router.replace("/login");

    if (!name.trim()) return setMsg("Name is required.");

    const payload: any = {
      user_id: u.user.id,
      type,
      name: name.trim(),
      bank_name: bank.trim() || null,
      last4: last4.trim() || null,
      upi_id: upi.trim() || null,
      is_active: true,
    };

    const { error } = await supabase.from("instruments").insert(payload);
    if (error) return setMsg(error.message);

    setName(""); setBank(""); setLast4(""); setUpi("");
    await load();
  }

  async function toggle(id: string, next: boolean) {
    setMsg(null);
    const { error } = await supabase.from("instruments").update({ is_active: next }).eq("id", id);
    if (error) return setMsg(error.message);
    await load();
  }

  async function del(id: string) {
    const ok = confirm("Delete this instrument?");
    if (!ok) return;
    setMsg(null);
    const { error } = await supabase.from("instruments").delete().eq("id", id);
    if (error) return setMsg(error.message);
    await load();
  }

  return (
    <main className="container">
      <h1 className="h1">Config · Payment Instruments</h1>
      <p className="sub">Add your banks, debit/credit cards, UPI handles, netbanking.</p>

      {msg && <div className="toast" style={{ marginTop: 12 }}>{msg}</div>}

      <div className="card cardPad" style={{ marginTop: 14 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="pill"><span>💳</span><span className="muted">Add instrument</span></div>
          <span className="badge">v1</span>
        </div>

        <div className="sep" />

        <label className="muted">Type</label>
        <select className="input" value={type} onChange={(e) => setType(e.target.value)} style={{ marginTop: 8 }}>
          <option value="bank_account">Bank account</option>
          <option value="debit_card">Debit card</option>
          <option value="credit_card">Credit card</option>
          <option value="upi_handle">UPI handle</option>
          <option value="netbanking">Netbanking</option>
          <option value="cash">Cash</option>
          <option value="other">Other</option>
        </select>

        <div style={{ height: 10 }} />

        <label className="muted">Name</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="HDFC Millennia CC / SBI Savings / GPay UPI" style={{ marginTop: 8 }} />

        <div style={{ height: 10 }} />

        <div className="grid2" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label className="muted">Bank (optional)</label>
            <input className="input" value={bank} onChange={(e) => setBank(e.target.value)} placeholder="HDFC / ICICI / SBI" style={{ marginTop: 8 }} />
          </div>
          <div>
            <label className="muted">Last 4 (optional)</label>
            <input className="input" value={last4} onChange={(e) => setLast4(e.target.value)} placeholder="1234" style={{ marginTop: 8 }} />
          </div>
        </div>

        <div style={{ height: 10 }} />

        <label className="muted">UPI ID (optional)</label>
        <input className="input" value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="name@upi" style={{ marginTop: 8 }} />

        <button className="btn btnPrimary" style={{ width: "100%", marginTop: 12 }} onClick={add}>Add</button>
      </div>

      <div className="card cardPad" style={{ marginTop: 12 }}>
        <div className="pill"><span>📦</span><span className="muted">Your instruments</span></div>
        <div className="sep" />

        <div className="col" style={{ gap: 10 }}>
          {items.map((i) => (
            <div key={i.id} className="row" style={{ justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 750 }}>{i.name}</div>
                <div className="faint" style={{ fontSize: 12 }}>
                  {i.type}{i.bank_name ? ` · ${i.bank_name}` : ""}{i.last4 ? ` · ****${i.last4}` : ""}{i.upi_id ? ` · ${i.upi_id}` : ""}
                </div>
              </div>
              <div className="row">
                <button className="btn" onClick={() => toggle(i.id, !i.is_active)}>
                  {i.is_active ? "Disable" : "Enable"}
                </button>
                <button className="btn btnDanger" onClick={() => del(i.id)}>Delete</button>
              </div>
            </div>
          ))}
          {items.length === 0 ? <p className="muted">No instruments yet.</p> : null}
        </div>
      </div>
    </main>
  );
}
