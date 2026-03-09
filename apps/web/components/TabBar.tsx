"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const TxnIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/>
    <line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/>
    <line x1="3" y1="12" x2="3.01" y2="12"/>
    <line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);

const BudgetIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a10 10 0 1 0 10 10H12V2z"/>
    <path d="M12 2a10 10 0 0 1 10 10"/>
  </svg>
);

const AnalysisIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
    <line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
);

function isActive(path: string, href: string) {
  if (href === "/dashboard") return path === "/dashboard";
  return path.startsWith(href);
}

export default function TabBar() {
  const path = usePathname();

  const leftTabs = [
    { href: "/dashboard",    label: "Home",   Icon: HomeIcon },
    { href: "/transactions", label: "Txns",   Icon: TxnIcon },
  ];

  const rightTabs = [
    { href: "/budget",   label: "Budget",   Icon: BudgetIcon },
    { href: "/analysis", label: "Analysis", Icon: AnalysisIcon },
  ];

  const renderTab = ({ href, label, Icon }: typeof leftTabs[0]) => {
    const active = isActive(path, href);
    return (
      <Link key={href} href={href} className={`tab ${active ? "tabActive" : ""}`}>
        <span className="tabIcon" aria-hidden>
          <Icon />
        </span>
        <span className="tabLabel">{label}</span>
      </Link>
    );
  };

  return (
    <nav className="tabbar" aria-label="Bottom navigation">
      {leftTabs.map(renderTab)}

      {/* Center FAB — primary action */}
      <Link
        href="/add"
        className="fabAdd"
        aria-label="Add transaction"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </Link>

      {rightTabs.map(renderTab)}
    </nav>
  );
}
