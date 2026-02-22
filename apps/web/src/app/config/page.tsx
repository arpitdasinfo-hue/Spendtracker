import Link from "next/link";

export default function ConfigIndexPage() {
  return (
    <main className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="h1">Config</h1>
          <p className="sub">Set up categories, payment instruments, currency, and rules.</p>
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
          <Link className="btn btnPrimary" href="/config/categories">🏷️ Categories</Link>
          <Link className="btn btnPrimary" href="/config/instruments">💳 Instruments</Link>
          <Link className="btn btnPrimary" href="/config/currency">💱 Currency</Link>
          <Link className="btn" href="/budget">◔ Budget rules</Link>
        </div>

        <p className="faint" style={{ marginTop: 12, fontSize: 12 }}>
          Tip: Configure instruments first, then categories, then budgets.
        </p>
      </div>
    </main>
  );
}
