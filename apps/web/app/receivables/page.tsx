"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useCurrencySymbol } from "@/lib/useCurrency";
import { formatMoney } from "@/lib/money";

type Txn = {
  id: string;
  direction: "expense" | "income";
  amount: number | null;
  note: string | null;
  tag: string | null;
  created_at: string;
  payment_method_id: string | null;
};

type Method = { id: string; name: string };

export default function ReceivablesPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const { sym, code } = useCurrencySymbol();

  const [items, setItems] = useState<Txn[]>([]);
  const [methods, setMethods] = useState<Method[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { router.replace("/login"); return; }

      const [txnRes, methodRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("id, direction, amount, note, tag, created_at, payment_method_id")
          .in("tag", ["receivable", "payable"])
          .order("created_at", { ascending: false }),
        supabase
          .from("payment_methods")
          .select("id, name")
          .eq("is_active", true),
      ]);

      if (txnRes.error) setMsg(txnRes.error.message);
      setItems((txnRes.data ?? []) as Txn[]);
      setMethods((methodRes.data ?? []) as Method[]);
      setLoading(false);
    })();
  }, [router]);

  const methodMap = useMemo(() => new Map(methods.map(m => [m.id, m.name])), [methods]);

  const receivables = useMemo(() => items.filter(t => t.tag === "receivable"), [items]);
  const payables    = useMemo(() => items.filter(t => t.tag === "payable"),    [items]);

  const totalReceivable = useMemo(
    () => receivables.reduce((s, t) => s + Number(t.amount ?? 0), 0),
    [receivables]
  );
  const totalPayable = useMemo(
    () => payables.reduce((s, t) => s + Number(t.amount ?? 0), 0),
    [payables]
  );
  const netExposure = totalReceivable - totalPayable;

  const money = (n: number) =>
    formatMoney(n, code, "en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  function TxnRow({ t }: { t: Txn }) {
    return (
      <div
        className="row"
        style={{
          justifyContent: "space-between",
          padding: "10px 0",
          borderBottom: "1px solid var(--stroke)",
          gap: 8,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {t.note || "—"}
          </div>
          <div className="faint" style={{ fontSize: 12, marginTop: 3 }}>
            {fmtDate(t.created_at)}
            {t.payment_method_id && (
              <> · {methodMap.get(t.payment_method_id) ?? "—"}</>
            )}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div
            className="money"
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: t.direction === "income" ? "var(--goodLight)" : "var(--badLight)",
            }}
          >
            {t.direction === "income" ? "+" : "-"}{money(Number(t.amount ?? 0))}
          </div>
          <div
            className="badge"
            style={{ marginTop: 4, fontSize: 10 }}
          >
            {t.direction}
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="h1">Receivables</h1>
          <p className="sub">Money owed to you and money you owe.</p>
        </div>
      </div>

      {msg && <div className="toast" style={{ marginTop: 12 }}>{msg}</div>}

      {/* Net exposure summary */}
      <div
        className="card cardPad fadeUp"
        style={{ marginTop: 14 }}
      >
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="muted" style={{ fontSize: 12, fontWeight: 500 }}>Net exposure</div>
            <div
              className="money"
              style={{
                fontWeight: 800,
                fontSize: 24,
                marginTop: 4,
                color: netExposure >= 0 ? "var(--goodLight)" : "var(--badLight)",
              }}
            >
              {netExposure >= 0 ? "+" : ""}{money(netExposure)}
            </div>
            <div className="faint" style={{ fontSize: 12, marginTop: 4 }}>
              {netExposure >= 0 ? "You are owed more than you owe" : "You owe more than you are owed"}
            </div>
          </div>
          <div className="row" style={{ gap: 20 }}>
            <div style={{ textAlign: "center" }}>
              <div className="muted" style={{ fontSize: 11 }}>To receive</div>
              <div className="money" style={{ fontWeight: 700, fontSize: 16, color: "var(--goodLight)", marginTop: 4 }}>
                {money(totalReceivable)}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div className="muted" style={{ fontSize: 11 }}>To pay</div>
              <div className="money" style={{ fontWeight: 700, fontSize: 16, color: "var(--badLight)", marginTop: 4 }}>
                {money(totalPayable)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card cardPad" style={{ marginTop: 12 }}>
          <div className="skeleton" style={{ height: 20, borderRadius: 8, marginBottom: 10 }} />
          <div className="skeleton" style={{ height: 20, borderRadius: 8, width: "70%" }} />
        </div>
      ) : (
        <div className="grid2" style={{ marginTop: 12 }}>
          {/* Receivables */}
          <div className="card cardPad">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="pill" style={{ borderColor: "rgba(16,185,129,.35)" }}>
                <span>💚</span>
                <span style={{ color: "var(--goodLight)" }}>Receivables</span>
              </div>
              <span className="badge badgeGood">{money(totalReceivable)}</span>
            </div>
            <div className="sep" />
            {receivables.length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>No receivables. Tag a transaction as "receivable" to track it here.</p>
            ) : (
              receivables.map(t => <TxnRow key={t.id} t={t} />)
            )}
          </div>

          {/* Payables */}
          <div className="card cardPad">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="pill" style={{ borderColor: "rgba(244,63,94,.35)" }}>
                <span>🔴</span>
                <span style={{ color: "var(--badLight)" }}>Payables</span>
              </div>
              <span className="badge badgeBad">{money(totalPayable)}</span>
            </div>
            <div className="sep" />
            {payables.length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>No payables. Tag a transaction as "payable" to track it here.</p>
            ) : (
              payables.map(t => <TxnRow key={t.id} t={t} />)
            )}
          </div>
        </div>
      )}
    </main>
  );
}
