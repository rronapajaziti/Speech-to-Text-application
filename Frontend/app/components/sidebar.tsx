"use client";

import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-zinc-900 text-white flex flex-col p-6">
      <h1 className="text-xl font-bold mb-10">ASR System</h1>

      <nav className="flex flex-col gap-3">
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-md hover:bg-zinc-800 transition"
        >
          Dashboard
        </Link>

        <Link
          href="/production"
          className="px-4 py-2 rounded-md hover:bg-zinc-800 transition"
        >
          Production
        </Link>

        <Link
          href="/evaluation"
          className="px-4 py-2 rounded-md hover:bg-zinc-800 transition"
        >
          Evaluation
        </Link>
      </nav>
    </aside>
  );
}
