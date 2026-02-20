"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Txn = {
  id: string;
  direction: "expense" | "income";
  amount: number | null;
  note: string;
  created_at: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [txns, setTxns] = useState<Txn[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const supabase = supabaseBrowser();

    async function load() {
      setErr(null);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login");
        return;
      }
      setEmail(userData.user.email ?? "");

      const { data, error } = await supabase
        .from("transactions")
        .select("id, direction, amount, note, created_at")
        .order("created_at", { ascending: false })
        .limit(25);

      if (error) setErr(error.message);
      setTxns((data ?? []) as Txn[]);
    }

    void load();
  }, [router]);

  async function logout() {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Dashboard</h1>
      <p>Logged in as: {email}</p>

      <p>
        <a href="/settings/link-telegram">Link Telegram</a>
      </p>

      <button onClick={logout} style={{ padding: 10, marginTop: 8 }}>
        Logout
      </button>

      <h2 style={{ marginTop: 20 }}>Latest transactions</h2>
      {err && <p style={{ color: "crimson" }}>Error: {err}</p>}
      <ul>
        {txns.map((t) => (
          <li key={t.id}>
            {t.direction} — ₹{t.amount ?? "?"} — {t.note} —{" "}
            {new Date(t.created_at).toLocaleString("en-IN")}
          </li>
        ))}
      </ul>
    </main>
  );
}
