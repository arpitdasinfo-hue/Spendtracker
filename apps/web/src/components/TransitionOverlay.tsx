"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export default function TransitionOverlay() {
  const pathname = usePathname();
  const prev = useRef(pathname);

  const [active, setActive] = useState(false);

  useEffect(() => {
    if (prev.current === pathname) return;

    // Start overlay immediately on route change
    setActive(true);

    // Keep it short (premium feel)
    const t = setTimeout(() => {
      setActive(false);
      prev.current = pathname;
    }, 160);

    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        pointerEvents: "none",
        opacity: active ? 1 : 0,
        transition: "opacity 160ms ease-out",
        background:
          "radial-gradient(900px 380px at 18% 8%, rgba(34,211,238,.14), rgba(0,0,0,.35) 60%)," +
          "radial-gradient(820px 360px at 82% 16%, rgba(124,58,237,.18), rgba(0,0,0,.35) 58%)," +
          "radial-gradient(720px 320px at 52% 92%, rgba(251,113,133,.10), rgba(0,0,0,.35) 62%)," +
          "linear-gradient(180deg, rgba(0,0,0,.45), rgba(0,0,0,.45))",
        backdropFilter: "blur(10px)",
      }}
    />
  );
}
