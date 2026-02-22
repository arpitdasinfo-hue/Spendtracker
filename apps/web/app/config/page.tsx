import Link from "next/link";

export default function ConfigIndexPage() {
  return (
    <main className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="h1">Config</h1>
          <p className="sub">Setup profile, currency, categories, instruments, payment methods, and budget rules.</p>
        </div>
        <span className="badge">Setup</span>
      </div>

      <div className="card cardPad" style={{ marginTop: 14 }}>
        <div className="pill">
          <span>⚙︎</span>
          <span className="muted">Configuration Center</span>
          <span className="kbd">pro</span>
        </div>

        <div className="sep" />

        <div className="grid2" style={{ gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          <Link className="btn btnPrimary" href="/config/user">👤 User</Link>
          <Link className="btn btnPrimary" href="/config/currency">💱 Currency</Link>
          <Link className="btn btnPrimary" href="/config/categories">🏷️ Categories</Link>
          <Link className="btn btnPrimary" href="/config/instruments">💳 Instruments</Link>
          <Link className="btn btnPrimary" href="/config/payment-methods">🧾 Payment Methods</Link>
          <Link className="btn btnPrimary" href="/config/budget-rules">◔ Budget Rules</Link>
        </div>
      </div>
    </main>
  );
}
