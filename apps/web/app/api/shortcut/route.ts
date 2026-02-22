import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function parseINR(textRaw: string) {
  const text = textRaw.trim();
  const lower = text.toLowerCase();

  const direction =
    lower.startsWith("income") ||
    lower.startsWith("earned") ||
    lower.startsWith("received")
      ? "income"
      : "expense";

  const m = text.match(/(\d+(?:\.\d+)?)/);
  const amount = m ? Number(m[1]) : null;

  let note = text;
  if (m) note = note.replace(m[0], "");
  note = note.replace(/^(spent|paid|expense|income|earned|received)\s*/i, "").trim();
  if (!note) note = direction === "income" ? "income" : "expense";

  return { direction, amount, note };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const secret = req.headers.get("x-shortcut-secret") || body.secret;

    if (!secret || secret !== process.env.SHORTCUT_SECRET) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const user_id = body.user_id as string | undefined;
    const text = body.text as string | undefined;

    if (!user_id) return NextResponse.json({ ok: false, error: "Missing user_id" }, { status: 400 });
    if (!text) return NextResponse.json({ ok: false, error: "Missing text" }, { status: 400 });

    const { direction, amount, note } = parseINR(text);

    if (!amount || Number.isNaN(amount)) {
      return NextResponse.json(
        { ok: false, error: "Could not find amount. Say: 'spent 250 groceries'." },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { error } = await supabase.from("transactions").insert({
      user_id,
      direction,
      amount,
      note: note.slice(0, 80),
      occurred_at: new Date().toISOString(),
      payment_method: "siri_shortcut",
    });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, saved: { direction, amount, note } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
