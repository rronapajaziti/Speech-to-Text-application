import Sidebar from "./components/sidebar";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#FAFAF9] text-[#0F172A]">
        <div className="flex">
          {/* GLOBAL SIDEBAR */}
          <Sidebar />

          {/* PAGE CONTENT */}
          <main className="ml-64 min-h-screen flex-1 bg-[#FAFAF9] p-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
