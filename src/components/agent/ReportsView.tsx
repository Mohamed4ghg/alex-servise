"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Wallet, Package, TrendingUp, AlertTriangle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Shipment = {
  id: string;
  status: string | null;
  collection_amount: number | null;
  receiver_area: string | null;
  created_at: string;
};

type StatusInfo = { key: string; label: string; color: string };

type Range = "today" | "7d" | "30d";

const RANGE_LABELS: Record<Range, string> = {
  today: "اليوم",
  "7d": "آخر 7 أيام",
  "30d": "آخر 30 يوم",
};

function getRangeStart(range: Range) {
  const now = new Date();
  if (range === "today") {
    now.setHours(0, 0, 0, 0);
    return now;
  }
  const days = range === "7d" ? 7 : 30;
  now.setDate(now.getDate() - days);
  return now;
}

function formatEGP(n: number) {
  return n.toLocaleString("ar-EG");
}

export function ReportsView() {
  const supabase = createClient();
  const [range, setRange] = useState<Range>("7d");
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [statuses, setStatuses] = useState<StatusInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (selectedRange: Range) => {
      setLoading(true);
      setError(null);

      const { data: agentId } = await supabase.rpc("my_agent_id");

      if (!agentId) {
        setError("مفيش بيانات مندوب مرتبطة بحسابك");
        setLoading(false);
        return;
      }

      const startDate = getRangeStart(selectedRange).toISOString();

      const [shipmentsRes, statusesRes] = await Promise.all([
        supabase
          .from("shipments")
          .select("id, status, collection_amount, receiver_area, created_at")
          .eq("agent_id", agentId)
          .gte("created_at", startDate)
          .order("created_at", { ascending: false }),
        supabase
          .from("shipment_statuses")
          .select("key, label, color")
          .eq("is_active", true)
          .order("sort_order"),
      ]);

      if (shipmentsRes.error) {
        setError("تعذّر تحميل التقرير، حاول تاني");
      } else {
        setShipments(shipmentsRes.data ?? []);
        setStatuses(statusesRes.data ?? []);
      }
      setLoading(false);
    },
    [supabase]
  );

  useEffect(() => {
    fetchData(range);
  }, [range, fetchData]);

  const totalCollection = useMemo(
    () => shipments.reduce((sum, s) => sum + (s.collection_amount ?? 0), 0),
    [shipments]
  );

  const deliveredCount = useMemo(
    () => shipments.filter((s) => s.status === "delivered").length,
    [shipments]
  );

  const successRate = useMemo(() => {
    if (shipments.length === 0) return 0;
    return Math.round((deliveredCount / shipments.length) * 100);
  }, [deliveredCount, shipments.length]);

  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    shipments.forEach((s) => {
      const key = s.status || "unknown";
      counts[key] = (counts[key] || 0) + 1;
    });
    return statuses
      .map((s) => ({ ...s, count: counts[s.key] || 0 }))
      .filter((s) => s.count > 0);
  }, [shipments, statuses]);

  const areaData = useMemo(() => {
    const map: Record<string, number> = {};
    shipments.forEach((s) => {
      const area = s.receiver_area || "غير محدد";
      map[area] = (map[area] || 0) + (s.collection_amount || 0);
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [shipments]);

  return (
    <div className="space-y-6">
      {/* Range filter */}
      <div className="flex gap-2 overflow-x-auto">
        {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`shrink-0 rounded-full px-5 py-2 text-sm font-bold transition ${
              range === r
                ? "bg-navy-950 text-white"
                : "border border-gray-100 bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            {RANGE_LABELS[r]}
          </button>
        ))}
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-white px-6 py-16 text-center">
          <AlertTriangle className="h-8 w-8 text-red-400" />
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="relative overflow-hidden rounded-2xl bg-navy-950 p-5 text-white">
              <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-red-600/30 blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <Wallet className="h-4 w-4" /> إجمالي التحصيل
                </div>
                <p className="mt-2 font-display text-2xl font-bold">
                  {loading ? "—" : formatEGP(totalCollection)}{" "}
                  <span className="text-sm font-medium text-white/60">ج.م</span>
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Package className="h-4 w-4" /> إجمالي الشحنات
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-navy-950">
                {loading ? "—" : shipments.length}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {loading ? "" : `${deliveredCount} تم تسليمها`}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <TrendingUp className="h-4 w-4" /> نسبة النجاح
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-navy-950">
                {loading ? "—" : `${successRate}%`}
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${successRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* Status breakdown */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="font-bold text-navy-950">توزيع الحالات</h3>
            <p className="mt-1 text-xs text-gray-500">
              خلال {RANGE_LABELS[range]}
            </p>

            {loading ? (
              <div className="py-10 text-center text-sm text-gray-400">
                جاري التحميل...
              </div>
            ) : statusBreakdown.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">
                مفيش شحنات في الفترة دي
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {statusBreakdown.map((s) => (
                  <div key={s.key} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-xs font-medium text-gray-600">
                      {s.label}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(s.count / shipments.length) * 100}%`,
                          backgroundColor: statusColorToHex(s.color),
                        }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-xs font-bold text-navy-950">
                      {s.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Area chart */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="font-bold text-navy-950">التحصيل حسب المنطقة</h3>
            <p className="mt-1 text-xs text-gray-500">
              أعلى المناطق تحصيلًا خلال {RANGE_LABELS[range]}
            </p>
            <div className="mt-6 h-72 w-full" dir="ltr">
              {loading ? (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">
                  جاري التحميل...
                </div>
              ) : areaData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">
                  لا توجد بيانات كافية
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={areaData}>
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#0f172a" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function statusColorToHex(color: string) {
  const map: Record<string, string> = {
    gray: "#9ca3af",
    info: "#3b82f6",
    warning: "#f59e0b",
    success: "#10b981",
    red: "#ef4444",
  };
  return map[color] ?? "#9ca3af";
}