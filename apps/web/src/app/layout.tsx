import "./globals.css";
import TabBar from "@/components/TabBar";
import TransitionOverlay from "@/components/TransitionOverlay";

export const metadata = {
  title: "SpendTracker",
  description: "Dark neon fintech expense tracker",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Overlay handles transitions; page content stays stable */}
        <TransitionOverlay />
        {children}
        <TabBar />
      </body>
    </html>
  );
}
