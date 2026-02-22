"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AddTransactionPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [direction, setDirection] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Ensure logged in
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace("/login");
    });
  }, [router]);

  async function save() {
    setMsg(null);
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setLoading(false);
      router.replace("/login");
      return;
    }

    const amt = Number(amount);
    if (!amt || Number.isNaN(amt) || amt <= 0) {
      setLoading(false);
      setMsg("Enter a valid amount (e.g., 250).");
      return;
    }

    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      direction,
      amount: amt,
      note: (note || (direction === "expense" ? "expense" : "income")).slice(0, 80),
      occurred_at: new Date().toISOString(),
      payment_method: "manual_web",
    });

    setLoading(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    router.replace("/dashboard");
  }

  return (
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h1>Add Transaction</h1>

      <label style={{ display: "block", marginTop: 12 }}>
        Type
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value as any)}
          style={{ display: "block", width: "100%", padding: 10, marginTop: 6 }}
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
      </label>

      <label style={{ display: "block", marginTop: 12 }}>
        Amount (INR)
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder="250"
          style={{ display: "block", width: "100%", padding: 10, marginTop: 6 }}
        />
      </label>

      <label style={{ display: "block", marginTop: 12 }}>
        Note (optional)
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="groceries, chai, rent..."
          style={{ display: "block", width: "100%", padding: 10, marginTop: 6 }}
        />
      </label>

      <button
        onClick={save}
        disabled={loading}
        style={{ marginTop: 16, padding: 12, width: "100%" }}
      >
        {loading ? "Saving..." : "Save"}
      </button>

      {msg && <p style={{ marginTop: 12, color: "crimson" }}>{msg}</p>}
    </main>
  );
}
