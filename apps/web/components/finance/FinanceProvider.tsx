"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { addEntryToState, createSeedState, type EntryInput, type FinanceState } from "@/lib/finance";

interface FinanceContextValue {
  state: FinanceState;
  addEntry: (entry: EntryInput) => void;
  resetDemo: () => void;
}

const storageKey = "spendtracker:finance-state:v2";

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FinanceState>(createSeedState);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state]);

  function addEntry(entry: EntryInput) {
    setState((current) => addEntryToState(current, entry));
  }

  function resetDemo() {
    const seed = createSeedState();
    setState(seed);
    window.localStorage.setItem(storageKey, JSON.stringify(seed));
  }

  return (
    <FinanceContext.Provider value={{ state, addEntry, resetDemo }}>
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
