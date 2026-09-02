"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { ChevronDown, LogOut, Settings } from "lucide-react";

export function UserMenu({
  userName,
  initial,
}: {
  userName: string;
  initial: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-full border border-gray-100 bg-gray-50/70 py-1.5 pl-1.5 pr-3 transition hover:bg-gray-100 sm:gap-3 sm:pr-4"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-950 text-sm font-bold text-white sm:h-9 sm:w-9">
          {initial}
        </span>
        <span className="hidden text-sm font-bold text-navy-950 sm:block">
          {userName}
        </span>
        <ChevronDown
          className={`hidden h-4 w-4 text-gray-400 transition-transform sm:block ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 top-[calc(100%+8px)] z-40 w-52 overflow-hidden rounded-2xl border border-gray-100 bg-white py-1.5 shadow-[0_18px_40px_-16px_rgba(15,23,42,0.25)]"
        >
          <Link
            href="/customer/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 hover:text-navy-950"
          >
            <Settings className="h-4 w-4" />
            الإعدادات
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              handleLogout();
            }}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </button>
        </div>
      )}
    </div>
  );
}