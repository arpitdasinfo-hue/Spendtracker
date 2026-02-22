"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { currencySymbol, type CurrencyCode } from "@/lib/currency";

const OPTIONS: CurrencyCode[] = ["INR", "USD", "GBP", "AED"];

export default function CurrencyConfigPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const [current, setCurrent] = useState<CurrencyCode>("INR");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return router.replace("/login");

      const { data, error } = await supabase
        .from("profiles")
        .select("currency_code")
        .eq("id", u.user.id)
        .maybeSingle();

      if (!error && data?.currency_code) setCurrent(data.currency_code as CurrencyCode);
    })();
  }, [router]);

  async function setCurrency(code: CurrencyCode) {
    setMsg(null);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return router.replace("/login");

    const { error } = await supabase
      .from("profiles")
      .update({ currency_code: code })
      .eq("id", u.user.id);

    if (error) return setMsg(error.message);

    setCurrent(code);
    setMsg("Saved ✅");
    setTimeout(() => setMsg(null), 900);
  }

  return (
    <main className="container">
      <h1 className="h1">Config · Currency</h1>
      <p className="sub">Choose a currency symbol (no words).</p>

      {msg && <div className="toast" style={{ marginTop: 12 }}>{msg}</div>}

      <div className="card cardPad" style={{ marginTop: 14 }}>
        <div className="pill">
          <span>💱</span>
          <span className="muted">Current</span>
          <span className="kbd">{currencySymbol(current)}</span>
        </div>

        <div className="sep" />

        <div className="grid2" style={{ gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {OPTIONS.map((c) => (
            <button
              key={c}
              className={`btn ${current === c ? "btnPrimary" : ""}`}
              onClick={() => setCurrency(c)}
              type="button"
              style={{ padding: 16, fontSize: 18, fontWeight: 850 }}
              title={c}
            >
              {currencySymbol(c)}
            </button>
          ))}
        </div>

        <p className="faint" style={{ marginTop: 12, fontSize: 12 }}>
          This updates the symbol across the app.
        </p>
      </div>
    </main>
  );
}
