"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function parse(textRaw: string) {
  const text = textRaw.trim();
  const lower = text.toLowerCase();

  const direction =
    lower.startsWith("income") ||
    lower.startsWith("earned") ||
    lower.startsWith("received")
      ? "income"
      : "expense";

  const catMatch = text.match(/#([a-zA-Z0-9_\-]+)/);
  const category = catMatch ? catMatch[1] : null;

  const m = text.match(/(\d+(?:\.\d+)?)/);
  const amount = m ? Number(m[1]) : null;

  let note = text;
  if (catMatch) note = note.replace(catMatch[0], "");
  if (m) note = note.replace(m[0], "");
  note = note.replace(/^(spent|paid|expense|income|earned|received)\s*/i, "").trim();
  if (!note) note = direction === "income" ? "income" : "expense";

  return { direction, amount, note, category };
}

export default function QuickAddDrawer() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hint = useMemo(() => {
    return open
      ? "Try: spent 250 groceries #food"
      : "Tap to quick add";
  }, [open]);

  async function save() {
    setMsg(null);
    setLoading(true);

    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setLoading(false);
      router.replace("/login");
      return;
    }

    const { direction, amount, note, category } = parse(text);

    if (!amount || Number.isNaN(amount) || amount <= 0) {
      setLoading(false);
      setMsg("Add an amount, e.g. “spent 250 groceries”.");
      return;
    }

    const { error } = await supabase.from("transactions").insert({
      user_id: u.user.id,
      direction,
      amount,
      note: note.slice(0, 80),
      category,
      occurred_at: new Date().toISOString(),
      payment_method: "quick_drawer",
    });

    setLoading(false);
    if (error) {
      setMsg(error.message);
      return;
    }

    setText("");
    setMsg("Saved ✅");
    router.refresh();
    setTimeout(() => {
      setMsg(null);
      setOpen(false);
    }, 900);
  }

  return (
    <div className="card" style={{ padding: 12, borderRadius: 18 }}>
      <button
        className={`btn ${open ? "btnPrimary" : ""}`}
        style={{ width: "100%" }}
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        {open ? "Close Quick Add" : "＋ Quick Add"}
      </button>

      <div className="faint" style={{ fontSize: 12, marginTop: 8 }}>{hint}</div>

      {open && (
        <div className="col" style={{ marginTop: 10 }}>
          <input
            className="input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="spent 250 groceries #food"
          />

          <div className="row">
            <button className="btn btnPrimary" style={{ flex: 1 }} onClick={save} disabled={loading}>
              {loading ? "Saving…" : "Save"}
            </button>
            <button
              className="btn"
              style={{ flex: 1 }}
              onClick={() => setText("spent 250 groceries #food")}
              disabled={loading}
              type="button"
            >
              Example
            </button>
          </div>

          {msg && <div className="toast"><span className="muted">{msg}</span></div>}
        </div>
      )}
    </div>
  );
}
