"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import "./sidebar.css";
import { fetchWithAuth } from "../lib/auth";

import {
  LayoutDashboard,
  Mic,
  BarChart3,
  History,
  TrendingUp,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [openMenu, setOpenMenu] = useState<number | null>(1);
  const [user, setUser] = useState<User | null>(null);
  type User = {
    username?: string;
    email?: string;
  };

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      children: [
        { href: "/dashboard/stats", label: "Stats", icon: TrendingUp },
      ],
    },
    {
      label: "Evaluation",
      href: "/evaluation",
      icon: Mic,
      children: [
        { href: "/evaluation/history", label: "History", icon: History },
      ],
    },
  ];

  const toggleMenu = (index: number) => {
    setOpenMenu(openMenu === index ? null : index);
  };
  const apiBase = (
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"
  ).replace(/\/+$/, "");

  useEffect(() => {
    const fetchUser = async () => {
      if (!localStorage.getItem("access")) return;
      try {
        const res = await fetchWithAuth(`${apiBase}/users/me/`);
        if (!res.ok) throw new Error("Failed to fetch user");
        const data = await res.json();
        setUser({ username: data.username, email: data.email });
      } catch (err) {
        console.error(err);
      }
    };

    fetchUser();
  }, [apiBase]);

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
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <div key={item.label} className="nav-group">
              {/* Parent */}
              <Link
                href={item.href}
                className={`nav-item ${isActive ? "active" : ""}`}
              >
                {Icon && <Icon size={18} className="icon" />}
                <span>{item.label}</span>
              </Link>

              {/* Children (always visible but indented) */}
              <div className="submenu">
                {item.children?.map((child) => {
                  const ChildIcon = child.icon;
                  const isChildActive = pathname === child.href;

                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={`sub-item ${isChildActive ? "active" : ""}`}
                    >
                      {ChildIcon && <ChildIcon size={16} className="icon" />}
                      <span>{child.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div className="user">
        <div className="avatar">
          {user?.username?.charAt(0).toUpperCase() || "U"}
        </div>

        <div>
          <p className="user-name">{user?.username || "Unknown"}</p>
          <p className="user-email">{user?.email || ""}</p>
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
