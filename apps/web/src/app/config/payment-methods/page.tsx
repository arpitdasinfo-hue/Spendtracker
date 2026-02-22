"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Instrument = {
  id: string;
  name: string;
  type: string | null; // credit_card / savings_account / cash / other
  is_active: boolean;
};

type MethodRow = {
  id: string;
  channel: string;
  name: string;
  source_instrument_id: string | null;
  netbanking_account_id: string | null;
  is_active: boolean;
};

const CHANNELS = ["upi", "card", "netbanking", "cash", "other"] as const;

function autoName(channel: string, sourceName?: string, nbName?: string) {
  if (channel === "netbanking") return `Netbanking - ${nbName ?? "Account"}`;
  if (channel === "upi") return `UPI - ${sourceName ?? "Source"}`;
  if (channel === "card") return `Card - ${sourceName ?? "Source"}`;
  if (channel === "cash") return "Cash";
  return "Other";
}

export default function PaymentMethodsConfigPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const [msg, setMsg] = useState<string | null>(null);

  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [methods, setMethods] = useState<MethodRow[]>([]);

  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>("upi");
  const [sourceId, setSourceId] = useState<string>("");
  const [netbankId, setNetbankId] = useState<string>("");
  const [name, setName] = useState<string>("");

  const savingsAccounts = useMemo(
    () => instruments.filter((i) => (i.type ?? "") === "savings_account" && i.is_active),
    [instruments]
  );

  const ccAndSavings = useMemo(
    () => instruments.filter((i) => ["credit_card", "savings_account"].includes(i.type ?? "") && i.is_active),
    [instruments]
  );

  async function load() {
    setMsg(null);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return router.replace("/login");

    const { data: inst, error: iErr } = await supabase
      .from("instruments")
      .select("id, name, type, is_active")
      .order("created_at", { ascending: false });

    if (iErr) setMsg(iErr.message);
    setInstruments((inst ?? []) as Instrument[]);

    const { data: m, error: mErr } = await supabase
      .from("payment_methods")
      .select("id, channel, name, source_instrument_id, netbanking_account_id, is_active")
      .order("created_at", { ascending: false });

    if (mErr) setMsg(mErr.message);
    setMethods((m ?? []) as MethodRow[]);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const srcName = instruments.find((x) => x.id === sourceId)?.name;
    const nbName = instruments.find((x) => x.id === netbankId)?.name;
    setName(autoName(channel, srcName, nbName));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, sourceId, netbankId]);

  async function addMethod() {
    setMsg(null);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return router.replace("/login");

    const n = name.trim();
    if (!n) return setMsg("Name is required.");

    if ((channel === "upi" || channel === "card") && !sourceId) return setMsg("Select a source instrument.");
    if (channel === "netbanking" && !netbankId) return setMsg("Select a savings account for netbanking.");

    const payload: any = {
      user_id: u.user.id,
      channel,
      name: n,
      is_active: true,
      source_instrument_id: null,
      netbanking_account_id: null,
    };

    if (channel === "upi" || channel === "card") payload.source_instrument_id = sourceId;
    if (channel === "netbanking") payload.netbanking_account_id = netbankId;

    const { error } = await supabase.from("payment_methods").insert(payload);
    if (error) return setMsg(error.message);

    setSourceId(""); setNetbankId("");
    await load();
    setMsg("Saved ✅");
    setTimeout(() => setMsg(null), 900);
  }

  async function toggle(id: string, next: boolean) {
    setMsg(null);
    const { error } = await supabase.from("payment_methods").update({ is_active: next }).eq("id", id);
    if (error) return setMsg(error.message);
    await load();
  }

  async function del(id: string) {
    const ok = confirm("Delete this payment method?");
    if (!ok) return;
    setMsg(null);
    const { error } = await supabase.from("payment_methods").delete().eq("id", id);
    if (error) return setMsg(error.message);
    await load();
  }

  return (
    <main className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="h1">Config · Payment Methods</h1>
          <p className="sub">Create UPI/Card/Netbanking methods that point to your instruments.</p>
        </div>
        <span className="badge">Payments</span>
      </div>

      {msg && <div className="toast" style={{ marginTop: 12 }}>{msg}</div>}

      <div className="card cardPad" style={{ marginTop: 14 }}>
        <div className="pill"><span>🧾</span><span className="muted">Add payment method</span></div>
        <div className="sep" />

        <label className="muted">Channel</label>
        <select className="input" value={channel} onChange={(e) => setChannel(e.target.value as any)} style={{ marginTop: 8 }}>
          {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        {(channel === "upi" || channel === "card") && (
          <>
            <div style={{ height: 10 }} />
            <label className="muted">Source instrument (Credit Card / Savings)</label>
            <select className="input" value={sourceId} onChange={(e) => setSourceId(e.target.value)} style={{ marginTop: 8 }}>
              <option value="">Select…</option>
              {ccAndSavings.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </>
        )}

        {channel === "netbanking" && (
          <>
            <div style={{ height: 10 }} />
            <label className="muted">Netbanking account (Savings)</label>
            <select className="input" value={netbankId} onChange={(e) => setNetbankId(e.target.value)} style={{ marginTop: 8 }}>
              <option value="">Select…</option>
              {savingsAccounts.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </>
        )}

        <div style={{ height: 10 }} />
        <label className="muted">Name</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} style={{ marginTop: 8 }} />

        <button className="btn btnPrimary" style={{ width: "100%", marginTop: 12 }} onClick={addMethod}>
          Save payment method
        </button>

        <p className="faint" style={{ marginTop: 10, fontSize: 12 }}>
          Examples: “UPI - HDFC CC”, “Card - ICICI CC”, “Netbanking - SBI Savings”.
        </p>
      </div>

      <div className="card cardPad" style={{ marginTop: 12 }}>
        <div className="pill"><span>📦</span><span className="muted">Your payment methods</span></div>
        <div className="sep" />
        <div className="col" style={{ gap: 10 }}>
          {methods.map((m) => (
            <div key={m.id} className="row" style={{ justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 800 }}>{m.name}</div>
                <div className="faint" style={{ fontSize: 12 }}>
                  channel: {m.channel}
                </div>
              </div>
              <div className="row">
                <button className="btn" onClick={() => toggle(m.id, !m.is_active)}>
                  {m.is_active ? "Disable" : "Enable"}
                </button>
                <button className="btn btnDanger" onClick={() => del(m.id)}>Delete</button>
              </div>
            </div>
          ))}
          {methods.length === 0 ? <p className="muted">No payment methods yet.</p> : null}
        </div>
      </div>
    </main>
  );
}
