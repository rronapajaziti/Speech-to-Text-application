"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/production", label: "Transcription" },
    { href: "/evaluation", label: "Evaluation" },
  ];

  return (
    <aside className="fixed left-0 top-0 flex h-screen w-64 flex-col border-r border-[#E7E5E4] bg-white p-6 text-[#0F172A]">
      <div className="mb-8 flex items-center gap-3 border-b border-[#E7E5E4] pb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#001D3D] font-bold text-white">
          S
        </div>
        <div>
          <p className="text-sm font-semibold">Scribe</p>
          <p className="text-[11px] text-[#64748B]">Speech-to-Text</p>
        </div>
      </div>

      <nav className="flex flex-col gap-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-2 rounded-md transition ${
                isActive
                  ? "bg-[#EEF2FF] text-[#001D3D]"
                  : "text-[#334155] hover:bg-[#F5F5F4] hover:text-[#0F172A]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-[#E7E5E4] pt-4">
        <div className="flex items-center gap-3 rounded-lg bg-[#F5F5F4] p-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00814D] text-xs font-semibold text-white">
            RP
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">Rrona Pajaziti</p>
            <p className="truncate text-xs text-[#64748B]">rrona.pajaziti@...</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
