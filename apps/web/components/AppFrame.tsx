"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import AppChrome from "@/components/AppChrome";
import TabBar from "@/components/TabBar";

export default function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showChrome = pathname !== "/login" && !pathname.startsWith("/auth");
  const showTabBar = showChrome && !pathname.startsWith("/add");

  return (
    <div className={`app-shell ${showChrome ? "app-shell-chrome" : ""}`}>
      {showChrome ? <AppChrome /> : null}
      {children}
      {showTabBar ? <TabBar /> : null}
    </div>
  );
}
