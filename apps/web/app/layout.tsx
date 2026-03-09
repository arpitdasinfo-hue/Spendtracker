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
        {/* Animated background mesh — fixes iOS background-attachment:fixed */}
        <div className="bg-mesh" aria-hidden="true">
          <span className="bg-orb3" />
        </div>
        <TransitionOverlay />
        {children}
        <TabBar />
      </body>
    </html>
  );
}
