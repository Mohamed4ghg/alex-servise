"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Loader2,
  Package,
  Printer,
  TrendingUp,
  Wallet,
} from "lucide-react";
import * as XLSX from "xlsx";
import { createClient } from "@/utils/supabase/client";

type Shipment = {
  id: string;
  tracking_number: string;
  customer_id: string | null;
  agent_id: string | null;
  receiver_area: string | null;
  type: string | null;
  value: number | null;
  collection_amount: number | null;
  status: string | null;
  priority: string | null;
  created_at: string;
};

type Agent = { id: string; name: string };
type Customer = { id: string; name: string | null; full_name: string | null };

type DateRangeKey = "today" | "week" | "month" | "all";

const STATUS_LABELS: Record<string, string> = {
  pending: "قيد الانتظار",
  assigned: "تم الإسناد",
  picked_up: "تم الاستلام",
  in_transit: "قيد التوصيل",
  delivered: "تم التسليم",
  returned: "مرتجع",
  cancelled: "ملغي",
};

function statusLabel(status: string | null) {
  if (!status) return "غير محدد";
  return STATUS_LABELS[status] ?? status;
}

function customerDisplayName(c?: Customer) {
  if (!c) return "—";
  return c.full_name || c.name || "—";
}

function getDateRangeStart(key: DateRangeKey): Date | null {
  const now = new Date();
  if (key === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (key === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  }
  if (key === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return null; // all
}

function formatCurrency(n: number) {
  return n.toLocaleString("ar-EG", { maximumFractionDigits: 0 });
}

// ===== تصدير البيانات =====
function exportCSV(rows: Record<string, string | number>[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvContent =
    "\uFEFF" + // BOM عشان العربي يظهر صح في إكسل
    [
      headers.join(","),
      ...rows.map((r) =>
        headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function exportExcel(rows: Record<string, string | number>[], filename: string) {
  if (rows.length === 0) return;
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "تقرير");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export default function ReportsPage() {
  const supabase = createClient();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [agents, setAgents] = useState<Record<string, Agent>>({});
  const [customers, setCustomers] = useState<Record<string, Customer>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<DateRangeKey>("month");

  async function fetchData() {
    setLoading(true);
    setError(null);

    const [shipmentsRes, agentsRes, customersRes] = await Promise.all([
      supabase
        .from("shipments")
        .select(
          "id, tracking_number, customer_id, agent_id, receiver_area, type, value, collection_amount, status, priority, created_at"
        )
        .order("created_at", { ascending: false }),
      supabase.from("agents").select("id, name"),
      supabase.from("customers").select("id, name, full_name"),
    ]);

    if (shipmentsRes.error) {
      setError("تعذر تحميل بيانات التقارير، برجاء المحاولة مرة أخرى");
      console.error("Reports fetch error:", shipmentsRes.error.message);
      setLoading(false);
      return;
    }

    setShipments(shipmentsRes.data ?? []);
    setAgents(
      Object.fromEntries((agentsRes.data ?? []).map((a) => [a.id, a]))
    );
    setCustomers(
      Object.fromEntries((customersRes.data ?? []).map((c) => [c.id, c]))
    );
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const start = getDateRangeStart(range);
    if (!start) return shipments;
    return shipments.filter((s) => new Date(s.created_at) >= start);
  }, [shipments, range]);

  const kpis = useMemo(() => {
    const totalRevenue = filtered.reduce((sum, s) => sum + (s.value ?? 0), 0);
    const totalCollected = filtered.reduce(
      (sum, s) => sum + (s.collection_amount ?? 0),
      0
    );
    const delivered = filtered.filter((s) => s.status === "delivered").length;
    const deliveryRate =
      filtered.length > 0 ? Math.round((delivered / filtered.length) * 100) : 0;

    return {
      total: filtered.length,
      totalRevenue,
      totalCollected,
      deliveryRate,
    };
  }, [filtered]);

  const byStatus = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>();
    for (const s of filtered) {
      const key = s.status ?? "unknown";
      const entry = map.get(key) ?? { count: 0, value: 0 };
      entry.count += 1;
      entry.value += s.value ?? 0;
      map.set(key, entry);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].count - a[1].count);
  }, [filtered]);

  const byAgent = useMemo(() => {
    const map = new Map<
      string,
      { name: string; count: number; delivered: number; collected: number }
    >();
    for (const s of filtered) {
      const id = s.agent_id ?? "unassigned";
      const name = s.agent_id ? agents[s.agent_id]?.name ?? "غير معروف" : "غير مسند";
      const entry = map.get(id) ?? { name, count: 0, delivered: 0, collected: 0 };
      entry.count += 1;
      if (s.status === "delivered") entry.delivered += 1;
      entry.collected += s.collection_amount ?? 0;
      map.set(id, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [filtered, agents]);

  const byArea = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of filtered) {
      const key = s.receiver_area?.trim() || "غير محدد";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [filtered]);

  function buildExportRows() {
    return filtered.map((s) => ({
      "رقم التتبع": s.tracking_number,
      العميل: customerDisplayName(customers[s.customer_id ?? ""]),
      المندوب: s.agent_id ? agents[s.agent_id]?.name ?? "—" : "غير مسند",
      المنطقة: s.receiver_area ?? "—",
      الحالة: statusLabel(s.status),
      القيمة: s.value ?? 0,
      التحصيل: s.collection_amount ?? 0,
      التاريخ: new Date(s.created_at).toLocaleDateString("ar-EG"),
    }));
  }

  function handlePrintPDF() {
    window.print();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 print:px-0 print:py-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900">
            <BarChart3 className="h-5 w-5 text-white" />
          </span>
          <div>
            <h1 className="font-display text-xl font-bold text-navy-950">
              التقارير
            </h1>
            <p className="text-sm text-gray-500">
              تقارير التشغيل والإيرادات بناءً على بيانات حقيقية
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportCSV(buildExportRows(), "تقرير-الشحنات")}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-semibold text-navy-800 transition hover:border-navy-300"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
          <button
            onClick={() => exportExcel(buildExportRows(), "تقرير-الشحنات")}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-semibold text-navy-800 transition hover:border-navy-300"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Excel
          </button>
          <button
            onClick={handlePrintPDF}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-red-700"
          >
            <Printer className="h-3.5 w-3.5" />
            PDF
          </button>
        </div>
      </div>

      {/* فلترة التاريخ */}
      <div className="mt-6 flex w-fit gap-2 rounded-lg bg-gray-50 p-1 print:hidden">
        {(
          [
            { key: "today", label: "اليوم" },
            { key: "week", label: "آخر 7 أيام" },
            { key: "month", label: "الشهر الحالي" },
            { key: "all", label: "الكل" },
          ] as { key: DateRangeKey; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setRange(t.key)}
            className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition ${
              range === t.key
                ? "bg-white text-navy-950 shadow-sm"
                : "text-gray-500 hover:text-navy-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm">جاري تحميل التقارير...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <p className="text-sm text-red-500">{error}</p>
          <button
            onClick={fetchData}
            className="text-sm font-semibold text-navy-700 hover:text-red-600"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : (
        <>
          {/* كروت KPI */}
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiCard
              icon={Package}
              label="إجمالي الشحنات"
              value={kpis.total.toLocaleString("ar-EG")}
            />
            <KpiCard
              icon={TrendingUp}
              label="إجمالي قيمة الشحنات"
              value={formatCurrency(kpis.totalRevenue)}
            />
            <KpiCard
              icon={Wallet}
              label="إجمالي التحصيلات"
              value={formatCurrency(kpis.totalCollected)}
            />
            <KpiCard
              icon={BarChart3}
              label="نسبة التسليم"
              value={`${kpis.deliveryRate}%`}
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* الحالات */}
            <ReportTable
              title="الشحنات حسب الحالة"
              rows={byStatus.map(([status, s]) => [
                statusLabel(status),
                s.count.toLocaleString("ar-EG"),
                formatCurrency(s.value),
              ])}
              headers={["الحالة", "العدد", "القيمة"]}
            />

            {/* المناطق */}
            <ReportTable
              title="أكثر المناطق طلبًا"
              rows={byArea.map(([area, count]) => [
                area,
                count.toLocaleString("ar-EG"),
              ])}
              headers={["المنطقة", "عدد الشحنات"]}
            />
          </div>

          {/* أداء المندوبين */}
          <div className="mt-6">
            <ReportTable
              title="أداء المندوبين"
              rows={byAgent.map((a) => [
                a.name,
                a.count.toLocaleString("ar-EG"),
                a.delivered.toLocaleString("ar-EG"),
                formatCurrency(a.collected),
              ])}
              headers={["المندوب", "إجمالي الشحنات", "تم التسليم", "إجمالي التحصيل"]}
            />
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[var(--shadow-card)] print:border print:shadow-none">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-red-500" />
        <p className="text-xs font-medium text-gray-500">{label}</p>
      </div>
      <p className="mt-2 font-display text-xl font-extrabold text-navy-950 tnum">
        {value}
      </p>
    </div>
  );
}

function ReportTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[var(--shadow-card)] print:border print:shadow-none">
      <div className="border-b border-gray-100 px-5 py-3">
        <h3 className="text-sm font-bold text-navy-950">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-gray-400">
          لا توجد بيانات
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-right text-xs font-semibold text-gray-500">
              {headers.map((h) => (
                <th key={h} className="px-5 py-2.5">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={`px-5 py-2.5 ${j === 0 ? "font-semibold text-navy-950" : "text-gray-600 tnum"}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}