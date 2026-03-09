"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useCurrencySymbol } from "@/lib/useCurrency";
import { formatMoney } from "@/lib/money";
import TxnFilterModal, { TxnFilters, countActiveFilters } from "@/components/TxnFilterModal";
import EditTxnModal, { EditableTxn } from "@/components/EditTxnModal";

type Txn = {
  id: string;
  direction: "expense" | "income";
  amount: number | null;
  note: string;
  created_at: string;
  category_id: string | null;
  payment_method_id: string | null;
  tag: "personal" | "official" | "receivable" | "payable" | null;
};

type Method = { id: string; name: string; channel: string; payment_type?: string | null; is_active: boolean };

function tagLabel(t: Txn["tag"]) {
  switch (t) {
    case "official":   return "Official";
    case "receivable": return "Receivable";
    case "payable":    return "Payable";
    default:           return "Personal";
  }
}

function startOfWeekISO(d: Date) {
  const day = (d.getDay() + 6) % 7;
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
  return new Date(y, m - 1, dd, 0, 0, 0, 0).toISOString();
}
function endOfDayISO(dateYYYYMMDD: string) {
  const [y, m, dd] = dateYYYYMMDD.split("-").map(Number);
  return new Date(y, m - 1, dd, 23, 59, 59, 999).toISOString();
}

const DEFAULT_FILTERS: TxnFilters = {
  amountMode: "any", amountGt: "", amountLt: "", amountMin: "", amountMax: "",
  channels: [], tags: [], direction: "any", dateMode: "any", dateFrom: "", dateTo: "",
};

const PAGE_SIZE = 50;

export default function TransactionsPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const { sym, code } = useCurrencySymbol();

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [items, setItems] = useState<Txn[]>([]);
  const [methods, setMethods] = useState<Map<string, Method>>(new Map());
  const [msg, setMsg] = useState<string | null>(null);

  const [openFilter, setOpenFilter] = useState(false);
  const [filters, setFilters] = useState<TxnFilters>({ ...DEFAULT_FILTERS });

  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loadingPage, setLoadingPage] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Edit modal
  const [editTxn, setEditTxn] = useState<EditableTxn | null>(null);

  const [quickRange, setQuickRange] = useState<"all" | "7d" | "30d" | "90d" | "custom">("all");
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  // Debounce search input → searchTerm
  function handleSearchChange(v: string) {
    setSearchInput(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchTerm(v);
    }, 300);
  }

  function resetPagination() { setItems([]); setPage(0); }

  function applyTxnFilters(qy: any, methodsList: any[]) {
    if (filters.direction !== "any") qy = qy.eq("direction", filters.direction);
    if (filters.tags.length) qy = qy.in("tag", filters.tags);

    const toNum = (s: string) => { const n = Number(s); return Number.isFinite(n) ? n : null; };
    if (filters.amountMode === "gt") { const n = toNum(filters.amountGt); if (n !== null) qy = qy.gte("amount", n); }
    else if (filters.amountMode === "lt") { const n = toNum(filters.amountLt); if (n !== null) qy = qy.lte("amount", n); }
    else if (filters.amountMode === "between") {
      const a = toNum(filters.amountMin); const b = toNum(filters.amountMax);
      if (a !== null) qy = qy.gte("amount", a);
      if (b !== null) qy = qy.lte("amount", b);
    }

    const now = new Date();
    if (filters.dateMode === "this_week") qy = qy.gte("created_at", startOfWeekISO(now));
    else if (filters.dateMode === "this_month") qy = qy.gte("created_at", startOfMonthISO(now));
    else if (filters.dateMode === "custom") {
      if (filters.dateFrom) qy = qy.gte("created_at", startOfDayISO(filters.dateFrom));
      if (filters.dateTo) qy = qy.lte("created_at", endOfDayISO(filters.dateTo));
    }

    if (filters.channels.length) {
      const ids = (methodsList ?? []).filter((x: any) => filters.channels.includes(x.channel)).map((x: any) => x.id);
      qy = ids.length === 0 ? qy.eq("id", "__none__") : qy.in("payment_method_id", ids);
    }

    // Server-side search
    if (searchTerm.trim()) qy = qy.ilike("note", `%${searchTerm.trim()}%`);

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
    if (!u.user) { setLoadingPage(false); return router.replace("/login"); }

    const methodsList = await loadMethods();

    const { count, error: cErr } = await applyTxnFilters(
      supabase.from("transactions").select("id", { count: "exact", head: true }),
      methodsList
    );
    if (cErr) setMsg(cErr.message);
    setTotalCount(count ?? 0);

    const { data, error } = await applyTxnFilters(
      supabase.from("transactions")
        .select("id, direction, amount, note, created_at, category_id, payment_method_id, tag")
        .order("created_at", { ascending: false }),
      methodsList
    ).range(0, PAGE_SIZE - 1);

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
    const { data, error } = await applyTxnFilters(
      supabase.from("transactions")
        .select("id, direction, amount, note, created_at, category_id, payment_method_id, tag")
        .order("created_at", { ascending: false }),
      methodsList
    ).range(from, from + PAGE_SIZE - 1);
    if (error) setMsg(error.message);
    setItems((prev) => [...prev, ...((data ?? []) as Txn[])]);
    setPage((p) => p + 1);
    setLoadingPage(false);
  }

  // CSV Export
  async function exportCSV() {
    setExporting(true);
    const methodsList = await loadMethods();
    const { data, error } = await applyTxnFilters(
      supabase.from("transactions")
        .select("id, direction, amount, note, created_at, tag, payment_method_id")
        .order("created_at", { ascending: false }),
      methodsList
    );
    if (error) { setMsg(error.message); setExporting(false); return; }

    const rows = (data ?? []) as Txn[];
    const header = "Date,Direction,Amount,Note,Tag,Payment Method\n";
    const body = rows.map((t) => {
      const date = new Date(t.created_at).toLocaleDateString("en-CA"); // YYYY-MM-DD
      const pm = t.payment_method_id ? methods.get(t.payment_method_id)?.name ?? "" : "";
      const noteClean = (t.note ?? "").replace(/"/g, '""');
      return `${date},${t.direction},${t.amount ?? 0},"${noteClean}",${t.tag ?? "personal"},"${pm}"`;
    }).join("\n");

    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  }

  useEffect(() => {
    loadCountAndFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when searchTerm settles
  useEffect(() => {
    resetPagination();
    loadCountAndFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // Quick date chips
  useEffect(() => {
    const setRange = (days: number) => {
      const d = new Date(); d.setDate(d.getDate() - days);
      const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      setFilters((f) => ({ ...f, dateMode: "custom", dateFrom: iso, dateTo: "" }));
    };
    if (quickRange === "all") setFilters((f) => ({ ...f, dateMode: "any", dateFrom: "", dateTo: "" }));
    else if (quickRange === "7d")  setRange(7);
    else if (quickRange === "30d") setRange(30);
    else if (quickRange === "90d") setRange(90);
    else { setOpenFilter(true); return; }

    resetPagination();
    loadCountAndFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickRange]);

  async function applyFilters() {
    if (filters.amountMode === "between" && (!filters.amountMin || !filters.amountMax)) {
      setMsg("Amount between requires both Min and Max."); return;
    }
    if (filters.dateMode === "custom" && filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
      setMsg("Date From must be before Date To."); return;
    }
    setOpenFilter(false); resetPagination(); await loadCountAndFirstPage();
  }

  function clearFiltersAndReload() {
    setFilters({ ...DEFAULT_FILTERS }); setQuickRange("all");
    setSearchInput(""); setSearchTerm("");
    resetPagination(); loadCountAndFirstPage();
  }

  const showPagination = totalCount > PAGE_SIZE;
  const hasMore = items.length < totalCount;

  return (
    <main className="container">
      <TxnFilterModal
        open={openFilter} onClose={() => setOpenFilter(false)}
        filters={filters} onChange={setFilters}
        onClear={() => setFilters({ ...DEFAULT_FILTERS })}
        onApply={applyFilters} currencySymbol={sym}
      />

      <EditTxnModal
        txn={editTxn}
        onClose={() => setEditTxn(null)}
        onSaved={() => { setEditTxn(null); resetPagination(); loadCountAndFirstPage(); }}
        onDeleted={() => { setEditTxn(null); resetPagination(); loadCountAndFirstPage(); }}
      />

      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="h1">Transactions</h1>
          <p className="sub">Browse, filter, edit and export.</p>
        </div>
        <div className="row">
          <Link href="/receivables" className="badge" style={{ cursor: "pointer" }}>Receivables →</Link>
          <button className="btn btnPrimary" onClick={() => router.push("/add")} type="button">＋ Add</button>
        </div>
      </div>

      {/* Quick range chips */}
      <div className="row" style={{ marginTop: 10, flexWrap: "wrap" }}>
        {(["all","7d","30d","90d","custom"] as const).map((x) => (
          <button key={x} type="button"
            className={`btn ${quickRange === x ? "btnPrimary" : ""}`}
            onClick={() => setQuickRange(x)}
          >
            {x === "all" ? "All" : x === "custom" ? "Custom" : x.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Search + Filter + Export row */}
      <div className="row" style={{ marginTop: 12, gap: 10 }}>
        <div className="card" style={{ padding: 12, borderRadius: 18, flex: 1 }}>
          <input
            className="input"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search all transactions by note…"
          />
        </div>
        <button className={`btn ${activeFilterCount ? "btnPrimary" : ""}`} onClick={() => setOpenFilter(true)} type="button">
          Filter {activeFilterCount ? `(${activeFilterCount})` : ""}
        </button>
        <button className="btn" onClick={exportCSV} disabled={exporting} type="button">
          {exporting ? "…" : "CSV"}
        </button>
        {(activeFilterCount || quickRange !== "all" || searchTerm) ? (
          <button className="btn" onClick={clearFiltersAndReload} type="button">Clear</button>
        ) : null}
      </div>

      {msg && <div className="toast" style={{ marginTop: 12 }}>{msg}</div>}

      <div className="card cardPad" style={{ marginTop: 12 }}>
        {loadingPage && items.length === 0 ? (
          <p className="muted">Loading…</p>
        ) : items.length === 0 ? (
          <p className="muted">No transactions found.</p>
        ) : (
          <div className="col" style={{ gap: 8 }}>
            {items.map((t) => {
              const pm = t.payment_method_id ? methods.get(t.payment_method_id) : null;
              return (
                <div key={t.id} className="card cardLift" style={{ padding: "12px 14px", borderRadius: 16 }}>
                  <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
                      <span className={`badge ${t.direction === "income" ? "badgeGood" : "badgeBad"}`}>
                        {t.direction === "income" ? "↘ IN" : "↗ OUT"}
                      </span>
                      <div>
                        <div style={{ fontWeight: 650 }}>{t.note}</div>
                        <div className="row" style={{ gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                          <span className="badge">{tagLabel(t.tag)}</span>
                          {pm ? <span className="badge">{pm.name}</span> : <span className="badge">No method</span>}
                          {pm?.channel ? <span className="badge">{pm.channel.toUpperCase()}</span> : null}
                        </div>
                        <div className="faint" style={{ fontSize: 11, marginTop: 5 }}>
                          {new Date(t.created_at).toLocaleString("en-IN")}
                        </div>
                      </div>
                    </div>

                    <div className="row" style={{ gap: 8, alignItems: "flex-start" }}>
                      <div className="money" style={{ fontWeight: 800, color: t.direction === "income" ? "var(--goodLight)" : "var(--badLight)" }}>
                        {t.direction === "income" ? "+" : "-"}{formatMoney(Number(t.amount ?? 0), code)}
                      </div>
                      <button
                        className="btn"
                        style={{ padding: "6px 10px", fontSize: 13 }}
                        onClick={() => setEditTxn({
                          id: t.id,
                          direction: t.direction,
                          amount: t.amount,
                          note: t.note,
                          category_id: t.category_id,
                          payment_method_id: t.payment_method_id,
                          tag: t.tag,
                        })}
                        type="button"
                      >
                        ✎
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showPagination && <div className="sep" />}
        {showPagination && (
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <span className="faint" style={{ fontSize: 12 }}>
              Showing {items.length} of {totalCount}
            </span>
            {hasMore ? (
              <button className="btn btnPrimary" onClick={loadMore} disabled={loadingPage} type="button">
                {loadingPage ? "Loading…" : "Load more"}
              </button>
            ) : (
              <span className="badge">End</span>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
