"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Instrument = {
  id: string;
  name: string;
  kind: string | null;
  type?: string | null;
  is_active: boolean;
};

type MethodRow = {
  id: string;
  payment_type: string | null;
  channel: string;
  name: string;
  netbanking_account_id: string | null;
  is_active: boolean;
};

type PaymentType = "credit_card" | "savings_account" | "netbanking" | "cash" | "other";
type Mode = "upi" | "card";

const PAYMENT_TYPES: { id: PaymentType; label: string }[] = [
  { id: "credit_card", label: "Credit Card" },
  { id: "savings_account", label: "Savings Account" },
  { id: "netbanking", label: "Netbanking" },
  { id: "cash", label: "Cash" },
  { id: "other", label: "Other" },
];

function kindOf(i: Instrument): PaymentType {
  const k = (i.kind ?? "").toLowerCase();
  const legacy = (i.type ?? "").toLowerCase();
  if (k === "credit_card" || legacy === "credit_card") return "credit_card";
  if (k === "savings_account" || legacy === "bank_account") return "savings_account";
  if (k === "cash" || legacy === "cash") return "cash";
  return "other";
}

function buildName(t: PaymentType, mode: Mode | null, typedName: string, netbankAccountName?: string) {
  if (t === "cash") return "Cash";
  if (t === "other") return typedName.trim() ? `Other - ${typedName.trim()}` : "Other";
  if (t === "netbanking") return `Netbanking - ${netbankAccountName ?? "Savings Account"}`;

  const m = (mode ?? "upi").toUpperCase();
  const n = typedName.trim();
  return `${m} - ${n || (t === "credit_card" ? "Credit Card" : "Savings Account")}`;
}

function guessTypedName(paymentType: PaymentType, channel: string, name: string) {
  // For CC/Savings: name format is "UPI - X" or "CARD - X"
  // For Other: "Other - X" or "Other"
  if (paymentType === "other") {
    if (name.toLowerCase().startsWith("other - ")) return name.slice(8).trim();
    return "";
  }
  if (paymentType === "credit_card" || paymentType === "savings_account") {
    const idx = name.indexOf(" - ");
    if (idx >= 0) return name.slice(idx + 3).trim();
    return "";
  }
  return "";
}

export default function PaymentMethodsConfigPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const [msg, setMsg] = useState<string | null>(null);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [methods, setMethods] = useState<MethodRow[]>([]);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);

  // Step 1
  const [paymentType, setPaymentType] = useState<PaymentType>("credit_card");

  // Step 2
  const [mode, setMode] = useState<Mode>("upi");
  const [netbankSavingsId, setNetbankSavingsId] = useState<string>("");

  // Step 3
  const [typedName, setTypedName] = useState<string>("");

  const savingsAccounts = useMemo(() => {
    return instruments.filter((i) => i.is_active && kindOf(i) === "savings_account");
  }, [instruments]);

  const netbankAccountName = useMemo(() => {
    return instruments.find((x) => x.id === netbankSavingsId)?.name;
  }, [instruments, netbankSavingsId]);

  const computedName = useMemo(() => {
    const m = (paymentType === "credit_card" || paymentType === "savings_account") ? mode : null;
    return buildName(paymentType, m, typedName, netbankAccountName);
  }, [paymentType, mode, typedName, netbankAccountName]);

  async function load() {
    setMsg(null);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return router.replace("/login");

    const { data: inst, error: iErr } = await supabase
      .from("instruments")
      .select("id, name, kind, type, is_active")
      .order("created_at", { ascending: false });

    if (iErr) setMsg(iErr.message);
    setInstruments((inst ?? []) as Instrument[]);

    const { data: m, error: mErr } = await supabase
      .from("payment_methods")
      .select("id, payment_type, channel, name, netbanking_account_id, is_active")
      .order("created_at", { ascending: false });

    if (mErr) setMsg(mErr.message);
    setMethods((m ?? []) as MethodRow[]);
  }

  useEffect(() => { load(); }, []);

  function showMode() {
    return paymentType === "credit_card" || paymentType === "savings_account";
  }
  function showNetbankDropdown() {
    return paymentType === "netbanking";
  }
  function showTypedName() {
    return paymentType === "credit_card" || paymentType === "savings_account" || paymentType === "other";
  }

  function typedNameLabel() {
    if (paymentType === "credit_card") return "Credit card name";
    if (paymentType === "savings_account") return "Savings account name";
    return "Name (optional)";
  }
  function typedNamePlaceholder() {
    if (paymentType === "credit_card") return "HDFC Millennia (xxxx 1234)";
    if (paymentType === "savings_account") return "SBI Savings (Salary)";
    return "Wallet / Adjustment / Misc";
  }

  function resetForm() {
    setEditingId(null);
    setPaymentType("credit_card");
    setMode("upi");
    setNetbankSavingsId("");
    setTypedName("");
    setMsg(null);
  }

  async function saveOrUpdate() {
    setMsg(null);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return router.replace("/login");

    if (showMode() && !typedName.trim()) return setMsg("Enter the name in the third field.");
    if (paymentType === "netbanking" && !netbankSavingsId) return setMsg("Select which savings account is used for Netbanking.");

    let channel: string = "other";
    if (paymentType === "credit_card" || paymentType === "savings_account") channel = mode;
    else if (paymentType === "netbanking") channel = "netbanking";
    else if (paymentType === "cash") channel = "cash";
    else channel = "other";

    const payload: any = {
      payment_type: paymentType,
      channel,
      name: computedName,
      is_active: true,
      netbanking_account_id: null,
    };

    if (paymentType === "netbanking") payload.netbanking_account_id = netbankSavingsId;

    let errMsg: string | null = null;

    if (editingId) {
      const { error } = await supabase.from("payment_methods").update(payload).eq("id", editingId);
      if (error) errMsg = error.message;
    } else {
      const { error } = await supabase.from("payment_methods").insert({
        user_id: u.user.id,
        ...payload,
      });
      if (error) errMsg = error.message;
    }

    if (errMsg) return setMsg(errMsg);

    setMsg(editingId ? "Updated ✅" : "Saved ✅");
    setTimeout(() => setMsg(null), 900);

    resetForm();
    await load();
  }

  function startEdit(m: MethodRow) {
    setMsg(null);
    setEditingId(m.id);

    const pt = (m.payment_type ?? "other") as PaymentType;
    setPaymentType(pt);

    if (pt === "credit_card" || pt === "savings_account") {
      setMode((m.channel === "card" ? "card" : "upi") as Mode);
      setTypedName(guessTypedName(pt, m.channel, m.name));
      setNetbankSavingsId("");
    } else if (pt === "netbanking") {
      setNetbankSavingsId(m.netbanking_account_id ?? "");
      setTypedName("");
      setMode("upi");
    } else if (pt === "cash") {
      setTypedName("");
      setMode("upi");
      setNetbankSavingsId("");
    } else {
      setTypedName(guessTypedName("other", m.channel, m.name));
      setMode("upi");
      setNetbankSavingsId("");
    }
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
    // if deleting currently edited row, reset
    if (editingId === id) resetForm();
    await load();
  }

  return (
    <main className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="h1">Config · Payment Methods</h1>
          <p className="sub">Type → (Mode) → (Name). Netbanking links to a savings account.</p>
        </div>
        <span className="badge">{editingId ? "Editing" : "Payments"}</span>
      </div>

      {msg && <div className="toast" style={{ marginTop: 12 }}>{msg}</div>}

      <div className="card cardPad" style={{ marginTop: 14 }}>
        <div className="pill"><span>🧾</span><span className="muted">{editingId ? "Modify payment method" : "Create payment method"}</span></div>
        <div className="sep" />

        <label className="muted">Payment Type</label>
        <select
          className="input"
          value={paymentType}
          onChange={(e) => setPaymentType(e.target.value as PaymentType)}
          style={{ marginTop: 8 }}
        >
          {PAYMENT_TYPES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
        </select>

        {showMode() && (
          <>
            <div style={{ height: 10 }} />
            <label className="muted">Mode</label>
            <select className="input" value={mode} onChange={(e) => setMode(e.target.value as Mode)} style={{ marginTop: 8 }}>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
            </select>
          </>
        )}

        {showNetbankDropdown() && (
          <>
            <div style={{ height: 10 }} />
            <label className="muted">Select savings account for Netbanking</label>
            <select className="input" value={netbankSavingsId} onChange={(e) => setNetbankSavingsId(e.target.value)} style={{ marginTop: 8 }}>
              <option value="">Select…</option>
              {savingsAccounts.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </>
        )}

        {showTypedName() && (
          <>
            <div style={{ height: 10 }} />
            <label className="muted">{typedNameLabel()}</label>
            <input
              className="input"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder={typedNamePlaceholder()}
              style={{ marginTop: 8 }}
            />
          </>
        )}

        <div className="sep" />
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="muted">Will save as</span>
          <span className="badge">{computedName}</span>
        </div>

        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn btnPrimary" style={{ flex: 1 }} onClick={saveOrUpdate}>
            {editingId ? "Update payment method" : "Save payment method"}
          </button>
          {editingId ? (
            <button className="btn" style={{ flex: 1 }} onClick={resetForm} type="button">
              Cancel edit
            </button>
          ) : (
            <button className="btn" style={{ flex: 1 }} onClick={() => { setTypedName(""); setNetbankSavingsId(""); }} type="button">
              Clear
            </button>
          )}
        </div>
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
                  {(m.payment_type ?? "—")} · {m.channel}
                </div>
              </div>
              <div className="row">
                <button className="btn" onClick={() => startEdit(m)}>Modify</button>
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
