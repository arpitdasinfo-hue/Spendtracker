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
  manifest: "/manifest.json",
  themeColor: "#05060f",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SpendTracker",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    viewportFit: "cover",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        {/* Overlay handles transitions; page content stays stable */}
        <TransitionOverlay />
        {children}
        <TabBar />
      </body>
    </html>
  );
}
