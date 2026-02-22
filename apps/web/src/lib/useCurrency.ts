"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { currencySymbol, type CurrencyCode } from "@/lib/currency";

export function useCurrencySymbol() {
  const supabase = createSupabaseBrowserClient();
  const [code, setCode] = useState<CurrencyCode>("INR");
  const [sym, setSym] = useState(currencySymbol("INR"));

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;

      const { data } = await supabase
        .from("profiles")
        .select("currency_code")
        .eq("id", u.user.id)
        .maybeSingle();

      const c = (data?.currency_code ?? "INR") as CurrencyCode;
      setCode(c);
      setSym(currencySymbol(c));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { code, sym };
}
