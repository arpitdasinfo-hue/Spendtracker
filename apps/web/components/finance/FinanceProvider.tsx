"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createEmptyState, createSeedState, type EntryInput, type FinanceState } from "@/lib/finance";
import {
  applyFinanceEntryForUser,
  ensureFinanceSeedData,
  loadFinanceStateForUser,
  replaceFinanceStateForUser,
} from "@/lib/finance-supabase";
import { createSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";

type FinanceStatus = "setup" | "loading" | "unauthenticated" | "ready" | "error";

interface FinanceContextValue {
  state: FinanceState;
  status: FinanceStatus;
  hasSupabase: boolean;
  userEmail: string | null;
  error: string | null;
  addEntry: (entry: EntryInput) => Promise<void>;
  resetDemo: () => Promise<void>;
  refresh: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const enabled = hasSupabaseEnv();
  const [state, setState] = useState<FinanceState>(() => (enabled ? createEmptyState() : createSeedState()));
  const [status, setStatus] = useState<FinanceStatus>(enabled ? "loading" : "setup");
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!supabase) return;

    setError(null);

    const { data, error: authError } = await supabase.auth.getUser();
    if (authError) {
      setStatus("error");
      setError(authError.message);
      return;
    }

    if (!data.user) {
      setUserId(null);
      setUserEmail(null);
      setState(createEmptyState());
      setStatus("unauthenticated");
      return;
    }

    setStatus("loading");
    setUserId(data.user.id);
    setUserEmail(data.user.email ?? null);

    try {
      await ensureFinanceSeedData(supabase, data.user.id);
      const nextState = await loadFinanceStateForUser(supabase, data.user.id);
      setState(nextState);
      setStatus("ready");
    } catch (nextError) {
      setStatus("error");
      setError(nextError instanceof Error ? nextError.message : "Unable to load finance data from Supabase.");
    }
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;

    let active = true;

    void (async () => {
      await refresh();
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      if (!active) return;
      void refresh();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [refresh, supabase]);

  async function addEntry(entry: EntryInput) {
    if (!supabase || !userId) {
      throw new Error("Sign in to save entries to Supabase.");
    }

    setError(null);

    try {
      await applyFinanceEntryForUser(supabase, entry);
      const nextState = await loadFinanceStateForUser(supabase, userId);
      setState(nextState);
      setStatus("ready");
    } catch (nextError) {
      setStatus("error");
      setError(nextError instanceof Error ? nextError.message : "Unable to save the entry.");
      throw nextError;
    }
  }

  async function resetDemo() {
    if (!supabase || !userId) {
      throw new Error("Sign in to seed demo data in Supabase.");
    }

    setError(null);
    setStatus("loading");

    try {
      await replaceFinanceStateForUser(supabase, userId, createSeedState());
      const nextState = await loadFinanceStateForUser(supabase, userId);
      setState(nextState);
      setStatus("ready");
    } catch (nextError) {
      setStatus("error");
      setError(nextError instanceof Error ? nextError.message : "Unable to reset demo data.");
      throw nextError;
    }
  }

  return (
    <FinanceContext.Provider
      value={{
        state,
        status,
        hasSupabase: enabled,
        userEmail,
        error,
        addEntry,
        resetDemo,
        refresh,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error("useFinance must be used within FinanceProvider");
  }
  return context;
}
