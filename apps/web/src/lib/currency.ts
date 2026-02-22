export type CurrencyCode = "INR" | "USD" | "EUR" | "GBP" | "AED";

export type CurrencyMeta = {
  code: CurrencyCode;
  symbol: string;
  name: string;
};

export const CURRENCIES: CurrencyMeta[] = [
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
];

export const CURRENCY_BY_CODE: Record<CurrencyCode, CurrencyMeta> = CURRENCIES.reduce(
  (acc, c) => {
    acc[c.code] = c;
    return acc;
  },
  {} as Record<CurrencyCode, CurrencyMeta>
);

export function isCurrencyCode(x: unknown): x is CurrencyCode {
  return x === "INR" || x === "USD" || x === "EUR" || x === "GBP" || x === "AED";
}

export function mapLegacySymbolToCode(symbol?: string | null): CurrencyCode | null {
  if (!symbol) return null;
  const s = symbol.trim();

  if (s === "₹" || s.toUpperCase() === "INR") return "INR";
  if (s === "$" || s.toUpperCase() === "USD") return "USD";
  if (s === "€" || s.toUpperCase() === "EUR") return "EUR";
  if (s === "£" || s.toUpperCase() === "GBP") return "GBP";
  if (s === "د.إ" || s.toUpperCase() === "AED") return "AED";

  return null;
}

export function currencySymbol(code: CurrencyCode | string | null | undefined) {
  if (code && isCurrencyCode(code)) return CURRENCY_BY_CODE[code].symbol;
  return CURRENCY_BY_CODE.INR.symbol;
}

export function currencyLabel(code: CurrencyCode) {
  const c = CURRENCY_BY_CODE[code];
  return `${c.code} (${c.symbol})`;
}

export function formatAmount(n: number, code: CurrencyCode | string | null | undefined) {
  const sym = currencySymbol(code);
  const value = Number(n ?? 0);
  const pretty = value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  return `${sym}${pretty}`;
}
