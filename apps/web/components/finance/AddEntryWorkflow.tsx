"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useFinance } from "@/components/finance/FinanceProvider";
import { MotionPanel, PageHeader, StatTag } from "@/components/finance/Primitives";
import {
  entryOptions,
  expenseCategories,
  formatCurrency,
  getEntryNarrative,
  getFundingOptions,
  incomeCategories,
  paymentRailOptions,
  type EntryType,
  type PaymentRail,
} from "@/lib/finance";

const entryTypeSet = new Set(entryOptions.map((option) => option.value));

function defaultRailFor(type: EntryType): PaymentRail {
  if (type === "income") return "bank_transfer";
  if (type === "transfer") return "upi";
  if (type === "repayment") return "bank_transfer";
  return "upi";
}

function getAllowedRails(entryType: EntryType) {
  if (entryType === "income") return ["bank_transfer", "upi", "cash"] as PaymentRail[];
  if (entryType === "transfer") return ["upi", "bank_transfer"] as PaymentRail[];
  if (entryType === "repayment") return ["bank_transfer", "upi", "auto_debit"] as PaymentRail[];
  return ["upi", "card", "cash", "bank_transfer", "auto_debit"] as PaymentRail[];
}

export default function AddEntryWorkflow({ initialType }: { initialType?: EntryType }) {
  const { state, addEntry } = useFinance();
  const presetType = (() => {
    if (initialType && entryTypeSet.has(initialType)) {
      return initialType;
    }
    return "expense";
  })();

  const [type, setType] = useState<EntryType>(presetType);
  const [paymentRail, setPaymentRail] = useState<PaymentRail>(defaultRailFor(presetType));
  const [amount, setAmount] = useState("1850");
  const [title, setTitle] = useState("");
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState<string>(presetType === "income" ? incomeCategories[0] : presetType === "expense" ? expenseCategories[1] : presetType === "transfer" ? "Transfer" : "Credit card bill");
  const [fundingSourceId, setFundingSourceId] = useState<string | undefined>();
  const [destinationAccountId, setDestinationAccountId] = useState<string | undefined>();
  const [note, setNote] = useState("");
  const [statusMessage, setStatusMessage] = useState<string>("");

  const fundingOptions = useMemo(
    () => getFundingOptions(state, type, paymentRail),
    [paymentRail, state, type]
  );
  const destinationOptions = useMemo(() => {
    if (type === "income") {
      return state.accounts.filter((account) => account.type === "bank" || account.type === "cash");
    }
    if (type === "transfer") {
      return state.accounts.filter((account) => (account.type === "bank" || account.type === "cash") && account.id !== fundingSourceId);
    }
    if (type === "repayment") {
      return state.accounts.filter((account) => account.type === "credit_card");
    }
    return [];
  }, [fundingSourceId, state, type]);

  const allowedRails = getAllowedRails(type);
  const effectiveFundingSourceId = fundingOptions.some((account) => account.id === fundingSourceId)
    ? fundingSourceId
    : fundingOptions[0]?.id;
  const effectiveDestinationAccountId = destinationOptions.some((account) => account.id === destinationAccountId)
    ? destinationAccountId
    : destinationOptions[0]?.id;
  const typeMeta = entryOptions.find((option) => option.value === type);
  const amountValue = Number(amount || 0);
  const requiresDestination = type === "income" || type === "transfer" || type === "repayment";
  const canSave =
    amountValue > 0 &&
    Boolean(category) &&
    (type === "income" ? effectiveDestinationAccountId : effectiveFundingSourceId) &&
    (!requiresDestination || effectiveDestinationAccountId);

  const narrative = getEntryNarrative(state, {
    amount: amountValue,
    type,
    fundingSourceId: effectiveFundingSourceId,
    destinationAccountId: effectiveDestinationAccountId,
    paymentRail,
    title,
    merchant,
    category,
    note,
  });

  function handleTypeChange(nextType: EntryType) {
    setType(nextType);
    setPaymentRail(defaultRailFor(nextType));
    setFundingSourceId(undefined);
    setDestinationAccountId(undefined);

    if (nextType === "income") {
      setCategory(incomeCategories[0]);
      return;
    }

    if (nextType === "transfer") {
      setCategory("Transfer");
      return;
    }

    if (nextType === "repayment") {
      setCategory("Credit card bill");
      return;
    }

    setCategory(expenseCategories[1]);
  }

  function saveEntry() {
    if (!canSave) return;

    addEntry({
      amount: amountValue,
      title: title || merchant || category,
      merchant: merchant || title || category,
      category,
      type,
      paymentRail,
      fundingSourceId: effectiveFundingSourceId,
      destinationAccountId: effectiveDestinationAccountId,
      note: note || narrative,
    });

    setStatusMessage(`${typeMeta?.label ?? "Entry"} saved. The ledger, balances, and analytics have been updated locally.`);
    setAmount("");
    setTitle("");
    setMerchant("");
    setNote("");
  }

  const categories = type === "expense" ? expenseCategories : type === "income" ? incomeCategories : [category];

  return (
    <main className="page">
      <PageHeader
        eyebrow="Animated money workflow"
        title="Capture the intent before the money moves."
        subtitle="The flow keeps classification explicit: first choose what happened, then how it moved, then which account actually funded it. That is how the product stays beautiful and accurate."
      />

      <div className="split-grid">
        <MotionPanel className="section-pad-lg stack-lg" delay={0.05}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">1. Choose the entry</h2>
              <p className="panel-subtitle">These are different financial meanings, not just different labels.</p>
            </div>
            <StatTag tone="accent">{typeMeta?.label}</StatTag>
          </div>

          <div className="choice-grid">
            {entryOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`choice-card ${type === option.value ? "choice-card-active" : ""}`}
                onClick={() => handleTypeChange(option.value)}
              >
                <p className="choice-title">{option.label}</p>
                <p className="choice-hint">{option.hint}</p>
              </button>
            ))}
          </div>

          <div className="panel-header">
            <div>
              <h2 className="panel-title">2. Pick the rail</h2>
              <p className="panel-subtitle">UPI, card, transfer, and AutoPay are experience rails, not accounting categories.</p>
            </div>
          </div>

          <div className="choice-grid">
            {paymentRailOptions
              .filter((option) => allowedRails.includes(option.value))
              .map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`choice-card ${paymentRail === option.value ? "choice-card-active" : ""}`}
                  onClick={() => setPaymentRail(option.value)}
                >
                  <p className="choice-title">{option.label}</p>
                  <p className="choice-hint">{option.hint}</p>
                </button>
              ))}
          </div>

          <div className="panel-header">
            <div>
              <h2 className="panel-title">3. Fill the details</h2>
              <p className="panel-subtitle">Every field below is reflected live in the preview.</p>
            </div>
          </div>

          <div className="form-grid">
            <label className="field">
              <span className="field-label">Amount</span>
              <input
                className="input"
                inputMode="decimal"
                placeholder="1850"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </label>

            <label className="field">
              <span className="field-label">Category</span>
              <select className="input" value={category} onChange={(event) => setCategory(event.target.value)}>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field-label">{type === "income" ? "Source label" : "Title"}</span>
              <input
                className="input"
                placeholder={type === "income" ? "Salary credited" : "What happened?"}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>

            <label className="field">
              <span className="field-label">{type === "income" ? "Payer / origin" : "Merchant / counterparty"}</span>
              <input
                className="input"
                placeholder={type === "transfer" ? "Self transfer" : "Merchant or source"}
                value={merchant}
                onChange={(event) => setMerchant(event.target.value)}
              />
            </label>

            {type !== "income" && (
              <label className="field">
                <span className="field-label">{type === "repayment" ? "Paying account" : "Funding source"}</span>
                <select className="input" value={effectiveFundingSourceId ?? ""} onChange={(event) => setFundingSourceId(event.target.value)}>
                  {fundingOptions.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.provider} · {account.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {requiresDestination && (
              <label className="field">
                <span className="field-label">
                  {type === "income" ? "Destination account" : type === "transfer" ? "Move to" : "Liability destination"}
                </span>
                <select className="input" value={effectiveDestinationAccountId ?? ""} onChange={(event) => setDestinationAccountId(event.target.value)}>
                  {destinationOptions.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.provider} · {account.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="field field-full">
              <span className="field-label">Note</span>
              <textarea
                className="textarea"
                placeholder="What should the ledger remember about this?"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
          </div>

          <div className="button-row">
            <button type="button" className="button button-primary" disabled={!canSave} onClick={saveEntry}>
              Save entry
            </button>
            <Link href="/transactions" className="button button-secondary">
              Open ledger
            </Link>
          </div>

          {statusMessage ? <div className="flow-note">{statusMessage}</div> : null}
        </MotionPanel>

        <div className="stack-md">
          <MotionPanel className="section-pad-lg stack-md" delay={0.1}>
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Live preview</h2>
                <p className="panel-subtitle">The preview explains how the product will book the event before it is saved.</p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${type}-${paymentRail}-${fundingSourceId}-${destinationAccountId}-${category}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22 }}
                className="preview-panel stack-sm"
              >
                <div className="preview-kicker">{typeMeta?.label} preview</div>
                <div className="money-strong">{formatCurrency(amountValue || 0)}</div>
                <div className="helper-text">{narrative}</div>
              </motion.div>
            </AnimatePresence>

            <div className="workflow-grid">
              <div className="workflow-step">
                <div className="workflow-index">A</div>
                <h3 className="account-name">Analytics</h3>
                <p className="account-provider">
                  {type === "expense"
                    ? "Counts in spend view now."
                    : type === "repayment"
                      ? "Excluded from spend view."
                      : type === "transfer"
                        ? "Excluded from income and spend."
                        : "Counts as inflow."}
                </p>
              </div>

              <div className="workflow-step">
                <div className="workflow-index">B</div>
                <h3 className="account-name">Rail</h3>
                <p className="account-provider">{paymentRail.replace("_", " ")} controls experience and reporting by payment behavior.</p>
              </div>

              <div className="workflow-step">
                <div className="workflow-index">C</div>
                <h3 className="account-name">Source</h3>
                <p className="account-provider">Underlying account is what actually changes balance or liability.</p>
              </div>

              <div className="workflow-step">
                <div className="workflow-index">D</div>
                <h3 className="account-name">Guardrail</h3>
                <p className="account-provider">Credit card repayment never becomes duplicate spend.</p>
              </div>
            </div>
          </MotionPanel>

          <MotionPanel className="section-pad-lg stack-md" delay={0.14}>
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Recommended patterns</h2>
                <p className="panel-subtitle">Use these to keep the ledger precise and the UX intuitive.</p>
              </div>
            </div>

            <div className="flow-note">
              `Expense + UPI + bank account` means the selected bank balance drops immediately.
            </div>
            <div className="flow-note">
              `Expense + UPI + credit card` means the card outstanding grows while reporting still calls out the UPI rail.
            </div>
            <div className="flow-note">
              `Repayment + bank account + credit card` means cash reduces, liability reduces, and expense analytics stay untouched.
            </div>
          </MotionPanel>
        </div>
      </div>
    </main>
  );
}
