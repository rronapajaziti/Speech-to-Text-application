import Sidebar from "./components/sidebar";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-zinc-50 dark:bg-black text-black dark:text-white">
        <div className="flex">
          {/* GLOBAL SIDEBAR */}
          <Sidebar />

          {/* PAGE CONTENT */}
          <main className="flex-1 ml-64 p-10 min-h-screen">{children}</main>
        </div>
      </body>
    </html>
  );
}
