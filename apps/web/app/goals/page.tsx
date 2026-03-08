"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import ProgressRing from "@/components/ProgressRing";
import { useCurrencySymbol } from "@/lib/useCurrency";
import { formatMoney } from "@/lib/money";

type Goal = {
  id: string;
  name: string;
  target_amount: number;
  saved_amount: number;
  deadline: string | null;
  created_at: string;
  completed_at: string | null;
};

export default function GoalsPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const { sym, code } = useCurrencySymbol();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Add goal form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  // Top-up modal
  const [topUpId, setTopUpId] = useState<string | null>(null);
  const [topUpAmt, setTopUpAmt] = useState("");
  const [topping, setTopping] = useState(false);

  const [acting, setActing] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  async function load() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { router.replace("/login"); return; }

    const { data, error } = await supabase
      .from("savings_goals")
      .select("id, name, target_amount, saved_amount, deadline, created_at, completed_at")
      .order("created_at", { ascending: false });

    if (error) setMsg(error.message);
    setGoals((data ?? []) as Goal[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const money = (n: number) =>
    formatMoney(n, code, "en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const active    = useMemo(() => goals.filter(g => !g.completed_at), [goals]);
  const completed = useMemo(() => goals.filter(g => !!g.completed_at), [goals]);

  async function addGoal() {
    setMsg(null);
    setSaving(true);
    const target = Number(newTarget);
    if (!newName.trim()) { setMsg("Enter a goal name."); setSaving(false); return; }
    if (!target || target <= 0) { setMsg("Enter a valid target amount."); setSaving(false); return; }

    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); router.replace("/login"); return; }

    const { error } = await supabase.from("savings_goals").insert({
      user_id: u.user.id,
      name: newName.trim(),
      target_amount: target,
      deadline: newDeadline || null,
    });

    setSaving(false);
    if (error) { setMsg(error.message); return; }
    setNewName(""); setNewTarget(""); setNewDeadline("");
    setShowAddForm(false);
    await load();
  }

  async function topUp(goalId: string) {
    setMsg(null);
    setTopping(true);
    const amt = Number(topUpAmt);
    if (!amt || amt <= 0) { setMsg("Enter a valid amount."); setTopping(false); return; }

    const goal = goals.find(g => g.id === goalId)!;
    const { error } = await supabase
      .from("savings_goals")
      .update({ saved_amount: Number(goal.saved_amount) + amt })
      .eq("id", goalId);

    setTopping(false);
    if (error) { setMsg(error.message); return; }
    setTopUpId(null); setTopUpAmt("");
    await load();
  }

  async function markComplete(goalId: string) {
    setActing(goalId);
    const { error } = await supabase
      .from("savings_goals")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", goalId);
    if (error) setMsg(error.message);
    setActing(null);
    await load();
  }

  async function deleteGoal(goalId: string) {
    setActing(goalId);
    const { error } = await supabase.from("savings_goals").delete().eq("id", goalId);
    if (error) setMsg(error.message);
    setActing(null);
    await load();
  }

  const fmtDeadline = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  function GoalCard({ g }: { g: Goal }) {
    const isComplete = !!g.completed_at;
    return (
      <div className="card cardPad fadeUp" style={{ opacity: isComplete ? 0.65 : 1 }}>
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{g.name}</div>
            {g.deadline && (
              <span className="badge" style={{ marginTop: 5 }}>
                🗓 {fmtDeadline(g.deadline)}
              </span>
            )}
            {isComplete && (
              <span className="badge badgeGood" style={{ marginTop: 5, marginLeft: g.deadline ? 6 : 0 }}>
                ✓ Completed
              </span>
            )}
          </div>
          <ProgressRing
            value={Number(g.saved_amount)}
            total={Number(g.target_amount)}
            symbol={sym}
            currencyCode={code}
            label="Saved"
          />
        </div>

        {!isComplete && (
          <>
            <div className="sep" />

            {/* Top-up inline */}
            {topUpId === g.id ? (
              <div className="row" style={{ gap: 8 }}>
                <input
                  className="input money"
                  value={topUpAmt}
                  onChange={e => setTopUpAmt(e.target.value)}
                  inputMode="decimal"
                  placeholder={`Amount (${sym})`}
                  autoFocus
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btnPrimary"
                  style={{ padding: "10px 14px", fontSize: 13 }}
                  onClick={() => topUp(g.id)}
                  disabled={topping}
                  type="button"
                >
                  {topping ? "…" : "Add"}
                </button>
                <button
                  className="btn"
                  style={{ padding: "10px 14px", fontSize: 13 }}
                  onClick={() => { setTopUpId(null); setTopUpAmt(""); }}
                  type="button"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                <button
                  className="btn btnPrimary"
                  style={{ flex: 1, fontSize: 13 }}
                  onClick={() => setTopUpId(g.id)}
                  type="button"
                >
                  + Add savings
                </button>
                <button
                  className="btn"
                  style={{ flex: 1, fontSize: 13 }}
                  onClick={() => markComplete(g.id)}
                  disabled={acting === g.id}
                  type="button"
                >
                  {acting === g.id ? "…" : "Mark complete"}
                </button>
                <button
                  className="btn btnDanger"
                  style={{ padding: "10px 14px", fontSize: 13 }}
                  onClick={() => deleteGoal(g.id)}
                  disabled={acting === g.id}
                  type="button"
                >
                  {acting === g.id ? "…" : "Delete"}
                </button>
              </div>
            )}
          </>
        )}

        {isComplete && (
          <>
            <div className="sep" />
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button
                className="btn btnDanger"
                style={{ padding: "8px 14px", fontSize: 13 }}
                onClick={() => deleteGoal(g.id)}
                disabled={acting === g.id}
                type="button"
              >
                {acting === g.id ? "…" : "Delete"}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <main className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="h1">Goals</h1>
          <p className="sub">Track savings targets and top up as you go.</p>
        </div>
        <button
          className="btn btnPrimary"
          onClick={() => setShowAddForm(v => !v)}
          type="button"
        >
          {showAddForm ? "Cancel" : "+ Add Goal"}
        </button>
      </div>

      {msg && (
        <div
          className="toast"
          style={{
            marginTop: 12,
            color: msg.includes("success") || msg.includes("Saved") ? "var(--goodLight)" : "var(--badLight)",
          }}
        >
          {msg}
        </div>
      )}

      {/* Add goal form */}
      {showAddForm && (
        <div className="card cardPad fadeUp" style={{ marginTop: 14 }}>
          <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>New Goal</div>
          <input
            className="input"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Goal name (e.g. Emergency fund)"
          />
          <div style={{ height: 10 }} />
          <input
            className="input money"
            value={newTarget}
            onChange={e => setNewTarget(e.target.value)}
            inputMode="decimal"
            placeholder={`Target amount (${sym})`}
            style={{ fontWeight: 700 }}
          />
          <div style={{ height: 10 }} />
          <label className="muted" style={{ fontSize: 12 }}>Deadline (optional)</label>
          <input
            className="input"
            type="date"
            value={newDeadline}
            onChange={e => setNewDeadline(e.target.value)}
            style={{ marginTop: 6 }}
          />
          <button
            className="btn btnPrimary"
            style={{ width: "100%", marginTop: 12 }}
            onClick={addGoal}
            disabled={saving}
            type="button"
          >
            {saving ? "Saving…" : "Create Goal"}
          </button>
        </div>
      )}

      {/* Active goals */}
      <div className="col" style={{ marginTop: 14, gap: 10 }}>
        {loading ? (
          [1, 2].map(i => (
            <div key={i} className="card cardPad">
              <div className="skeleton" style={{ height: 20, width: "50%", marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 104, borderRadius: 52, width: 104 }} />
            </div>
          ))
        ) : active.length === 0 && !showAddForm ? (
          <div className="card cardPad">
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>
              No active goals. Tap <strong>+ Add Goal</strong> to start tracking.
            </p>
          </div>
        ) : (
          active.map(g => <GoalCard key={g.id} g={g} />)
        )}
      </div>

      {/* Completed goals */}
      {completed.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <button
            className="btn"
            style={{ width: "100%", fontSize: 13, color: "var(--muted)" }}
            onClick={() => setShowCompleted(v => !v)}
            type="button"
          >
            {showCompleted ? "Hide" : "Show"} completed ({completed.length})
          </button>
          {showCompleted && (
            <div className="col" style={{ marginTop: 10, gap: 10 }}>
              {completed.map(g => <GoalCard key={g.id} g={g} />)}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
