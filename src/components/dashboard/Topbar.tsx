"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, Menu, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  type: "info" | "success" | "warning" | "danger";
  message: string;
  created_at: string;
};

const typeColor = {
  info: "bg-info-100 text-info-600",
  success: "bg-success-100 text-success-600",
  warning: "bg-warning-100 text-warning-600",
  danger: "bg-red-100 text-red-600",
} as const;

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

function initials(fullName: string) {
  const parts = fullName.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "؟";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return `${parts[0][0]}.${parts[1][0]}`;
}

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const router = useRouter();
  const supabase = createClient();

  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (profile?.full_name) setUserName(profile.full_name);

      const { data: notifs } = await supabase
        .from("notifications")
        .select("id, type, message, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (notifs) setNotifications(notifs as Notification[]);
    }

    loadData();
  }, [supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-gray-100 bg-white/90 px-4 backdrop-blur-md sm:px-6">
      <div className="flex flex-1 items-center gap-3">
        <button onClick={onMenu} className="text-gray-500 lg:hidden">
          <Menu className="h-5 w-5" />
        </button>
        <div className="relative hidden max-w-sm flex-1 sm:block">
          <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="بحث برقم الشحنة، العميل، أو المندوب..."
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pe-9 ps-3 text-sm focus:border-navy-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-100"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => {
              setNotifOpen((v) => !v);
              setUserOpen(false);
            }}
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
          >
            <Bell className="h-5 w-5" />
            {notifications.length > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-600 ring-2 ring-white" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute left-0 top-12 w-80 rounded-xl border border-gray-100 bg-white p-2 shadow-[var(--shadow-popover)]">
              <div className="flex items-center justify-between px-3 py-2">
                <p className="text-sm font-bold text-navy-950">الإشعارات</p>
                <span className="text-xs font-semibold text-red-600">{notifications.length} جديد</span>
              </div>
              <div className="scroll-thin max-h-80 space-y-1 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-3 py-4 text-center text-xs text-gray-400">لا توجد إشعارات حاليًا</p>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="flex items-start gap-2.5 rounded-lg px-3 py-2 hover:bg-gray-50">
                      <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", typeColor[n.type].split(" ")[0])} />
                      <div>
                        <p className="text-xs leading-5 text-navy-900">{n.message}</p>
                        <p className="mt-0.5 text-[11px] text-gray-400">{timeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Link
                href="/dashboard/notifications"
                onClick={() => setNotifOpen(false)}
                className="mt-1 block rounded-lg px-3 py-2 text-center text-xs font-semibold text-navy-700 hover:bg-navy-50"
              >
                عرض كل الإشعارات
              </Link>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setUserOpen((v) => !v);
              setNotifOpen(false);
            }}
            className="flex items-center gap-2 rounded-lg py-1.5 pe-2 ps-1.5 hover:bg-gray-100"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">
              {userName ? initials(userName) : "؟"}
            </span>
            <span className="hidden text-sm font-semibold text-navy-950 sm:block">
              {userName || "جاري التحميل..."}
            </span>
            <ChevronDown className="hidden h-4 w-4 text-gray-400 sm:block" />
          </button>

          {userOpen && (
            <div className="absolute left-0 top-12 w-48 rounded-xl border border-gray-100 bg-white p-1.5 shadow-[var(--shadow-popover)]">
              <Link href="/dashboard/settings" className="block rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                الملف الشخصي
              </Link>
              <Link href="/dashboard/settings" className="block rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                الإعدادات
              </Link>
              <button
                onClick={handleSignOut}
                className="block w-full rounded-lg px-3 py-2 text-right text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                تسجيل الخروج
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}