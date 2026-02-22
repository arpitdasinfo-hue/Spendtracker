"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const CURRENCIES = [
  { code: "INR", symbol: "₹" },
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "AED", symbol: "د.إ" },
] as const;

export default function CurrencyConfigPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const [currency, setCurrency] = useState<string>("INR");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return router.replace("/login");

      const { data: prof } = await supabase
        .from("profiles")
        .select("currency_code")
        .eq("id", u.user.id)
        .maybeSingle();

      if (prof?.currency_code) setCurrency(prof.currency_code);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function choose(code: string) {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setLoading(false);
      return router.replace("/login");
    }

    setCurrency(code);

    // Persist silently (no banner)
    await supabase.from("profiles").update({ currency_code: code }).eq("id", u.user.id);

    setLoading(false);
    router.refresh(); // ensures symbol updates everywhere
  }

  return (
    <main className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="h1">Config · Currency</h1>
          <p className="sub">Choose your display currency (code + symbol).</p>
        </div>
        <span className="badge">Profile</span>
      </div>

      <div className="card cardPad" style={{ marginTop: 14 }}>
        <div className="pill">
          <span>💱</span>
          <span className="muted">Current</span>
          <span className="kbd">{currency}</span>
        </div>

        <div className="sep" />

        <div className="grid2" style={{ gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {CURRENCIES.map((c) => {
            const active = currency === c.code;
            return (
              <button
                key={c.code}
                className={`btn ${active ? "btnPrimary" : ""}`}
                onClick={() => choose(c.code)}
                disabled={loading}
                type="button"
                style={{
                  justifyContent: "center",
                  padding: "14px 12px",
                  borderRadius: 16,
                  fontWeight: 800,
                }}
              >
                <span style={{ marginRight: 10 }}>{c.symbol}</span>
                {c.code}
              </button>
            );
          })}
        </div>

        <div className="faint" style={{ marginTop: 12, fontSize: 12 }}>
          Selecting a currency updates symbols across the app.
        </div>
      </div>
    </main>
  );
}
