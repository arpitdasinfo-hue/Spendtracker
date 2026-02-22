"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useCurrencySymbol } from "@/lib/useCurrency";
import TxnFilterModal, { TxnFilters, countActiveFilters } from "@/components/TxnFilterModal";

type Txn = {
  id: string;
  direction: "expense" | "income";
  amount: number | null;
  note: string;
  created_at: string;
  payment_method_id: string | null;
  tag: "personal" | "official" | "receivable" | "payable" | null;
};

type Method = { id: string; name: string; channel: string; payment_type?: string | null; is_active: boolean };

function tagLabel(t: Txn["tag"]) {
  switch (t) {
    case "official": return "Official";
    case "receivable": return "Receivable";
    case "payable": return "Payable";
    case "personal":
    default: return "Personal";
  }
}

function startOfWeekISO(d: Date) {
  const day = (d.getDay() + 6) % 7; // Mon=0
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  s.setDate(s.getDate() - day);
  s.setHours(0, 0, 0, 0);
  return s.toISOString();
}

function startOfMonthISO(d: Date) {
  const s = new Date(d.getFullYear(), d.getMonth(), 1);
  s.setHours(0, 0, 0, 0);
  return s.toISOString();
}

function startOfDayISO(dateYYYYMMDD: string) {
  const [y, m, dd] = dateYYYYMMDD.split("-").map(Number);
  const s = new Date(y, m - 1, dd, 0, 0, 0, 0);
  return s.toISOString();
}

function endOfDayISO(dateYYYYMMDD: string) {
  const [y, m, dd] = dateYYYYMMDD.split("-").map(Number);
  const e = new Date(y, m - 1, dd, 23, 59, 59, 999);
  return e.toISOString();
}

function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

const DEFAULT_FILTERS: TxnFilters = {
  amountMode: "any",
  amountGt: "",
  amountLt: "",
  amountMin: "",
  amountMax: "",

  channels: [],
  tags: [],
  direction: "any",

  dateMode: "any",
  dateFrom: "",
  dateTo: "",
};

const PAGE_SIZE = 50;

export default function TransactionsPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const { sym } = useCurrencySymbol();

  const [q, setQ] = useState("");
  const [items, setItems] = useState<Txn[]>([]);
  const [methods, setMethods] = useState<Map<string, Method>>(new Map());
  const [msg, setMsg] = useState<string | null>(null);

  const [openFilter, setOpenFilter] = useState(false);
  const [filters, setFilters] = useState<TxnFilters>({ ...DEFAULT_FILTERS });

  // Pagination state
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(0);
  const [loadingPage, setLoadingPage] = useState<boolean>(false);

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  // Quick date range chips (main browsing)
  const [quickRange, setQuickRange] = useState<"all" | "7d" | "30d" | "90d" | "custom">("all");

  function resetPagination() {
    setItems([]);
    setPage(0);
  }

  function applyTxnFilters(qy: any, methodsList: any[]) {

    // Direction
    if (filters.direction !== "any") qy = qy.eq("direction", filters.direction);

    // Tags
    if (filters.tags.length) qy = qy.in("tag", filters.tags);

    // Amount
    const toNum = (s: string) => {
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    };

    if (filters.amountMode === "gt") {
      const n = toNum(filters.amountGt);
      if (n !== null) qy = qy.gte("amount", n);
    } else if (filters.amountMode === "lt") {
      const n = toNum(filters.amountLt);
      if (n !== null) qy = qy.lte("amount", n);
    } else if (filters.amountMode === "between") {
      const a = toNum(filters.amountMin);
      const b = toNum(filters.amountMax);
      if (a !== null) qy = qy.gte("amount", a);
      if (b !== null) qy = qy.lte("amount", b);
    }

    // Date
    const now = new Date();
    if (filters.dateMode === "this_week") qy = qy.gte("created_at", startOfWeekISO(now));
    else if (filters.dateMode === "this_month") qy = qy.gte("created_at", startOfMonthISO(now));
    else if (filters.dateMode === "custom") {
      if (filters.dateFrom) qy = qy.gte("created_at", startOfDayISO(filters.dateFrom));
      if (filters.dateTo) qy = qy.lte("created_at", endOfDayISO(filters.dateTo));
    }

    // Channel (map channels -> payment_method_ids)
    if (filters.channels.length) {
      const ids = (methodsList ?? [])
        .filter((x: any) => filters.channels.includes(x.channel))
        .map((x: any) => x.id);

      // If user chose channels but none exist, force empty by impossible filter
      if (ids.length === 0) qy = qy.eq("id", "__none__");
      else qy = qy.in("payment_method_id", ids);
    }

    return qy;
  }

  async function loadMethods() {
    const { data: m, error: mErr } = await supabase
      .from("payment_methods")
      .select("id, name, channel, payment_type, is_active")
      .order("created_at", { ascending: false });

    if (mErr) setMsg(mErr.message);

    const map = new Map<string, Method>();
    (m ?? []).forEach((x: any) => map.set(x.id, x));
    setMethods(map);

    return m ?? [];
  }

  async function loadCountAndFirstPage() {
    setMsg(null);
    setLoadingPage(true);

    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setLoadingPage(false);
      return router.replace("/login");
    }

    const methodsList = await loadMethods();

    // Count query (head)
    const { count, error: cErr } = await applyTxnFilters(
      supabase.from("transactions").select("id", { count: "exact", head: true }),
      methodsList
    );

    if (cErr) setMsg(cErr.message);
    setTotalCount(count ?? 0);

    // First page query
    const { data, error } = await applyTxnFilters(
      supabase
        .from("transactions")
        .select("id, direction, amount, note, created_at, payment_method_id, tag")
        .order("created_at", { ascending: false }),
      methodsList
    )
      .range(0, PAGE_SIZE - 1);

    if (error) setMsg(error.message);
    setItems((data ?? []) as Txn[]);
    setPage(1);
    setLoadingPage(false);
  }

  async function loadMore() {
    if (loadingPage) return;
    setLoadingPage(true);

    const methodsList = await loadMethods();

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await applyTxnFilters(
      supabase
        .from("transactions")
        .select("id, direction, amount, note, created_at, payment_method_id, tag")
        .order("created_at", { ascending: false }),
      methodsList
    )
      .range(from, to);

    if (error) setMsg(error.message);

    setItems((prev) => [...prev, ...((data ?? []) as Txn[])]);
    setPage((p) => p + 1);
    setLoadingPage(false);
  }

  // Initial load
  useEffect(() => {
    loadCountAndFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply quick date ranges (main browsing)
  useEffect(() => {
    // Update filters.dateMode based on quickRange (without opening modal)
    if (quickRange === "all") {
      setFilters((f) => ({ ...f, dateMode: "any", dateFrom: "", dateTo: "" }));
    } else if (quickRange === "7d") {
      // use custom with ISO boundaries via created_at >= (today-7)
      // We store in dateMode "custom" using dateFrom only for UI consistency
      const d = new Date();
      d.setDate(d.getDate() - 7);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      setFilters((f) => ({ ...f, dateMode: "custom", dateFrom: `${yyyy}-${mm}-${dd}`, dateTo: "" }));
    } else if (quickRange === "30d") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      setFilters((f) => ({ ...f, dateMode: "custom", dateFrom: `${yyyy}-${mm}-${dd}`, dateTo: "" }));
    } else if (quickRange === "90d") {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      setFilters((f) => ({ ...f, dateMode: "custom", dateFrom: `${yyyy}-${mm}-${dd}`, dateTo: "" }));
    } else {
      // custom = open modal for user
      setOpenFilter(true);
    }

    // reset pagination + reload when quick range changes (except opening modal)
    if (quickRange !== "custom") {
      resetPagination();
      loadCountAndFirstPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickRange]);

  // Search stays local (works across loaded pages)
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;

    return items.filter((t) => {
      const a = String(t.amount ?? "");
      const pm = t.payment_method_id ? methods.get(t.payment_method_id)?.name ?? "" : "";
      return (
        (t.note ?? "").toLowerCase().includes(s) ||
        a.includes(s) ||
        pm.toLowerCase().includes(s) ||
        tagLabel(t.tag).toLowerCase().includes(s)
      );
    });
  }, [q, items, methods]);

  async function applyFilters() {
    // validate amount + date
    if (filters.amountMode === "between") {
      if (!filters.amountMin || !filters.amountMax) {
        setMsg("Amount between requires both Min and Max.");
        return;
      }
    }
    if (filters.dateMode === "custom") {
      if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
        setMsg("Date From must be before Date To.");
        return;
      }
    }

    setOpenFilter(false);
    resetPagination();
    await loadCountAndFirstPage();
  }

  function clearFiltersAndReload() {
    setFilters({ ...DEFAULT_FILTERS });
    setQuickRange("all");
    resetPagination();
    loadCountAndFirstPage();
  }

  const showPagination = totalCount > PAGE_SIZE;
  const loadedCount = items.length;
  const hasMore = loadedCount < totalCount;

  return (
    <main className="container">
      <TxnFilterModal
        open={openFilter}
        onClose={() => setOpenFilter(false)}
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters({ ...DEFAULT_FILTERS })}
        onApply={applyFilters}
        currencySymbol={sym}
      />

      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="h1">Transactions</h1>
          <p className="sub">Browse by date-range + filters. Pagination appears only when needed.</p>
        </div>
        <button className="btn btnPrimary" onClick={() => router.push("/add")}>
          ＋ Add
        </button>
      </div>

      {/* Quick range chips (main browsing) */}
      <div className="row" style={{ marginTop: 10, flexWrap: "wrap" }}>
        {[
          { id: "all", label: "All" },
          { id: "7d", label: "7D" },
          { id: "30d", label: "30D" },
          { id: "90d", label: "90D" },
          { id: "custom", label: "Custom" },
        ].map((x) => (
          <button
            key={x.id}
            type="button"
            className={`btn ${quickRange === (x.id as any) ? "btnPrimary" : ""}`}
            onClick={() => setQuickRange(x.id as any)}
          >
            {x.label}
          </button>
        ))}
      </div>

      <div className="row" style={{ marginTop: 12, gap: 10 }}>
        <div className="card" style={{ padding: 12, borderRadius: 18, flex: 1 }}>
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search within loaded: rent / ${sym}450 / UPI / Official…`}
          />
        </div>

        <button className={`btn ${activeFilterCount ? "btnPrimary" : ""}`} onClick={() => setOpenFilter(true)} type="button">
          Filter {activeFilterCount ? `(${activeFilterCount})` : ""}
        </button>

        {(activeFilterCount || quickRange !== "all") ? (
          <button className="btn" onClick={clearFiltersAndReload} type="button">
            Clear
          </button>
        ) : null}
      </div>

      {msg && <div className="toast" style={{ marginTop: 12 }}>{msg}</div>}

      <div className="card cardPad" style={{ marginTop: 12 }}>
        {loadingPage && items.length === 0 ? (
          <p className="muted">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="muted">No transactions found.</p>
        ) : (
          <div className="col" style={{ gap: 10 }}>
            {filtered.map((t) => {
              const pm = t.payment_method_id ? methods.get(t.payment_method_id) : null;

              return (
                <div key={t.id} className="card" style={{ padding: 12, borderRadius: 18 }}>
                  <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
                      <span className={`badge ${t.direction === "income" ? "badgeGood" : "badgeBad"}`}>
                        {t.direction === "income" ? "↘ IN" : "↗ OUT"}
                      </span>

                      <div>
                        <div style={{ fontWeight: 650 }}>{t.note}</div>

                        <div className="row" style={{ gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                          <span className="badge">{tagLabel(t.tag)}</span>
                          {pm ? <span className="badge">{pm.name}</span> : <span className="badge">No method</span>}
                          {pm?.channel ? <span className="badge">{pm.channel.toUpperCase()}</span> : null}
                        </div>

                        <div className="faint" style={{ fontSize: 12, marginTop: 6 }}>
                          {new Date(t.created_at).toLocaleString("en-IN")}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div className="money" style={{ fontWeight: 800, color: t.direction === "income" ? "var(--good)" : "var(--bad)" }}>
                        {t.direction === "income" ? "+" : "-"}{sym}{Number(t.amount ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination footer only when total > 50 */}
        {showPagination ? (
          <div className="sep" />
        ) : null}

        {showPagination ? (
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <span className="faint" style={{ fontSize: 12 }}>
              Showing {Math.min(loadedCount, totalCount)} of {totalCount}
            </span>

            {hasMore ? (
              <button className="btn btnPrimary" onClick={loadMore} type="button" disabled={loadingPage}>
                {loadingPage ? "Loading…" : "Load more"}
              </button>
            ) : (
              <span className="badge">End</span>
            )}
          </div>
        ) : null}
      </div>
    </main>
  );
}
