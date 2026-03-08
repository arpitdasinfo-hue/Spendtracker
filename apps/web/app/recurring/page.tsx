"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useCurrencySymbol } from "@/lib/useCurrency";
import { formatMoney } from "@/lib/money";

type Template = {
  id: string;
  direction: "expense" | "income";
  amount: number;
  note: string | null;
  category_id: string | null;
  payment_method_id: string | null;
  tag: string | null;
  last_posted_at: string | null;
  created_at: string;
};

type Cat = { id: string; name: string };
type Method = { id: string; name: string };

export default function RecurringPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const { sym, code } = useCurrencySymbol();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [methods, setMethods] = useState<Method[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { router.replace("/login"); return; }

    const [tRes, cRes, mRes] = await Promise.all([
      supabase
        .from("recurring_templates")
        .select("id, direction, amount, note, category_id, payment_method_id, tag, last_posted_at, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("categories").select("id, name").eq("is_active", true),
      supabase.from("payment_methods").select("id, name").eq("is_active", true),
    ]);

    if (tRes.error) setMsg(tRes.error.message);
    setTemplates((tRes.data ?? []) as Template[]);
    setCats((cRes.data ?? []) as Cat[]);
    setMethods((mRes.data ?? []) as Method[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const catMap    = useMemo(() => new Map(cats.map(c => [c.id, c.name])),    [cats]);
  const methodMap = useMemo(() => new Map(methods.map(m => [m.id, m.name])), [methods]);

  const money = (n: number) =>
    formatMoney(n, code, "en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  async function postNow(t: Template) {
    setMsg(null);
    setPosting(t.id);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setPosting(null); return; }

    const { error } = await supabase.from("transactions").insert({
      user_id: u.user.id,
      direction: t.direction,
      amount: t.amount,
      note: t.note,
      category_id: t.category_id,
      payment_method_id: t.payment_method_id,
      tag: t.tag,
      occurred_at: new Date().toISOString(),
      payment_method: "recurring",
    });

    if (error) { setMsg(error.message); setPosting(null); return; }

    await supabase
      .from("recurring_templates")
      .update({ last_posted_at: new Date().toISOString() })
      .eq("id", t.id);

    setPosting(null);
    await load();
    setMsg("Posted successfully!");
  }

  async function deleteTemplate(id: string) {
    setDeleting(id);
    const { error } = await supabase.from("recurring_templates").delete().eq("id", id);
    if (error) setMsg(error.message);
    setDeleting(null);
    await load();
  }

  const fmtDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })
      : "Never";

  return (
    <main className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="h1">Recurring</h1>
          <p className="sub">One-tap re-add for frequent transactions.</p>
        </div>
        <span className="badge">{templates.length} template{templates.length !== 1 ? "s" : ""}</span>
      </div>

      {msg && (
        <div
          className="toast"
          style={{
            marginTop: 12,
            color: msg.includes("success") ? "var(--goodLight)" : "var(--badLight)",
          }}
        >
          {msg}
        </div>
      )}

      <div className="col" style={{ marginTop: 14, gap: 10 }}>
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="card cardPad">
              <div className="skeleton" style={{ height: 18, width: "60%", marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 14, width: "40%" }} />
            </div>
          ))
        ) : templates.length === 0 ? (
          <div className="card cardPad">
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>
              No recurring templates yet. Go to <strong>Add</strong> and tap{" "}
              <strong>"Save as Recurring"</strong> to create one.
            </p>
          </div>
        ) : (
          templates.map(t => (
            <div key={t.id} className="card cardPad fadeUp">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div className="row" style={{ gap: 10 }}>
                  <span
                    className={`badge ${t.direction === "income" ? "badgeGood" : "badgeBad"}`}
                  >
                    {t.direction === "income" ? "↘ income" : "↗ expense"}
                  </span>
                  {t.tag && (
                    <span className="badge" style={{ textTransform: "capitalize" }}>{t.tag}</span>
                  )}
                </div>
                <div
                  className="money"
                  style={{
                    fontWeight: 800,
                    fontSize: 18,
                    color: t.direction === "income" ? "var(--goodLight)" : "var(--badLight)",
                  }}
                >
                  {money(Number(t.amount))}
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{t.note || "—"}</div>
                <div className="faint" style={{ fontSize: 12, marginTop: 4 }}>
                  {t.category_id ? catMap.get(t.category_id) ?? "—" : "No category"}
                  {t.payment_method_id ? ` · ${methodMap.get(t.payment_method_id) ?? "—"}` : ""}
                </div>
              </div>

              <div className="sep" />

              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="faint" style={{ fontSize: 12 }}>
                  Last posted: {fmtDate(t.last_posted_at)}
                </span>
                <div className="row" style={{ gap: 8 }}>
                  <button
                    className="btn btnPrimary"
                    style={{ padding: "8px 14px", fontSize: 13 }}
                    disabled={posting === t.id}
                    onClick={() => postNow(t)}
                    type="button"
                  >
                    {posting === t.id ? "Posting…" : "Post now"}
                  </button>
                  <button
                    className="btn btnDanger"
                    style={{ padding: "8px 14px", fontSize: 13 }}
                    disabled={deleting === t.id}
                    onClick={() => deleteTemplate(t.id)}
                    type="button"
                  >
                    {deleting === t.id ? "…" : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
