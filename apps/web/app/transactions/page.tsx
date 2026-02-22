"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useCurrencySymbol } from "@/lib/useCurrency";

type Txn = {
  id: string;
  direction: "expense" | "income";
  amount: number | null;
  note: string;
  category: string | null;
  created_at: string;
};

export default function TransactionsPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const { sym } = useCurrencySymbol();

  const [q, setQ] = useState("");
  const [items, setItems] = useState<Txn[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDirection, setEditDirection] = useState<"expense" | "income">("expense");
  const [editAmount, setEditAmount] = useState<string>("");
  const [editNote, setEditNote] = useState<string>("");
  const [editCategory, setEditCategory] = useState<string>("");

  async function load() {
    setMsg(null);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      router.replace("/login");
      return;
    }

    const { data, error } = await supabase
      .from("transactions")
      .select("id, direction, amount, note, category, created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) setMsg(error.message);
    setItems((data ?? []) as Txn[]);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((t) => {
      const a = String(t.amount ?? "");
      return (
        (t.note ?? "").toLowerCase().includes(s) ||
        (t.category ?? "").toLowerCase().includes(s) ||
        a.includes(s)
      );
    });
  }, [q, items]);

  function startEdit(t: Txn) {
    setEditingId(t.id);
    setEditDirection(t.direction);
    setEditAmount(String(t.amount ?? ""));
    setEditNote(t.note ?? "");
    setEditCategory(t.category ?? "");
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
        category: editCategory.trim() ? editCategory.trim() : null,
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

  return (
    <main className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="h1">Transactions</h1>
          <p className="sub">Search by note, category, or amount. Edit/delete from here.</p>
        </div>
        <button className="btn btnPrimary" onClick={() => router.push("/add")}>
          ＋ Add
        </button>
      </div>

      <div className="card cardPad" style={{ marginTop: 14 }}>
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search: rent / 450 / ${sym}…`} />
      </div>

      {msg && <div className="toast" style={{ marginTop: 12 }}>{msg}</div>}

      <div className="card cardPad" style={{ marginTop: 12 }}>
        {filtered.length === 0 ? (
          <p className="muted">No transactions found.</p>
        ) : (
          <div className="col" style={{ gap: 10 }}>
            {filtered.map((t) => {
              const isEditing = editingId === t.id;

              return (
                <div key={t.id} className="card" style={{ padding: 12, borderRadius: 18 }}>
                  {!isEditing ? (
                    <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
                        <span className={`badge ${t.direction === "income" ? "badgeGood" : "badgeBad"}`}>
                          {t.direction === "income" ? "↘ IN" : "↗ OUT"}
                        </span>
                        <div>
                          <div style={{ fontWeight: 650 }}>
                            {t.note}
                            {t.category ? <span className="badge" style={{ marginLeft: 8 }}>#{t.category}</span> : null}
                          </div>
                          <div className="faint" style={{ fontSize: 12 }}>
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

                      <label className="muted">Category</label>
                      <input className="input" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} placeholder="Food, Travel…" />

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
