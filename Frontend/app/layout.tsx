import "./globals.css";
import AppShell from "./components/app-shell";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#FAFAF9] text-[#0F172A]">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
