"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Settings, LogOut, ChevronDown } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export function AgentUserMenu({
  greeting,
  name,
}: {
  greeting: string;
  name: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initial = name.trim().charAt(0).toUpperCase() || "م";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 rounded-full border border-gray-100 bg-gray-50/70 py-1.5 pl-2 pr-1.5 transition hover:bg-gray-100"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-950 text-sm font-bold text-white">
          {initial}
        </span>
        <span className="hidden text-right sm:block">
          <span className="block text-xs text-gray-400">{greeting}</span>
          <span className="block text-sm font-bold leading-none text-navy-950">
            {name}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-2xl border border-gray-100 bg-white py-2 shadow-xl">
          <div className="border-b border-gray-50 px-4 py-3 sm:hidden">
            <p className="text-sm font-bold text-navy-950">{name}</p>
            <p className="text-xs text-gray-400">{greeting}</p>
          </div>

          <Link
            href="/agent/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-navy-950"
          >
            <Settings className="h-4 w-4" />
            الإعدادات
          </Link>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            {loggingOut ? "جاري تسجيل الخروج..." : "تسجيل الخروج"}
          </button>
        </div>
      )}
    </div>
  );
}