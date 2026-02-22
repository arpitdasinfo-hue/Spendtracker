"use client";

import { useState } from "react";
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

export default function QuickAdd() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function add() {
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
      payment_method: "quick_add",
    });

    setLoading(false);
    if (error) {
      setMsg(error.message);
      return;
    }

    setText("");
    setMsg("Saved ✅");
    // refresh server data
    router.refresh();
    setTimeout(() => setMsg(null), 1400);
  }

  return (
    <div className="col">
      <input
        className="input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="spent 250 groceries"
        inputMode="text"
      />

      <div className="row">
        <button className="btn btnPrimary" style={{ flex: 1 }} onClick={add} disabled={loading}>
          {loading ? "Saving…" : "Save"}
        </button>
        <button
          className="btn"
          style={{ flex: 1 }}
          onClick={() => setText("income 5000 salary")}
          disabled={loading}
          title="Example"
        >
          Fill example
        </button>
      </div>

      {msg && <div className="toast"><span className="muted">{msg}</span></div>}
    </div>
  );
}
