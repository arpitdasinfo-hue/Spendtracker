"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Txn = {
  id: string;
  direction: "expense" | "income";
  amount: number | null;
  note: string;
  created_at: string;
};

function inr(n: number) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export default function TransactionsPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const [q, setQ] = useState("");
  const [items, setItems] = useState<Txn[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        router.replace("/login");
        return;
      }
      const { data, error } = await supabase
        .from("transactions")
        .select("id, direction, amount, note, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) setMsg(error.message);
      setItems((data ?? []) as Txn[]);
    })();
  }, [router]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((t) => {
      const a = String(t.amount ?? "");
      return t.note.toLowerCase().includes(s) || a.includes(s);
    });
  }, [q, items]);

  return (
    <main className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="h1">Transactions</h1>
          <p className="sub">Search by note or amount. Swipe actions later.</p>
        </div>
        <button className="btn btnPrimary" onClick={() => router.push("/add")}>
          ＋ Add
        </button>
      </div>

      <div className="card cardPad" style={{ marginTop: 14 }}>
        <input
          className="input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search: zomato / 450 / rent…"
        />
      </div>

      {msg && <div className="toast" style={{ marginTop: 12 }}>{msg}</div>}

      <div className="card cardPad" style={{ marginTop: 12 }}>
        {filtered.length === 0 ? (
          <p className="muted">No transactions found.</p>
        ) : (
          <div className="col" style={{ gap: 10 }}>
            {filtered.map((t) => (
              <div key={t.id} className="row" style={{ justifyContent: "space-between" }}>
                <div className="row" style={{ gap: 10 }}>
                  <span className={`badge ${t.direction === "income" ? "badgeGood" : "badgeBad"}`}>
                    {t.direction === "income" ? "IN" : "OUT"}
                  </span>
                  <div>
                    <div style={{ fontWeight: 650 }}>{t.note}</div>
                    <div className="faint" style={{ fontSize: 12 }}>
                      {new Date(t.created_at).toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
                <div
                  className="money"
                  style={{ fontWeight: 800, color: t.direction === "income" ? "var(--good)" : "var(--bad)" }}
                >
                  {t.direction === "income" ? "+" : "-"}₹{inr(Number(t.amount ?? 0))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
