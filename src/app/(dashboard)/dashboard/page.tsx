import Link from "next/link";
import { cookies } from "next/headers";
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  Package,
  PackageCheck,
  PackagePlus,
  RotateCcw,
  Truck,
  UserRound,
  Wallet,
  WifiOff,
} from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ShipmentStatusBadge, AgentStatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";

const KPI_ICONS = [Package, PackagePlus, Truck, PackageCheck, RotateCcw, Wallet];

const STATUS_LABELS: Record<string, { name: string; color: string }> = {
  delivered: { name: "تم التسليم", color: "#0f8a4b" },
  out_for_delivery: { name: "قيد التوصيل", color: "#b6790a" },
  new: { name: "جديدة", color: "#2e5399" },
  returned: { name: "مرتجعة", color: "#c81823" },
  cancelled: { name: "ملغاة", color: "#9aa4b0" },
};

const DAY_NAMES = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

export default async function DashboardHome() {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);

  // ===== KPIs =====
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    { count: totalShipments },
    { count: newToday },
    { count: outForDelivery },
    { count: delivered },
    { count: returned },
    { data: collectionsData },
  ] = await Promise.all([
    supabase.from("shipments").select("*", { count: "exact", head: true }),
    supabase.from("shipments").select("*", { count: "exact", head: true }).gte("created_at", startOfToday.toISOString()),
    supabase.from("shipments").select("*", { count: "exact", head: true }).eq("status", "out_for_delivery"),
    supabase.from("shipments").select("*", { count: "exact", head: true }).eq("status", "delivered"),
    supabase.from("shipments").select("*", { count: "exact", head: true }).eq("status", "returned"),
    supabase.from("shipments").select("collection_amount"),
  ]);

  const totalCollections =
    collectionsData?.reduce((sum, s) => sum + (Number(s.collection_amount) || 0), 0) ?? 0;

  const kpis = [
    { label: "إجمالي الشحنات", value: totalShipments ?? 0 },
    { label: "شحنات جديدة", value: newToday ?? 0 },
    { label: "قيد التوصيل", value: outForDelivery ?? 0 },
    { label: "تم التسليم", value: delivered ?? 0 },
    { label: "مرتجعة", value: returned ?? 0 },
    { label: "إجمالي التحصيلات", value: totalCollections, isCurrency: true },
  ];

  // ===== توزيع الحالات =====
  const { data: allStatuses } = await supabase.from("shipments").select("status");
  const statusCounts: Record<string, number> = {};
  allStatuses?.forEach((s) => {
    statusCounts[s.status] = (statusCounts[s.status] ?? 0) + 1;
  });
  const statusDistribution = Object.entries(statusCounts)
    .filter(([key]) => STATUS_LABELS[key])
    .map(([key, value]) => ({ ...STATUS_LABELS[key], value }));

  // ===== الشحنات الأسبوعية (آخر 7 أيام) =====
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const { data: weekShipments } = await supabase
    .from("shipments")
    .select("created_at, status")
    .gte("created_at", sevenDaysAgo.toISOString());

  const weeklyMap: Record<string, { shipments: number; delivered: number }> = {};
  weekShipments?.forEach((s) => {
    const day = DAY_NAMES[new Date(s.created_at).getDay()];
    if (!weeklyMap[day]) weeklyMap[day] = { shipments: 0, delivered: 0 };
    weeklyMap[day].shipments += 1;
    if (s.status === "delivered") weeklyMap[day].delivered += 1;
  });
  const weeklyShipments = DAY_NAMES.map((day) => ({
    day,
    ...(weeklyMap[day] ?? { shipments: 0, delivered: 0 }),
  }));

  // ===== المندوبين =====
  const { data: agents } = await supabase
    .from("agents")
    .select("*")
    .order("status")
    .limit(6);

  // ===== آخر الشحنات =====
  const { data: latestRaw } = await supabase
    .from("shipments")
    .select(
      "id, tracking_number, collection_amount, status, receiver_name, customers(name), agents(name)"
    )
    .order("created_at", { ascending: false })
    .limit(6);

  const latest = (latestRaw ?? []).map((s: any) => ({
    id: s.id,
    trackingNumber: s.tracking_number,
    customerName: s.customers?.name ?? "—",
    receiverName: s.receiver_name,
    agentName: s.agents?.name as string | undefined,
    status: s.status,
    collectionAmount: s.collection_amount,
  }));

  // تنبيهات: هنسيبها ثابتة مؤقتًا لحد ما تتفق على منطق التنبيهات الفعلي
  const alerts = [
    { icon: Clock, text: "شحنات تجاوزت وقت التسليم المتوقع", tone: "warning" as const, href: "/dashboard/shipments" },
    { icon: WifiOff, text: "تحقق من المندوبين الغير متصلين", tone: "danger" as const, href: "/dashboard/agents" },
    { icon: AlertTriangle, text: "شحنات لم تُحدّث منذ فترة طويلة", tone: "warning" as const, href: "/dashboard/shipments" },
    { icon: Wallet, text: "تحصيلات لم يتم تسليمها للمكتب بعد", tone: "info" as const, href: "/dashboard/collections" },
  ];
  const alertTone = {
    warning: "bg-warning-100 text-warning-600",
    danger: "bg-red-100 text-red-600",
    info: "bg-info-100 text-info-600",
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-xl font-extrabold text-navy-950 sm:text-2xl">مرحبًا 👋</h1>
        <p className="mt-1 text-sm text-gray-500">هذا ملخص أداء اليوم</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k, i) => (
          <KpiCard key={k.label} {...k} icon={KPI_ICONS[i]} />
        ))}
      </div>

      {/* Charts */}
      <DashboardCharts weeklyShipments={weeklyShipments} statusDistribution={statusDistribution} />

      {/* Live map summary + Alerts */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[var(--shadow-card)] lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-navy-950">المندوبين الآن</h3>
            <Link href="/dashboard/live-map" className="flex items-center gap-1 text-xs font-semibold text-navy-700 hover:text-red-600">
              التتبع المباشر <ArrowLeft className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-3 relative h-56 overflow-hidden rounded-xl bg-navy-50">
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  "linear-gradient(#c2c9d1 1px, transparent 1px), linear-gradient(90deg, #c2c9d1 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
            {(agents ?? []).map((a, i) => (
              <span
                key={a.id}
                className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-navy-900 text-[10px] font-bold text-white shadow-md"
                style={{ top: `${20 + i * 15}%`, left: `${15 + i * 17}%` }}
                title={a.name}
              >
                {a.avatar}
              </span>
            ))}
            <div className="absolute bottom-3 right-3 rounded-lg bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-navy-900 shadow">
              معاينة تقريبية — الخريطة الكاملة تفاعلية
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(agents ?? []).slice(0, 3).map((a) => (
              <div key={a.id} className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-100 text-[10px] font-bold text-navy-900">
                  {a.avatar}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-navy-900">{a.name}</p>
                  <AgentStatusBadge status={a.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[var(--shadow-card)]">
          <h3 className="font-display text-sm font-bold text-navy-950">يحتاج إلى انتباهك</h3>
          <div className="mt-3 space-y-2.5">
            {alerts.map((a, i) => (
              <Link
                key={i}
                href={a.href}
                className="flex items-start gap-3 rounded-xl border border-gray-100 p-3 transition hover:border-gray-200 hover:bg-gray-50"
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${alertTone[a.tone]}`}>
                  <a.icon className="h-4 w-4" />
                </span>
                <p className="text-xs leading-5 text-navy-900">{a.text}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Latest shipments */}
      <div className="mt-6 rounded-2xl border border-gray-100 bg-white shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <h3 className="font-display text-sm font-bold text-navy-950">آخر الشحنات</h3>
          <Link href="/dashboard/shipments" className="flex items-center gap-1 text-xs font-semibold text-navy-700 hover:text-red-600">
            عرض الكل <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-right text-xs text-gray-400">
                <th className="px-5 py-3 font-medium">رقم الشحنة</th>
                <th className="px-5 py-3 font-medium">العميل</th>
                <th className="px-5 py-3 font-medium">المستلم</th>
                <th className="px-5 py-3 font-medium">المندوب</th>
                <th className="px-5 py-3 font-medium">الحالة</th>
                <th className="px-5 py-3 font-medium">التحصيل</th>
              </tr>
            </thead>
            <tbody>
              {latest.map((s) => (
                <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <Link href={`/dashboard/shipments/${s.id}`} className="font-semibold text-navy-900 tnum hover:text-red-600">
                      {s.trackingNumber}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{s.customerName}</td>
                  <td className="px-5 py-3 text-gray-600">{s.receiverName}</td>
                  <td className="px-5 py-3 text-gray-600">
                    {s.agentName ? (
                      <span className="flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5 text-gray-400" /> {s.agentName}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3"><ShipmentStatusBadge status={s.status} /></td>
                  <td className="px-5 py-3 font-semibold text-navy-900 tnum">{formatCurrency(s.collectionAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}