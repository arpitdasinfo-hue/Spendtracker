export type EntryType = "expense" | "income" | "transfer" | "repayment";
export type PaymentRail = "cash" | "upi" | "card" | "bank_transfer" | "auto_debit";
export type AccountType = "cash" | "bank" | "credit_card" | "credit_line";
export type FundingSourceType = "cash_wallet" | "bank_account" | "credit_card" | "credit_line";
export type MandateType = "upi_autopay" | "debit_card_emandate" | "credit_card_emandate";

export interface Account {
  id: string;
  name: string;
  provider: string;
  mask: string;
  type: AccountType;
  currentBalance: number;
  creditLimit?: number;
  statementDay?: number;
  dueDay?: number;
  color: string;
  railHint: string;
}

export interface Transaction {
  id: string;
  title: string;
  merchant: string;
  category: string;
  type: EntryType;
  amount: number;
  paymentRail: PaymentRail;
  fundingSourceType: FundingSourceType;
  fromAccountId?: string;
  toAccountId?: string;
  createdAt: string;
  note: string;
  sourceLabel: string;
  status: "posted" | "scheduled";
  origin: "manual" | "mandate" | "seed";
}

export interface Mandate {
  id: string;
  merchantName: string;
  mandateType: MandateType;
  paymentRail: PaymentRail;
  fundingSourceType: FundingSourceType;
  sourceAccountId: string;
  destinationAccountId?: string;
  amountType: "fixed" | "variable";
  amount: number;
  frequency: string;
  nextTriggerAt: string;
  status: "active" | "paused" | "draft";
  note: string;
}

export interface Budget {
  category: string;
  limit: number;
  color: string;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  dueMonth: string;
}

export interface FinanceState {
  accounts: Account[];
  budgets: Budget[];
  goals: Goal[];
  mandates: Mandate[];
  transactions: Transaction[];
}

export interface EntryInput {
  amount: number;
  title: string;
  merchant: string;
  category: string;
  type: EntryType;
  paymentRail: PaymentRail;
  fundingSourceId?: string;
  destinationAccountId?: string;
  note: string;
}

export function createEmptyState(): FinanceState {
  return {
    accounts: [],
    budgets: [],
    goals: [],
    mandates: [],
    transactions: [],
  };
}

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  currency: "INR",
  style: "currency",
  maximumFractionDigits: 0,
});

const compactFormatter = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

export function formatCompact(value: number) {
  return compactFormatter.format(value);
}

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

export function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function percent(part: number, whole: number) {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

export function monthLabel(offset = 0) {
  const date = new Date();
  date.setMonth(date.getMonth() + offset);
  return date.toLocaleDateString("en-IN", { month: "long" });
}

function isoAt(monthOffset: number, day: number, hour: number, minute = 0) {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() + monthOffset, day, hour, minute, 0, 0);
  return date.toISOString();
}

function fundingSourceTypeOf(account: Account): FundingSourceType {
  if (account.type === "cash") return "cash_wallet";
  if (account.type === "credit_card") return "credit_card";
  if (account.type === "credit_line") return "credit_line";
  return "bank_account";
}

function flowLabel(type: EntryType) {
  if (type === "expense") return "Spend view";
  if (type === "income") return "Income";
  if (type === "transfer") return "Internal move";
  return "Liability repayment";
}

export const entryOptions: Array<{ value: EntryType; label: string; hint: string }> = [
  { value: "expense", label: "Expense", hint: "Book consumption on purchase date." },
  { value: "income", label: "Income", hint: "Credit salary, reimbursement, or side income." },
  { value: "transfer", label: "Transfer", hint: "Move money between your own accounts." },
  { value: "repayment", label: "Repayment", hint: "Reduce credit card outstanding without double counting spend." },
];

export const paymentRailOptions: Array<{ value: PaymentRail; label: string; hint: string }> = [
  { value: "upi", label: "UPI", hint: "Use UPI as a rail and pick the real funding source." },
  { value: "card", label: "Card", hint: "Debit or credit card, directly from the card surface." },
  { value: "bank_transfer", label: "Bank", hint: "NEFT, IMPS, standing instruction, or manual transfer." },
  { value: "auto_debit", label: "AutoPay", hint: "Mandate-triggered charge or bill payment." },
  { value: "cash", label: "Cash", hint: "Wallet or cash-in-hand settlement." },
];

export const expenseCategories = [
  "Groceries",
  "Food & Drinks",
  "Transport",
  "Utilities",
  "Shopping",
  "Travel",
  "Health",
  "Subscription",
  "Family",
  "Recharge",
] as const;

export const incomeCategories = [
  "Salary",
  "Freelance",
  "Interest",
  "Cashback",
  "Reimbursement",
] as const;

export const spendingRailColors: Record<PaymentRail, string> = {
  upi: "#1f9d8b",
  card: "#ef7f5d",
  bank_transfer: "#5571f2",
  auto_debit: "#f5bf4f",
  cash: "#9665db",
};

export function createSeedState(): FinanceState {
  return {
    accounts: [
      {
        id: "axis-salary",
        name: "Salary Account",
        provider: "Axis Bank",
        mask: "…1892",
        type: "bank",
        currentBalance: 184600,
        color: "#0f766e",
        railHint: "Salary inflows and card bill autopay",
      },
      {
        id: "hdfc-daily",
        name: "Daily Banking",
        provider: "HDFC Bank",
        mask: "…4408",
        type: "bank",
        currentBalance: 46280,
        color: "#2450d8",
        railHint: "Primary UPI and debit card account",
      },
      {
        id: "icici-travel",
        name: "Travel Float",
        provider: "ICICI Bank",
        mask: "…7721",
        type: "bank",
        currentBalance: 22940,
        color: "#e7693c",
        railHint: "Trips, fuel, and weekend transfers",
      },
      {
        id: "cash-wallet",
        name: "Cash Wallet",
        provider: "Offline",
        mask: "on hand",
        type: "cash",
        currentBalance: 2350,
        color: "#7c3aed",
        railHint: "Cash, tips, and local settlements",
      },
      {
        id: "hdfc-millennia",
        name: "Millennia",
        provider: "HDFC Credit Card",
        mask: "…9011",
        type: "credit_card",
        currentBalance: 26400,
        creditLimit: 125000,
        statementDay: 20,
        dueDay: 5,
        color: "#0f172a",
        railHint: "Bills, shopping, and autopay subscriptions",
      },
      {
        id: "sbi-rupay",
        name: "RuPay UPI Card",
        provider: "SBI Card",
        mask: "…7718",
        type: "credit_card",
        currentBalance: 11850,
        creditLimit: 85000,
        statementDay: 14,
        dueDay: 1,
        color: "#7c2d12",
        railHint: "Merchant UPI on credit card",
      },
    ],
    budgets: [
      { category: "Food & Drinks", limit: 18000, color: "#ef7f5d" },
      { category: "Groceries", limit: 14000, color: "#1f9d8b" },
      { category: "Travel", limit: 10000, color: "#2450d8" },
      { category: "Subscription", limit: 3500, color: "#f5bf4f" },
    ],
    goals: [
      { id: "goa", name: "Goa long weekend", target: 85000, saved: 47250, dueMonth: "July 2026" },
      { id: "laptop", name: "Design laptop refresh", target: 165000, saved: 72000, dueMonth: "September 2026" },
    ],
    mandates: [
      {
        id: "mandate-netflix",
        merchantName: "Netflix",
        mandateType: "credit_card_emandate",
        paymentRail: "auto_debit",
        fundingSourceType: "credit_card",
        sourceAccountId: "hdfc-millennia",
        amountType: "fixed",
        amount: 649,
        frequency: "Monthly",
        nextTriggerAt: isoAt(0, 7, 8, 0),
        status: "active",
        note: "Entertainment bundle on HDFC card",
      },
      {
        id: "mandate-sip",
        merchantName: "Bluechip SIP",
        mandateType: "upi_autopay",
        paymentRail: "upi",
        fundingSourceType: "bank_account",
        sourceAccountId: "axis-salary",
        amountType: "fixed",
        amount: 5000,
        frequency: "Monthly",
        nextTriggerAt: isoAt(0, 6, 7, 30),
        status: "active",
        note: "UPI AutoPay from salary account",
      },
      {
        id: "mandate-card-bill",
        merchantName: "HDFC Card Bill AutoPay",
        mandateType: "debit_card_emandate",
        paymentRail: "auto_debit",
        fundingSourceType: "bank_account",
        sourceAccountId: "axis-salary",
        destinationAccountId: "hdfc-millennia",
        amountType: "variable",
        amount: 18000,
        frequency: "Monthly on due date",
        nextTriggerAt: isoAt(0, 5, 9, 15),
        status: "active",
        note: "Bill repayment mandate. Creates repayment, not expense.",
      },
      {
        id: "mandate-electricity",
        merchantName: "BESCOM",
        mandateType: "debit_card_emandate",
        paymentRail: "auto_debit",
        fundingSourceType: "bank_account",
        sourceAccountId: "hdfc-daily",
        amountType: "variable",
        amount: 1850,
        frequency: "Monthly",
        nextTriggerAt: isoAt(0, 11, 10, 0),
        status: "active",
        note: "Utility debit-card mandate",
      },
    ],
    transactions: [
      {
        id: "t1",
        title: "Salary credited",
        merchant: "TechWave Labs",
        category: "Salary",
        type: "income",
        amount: 118000,
        paymentRail: "bank_transfer",
        fundingSourceType: "bank_account",
        toAccountId: "axis-salary",
        createdAt: isoAt(0, 1, 9, 12),
        note: "April salary credited",
        sourceLabel: flowLabel("income"),
        status: "posted",
        origin: "seed",
      },
      {
        id: "t2",
        title: "Transfer to daily account",
        merchant: "Self transfer",
        category: "Transfer",
        type: "transfer",
        amount: 35000,
        paymentRail: "upi",
        fundingSourceType: "bank_account",
        fromAccountId: "axis-salary",
        toAccountId: "hdfc-daily",
        createdAt: isoAt(0, 1, 9, 42),
        note: "Funding daily spend account",
        sourceLabel: flowLabel("transfer"),
        status: "posted",
        origin: "seed",
      },
      {
        id: "t3",
        title: "Quick coffee before standup",
        merchant: "Third Wave Coffee",
        category: "Food & Drinks",
        type: "expense",
        amount: 320,
        paymentRail: "upi",
        fundingSourceType: "bank_account",
        fromAccountId: "hdfc-daily",
        createdAt: isoAt(0, 1, 10, 5),
        note: "UPI from HDFC bank",
        sourceLabel: flowLabel("expense"),
        status: "posted",
        origin: "seed",
      },
      {
        id: "t4",
        title: "Weekly grocery stock-up",
        merchant: "Nature's Basket",
        category: "Groceries",
        type: "expense",
        amount: 2480,
        paymentRail: "card",
        fundingSourceType: "bank_account",
        fromAccountId: "hdfc-daily",
        createdAt: isoAt(0, 1, 11, 25),
        note: "Debit card on HDFC Bank",
        sourceLabel: flowLabel("expense"),
        status: "posted",
        origin: "seed",
      },
      {
        id: "t5",
        title: "Flight for Mumbai offsite",
        merchant: "IndiGo",
        category: "Travel",
        type: "expense",
        amount: 11240,
        paymentRail: "card",
        fundingSourceType: "credit_card",
        fromAccountId: "hdfc-millennia",
        createdAt: isoAt(-1, 29, 18, 15),
        note: "Credit card purchase. Expense booked now, cash later.",
        sourceLabel: flowLabel("expense"),
        status: "posted",
        origin: "seed",
      },
      {
        id: "t6",
        title: "Dinner paid on UPI credit",
        merchant: "Naru Noodle Bar",
        category: "Food & Drinks",
        type: "expense",
        amount: 1860,
        paymentRail: "upi",
        fundingSourceType: "credit_card",
        fromAccountId: "sbi-rupay",
        createdAt: isoAt(0, 1, 21, 10),
        note: "UPI rail, RuPay credit card funding",
        sourceLabel: flowLabel("expense"),
        status: "posted",
        origin: "seed",
      },
      {
        id: "t7",
        title: "Spotify Family",
        merchant: "Spotify",
        category: "Subscription",
        type: "expense",
        amount: 199,
        paymentRail: "auto_debit",
        fundingSourceType: "credit_card",
        fromAccountId: "hdfc-millennia",
        createdAt: isoAt(0, 1, 6, 15),
        note: "AutoPay on HDFC credit card",
        sourceLabel: flowLabel("expense"),
        status: "posted",
        origin: "mandate",
      },
      {
        id: "t8",
        title: "HDFC card bill payment",
        merchant: "HDFC Credit Card",
        category: "Credit card bill",
        type: "repayment",
        amount: 12000,
        paymentRail: "bank_transfer",
        fundingSourceType: "bank_account",
        fromAccountId: "axis-salary",
        toAccountId: "hdfc-millennia",
        createdAt: isoAt(-1, 30, 13, 20),
        note: "Repayment only. Expense analytics unchanged.",
        sourceLabel: flowLabel("repayment"),
        status: "posted",
        origin: "seed",
      },
      {
        id: "t9",
        title: "Freelance brand sprint",
        merchant: "Juniper Studio",
        category: "Freelance",
        type: "income",
        amount: 24000,
        paymentRail: "bank_transfer",
        fundingSourceType: "bank_account",
        toAccountId: "axis-salary",
        createdAt: isoAt(-1, 27, 17, 50),
        note: "Side project retained earnings",
        sourceLabel: flowLabel("income"),
        status: "posted",
        origin: "seed",
      },
      {
        id: "t10",
        title: "Office cab",
        merchant: "Uber",
        category: "Transport",
        type: "expense",
        amount: 540,
        paymentRail: "upi",
        fundingSourceType: "bank_account",
        fromAccountId: "hdfc-daily",
        createdAt: isoAt(0, 1, 8, 25),
        note: "UPI via HDFC account",
        sourceLabel: flowLabel("expense"),
        status: "posted",
        origin: "seed",
      },
      {
        id: "t11",
        title: "Apartment electricity",
        merchant: "BESCOM",
        category: "Utilities",
        type: "expense",
        amount: 1840,
        paymentRail: "auto_debit",
        fundingSourceType: "bank_account",
        fromAccountId: "hdfc-daily",
        createdAt: isoAt(-1, 28, 7, 5),
        note: "Debit mandate from HDFC bank",
        sourceLabel: flowLabel("expense"),
        status: "posted",
        origin: "mandate",
      },
      {
        id: "t12",
        title: "Goa trip fund",
        merchant: "Self transfer",
        category: "Transfer",
        type: "transfer",
        amount: 9000,
        paymentRail: "bank_transfer",
        fundingSourceType: "bank_account",
        fromAccountId: "axis-salary",
        toAccountId: "icici-travel",
        createdAt: isoAt(0, 1, 10, 45),
        note: "Pre-funding travel float",
        sourceLabel: flowLabel("transfer"),
        status: "posted",
        origin: "seed",
      },
    ],
  };
}

function isSameMonth(isoString: string) {
  const date = new Date(isoString);
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function ordered<T extends { createdAt?: string; nextTriggerAt?: string }>(items: T[], key: "createdAt" | "nextTriggerAt") {
  return [...items].sort((left, right) => {
    const first = key === "createdAt" ? left.createdAt : left.nextTriggerAt;
    const second = key === "createdAt" ? right.createdAt : right.nextTriggerAt;
    return new Date(second ?? 0).getTime() - new Date(first ?? 0).getTime();
  });
}

export function getAccountById(state: FinanceState, accountId?: string) {
  if (!accountId) return undefined;
  return state.accounts.find((account) => account.id === accountId);
}

export function getFundingOptions(state: FinanceState, type: EntryType, rail: PaymentRail) {
  if (type === "income") {
    return state.accounts.filter((account) => account.type === "bank" || account.type === "cash");
  }

  if (type === "repayment") {
    return state.accounts.filter((account) => account.type === "bank" || account.type === "cash");
  }

  if (type === "transfer") {
    return state.accounts.filter((account) => account.type === "bank" || account.type === "cash");
  }

  if (rail === "cash") {
    return state.accounts.filter((account) => account.type === "cash");
  }

  if (rail === "card") {
    return state.accounts.filter((account) => account.type === "bank" || account.type === "credit_card");
  }

  if (rail === "upi") {
    return state.accounts.filter((account) => account.type === "bank" || account.type === "credit_card" || account.type === "credit_line");
  }

  if (rail === "auto_debit") {
    return state.accounts.filter((account) => account.type === "bank" || account.type === "credit_card");
  }

  return state.accounts.filter((account) => account.type === "bank");
}

export function buildFinanceSnapshot(state: FinanceState) {
  const monthTransactions = state.transactions.filter((transaction) => isSameMonth(transaction.createdAt));
  const expenseTransactions = monthTransactions.filter((transaction) => transaction.type === "expense");
  const incomeTransactions = monthTransactions.filter((transaction) => transaction.type === "income");
  const repaymentTransactions = monthTransactions.filter((transaction) => transaction.type === "repayment");
  const transferTransactions = monthTransactions.filter((transaction) => transaction.type === "transfer");

  const expense = expenseTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const income = incomeTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const repayments = repaymentTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const transferVolume = transferTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const cardSpend = expenseTransactions
    .filter((transaction) => transaction.fundingSourceType === "credit_card" || transaction.fundingSourceType === "credit_line")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const cashExpenseOutflow = expenseTransactions
    .filter((transaction) => transaction.fundingSourceType === "bank_account" || transaction.fundingSourceType === "cash_wallet")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const cashOutflow = cashExpenseOutflow + repayments;

  const assets = state.accounts.filter((account) => account.type === "bank" || account.type === "cash");
  const liabilities = state.accounts.filter((account) => account.type === "credit_card" || account.type === "credit_line");
  const assetsTotal = assets.reduce((sum, account) => sum + account.currentBalance, 0);
  const liabilitiesTotal = liabilities.reduce((sum, account) => sum + account.currentBalance, 0);
  const totalLimit = liabilities.reduce((sum, account) => sum + Number(account.creditLimit ?? 0), 0);

  const spendingByRail = Object.entries(
    expenseTransactions.reduce<Record<string, number>>((collection, transaction) => {
      collection[transaction.paymentRail] = (collection[transaction.paymentRail] ?? 0) + transaction.amount;
      return collection;
    }, {})
  )
    .map(([rail, value]) => ({
      name: rail.replace("_", " "),
      value,
      color: spendingRailColors[rail as PaymentRail],
    }))
    .sort((left, right) => right.value - left.value);

  const spendingByCategory = Object.entries(
    expenseTransactions.reduce<Record<string, number>>((collection, transaction) => {
      collection[transaction.category] = (collection[transaction.category] ?? 0) + transaction.amount;
      return collection;
    }, {})
  )
    .map(([category, value]) => ({ category, value }))
    .sort((left, right) => right.value - left.value);

  const budgetProgress = state.budgets.map((budget) => {
    const spent = expenseTransactions
      .filter((transaction) => transaction.category === budget.category)
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    return {
      ...budget,
      spent,
      ratio: budget.limit ? spent / budget.limit : 0,
    };
  });

  const upcomingMandates = [...state.mandates]
    .sort((left, right) => new Date(left.nextTriggerAt).getTime() - new Date(right.nextTriggerAt).getTime())
    .slice(0, 4)
    .map((mandate) => ({
      ...mandate,
      sourceAccount: getAccountById(state, mandate.sourceAccountId),
      destinationAccount: getAccountById(state, mandate.destinationAccountId),
    }));

  const dueCards = liabilities
    .filter((account) => account.type === "credit_card")
    .map((account) => {
      const dueDate = nextDueDate(account.dueDay ?? 1);
      return {
        account,
        dueDate,
        daysLeft: daysUntil(dueDate),
        utilization: percent(account.currentBalance, Number(account.creditLimit ?? 0)),
      };
    })
    .sort((left, right) => left.daysLeft - right.daysLeft);

  const recentTransactions = ordered(state.transactions, "createdAt").slice(0, 10).map((transaction) => ({
    ...transaction,
    fromAccount: getAccountById(state, transaction.fromAccountId),
    toAccount: getAccountById(state, transaction.toAccountId),
  }));

  const timeline = recentTransactions.reduce<Array<{ dateLabel: string; items: typeof recentTransactions }>>((groups, transaction) => {
    const dateLabel = new Intl.DateTimeFormat("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(new Date(transaction.createdAt));
    const group = groups.find((item) => item.dateLabel === dateLabel);
    if (group) {
      group.items.push(transaction);
      return groups;
    }
    groups.push({ dateLabel, items: [transaction] });
    return groups;
  }, []);

  const monthSeries = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    const month = date.getMonth();
    const year = date.getFullYear();
    const bucket = state.transactions.filter((transaction) => {
      const current = new Date(transaction.createdAt);
      return current.getMonth() === month && current.getFullYear() === year;
    });

    return {
      name: date.toLocaleDateString("en-IN", { month: "short" }),
      income: bucket.filter((transaction) => transaction.type === "income").reduce((sum, transaction) => sum + transaction.amount, 0),
      spend: bucket.filter((transaction) => transaction.type === "expense").reduce((sum, transaction) => sum + transaction.amount, 0),
      cashOut: bucket
        .filter((transaction) => transaction.type === "repayment" || (transaction.type === "expense" && transaction.fundingSourceType !== "credit_card" && transaction.fundingSourceType !== "credit_line"))
        .reduce((sum, transaction) => sum + transaction.amount, 0),
    };
  });

  return {
    monthLabel: monthLabel(),
    monthSummary: {
      income,
      expense,
      repayments,
      transferVolume,
      cardSpend,
      cashOutflow,
      netCash: income - cashOutflow,
    },
    assetsTotal,
    liabilitiesTotal,
    totalLimit,
    utilization: percent(liabilitiesTotal, totalLimit),
    budgetProgress,
    dueCards,
    recentTransactions,
    spendingByRail,
    spendingByCategory,
    upcomingMandates,
    timeline,
    monthSeries,
    accounts: {
      assets,
      liabilities,
    },
  };
}

function daysUntil(date: Date) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function nextDueDate(day: number) {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), day, 9, 0, 0, 0);
  if (next.getTime() < now.getTime()) {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}

export function addEntryToState(state: FinanceState, input: EntryInput) {
  const accounts = state.accounts.map((account) => ({ ...account }));
  const fundingAccount = accounts.find((account) => account.id === input.fundingSourceId);
  const destinationAccount = accounts.find((account) => account.id === input.destinationAccountId);

  const transaction: Transaction = {
    id: `manual-${Date.now()}`,
    title: input.title.trim() || input.category,
    merchant: input.merchant.trim() || input.title.trim() || input.category,
    category: input.category,
    type: input.type,
    amount: input.amount,
    paymentRail: input.paymentRail,
    fundingSourceType: fundingAccount ? fundingSourceTypeOf(fundingAccount) : "bank_account",
    fromAccountId: fundingAccount?.id,
    toAccountId: destinationAccount?.id,
    createdAt: new Date().toISOString(),
    note: input.note.trim(),
    sourceLabel: flowLabel(input.type),
    status: "posted",
    origin: "manual",
  };

  if (input.type === "expense" && fundingAccount) {
    if (fundingAccount.type === "credit_card" || fundingAccount.type === "credit_line") {
      fundingAccount.currentBalance += input.amount;
    } else {
      fundingAccount.currentBalance -= input.amount;
    }
  }

  if (input.type === "income" && destinationAccount) {
    destinationAccount.currentBalance += input.amount;
  }

  if (input.type === "transfer" && fundingAccount && destinationAccount) {
    fundingAccount.currentBalance -= input.amount;
    destinationAccount.currentBalance += input.amount;
  }

  if (input.type === "repayment" && fundingAccount && destinationAccount) {
    fundingAccount.currentBalance -= input.amount;
    destinationAccount.currentBalance = Math.max(0, destinationAccount.currentBalance - input.amount);
  }

  return {
    ...state,
    accounts,
    transactions: [transaction, ...state.transactions],
  };
}

export function getEntryNarrative(state: FinanceState, input: Partial<EntryInput>) {
  const amount = input.amount ?? 0;
  const fundingAccount = getAccountById(state, input.fundingSourceId);
  const destinationAccount = getAccountById(state, input.destinationAccountId);

  if (!input.type) {
    return "Pick an entry type to preview how balances and analytics will move.";
  }

  if (input.type === "expense") {
    if (!fundingAccount) {
      return "Select a funding source. UPI is the rail, but the ledger still needs the real account behind it.";
    }

    if (fundingAccount.type === "credit_card" || fundingAccount.type === "credit_line") {
      return `${formatCurrency(amount)} is booked as spend now. ${fundingAccount.provider} outstanding increases, and repayment later will not count as another expense.`;
    }

    return `${formatCurrency(amount)} is booked as spend now and reduces ${fundingAccount.provider} immediately because the funding source is cash or bank backed.`;
  }

  if (input.type === "income") {
    if (!destinationAccount) {
      return "Choose the receiving account for salary, reimbursement, or side income.";
    }
    return `${formatCurrency(amount)} lands in ${destinationAccount.provider} and increases your available balance instantly.`;
  }

  if (input.type === "transfer") {
    if (!fundingAccount || !destinationAccount) {
      return "Transfers move money between your own accounts and stay out of spend reports.";
    }
    return `${formatCurrency(amount)} moves from ${fundingAccount.provider} to ${destinationAccount.provider}. It changes liquidity, not spending behavior.`;
  }

  if (!fundingAccount || !destinationAccount) {
    return "Repayments need a paying account and a target credit card.";
  }

  return `${formatCurrency(amount)} reduces ${fundingAccount.provider} cash and lowers ${destinationAccount.provider} outstanding. Expense analytics stay untouched.`;
}
