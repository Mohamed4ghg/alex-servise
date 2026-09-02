"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Download,
  Eye,
  Loader2,
  MoreHorizontal,
  Package,
  Plus,
  Printer,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type Shipment = {
  id: string;
  tracking_number: string;
  customer_id: string | null;
  agent_id: string | null;
  receiver_name: string | null;
  receiver_phone: string | null;
  receiver_area: string | null;
  collection_amount: number | null;
  status: string | null;
  created_at: string;
};

type Customer = { id: string; full_name: string | null; name: string | null };
type Agent = { id: string; name: string };

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending: { label: "قيد الانتظار", className: "bg-gray-100 text-gray-600" },
  assigned: { label: "تم الإسناد", className: "bg-info-100 text-info-600" },
  picked_up: { label: "تم الاستلام", className: "bg-info-100 text-info-600" },
  in_transit: { label: "قيد التوصيل", className: "bg-warning-100 text-warning-600" },
  delivered: { label: "تم التسليم", className: "bg-success-100 text-success-600" },
  returned: { label: "مرتجع", className: "bg-red-100 text-red-600" },
  cancelled: { label: "ملغي", className: "bg-red-100 text-red-600" },
};

function StatusBadge({ status }: { status: string | null }) {
  const meta = status ? STATUS_META[status] : null;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
        meta?.className ?? "bg-gray-100 text-gray-500"
      }`}
    >
      {meta?.label ?? status ?? "غير محدد"}
    </span>
  );
}

function formatCurrency(n: number) {
  return n.toLocaleString("ar-EG", { maximumFractionDigits: 0 });
}

function customerName(c?: Customer) {
  if (!c) return "—";
  return c.full_name || c.name || "—";
}

function exportCSV(rows: Record<string, string | number>[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvContent =
    "\uFEFF" +
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

const PAGE_SIZE = 25;

export default function ShipmentsPage() {
  const supabase = createClient();

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [customers, setCustomers] = useState<Record<string, Customer>>({});
  const [agents, setAgents] = useState<Record<string, Agent>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [area, setArea] = useState<string>("all");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [printShipment, setPrintShipment] = useState<Shipment | null>(null);

  async function fetchShipments(offset = 0, append = false) {
    const { data, error: fetchError } = await supabase
      .from("shipments")
      .select(
        "id, tracking_number, customer_id, agent_id, receiver_name, receiver_phone, receiver_area, collection_amount, status, created_at"
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (fetchError) {
      setError("تعذر تحميل الشحنات، برجاء المحاولة مرة أخرى");
      console.error("Shipments fetch error:", fetchError.message);
      return;
    }

    setHasMore((data?.length ?? 0) === PAGE_SIZE);
    setShipments((prev) => (append ? [...prev, ...(data ?? [])] : data ?? []));
  }

  async function fetchLookups() {
    const [customersRes, agentsRes] = await Promise.all([
      supabase.from("customers").select("id, full_name, name"),
      supabase.from("agents").select("id, name"),
    ]);
    setCustomers(Object.fromEntries((customersRes.data ?? []).map((c) => [c.id, c])));
    setAgents(Object.fromEntries((agentsRes.data ?? []).map((a) => [a.id, a])));
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchShipments(), fetchLookups()]);
      setLoading(false);
    })();

    // تحديث لحظي: أي شحنة جديدة تتضاف تظهر فورًا فوق الجدول
    const channel = supabase
      .channel("shipments_list_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "shipments" },
        (payload) => {
          setShipments((prev) => [payload.new as Shipment, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const areas = useMemo(() => {
    const set = new Set(shipments.map((s) => s.receiver_area).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [shipments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return shipments.filter((s) => {
      const customer = customers[s.customer_id ?? ""];
      const matchesSearch =
        !q ||
        s.tracking_number.toLowerCase().includes(q) ||
        customerName(customer).toLowerCase().includes(q) ||
        s.receiver_phone?.includes(q);
      const matchesStatus = status === "all" || s.status === status;
      const matchesArea = area === "all" || s.receiver_area === area;
      return matchesSearch && matchesStatus && matchesArea;
    });
  }, [shipments, customers, search, status, area]);

  function handleExport() {
    exportCSV(
      filtered.map((s) => ({
        "رقم الشحنة": s.tracking_number,
        العميل: customerName(customers[s.customer_id ?? ""]),
        المستلم: s.receiver_name ?? "—",
        الهاتف: s.receiver_phone ?? "—",
        المنطقة: s.receiver_area ?? "—",
        المندوب: s.agent_id ? agents[s.agent_id]?.name ?? "—" : "غير مسندة",
        التحصيل: s.collection_amount ?? 0,
        الحالة: STATUS_META[s.status ?? ""]?.label ?? s.status ?? "—",
        التاريخ: new Date(s.created_at).toLocaleDateString("ar-EG"),
      })),
      "الشحنات"
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-navy-950">إدارة الشحنات</h1>
          <p className="text-sm text-gray-500">
            {filtered.length} شحنة من إجمالي {shipments.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3.5 py-2 text-xs font-semibold text-gray-600 hover:border-gray-300"
          >
            <Download className="h-3.5 w-3.5" /> تصدير
          </button>
          <Link
            href="/dashboard/shipments/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-red-600/20 hover:bg-red-700"
          >
            <Plus className="h-3.5 w-3.5" /> إضافة شحنة
          </Link>
        </div>
      </div>

      {/* الفلاتر */}
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-[var(--shadow-card)] sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث برقم الشحنة، اسم العميل، أو الهاتف..."
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pe-9 ps-3 text-sm focus:border-navy-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-100"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-navy-300 focus:outline-none"
        >
          <option value="all">كل الحالات</option>
          {Object.entries(STATUS_META).map(([key, meta]) => (
            <option key={key} value={key}>
              {meta.label}
            </option>
          ))}
        </select>
        <select
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-navy-300 focus:outline-none"
        >
          <option value="all">كل المناطق</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {/* الجدول */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-[var(--shadow-card)]">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">جاري تحميل الشحنات...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <p className="text-sm text-red-500">{error}</p>
            <button
              onClick={() => fetchShipments()}
              className="text-sm font-semibold text-navy-700 hover:text-red-600"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState hasAny={shipments.length > 0} />
        ) : (
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-right text-xs text-gray-400">
                  <th className="px-5 py-3 font-medium">رقم الشحنة</th>
                  <th className="px-5 py-3 font-medium">العميل</th>
                  <th className="px-5 py-3 font-medium">المستلم</th>
                  <th className="px-5 py-3 font-medium">المنطقة</th>
                  <th className="px-5 py-3 font-medium">المندوب</th>
                  <th className="px-5 py-3 font-medium">التحصيل</th>
                  <th className="px-5 py-3 font-medium">الحالة</th>
                  <th className="px-5 py-3 font-medium">تاريخ الإنشاء</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <Link
                        href={`/dashboard/shipments/${s.id}`}
                        className="font-semibold text-navy-900 tnum hover:text-red-600"
                        dir="ltr"
                      >
                        {s.tracking_number}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {customerName(customers[s.customer_id ?? ""])}
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-gray-800">{s.receiver_name ?? "—"}</p>
                      <p className="text-xs text-gray-400 tnum" dir="ltr">
                        {s.receiver_phone ?? "—"}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{s.receiver_area ?? "—"}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {s.agent_id ? (
                        <span className="flex items-center gap-1.5">
                          <UserRound className="h-3.5 w-3.5 text-gray-400" />
                          {agents[s.agent_id]?.name ?? "—"}
                        </span>
                      ) : (
                        <span className="text-gray-300">غير مسندة</span>
                      )}
                    </td>
                    <td className="px-5 py-3 font-semibold text-navy-900 tnum">
                      {formatCurrency(s.collection_amount ?? 0)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-400 tnum">
                      {new Date(s.created_at).toLocaleDateString("ar-EG")}
                    </td>
                    <td className="relative px-5 py-3">
                      <button
                        onClick={() => setOpenMenu(openMenu === s.id ? null : s.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {openMenu === s.id && (
                        <div className="absolute left-5 top-11 z-10 w-44 rounded-xl border border-gray-100 bg-white p-1.5 shadow-[var(--shadow-popover)]">
                          <Link
                            href={`/dashboard/shipments/${s.id}`}
                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-gray-600 hover:bg-gray-50"
                          >
                            <Eye className="h-3.5 w-3.5" /> عرض التفاصيل
                          </Link>
                          <button
                            onClick={() => {
                              setPrintShipment(s);
                              setOpenMenu(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-gray-600 hover:bg-gray-50"
                          >
                            <Printer className="h-3.5 w-3.5" /> طباعة البوليصة
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && !error && hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => fetchShipments(shipments.length, true)}
            className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold text-navy-800 transition hover:border-navy-300"
          >
            تحميل المزيد
          </button>
        </div>
      )}

      {printShipment && (
        <WaybillModal
          shipment={printShipment}
          customer={customers[printShipment.customer_id ?? ""]}
          onClose={() => setPrintShipment(null)}
        />
      )}
    </div>
  );
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-50 text-navy-400">
        <Package className="h-6 w-6" />
      </span>
      <p className="font-display text-base font-bold text-navy-950">
        {hasAny ? "لا توجد شحنات مطابقة" : "لا توجد شحنات بعد"}
      </p>
      <p className="max-w-xs text-sm text-gray-400">
        {hasAny
          ? "جرّب تعديل الفلاتر أو كلمات البحث، أو أضف شحنة جديدة."
          : "ابدأ بإضافة أول شحنة لظهورها هنا."}
      </p>
      <Link
        href="/dashboard/shipments/new"
        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
      >
        <Plus className="h-3.5 w-3.5" /> إضافة شحنة
      </Link>
    </div>
  );
}

function WaybillModal({
  shipment,
  customer,
  onClose,
}: {
  shipment: Shipment;
  customer?: Customer;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 print:static print:bg-white">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 print:rounded-none print:shadow-none">
        <div className="flex items-center justify-between print:hidden">
          <h3 className="font-display text-lg font-bold text-navy-950">بوليصة الشحنة</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 rounded-xl border-2 border-black p-5">
          <div className="flex items-center justify-between border-b border-dashed border-gray-300 pb-3">
            <p className="font-display text-lg font-extrabold text-navy-950">ALEX Service</p>
            <p className="font-display text-lg font-bold tnum" dir="ltr">
              {shipment.tracking_number}
            </p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-400">المرسل</p>
              <p className="font-bold text-navy-950">{customerName(customer)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">المستلم</p>
              <p className="font-bold text-navy-950">{shipment.receiver_name}</p>
              <p className="text-gray-500" dir="ltr">{shipment.receiver_phone}</p>
            </div>
          </div>

          <div className="mt-3 border-t border-dashed border-gray-300 pt-3 text-sm">
            <p className="text-xs text-gray-400">المنطقة</p>
            <p className="text-navy-950">{shipment.receiver_area ?? "—"}</p>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-dashed border-gray-300 pt-3 text-sm">
            <span className="font-bold text-red-600 tnum">
              التحصيل: {formatCurrency(shipment.collection_amount ?? 0)} ج.م
            </span>
            <span className="font-mono text-lg tracking-widest">*{shipment.tracking_number}*</span>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 print:hidden"
        >
          <Printer className="h-4 w-4" />
          طباعة الآن
        </button>
      </div>
    </div>
  );
}