"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 18, scale: 0.985, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -12, scale: 0.99, filter: "blur(10px)" }}
        transition={{ type: "spring", stiffness: 260, damping: 26, mass: 0.7 }}
        style={{ minHeight: "100vh" }}
      >
        {/* background shimmer layer */}
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
