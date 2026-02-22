"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useCurrencySymbol } from "@/lib/useCurrency";
import TxnFilterModal, { TxnFilters, countActiveFilters } from "@/components/TxnFilterModal";

type Txn = {
  id: string;
  direction: "expense" | "income";
  amount: number | null;
  note: string;
  created_at: string;
  payment_method_id: string | null;
  tag: "personal" | "official" | "receivable" | "payable" | null;
};

type Method = { id: string; name: string; channel: string; payment_type?: string | null; is_active: boolean };

function tagLabel(t: Txn["tag"]) {
  switch (t) {
    case "official": return "Official";
    case "receivable": return "Receivable";
    case "payable": return "Payable";
    case "personal":
    default: return "Personal";
  }
}

function startOfWeekISO(d: Date) {
  const day = (d.getDay() + 6) % 7; // Mon=0
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  s.setDate(s.getDate() - day);
  s.setHours(0, 0, 0, 0);
  return s.toISOString();
}

function startOfMonthISO(d: Date) {
  const s = new Date(d.getFullYear(), d.getMonth(), 1);
  s.setHours(0, 0, 0, 0);
  return s.toISOString();
}

function endOfDayISO(dateYYYYMMDD: string) {
  const [y, m, dd] = dateYYYYMMDD.split("-").map(Number);
  const e = new Date(y, m - 1, dd, 23, 59, 59, 999);
  return e.toISOString();
}

function startOfDayISO(dateYYYYMMDD: string) {
  const [y, m, dd] = dateYYYYMMDD.split("-").map(Number);
  const s = new Date(y, m - 1, dd, 0, 0, 0, 0);
  return s.toISOString();
}

const DEFAULT_FILTERS: TxnFilters = {
  amountMode: "any",
  amountGt: "",
  amountLt: "",
  amountMin: "",
  amountMax: "",

  channels: [],
  tags: [],
  direction: "any",

  dateMode: "any",
  dateFrom: "",
  dateTo: "",
};

export default function TransactionsPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const { sym } = useCurrencySymbol();

  const [q, setQ] = useState("");
  const [items, setItems] = useState<Txn[]>([]);
  const [methods, setMethods] = useState<Map<string, Method>>(new Map());
  const [msg, setMsg] = useState<string | null>(null);

  const [openFilter, setOpenFilter] = useState(false);
  const [filters, setFilters] = useState<TxnFilters>({ ...DEFAULT_FILTERS });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDirection, setEditDirection] = useState<"expense" | "income">("expense");
  const [editAmount, setEditAmount] = useState<string>("");
  const [editNote, setEditNote] = useState<string>("");

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  async function load() {
    setMsg(null);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return router.replace("/login");

    // fetch payment methods (for displaying name + channel, and channel filtering)
    const { data: m, error: mErr } = await supabase
      .from("payment_methods")
      .select("id, name, channel, payment_type, is_active")
      .order("created_at", { ascending: false });

    if (mErr) setMsg(mErr.message);

    const map = new Map<string, Method>();
    (m ?? []).forEach((x: any) => map.set(x.id, x));
    setMethods(map);

    // Build server-side filtered query
    let qy = supabase
      .from("transactions")
      .select("id, direction, amount, note, created_at, payment_method_id, tag")
      .order("created_at", { ascending: false })
      .limit(500);

    // Direction
    if (filters.direction !== "any") {
      qy = qy.eq("direction", filters.direction);
    }

    // Tags (multi)
    if (filters.tags.length) {
      qy = qy.in("tag", filters.tags);
    }

    // Amount
    const toNum = (s: string) => {
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    };

    if (filters.amountMode === "gt") {
      const n = toNum(filters.amountGt);
      if (n !== null) qy = qy.gte("amount", n);
    } else if (filters.amountMode === "lt") {
      const n = toNum(filters.amountLt);
      if (n !== null) qy = qy.lte("amount", n);
    } else if (filters.amountMode === "between") {
      const a = toNum(filters.amountMin);
      const b = toNum(filters.amountMax);
      if (a !== null) qy = qy.gte("amount", a);
      if (b !== null) qy = qy.lte("amount", b);
    }

    // Date range
    const now = new Date();
    if (filters.dateMode === "this_week") {
      qy = qy.gte("created_at", startOfWeekISO(now));
    } else if (filters.dateMode === "this_month") {
      qy = qy.gte("created_at", startOfMonthISO(now));
    } else if (filters.dateMode === "custom") {
      if (filters.dateFrom) qy = qy.gte("created_at", startOfDayISO(filters.dateFrom));
      if (filters.dateTo) qy = qy.lte("created_at", endOfDayISO(filters.dateTo));
    }

    // Channel (requires mapping channels -> payment_method_ids)
    if (filters.channels.length) {
      const ids = (m ?? [])
        .filter((x: any) => filters.channels.includes(x.channel))
        .map((x: any) => x.id);

      // If user chose channels but no matching methods exist, return empty
      if (ids.length === 0) {
        setItems([]);
        return;
      }
      qy = qy.in("payment_method_id", ids);
    }

    const { data, error } = await qy;

    if (error) setMsg(error.message);
    setItems((data ?? []) as Txn[]);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  // Apply search locally (fast + flexible)
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;

    return items.filter((t) => {
      const a = String(t.amount ?? "");
      const pm = t.payment_method_id ? methods.get(t.payment_method_id)?.name ?? "" : "";
      return (
        (t.note ?? "").toLowerCase().includes(s) ||
        a.includes(s) ||
        pm.toLowerCase().includes(s) ||
        tagLabel(t.tag).toLowerCase().includes(s)
      );
    });
  }, [q, items, methods]);

  function startEdit(t: Txn) {
    setEditingId(t.id);
    setEditDirection(t.direction);
    setEditAmount(String(t.amount ?? ""));
    setEditNote(t.note ?? "");
  }

  async function saveEdit() {
    if (!editingId) return;
    setMsg(null);

    const amt = Number(editAmount);
    if (!amt || Number.isNaN(amt) || amt <= 0) {
      setMsg(`Enter a valid amount (e.g. ${sym}250).`);
      return;
    }

    const { error } = await supabase
      .from("transactions")
      .update({
        direction: editDirection,
        amount: amt,
        note: (editNote || (editDirection === "expense" ? "expense" : "income")).slice(0, 80),
      })
      .eq("id", editingId);

    if (error) {
      setMsg(error.message);
      return;
    }

    setEditingId(null);
    await load();
  }

  async function deleteTxn(id: string) {
    const ok = confirm("Delete this transaction?");
    if (!ok) return;

    setMsg(null);
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) {
      setMsg(error.message);
      return;
    }
    await load();
  }

  function clearFilters() {
    setFilters({ ...DEFAULT_FILTERS });
  }

  async function applyFilters() {
    // light validation for amount + custom dates
    if (filters.amountMode === "between") {
      if (!filters.amountMin || !filters.amountMax) {
        setMsg("Amount between requires both Min and Max.");
        return;
      }
    }
    if (filters.dateMode === "custom") {
      if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
        setMsg("Date From must be before Date To.");
        return;
      }
    }

    setOpenFilter(false);
    await load();
  }

  return (
    <main className="container">
      <TxnFilterModal
        open={openFilter}
        onClose={() => setOpenFilter(false)}
        filters={filters}
        onChange={setFilters}
        onClear={clearFilters}
        onApply={applyFilters}
        currencySymbol={sym}
      />

      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="h1">Transactions</h1>
          <p className="sub">Search by note, amount, payment method, or tag. Filter via popup.</p>
        </div>
        <button className="btn btnPrimary" onClick={() => router.push("/add")}> 
          ＋ Add
        </button>
      </div>

      <div className="row" style={{ marginTop: 14, gap: 10 }}>
        <div className="card" style={{ padding: 12, borderRadius: 18, flex: 1 }}>
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search: rent / ${sym}450 / UPI / Official…`}
          />
        </div>

        <button className={`btn ${activeFilterCount ? "btnPrimary" : ""}`} onClick={() => setOpenFilter(true)} type="button">
          Filter {activeFilterCount ? `(${activeFilterCount})` : ""}
        </button>

        {activeFilterCount ? (
          <button className="btn" onClick={async () => { clearFilters(); await load(); }} type="button">
            Clear
          </button>
        ) : null}
      </div>

      {msg && <div className="toast" style={{ marginTop: 12 }}>{msg}</div>}

      <div className="card cardPad" style={{ marginTop: 12 }}>
        {filtered.length === 0 ? (
          <p className="muted">No transactions found.</p>
        ) : (
          <div className="col" style={{ gap: 10 }}>
            {filtered.map((t) => {
              const isEditing = editingId === t.id;
              const pm = t.payment_method_id ? methods.get(t.payment_method_id) : null;

              return (
                <div key={t.id} className="card" style={{ padding: 12, borderRadius: 18 }}>
                  {!isEditing ? (
                    <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
                        <span className={`badge ${t.direction === "income" ? "badgeGood" : "badgeBad"}`}>
                          {t.direction === "income" ? "↘ IN" : "↗ OUT"}
                        </span>

                        <div>
                          <div style={{ fontWeight: 650 }}>{t.note}</div>

                          <div className="row" style={{ gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                            <span className="badge">{tagLabel(t.tag)}</span>
                            {pm ? <span className="badge">{pm.name}</span> : <span className="badge">No method</span>}
                            {pm?.channel ? <span className="badge">{pm.channel.toUpperCase()}</span> : null}
                          </div>

                          <div className="faint" style={{ fontSize: 12, marginTop: 6 }}>
                            {new Date(t.created_at).toLocaleString("en-IN")}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div className="money" style={{ fontWeight: 800, color: t.direction === "income" ? "var(--good)" : "var(--bad)" }}>
                          {t.direction === "income" ? "+" : "-"}{sym}{Number(t.amount ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                        </div>

                        <div className="row" style={{ justifyContent: "flex-end", marginTop: 8 }}>
                          <button className="btn" onClick={() => startEdit(t)}>Edit</button>
                          <button className="btn btnDanger" onClick={() => deleteTxn(t.id)}>Delete</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="col">
                      <div className="row" style={{ justifyContent: "space-between" }}>
                        <div className="row">
                          <button className={`btn ${editDirection === "expense" ? "btnDanger" : ""}`} type="button" onClick={() => setEditDirection("expense")}>
                            Expense
                          </button>
                          <button className={`btn ${editDirection === "income" ? "btnPrimary" : ""}`} type="button" onClick={() => setEditDirection("income")}>
                            Income
                          </button>
                        </div>
                        <span className="badge">Editing</span>
                      </div>

                      <label className="muted">Amount ({sym})</label>
                      <input className="input money" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />

                      <label className="muted">Note</label>
                      <input className="input" value={editNote} onChange={(e) => setEditNote(e.target.value)} />

                      <div className="row">
                        <button className="btn btnPrimary" onClick={saveEdit} style={{ flex: 1 }}>Save</button>
                        <button className="btn" onClick={() => setEditingId(null)} style={{ flex: 1 }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
