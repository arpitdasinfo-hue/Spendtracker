import Link from "next/link";

export default function ConfigIndexPage() {
  return (
    <main className="container">
      <h1 className="h1">Config</h1>
      <p className="sub">Set up categories, payment instruments, budget rules, and currency.</p>

      <div className="card cardPad" style={{ marginTop: 14 }}>
        <div className="col">
          <Link className="btn btnPrimary" href="/config/categories">🏷️ Categories</Link>
          <Link className="btn btnPrimary" href="/config/instruments">💳 Payment Instruments</Link>
          <Link className="btn btnPrimary" href="/config/currency">💱 Currency</Link>
          <Link className="btn" href="/budget">◔ Budget (monthly + category)</Link>
        </div>
      </div>
    </main>
  );
}
