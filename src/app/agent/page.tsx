"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ClipboardList,
  MapPin,
  Navigation,
  Package,
  PackageCheck,
  Phone,
  RefreshCw,
  Search,
  Truck,
  Wallet,
  Clock,
  X,
  Eye,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { AgentUserMenu } from "@/components/agent/AgentUserMenu";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

type Shipment = {
  id: string;
  tracking_number: string;
  receiver_name: string | null;
  receiver_phone: string | null;
  receiver_area: string | null;
  collection_amount: number | null;
  status: string | null;
  created_at?: string;
};

type StatusKey = "assigned" | "picked_up" | "in_transit";

const STATUS_META: Record<
  StatusKey,
  { label: string; color: string; bg: string; icon: LucideIcon }
> = {
  assigned: { label: "تم الإسناد", color: "#3b82f6", bg: "bg-blue-50 text-blue-700 border-blue-200", icon: ClipboardList },
  picked_up: { label: "تم الاستلام", color: "#f59e0b", bg: "bg-amber-50 text-amber-700 border-amber-200", icon: PackageCheck },
  in_transit: { label: "قيد التوصيل", color: "#ef4444", bg: "bg-red-50 text-red-700 border-red-200", icon: Truck },
};

const ACTIVE_STATUSES: StatusKey[] = ["assigned", "picked_up", "in_transit"];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "صباح الخير";
  if (hour < 17) return "مساء الفل";
  return "مساء الخير";
}
function formatEGP(n: number) {
  return n.toLocaleString("ar-EG");
}

export default function AgentDashboardPage() {
  const supabase = createClient();
  const [agentName, setAgentName] = useState<string | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusKey | "all">("all");
  const [query, setQuery] = useState("");

  const fetchShipments = useCallback(
    async (isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from("shipments")
        .select(
          "id, tracking_number, receiver_name, receiver_phone, receiver_area, collection_amount, status, created_at"
        )
        .in("status", ACTIVE_STATUSES)
        .order("created_at", { ascending: false });

      if (fetchError) {
        setError("تعذّر تحميل الشحنات. تحقق من الاتصال وحاول مرة أخرى.");
      } else {
        setShipments((data as Shipment[]) ?? []);
      }
      setLoading(false);
      setRefreshing(false);
    },
    [supabase]
  );

  useEffect(() => {
    fetchShipments();
    supabase.auth.getUser().then(({ data }) => {
      setAgentName(data.user?.user_metadata?.full_name ?? data.user?.email?.split("@")[0] ?? null);
    });
  }, [fetchShipments, supabase]);

  const counts = useMemo(() => {
    const base: Record<StatusKey, number> = { assigned: 0, picked_up: 0, in_transit: 0 };
    shipments.forEach((s) => {
      if (s.status && s.status in base) base[s.status as StatusKey] += 1;
    });
    return base;
  }, [shipments]);

  const totalCollection = useMemo(
    () => shipments.reduce((sum, s) => sum + (s.collection_amount ?? 0), 0),
    [shipments]
  );

  const pieData = useMemo(
    () =>
      ACTIVE_STATUSES.map((k) => ({
        name: STATUS_META[k].label,
        value: counts[k],
        color: STATUS_META[k].color,
      })).filter((d) => d.value > 0),
    [counts]
  );

  const areaData = useMemo(() => {
    const map: Record<string, number> = {};
    shipments.forEach((s) => {
      const area = s.receiver_area || "غير محدد";
      map[area] = (map[area] || 0) + (s.collection_amount || 0);
    });
    return Object.entries(map).slice(0, 5).map(([name, value]) => ({ name, value }));
  }, [shipments]);

  const visibleShipments = useMemo(() => {
    const q = query.trim().toLowerCase();
    return shipments.filter((s) => {
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      const matchesQuery =
        !q ||
        s.tracking_number.toLowerCase().includes(q) ||
        s.receiver_name?.toLowerCase().includes(q) ||
        s.receiver_phone?.includes(q) ||
        s.receiver_area?.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [shipments, statusFilter, query]);

  return (
    <>
      {/* HEADER */}
      <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-gray-100 bg-white/80 px-4 backdrop-blur-xl lg:px-8">
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchShipments(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-500 transition hover:text-navy-900 disabled:opacity-50"
            disabled={loading || refreshing}
            aria-label="تحديث"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <Link href="/agent/track" className="hidden items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 lg:flex">
            <Navigation className="h-4 w-4" /> بدء البث المباشر
          </Link>
        </div>

        <AgentUserMenu greeting={getGreeting()} name={agentName ?? "مندوبنا"} />
      </header>

      <div className="p-4 lg:p-8">
        {/* KPI CARDS */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
              <p className="mt-3 text-xs text-white/50">من {shipments.length} شحنة نشطة</p>
            </div>
          </div>
          {ACTIVE_STATUSES.map((key) => {
            const meta = STATUS_META[key];
            const Icon = meta.icon;
            return (
              <div key={key} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full border ${meta.bg}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-xs text-gray-400">
                    <Clock className="inline h-3 w-3" /> اليوم
                  </span>
                </div>
                <p className="mt-4 font-display text-2xl font-bold text-navy-950">
                  {loading ? "—" : counts[key]}
                </p>
                <p className="mt-1 text-xs font-medium text-gray-500">{meta.label}</p>
              </div>
            );
          })}
        </div>

        {/* CHARTS ROW */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
            <h3 className="font-bold text-navy-950">التحصيل حسب المنطقة</h3>
            <p className="mt-1 text-xs text-gray-500">أعلى 5 مناطق تحصيل من الشحنات النشطة</p>
            <div className="mt-6 h-72 w-full" dir="ltr">
              {areaData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">
                  لا توجد بيانات كافية بعد
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={areaData}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#0f172a" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="font-bold text-navy-950">توزيع الحالات</h3>
            <div className="mt-4 h-56 w-full" dir="ltr">
              {pieData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">
                  لا توجد شحنات نشطة
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value">
                      {pieData.map((e, i) => (
                        <Cell key={i} fill={e.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-2 space-y-2">
              {ACTIVE_STATUSES.map((k) => (
                <div key={k} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: STATUS_META[k].color }} />
                    {STATUS_META[k].label}
                  </span>
                  <b>{counts[k]}</b>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="mt-6 rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-100 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="font-bold text-navy-950">الشحنات النشطة ({visibleShipments.length})</h3>
              <p className="text-xs text-gray-500">إدارة وتتبع كل شحناتك في مكان واحد</p>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1 lg:w-80">
                <Search className="pointer-events-none absolute end-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ابحث برقم الشحنة، الاسم، الهاتف..."
                  className="w-full rounded-full border border-gray-100 bg-gray-50 py-2.5 pe-10 ps-4 text-sm transition focus:border-navy-900 focus:bg-white focus:outline-none"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    aria-label="مسح البحث"
                    className="absolute start-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto border-b border-gray-100 bg-gray-50/50 p-3">
            <button
              onClick={() => setStatusFilter("all")}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition ${
                statusFilter === "all" ? "bg-navy-950 text-white" : "border border-gray-100 bg-white text-gray-500"
              }`}
            >
              الكل ({shipments.length})
            </button>
            {ACTIVE_STATUSES.map((k) => (
              <button
                key={k}
                onClick={() => setStatusFilter(k)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition ${
                  statusFilter === k ? "bg-navy-950 text-white" : "border border-gray-100 bg-white text-gray-500"
                }`}
              >
                {STATUS_META[k].label} ({counts[k]})
              </button>
            ))}
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">جاري التحميل...</div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <AlertTriangle className="h-8 w-8 text-red-400" />
              <p className="text-sm text-gray-600">{error}</p>
              <button
                onClick={() => fetchShipments()}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-navy-900 transition hover:bg-gray-50"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : visibleShipments.length === 0 ? (
            <div className="py-20 text-center">
              <Package className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">لا توجد شحنات</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">رقم الشحنة</th>
                    <th className="px-5 py-3 font-medium">المستلم</th>
                    <th className="px-5 py-3 font-medium">المنطقة</th>
                    <th className="px-5 py-3 font-medium">التحصيل</th>
                    <th className="px-5 py-3 font-medium">الحالة</th>
                    <th className="px-5 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visibleShipments.map((s) => (
                    <tr key={s.id} className="transition hover:bg-gray-50/80">
                      <td className="px-5 py-4 font-mono font-bold text-navy-950" dir="ltr">
                        {s.tracking_number}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-gray-900">{s.receiver_name || "بدون اسم"}</div>
                        {s.receiver_phone && (
                          <a href={`tel:${s.receiver_phone}`} className="flex items-center gap-1 text-xs text-gray-500" dir="ltr">
                            <Phone className="h-3 w-3" />
                            {s.receiver_phone}
                          </a>
                        )}
                      </td>
                      <td className="px-5 py-4 text-gray-600">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {s.receiver_area || "-"}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-bold text-red-600">
                        {s.collection_amount ? `${formatEGP(s.collection_amount)} ج.م` : "-"}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_META[s.status as StatusKey]?.bg || "bg-gray-100"}`}>
                          {STATUS_META[s.status as StatusKey]?.label || s.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/agent/shipments/${s.id}`}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-100 bg-white transition hover:bg-gray-50"
                        >
                          <Eye className="h-4 w-4 text-gray-500" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Mobile Live Button */}
        <Link
          href="/agent/track"
          className="fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-red-600/30 lg:hidden"
        >
          <Navigation className="h-4 w-4" /> بث مباشر
        </Link>
      </div>
    </>
  );
}