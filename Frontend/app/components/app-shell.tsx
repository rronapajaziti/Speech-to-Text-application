"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Sidebar from "./sidebar";

type Props = {
  children: React.ReactNode;
};

export default function AppShell({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    const token = localStorage.getItem("access");

    if (!token && !isLoginPage) {
      router.replace("/login");
      return;
    }
    if (token && isLoginPage) {
      router.replace("/dashboard");
      return;
    }
    setReady(true);
  }, [isLoginPage, router, pathname]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] text-sm text-[#64748B]">
        Loading...
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="ml-64 min-h-screen flex-1 bg-[#FAFAF9] p-10">{children}</main>
    </div>
  );
}
