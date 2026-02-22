"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Track last pathname to avoid re-playing animations on refresh/re-render
  const lastPathRef = useRef<string>(pathname);
  const [shouldAnimate, setShouldAnimate] = useState(true);

  useEffect(() => {
    if (lastPathRef.current === pathname) {
      // Same route (likely refresh / re-render) -> don't animate
      setShouldAnimate(false);
      // Re-enable for the *next* real navigation
      const t = setTimeout(() => setShouldAnimate(true), 50);
      return () => clearTimeout(t);
    } else {
      // Real navigation -> animate
      lastPathRef.current = pathname;
      setShouldAnimate(true);
    }
  }, [pathname]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={shouldAnimate ? { opacity: 0, y: 18, scale: 0.985, filter: "blur(10px)" } : false}
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        exit={shouldAnimate ? { opacity: 0, y: -12, scale: 0.99, filter: "blur(10px)" } : undefined}
        transition={{ type: "spring", stiffness: 260, damping: 26, mass: 0.7 }}
        style={{ minHeight: "100vh" }}
      >
        <div
          style={{
            position: "fixed",
            inset: -200,
            pointerEvents: "none",
            zIndex: -1,
            background:
              "radial-gradient(900px 380px at 18% 8%, rgba(34,211,238,.12), transparent 60%)," +
              "radial-gradient(820px 360px at 82% 16%, rgba(124,58,237,.18), transparent 58%)," +
              "radial-gradient(720px 320px at 52% 92%, rgba(251,113,133,.10), transparent 62%)",
            filter: "blur(18px)",
            opacity: 0.9,
          }}
        />
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
