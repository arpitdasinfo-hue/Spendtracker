import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createEmptyState,
  createSeedState,
  type Account,
  type Budget,
  type EntryInput,
  type FinanceState,
  type Goal,
  type Mandate,
  type Transaction,
} from "@/lib/finance";

type FinanceSupabase = SupabaseClient;

type AccountRow = {
  id: string;
  user_id: string;
  name: string;
  provider: string;
  mask: string;
  type: Account["type"];
  current_balance: number;
  credit_limit: number | null;
  statement_day: number | null;
  due_day: number | null;
  color: string;
  rail_hint: string;
};

type BudgetRow = {
  id: string;
  user_id: string;
  category: string;
  limit_amount: number;
  color: string;
};

type GoalRow = {
  id: string;
  user_id: string;
  name: string;
  target: number;
  saved: number;
  due_month: string;
};

type MandateRow = {
  id: string;
  user_id: string;
  merchant_name: string;
  mandate_type: Mandate["mandateType"];
  payment_rail: Mandate["paymentRail"];
  funding_source_type: Mandate["fundingSourceType"];
  source_account_id: string;
  destination_account_id: string | null;
  amount_type: Mandate["amountType"];
  amount: number;
  frequency: string;
  next_trigger_at: string;
  status: Mandate["status"];
  note: string;
};

type TransactionRow = {
  id: string;
  user_id: string;
  title: string;
  merchant: string;
  category: string;
  type: Transaction["type"];
  amount: number;
  payment_rail: Transaction["paymentRail"];
  funding_source_type: Transaction["fundingSourceType"];
  from_account_id: string | null;
  to_account_id: string | null;
  created_at: string;
  note: string;
  source_label: string;
  status: Transaction["status"];
  origin: Transaction["origin"];
};

function mapAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    provider: row.provider,
    mask: row.mask,
    type: row.type,
    currentBalance: Number(row.current_balance ?? 0),
    creditLimit: row.credit_limit ?? undefined,
    statementDay: row.statement_day ?? undefined,
    dueDay: row.due_day ?? undefined,
    color: row.color,
    railHint: row.rail_hint,
  };
}

function mapBudget(row: BudgetRow): Budget {
  return {
    category: row.category,
    limit: Number(row.limit_amount ?? 0),
    color: row.color,
  };
}

function mapGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    name: row.name,
    target: Number(row.target ?? 0),
    saved: Number(row.saved ?? 0),
    dueMonth: row.due_month,
  };
}

function mapMandate(row: MandateRow): Mandate {
  return {
    id: row.id,
    merchantName: row.merchant_name,
    mandateType: row.mandate_type,
    paymentRail: row.payment_rail,
    fundingSourceType: row.funding_source_type,
    sourceAccountId: row.source_account_id,
    destinationAccountId: row.destination_account_id ?? undefined,
    amountType: row.amount_type,
    amount: Number(row.amount ?? 0),
    frequency: row.frequency,
    nextTriggerAt: row.next_trigger_at,
    status: row.status,
    note: row.note,
  };
}

function mapTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    title: row.title,
    merchant: row.merchant,
    category: row.category,
    type: row.type,
    amount: Number(row.amount ?? 0),
    paymentRail: row.payment_rail,
    fundingSourceType: row.funding_source_type,
    fromAccountId: row.from_account_id ?? undefined,
    toAccountId: row.to_account_id ?? undefined,
    createdAt: row.created_at,
    note: row.note,
    sourceLabel: row.source_label,
    status: row.status,
    origin: row.origin,
  };
}

export async function loadFinanceStateForUser(supabase: FinanceSupabase, userId: string): Promise<FinanceState> {
  const [accounts, budgets, goals, mandates, transactions] = await Promise.all([
    supabase.from("finance_accounts").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
    supabase.from("finance_budgets").select("*").eq("user_id", userId).order("category", { ascending: true }),
    supabase.from("finance_goals").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
    supabase.from("finance_mandates").select("*").eq("user_id", userId).order("next_trigger_at", { ascending: true }),
    supabase.from("finance_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
  ]);

  if (accounts.error) throw accounts.error;
  if (budgets.error) throw budgets.error;
  if (goals.error) throw goals.error;
  if (mandates.error) throw mandates.error;
  if (transactions.error) throw transactions.error;

  return {
    accounts: (accounts.data ?? []).map((row) => mapAccount(row as AccountRow)),
    budgets: (budgets.data ?? []).map((row) => mapBudget(row as BudgetRow)),
    goals: (goals.data ?? []).map((row) => mapGoal(row as GoalRow)),
    mandates: (mandates.data ?? []).map((row) => mapMandate(row as MandateRow)),
    transactions: (transactions.data ?? []).map((row) => mapTransaction(row as TransactionRow)),
  };
}

export async function ensureFinanceSeedData(supabase: FinanceSupabase, userId: string) {
  const { count, error } = await supabase
    .from("finance_accounts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw error;

  if ((count ?? 0) === 0) {
    await replaceFinanceStateForUser(supabase, userId, createSeedState());
  }
}

function namespacedId(userId: string, value: string) {
  return `${userId.slice(0, 8)}-${value}`;
}

function namespaceState(userId: string, state: FinanceState): FinanceState {
  const accountMap = new Map<string, string>();

  const accounts = state.accounts.map((account) => {
    const id = namespacedId(userId, account.id);
    accountMap.set(account.id, id);
    return {
      ...account,
      id,
    };
  });

  const goals = state.goals.map((goal) => ({
    ...goal,
    id: namespacedId(userId, goal.id),
  }));

  const mandates = state.mandates.map((mandate) => ({
    ...mandate,
    id: namespacedId(userId, mandate.id),
    sourceAccountId: accountMap.get(mandate.sourceAccountId) ?? mandate.sourceAccountId,
    destinationAccountId: mandate.destinationAccountId
      ? (accountMap.get(mandate.destinationAccountId) ?? mandate.destinationAccountId)
      : undefined,
  }));

  const transactions = state.transactions.map((transaction) => ({
    ...transaction,
    id: namespacedId(userId, transaction.id),
    fromAccountId: transaction.fromAccountId ? (accountMap.get(transaction.fromAccountId) ?? transaction.fromAccountId) : undefined,
    toAccountId: transaction.toAccountId ? (accountMap.get(transaction.toAccountId) ?? transaction.toAccountId) : undefined,
  }));

  return {
    accounts,
    budgets: state.budgets,
    goals,
    mandates,
    transactions,
  };
}

export async function replaceFinanceStateForUser(supabase: FinanceSupabase, userId: string, sourceState: FinanceState = createSeedState()) {
  const state = namespaceState(userId, sourceState);

  const deletions = [
    supabase.from("finance_transactions").delete().eq("user_id", userId),
    supabase.from("finance_mandates").delete().eq("user_id", userId),
    supabase.from("finance_budgets").delete().eq("user_id", userId),
    supabase.from("finance_goals").delete().eq("user_id", userId),
    supabase.from("finance_accounts").delete().eq("user_id", userId),
  ];

  for (const deletion of deletions) {
    const { error } = await deletion;
    if (error) throw error;
  }

  if (state.accounts.length) {
    const { error } = await supabase.from("finance_accounts").insert(
      state.accounts.map((account) => ({
        id: account.id,
        user_id: userId,
        name: account.name,
        provider: account.provider,
        mask: account.mask,
        type: account.type,
        current_balance: account.currentBalance,
        credit_limit: account.creditLimit ?? null,
        statement_day: account.statementDay ?? null,
        due_day: account.dueDay ?? null,
        color: account.color,
        rail_hint: account.railHint,
      }))
    );
    if (error) throw error;
  }

  if (state.budgets.length) {
    const { error } = await supabase.from("finance_budgets").insert(
      state.budgets.map((budget, index) => ({
        id: namespacedId(userId, `budget-${index}-${budget.category.toLowerCase().replaceAll(" ", "-")}`),
        user_id: userId,
        category: budget.category,
        limit_amount: budget.limit,
        color: budget.color,
      }))
    );
    if (error) throw error;
  }

  if (state.goals.length) {
    const { error } = await supabase.from("finance_goals").insert(
      state.goals.map((goal) => ({
        id: goal.id,
        user_id: userId,
        name: goal.name,
        target: goal.target,
        saved: goal.saved,
        due_month: goal.dueMonth,
      }))
    );
    if (error) throw error;
  }

  if (state.mandates.length) {
    const { error } = await supabase.from("finance_mandates").insert(
      state.mandates.map((mandate) => ({
        id: mandate.id,
        user_id: userId,
        merchant_name: mandate.merchantName,
        mandate_type: mandate.mandateType,
        payment_rail: mandate.paymentRail,
        funding_source_type: mandate.fundingSourceType,
        source_account_id: mandate.sourceAccountId,
        destination_account_id: mandate.destinationAccountId ?? null,
        amount_type: mandate.amountType,
        amount: mandate.amount,
        frequency: mandate.frequency,
        next_trigger_at: mandate.nextTriggerAt,
        status: mandate.status,
        note: mandate.note,
      }))
    );
    if (error) throw error;
  }

  if (state.transactions.length) {
    const { error } = await supabase.from("finance_transactions").insert(
      state.transactions.map((transaction) => ({
        id: transaction.id,
        user_id: userId,
        title: transaction.title,
        merchant: transaction.merchant,
        category: transaction.category,
        type: transaction.type,
        amount: transaction.amount,
        payment_rail: transaction.paymentRail,
        funding_source_type: transaction.fundingSourceType,
        from_account_id: transaction.fromAccountId ?? null,
        to_account_id: transaction.toAccountId ?? null,
        created_at: transaction.createdAt,
        note: transaction.note,
        source_label: transaction.sourceLabel,
        status: transaction.status,
        origin: transaction.origin,
      }))
    );
    if (error) throw error;
  }
}

export async function applyFinanceEntryForUser(supabase: FinanceSupabase, entry: EntryInput) {
  const { error } = await supabase.rpc("apply_finance_entry", {
    p_title: entry.title,
    p_merchant: entry.merchant,
    p_category: entry.category,
    p_type: entry.type,
    p_amount: entry.amount,
    p_payment_rail: entry.paymentRail,
    p_funding_source_id: entry.fundingSourceId ?? null,
    p_destination_account_id: entry.destinationAccountId ?? null,
    p_note: entry.note,
  });

  if (error) {
    throw error;
  }
}

export async function loadOrEmptyState(supabase: FinanceSupabase, userId: string) {
  try {
    return await loadFinanceStateForUser(supabase, userId);
  } catch {
    return createEmptyState();
  }
}
