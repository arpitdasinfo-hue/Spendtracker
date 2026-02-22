export type CurrencyCode = "INR" | "USD" | "GBP" | "AED";

export function currencySymbol(code: CurrencyCode | string | null | undefined) {
  switch (code) {
    case "USD": return "$";
    case "GBP": return "£";
    case "AED": return "د.إ";
    case "INR":
    default: return "₹";
  }
}

export function formatAmount(n: number, code: CurrencyCode | string | null | undefined) {
  const sym = currencySymbol(code);
  const value = Number(n ?? 0);
  const pretty = value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  return `${sym}${pretty}`;
}
