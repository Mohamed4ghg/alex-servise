"use client";

import { useEffect, useState } from "react";
import {
  History,
  Loader2,
  PackagePlus,
  RefreshCw,
  Truck,
  User,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type ActivityLog = {
  id: string;
  actor_name: string;
  action: string;
  entity_type: string | null;
  entity_label: string | null;
  created_at: string;
};

// أيقونة مختلفة حسب نوع العنصر المرتبط بالحدث
function getActivityIcon(entityType: string | null) {
  switch (entityType) {
    case "shipment":
      return PackagePlus;
    case "agent":
      return Truck;
    default:
      return User;
  }
}

// تحويل التاريخ لصيغة "منذ 5 دقايق" بالعربي
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

const PAGE_SIZE = 20;

export default function ActivityLogPage() {
  const supabase = createClient();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  async function fetchLogs(offset = 0, append = false) {
    const { data, error: fetchError } = await supabase
      .from("activity_logs")
      .select("id, actor_name, action, entity_type, entity_label, created_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (fetchError) {
      setError("تعذر تحميل سجل الأنشطة، برجاء المحاولة مرة أخرى");
      console.error("Activity log fetch error:", fetchError.message);
      return;
    }

    setHasMore((data?.length ?? 0) === PAGE_SIZE);
    setLogs((prev) => (append ? [...prev, ...(data ?? [])] : data ?? []));
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchLogs();
      setLoading(false);
    })();

    // تحديث لحظي: أي سجل جديد يتضاف يظهر تلقائيًا فوق القايمة من غير Refresh
    const channel = supabase
      .channel("activity_logs_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_logs" },
        (payload) => {
          setLogs((prev) => [payload.new as ActivityLog, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    setError(null);
    await fetchLogs();
    setRefreshing(false);
  }

  async function handleLoadMore() {
    await fetchLogs(logs.length, true);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900">
            <History className="h-5 w-5 text-white" />
          </span>
          <div>
            <h1 className="font-display text-xl font-bold text-navy-950">
              سجل الأنشطة
            </h1>
            <p className="text-sm text-gray-500">
              تسجيل كامل لكل عملية: من قام بها، متى، وعلى أي شحنة.
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-semibold text-navy-800 transition hover:border-navy-300 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          تحديث
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-100 bg-white shadow-card">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">جاري تحميل السجل...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <p className="text-sm text-red-500">{error}</p>
            <button
              onClick={handleRefresh}
              className="text-sm font-semibold text-navy-700 hover:text-red-600"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <History className="h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">
              لا توجد أي أنشطة مسجّلة حتى الآن
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {logs.map((log) => {
              const Icon = getActivityIcon(log.entity_type);
              return (
                <li key={log.id} className="flex items-start gap-3 px-5 py-4">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-50">
                    <Icon className="h-4 w-4 text-navy-700" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-navy-950">
                      <span className="font-bold">{log.actor_name}</span>{" "}
                      {log.action}
                      {log.entity_label && (
                        <span className="font-semibold text-red-600">
                          {" "}
                          {log.entity_label}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400 tnum">
                      {timeAgo(log.created_at)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!loading && !error && hasMore && (
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