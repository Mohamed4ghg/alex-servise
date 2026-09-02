"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { LogOut, Settings } from "lucide-react";
import { NavLinks } from "./NavLinks";
export function CustomerSidebar() {
  const router = useRouter();
  const supabase = createClient();
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-l border-white/10 bg-[#060C1A] lg:flex">
      <Link
        href="/customer"
        className="flex items-center justify-start border-b border-white/10 px-6 py-4"
      >
        <Image
          src="/images/logo.png"
          alt="Alex Service"
          width={88}
          height={88}
          className="h-[88px] w-[88px] object-contain"
          priority
        />
      </Link>
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <NavLinks variant="sidebar" />
      </div>
      <div className="space-y-1 border-t border-white/10 p-4">
        <Link
          href="/customer/settings"
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <Settings className="h-4.5 w-4.5" />
          الإعدادات
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white/60 transition hover:bg-red-500/15 hover:text-red-300"
        >
          <LogOut className="h-4.5 w-4.5" />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}