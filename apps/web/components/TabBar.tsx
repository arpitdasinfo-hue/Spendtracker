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

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .33 1.77l.06.06a1.99 1.99 0 1 1-2.82 2.82l-.06-.06A1.6 1.6 0 0 0 15 19.4a1.6 1.6 0 0 0-1 .14 1.6 1.6 0 0 0-.94 1.46V21a2 2 0 1 1-4 0v-.09a1.6 1.6 0 0 0-.94-1.46 1.6 1.6 0 0 0-1-.14 1.6 1.6 0 0 0-1.77.33l-.06.06a1.99 1.99 0 1 1-2.82-2.82l.06-.06A1.6 1.6 0 0 0 4.6 15a1.6 1.6 0 0 0-.14-1 1.6 1.6 0 0 0-1.46-.94H3a2 2 0 1 1 0-4h.09a1.6 1.6 0 0 0 1.46-.94 1.6 1.6 0 0 0 .14-1 1.6 1.6 0 0 0-.33-1.77l-.06-.06a1.99 1.99 0 1 1 2.82-2.82l.06.06A1.6 1.6 0 0 0 9 4.6a1.6 1.6 0 0 0 1-.14 1.6 1.6 0 0 0 .94-1.46V3a2 2 0 1 1 4 0v.09a1.6 1.6 0 0 0 .94 1.46 1.6 1.6 0 0 0 1 .14 1.6 1.6 0 0 0 1.77-.33l.06-.06a1.99 1.99 0 1 1 2.82 2.82l-.06.06A1.6 1.6 0 0 0 19.4 9c0 .35.05.68.14 1a1.6 1.6 0 0 0 1.46.94H21a2 2 0 1 1 0 4h-.09a1.6 1.6 0 0 0-1.46.94c-.09.32-.14.65-.14 1Z" />
    </svg>
  );
}

const tabs = [
  { href: "/dashboard", label: "Home", Icon: HomeIcon },
  { href: "/transactions", label: "Activity", Icon: LedgerIcon },
  { href: "/budget", label: "Plan", Icon: BudgetIcon },
  { href: "/settings", label: "Settings", Icon: SettingsIcon },
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
