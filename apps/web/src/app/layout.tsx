import "./globals.css";
import TabBar from "@/components/TabBar";
import PageTransition from "@/components/PageTransition";

export const metadata = {
  title: "SpendTracker",
  description: "Dark neon fintech expense tracker",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PageTransition>{children}</PageTransition>
        <TabBar />
      </body>
    </html>
  );
}
