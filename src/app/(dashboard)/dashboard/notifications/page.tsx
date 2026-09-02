"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  Info,
  Loader2,
  XCircle,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type NotificationType = "info" | "success" | "warning" | "danger";

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

const TYPE_STYLES: Record<NotificationType, { bg: string; icon: React.ElementType }> = {
  info: { bg: "bg-info-100 text-info-600", icon: Info },
  success: { bg: "bg-success-100 text-success-600", icon: CheckCircle2 },
  warning: { bg: "bg-warning-100 text-warning-600", icon: AlertTriangle },
  danger: { bg: "bg-red-100 text-red-600", icon: XCircle },
};

type FilterTab = "all" | "unread";

const PAGE_SIZE = 20;

function timeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  if (hours < 24) return `منذ ${hours} ساعة`;
  return `منذ ${days} يوم`;
}

export default function NotificationsPage() {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [hasMore, setHasMore] = useState(true);

  async function fetchNotifications(offset = 0, append = false) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error: fetchError } = await supabase
      .from("notifications")
      .select("id, type, title, message, link, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (fetchError) {
      setError("تعذر تحميل الإشعارات، برجاء المحاولة مرة أخرى");
      console.error("Notifications fetch error:", fetchError.message);
      return;
    }

    setHasMore((data?.length ?? 0) === PAGE_SIZE);
    setNotifications((prev) => (append ? [...prev, ...(data ?? [])] : data ?? []));
  }

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      setLoading(true);
      await fetchNotifications();
      setLoading(false);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      // لو الكومبوننت اتشال قبل ما نوصل هنا (زي حالة Strict Mode
      // اللي بتشغّل الـ effect مرتين)، متعملش اشتراك أصلاً
      if (!user || cancelled) return;

      // اسم القناة لازم يكون فريد لكل مستخدم عشان يتفادى تعارض
      // الاشتراك المزدوج لو الـ effect اشتغل أكتر من مرة
      channel = supabase
        .channel(`notifications_changes_${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            setNotifications((prev) => [payload.new as Notification, ...prev]);
          }
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () =>
      filter === "unread"
        ? notifications.filter((n) => !n.is_read)
        : notifications,
    [notifications, filter]
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  async function markAsRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );

    const { error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (updateError) {
      console.error("Mark as read error:", updateError.message);
    }
  }

  async function markAllAsRead() {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    const { error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds);

    if (updateError) {
      console.error("Mark all as read error:", updateError.message);
    }
  }

  async function handleLoadMore() {
    await fetchNotifications(notifications.length, true);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900">
            <Bell className="h-5 w-5 text-white" />
            {unreadCount > 0 && (
              <span className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </span>
          <div>
            <h1 className="font-display text-xl font-bold text-navy-950">
              الإشعارات
            </h1>
            <p className="text-sm text-gray-500">
              {notifications.length} إشعار مرتبط بأحداث النظام
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-semibold text-navy-800 transition hover:border-navy-300"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            تحديد الكل كمقروء
          </button>
        )}
      </div>

      {/* الفلترة */}
      <div className="mt-6 flex w-fit gap-2 rounded-lg bg-gray-50 p-1">
        {(
          [
            { key: "all", label: "الكل" },
            { key: "unread", label: `غير مقروء${unreadCount > 0 ? ` (${unreadCount})` : ""}` },
          ] as { key: FilterTab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition ${
              filter === t.key
                ? "bg-white text-navy-950 shadow-sm"
                : "text-gray-500 hover:text-navy-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* القائمة */}
      <div className="mt-4 rounded-2xl border border-gray-100 bg-white shadow-[var(--shadow-card)]">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">جاري تحميل الإشعارات...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <p className="text-sm text-red-500">{error}</p>
            <button
              onClick={() => fetchNotifications()}
              className="text-sm font-semibold text-navy-700 hover:text-red-600"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Bell className="h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">
              {filter === "unread"
                ? "لا توجد إشعارات غير مقروءة"
                : "لا توجد إشعارات حتى الآن"}
            </p>
          </div>
        ) : (
          filtered.map((n) => {
            const { bg, icon: Icon } = TYPE_STYLES[n.type];
            const content = (
              <div
                className={`flex items-start gap-3 border-b border-gray-50 p-4 transition last:border-0 hover:bg-gray-50/60 ${
                  !n.is_read ? "bg-red-50/30" : ""
                }`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-navy-950">{n.title}</p>
                    {!n.is_read && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-600" />
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-gray-600">{n.message}</p>
                  <p className="mt-1 text-xs text-gray-400 tnum">
                    {timeAgo(n.created_at)}
                  </p>
                </div>
              </div>
            );

            return (
              <div key={n.id} onClick={() => !n.is_read && markAsRead(n.id)}>
                {n.link ? (
                  <Link href={n.link} className="block cursor-pointer">
                    {content}
                  </Link>
                ) : (
                  <div className="cursor-pointer">{content}</div>
                )}
              </div>
            );
          })
        )}
      </div>

      {!loading && !error && hasMore && filter === "all" && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={handleLoadMore}
            className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold text-navy-800 transition hover:border-navy-300"
          >
            تحميل المزيد
          </button>
        </div>
      )}
    </div>
  );
}