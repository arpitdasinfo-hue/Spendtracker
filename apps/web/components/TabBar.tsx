"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function isActive(path: string, href: string) {
  if (href === "/dashboard") return path === "/" || path === "/dashboard";
  return path.startsWith(href);
}

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
      <path d="M9 21v-7h6v7" />
    </svg>
  );
}

function LedgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h16" />
      <path d="M4 12h16" />
      <path d="M4 19h16" />
      <circle cx="7" cy="5" r="1" fill="currentColor" stroke="none" />
      <circle cx="7" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="7" cy="19" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function BudgetIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20" />
      <path d="M17 5H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H7" />
    </svg>
  );
}

function InsightsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 20h18" />
      <path d="M6 16V9" />
      <path d="M12 16V4" />
      <path d="M18 16v-6" />
    </svg>
  );
}

const tabs = [
  { href: "/dashboard", label: "Home", Icon: HomeIcon },
  { href: "/transactions", label: "Ledger", Icon: LedgerIcon },
  { href: "/budget", label: "Budget", Icon: BudgetIcon },
  { href: "/analysis", label: "Insights", Icon: InsightsIcon },
];

export default function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="tabbar" aria-label="Primary navigation">
      {tabs.slice(0, 2).map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link key={href} href={href} className={`tab-item ${active ? "tab-item-active" : ""}`}>
            <Icon />
            <span>{label}</span>
          </Link>
        );
      })}

      <Link href="/add" className="fab-add" aria-label="Add entry">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      </Link>

      {tabs.slice(2).map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link key={href} href={href} className={`tab-item ${active ? "tab-item-active" : ""}`}>
            <Icon />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
