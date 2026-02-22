import "./globals.css";
import TabBar from "@/components/TabBar";

export const metadata = {
  title: "SpendTracker",
  description: "Dark neon fintech expense tracker",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <TabBar />
      </body>
    </html>
  );
}
