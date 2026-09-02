"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Navigation,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

const NAV_ITEMS = [
  { href: "/agent", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/agent/track", label: "البث المباشر", icon: Navigation },
  { href: "/agent/reports", label: "التقارير", icon: BarChart3 },
];

export function AgentSidebar({ agentName }: { agentName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [loggingOut, setLoggingOut] = useState(false);

  const initial = agentName.trim().charAt(0).toUpperCase() || "م";

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="fixed right-0 top-0 z-20 hidden h-screen w-64 flex-col border-l border-gray-100 bg-white lg:flex">
      <div className="flex h-20 items-center gap-3 border-b border-gray-100 px-6">
        <Image
          src="/images/logo.png"
          alt="Alex Service"
          width={64}
          height={64}
          className="h-16 w-16 rounded-xl object-contain"
          priority
        />
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-navy-950 font-bold text-white"
                  : "text-gray-500 hover:bg-gray-50 hover:text-navy-900"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-gray-100 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 text-sm font-bold text-white">
            {initial}
          </span>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-bold text-navy-950">
              {agentName}
            </p>
            <p className="text-xs text-gray-500">مندوب توصيل</p>
          </div>
        </div>

        <div className="space-y-1">
          <Link
            href="/agent/settings"
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              pathname === "/agent/settings"
                ? "bg-navy-950 font-bold text-white"
                : "text-gray-500 hover:bg-gray-50 hover:text-navy-900"
            }`}
          >
            <Settings className="h-4 w-4" /> الإعدادات
          </Link>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            {loggingOut ? "جاري تسجيل الخروج..." : "تسجيل الخروج"}
          </button>
        </div>
      </div>
    </aside>
  );
}