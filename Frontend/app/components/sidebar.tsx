"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import "./sidebar.css";
import { LayoutDashboard, Mic, BarChart3, History } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [openMenu, setOpenMenu] = useState<number | null>(1);

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Evaluation",
      icon: Mic,
      children: [
        { href: "/evaluation", label: "Overview", icon: BarChart3 },
        { href: "/evaluation/history", label: "History", icon: History },
      ],
    },
  ];

  const toggleMenu = (index: number) => {
    setOpenMenu(openMenu === index ? null : index);
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="logo">
        <div className="logo-box">S</div>
        <div>
          <p className="logo-title">Scribe</p>
          <p className="logo-sub">Speech-to-Text</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="nav">
        {navItems.map((item, index) => {
          const Icon = item.icon;

          if (item.children) {
            const isOpen = openMenu === index;

            return (
              <div key={item.label} className="nav-group">
                {/* Parent clickable */}
                <div
                  className="nav-item parent"
                  onClick={() => toggleMenu(index)}
                  style={{ cursor: "pointer" }}
                >
                  {Icon && <Icon size={18} className="icon" />}
                  <span>{item.label}</span>
                </div>

                {/* Submenu */}
                {isOpen && (
                  <div className="submenu">
                    {item.children.map((child) => {
                      const isActive = pathname === child.href;
                      const ChildIcon = child.icon;

                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`sub-item ${isActive ? "active" : ""}`}
                        >
                          {ChildIcon && (
                            <ChildIcon size={16} className="icon" />
                          )}
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? "active" : ""}`}
            >
              {Icon && <Icon size={18} className="icon" />}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="user">
        <div className="avatar">RP</div>
        <div>
          <p className="user-name">Rrona Pajaziti</p>
          <p className="user-email">rrona.pajaziti@...</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
          router.replace("/login");
        }}
        className="mt-3 rounded-md border border-[#E7E5E4] px-3 py-2 text-xs font-semibold text-[#334155] hover:bg-[#F5F5F4]"
      >
        Logout
      </button>
    </aside>
  );
}
