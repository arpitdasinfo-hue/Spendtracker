import "./globals.css";
import { Inter } from "next/font/google";
import TabBar from "@/components/TabBar";
import TransitionOverlay from "@/components/TransitionOverlay";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "SpendTracker",
  description: "Dark neon fintech expense tracker",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {/* Overlay handles transitions; page content stays stable */}
        <TransitionOverlay />
        {children}
        <TabBar />
      </body>
    </html>
  );
}
