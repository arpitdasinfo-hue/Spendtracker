import type { CurrencyCode } from "@/lib/currency";
import { CURRENCY_BY_CODE } from "@/lib/currency";

const nfCache = new Map<string, Intl.NumberFormat>();

type MoneyFormatOptions = {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

function getNumberFormatter(locale: string, opts: MoneyFormatOptions = {}) {
  const key = `${locale}|${opts.minimumFractionDigits ?? ""}|${opts.maximumFractionDigits ?? ""}`;
  const cached = nfCache.get(key);
  if (cached) return cached;

  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: opts.minimumFractionDigits,
    maximumFractionDigits: opts.maximumFractionDigits,
  });

  nfCache.set(key, formatter);
  return formatter;
}

export function formatMoney(
  amount: number,
  currencyCode: CurrencyCode,
  locale = "en-IN",
  opts: MoneyFormatOptions = {}
) {
  try {
    const sym = CURRENCY_BY_CODE[currencyCode]?.symbol ?? "";
    return `${sym}${getNumberFormatter(locale, opts).format(Number(amount ?? 0))}`;
  } catch {
    const sym = CURRENCY_BY_CODE[currencyCode]?.symbol ?? "";
    return `${sym}${Number(amount ?? 0).toLocaleString(locale)}`;
  }
}
