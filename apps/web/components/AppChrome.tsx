"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useFinance } from "@/components/finance/FinanceProvider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/" || pathname === "/dashboard";
  }

  return pathname.startsWith(href);
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 0 1-2.82 2.82l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .15 1.7 1.7 0 0 0-.95 1.54V21.2a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.1 19.6a1.7 1.7 0 0 0-1-.15 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 0 1-2.82-2.82l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.15-1 1.7 1.7 0 0 0-1.54-.95H2.8a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.4 8.1a1.7 1.7 0 0 0 .15-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.82-2.82l.06.06A1.7 1.7 0 0 0 8.9 4.6a1.7 1.7 0 0 0 1-.15 1.7 1.7 0 0 0 .95-1.54V2.8a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15.9 4.4a1.7 1.7 0 0 0 1 .15 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.82 2.82l-.06.06A1.7 1.7 0 0 0 19.4 8.9a1.7 1.7 0 0 0 .15 1 1.7 1.7 0 0 0 1.54.95h.11a2 2 0 1 1 0 4h-.11A1.7 1.7 0 0 0 19.6 15Z" />
    </svg>
  );
}

const navItems = [
  { href: "/dashboard", label: "Home" },
  { href: "/transactions", label: "Activity" },
  { href: "/budget", label: "Plan" },
  { href: "/settings", label: "Settings" },
];

export default function AppChrome() {
  const pathname = usePathname();
  const router = useRouter();
  const { status, userIdentity } = useFinance();

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase?.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="app-chrome">
      <div className="app-chrome-inner">
        <Link href="/dashboard" className="chrome-brand" aria-label="Open dashboard">
          <span className="chrome-brand-mark">₹</span>
          <span className="chrome-brand-copy">
            <span className="chrome-brand-title">Spendtracker</span>
            <span className="chrome-brand-caption">Cleaner money decisions</span>
          </span>
        </Link>

        <nav className="chrome-nav" aria-label="Desktop navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`chrome-link ${isActive(pathname, item.href) ? "chrome-link-active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="chrome-actions">
          {userIdentity ? <span className="chrome-identity">{userIdentity}</span> : null}
          <Link href="/add" className="button button-primary chrome-add-button">
            Add entry
          </Link>
          {pathname !== "/settings" ? (
            <Link href="/settings" className="chrome-icon-link" aria-label="Open settings">
              <SettingsIcon />
            </Link>
          ) : null}
          {status === "ready" ? (
            <button type="button" className="button button-secondary chrome-signout-button" onClick={handleSignOut}>
              Sign out
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
