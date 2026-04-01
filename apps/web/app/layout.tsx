import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Cormorant_Garamond } from "next/font/google";
import AppFrame from "@/components/AppFrame";
import TransitionOverlay from "@/components/TransitionOverlay";
import { FinanceProvider } from "@/components/finance/FinanceProvider";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Spendtracker",
  description: "A polished finance command center for expense, income, UPI, cards, and repayments.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Spendtracker",
  },
};

export const viewport: Viewport = {
  themeColor: "#f5efe6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${cormorant.variable}`}>
      <body>
        <div className="app-backdrop" aria-hidden="true">
          <div className="app-noise" />
          <div className="app-orb app-orb-a" />
          <div className="app-orb app-orb-b" />
          <div className="app-orb app-orb-c" />
        </div>
        <FinanceProvider>
          <TransitionOverlay />
          <AppFrame>{children}</AppFrame>
        </FinanceProvider>
      </body>
    </html>
  );
}
