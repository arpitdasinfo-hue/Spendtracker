"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function isActive(path: string, href: string) {
  if (href === "/dashboard") return path === "/dashboard";
  return path.startsWith(href);
}

export default function TabBar() {
  const path = usePathname();

  const tabs = [
    { href: "/dashboard", label: "Home", icon: "⌂" },
    { href: "/add", label: "Add", icon: "＋" },
    { href: "/transactions", label: "Txns", icon: "≡" },
    { href: "/analysis", label: "Analysis", icon: "⬡" },
    { href: "/budget", label: "Budget", icon: "◔" },
    { href: "/settings", label: "Settings", icon: "⚙︎" },
  ];

  return (
    <nav className="tabbar" aria-label="Bottom navigation">
      {tabs.map((t) => {
        const active = isActive(path, t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`tab ${active ? "tabActive" : ""}`}
          >
            <span aria-hidden>{t.icon}</span>
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
