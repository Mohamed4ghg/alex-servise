"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Package,
  Phone,
  Plus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { logActivity } from "@/utils/log-activity";

// ============================================================
// أنواع البيانات
// ============================================================

type ReturnReason =
  | "customer_refused"
  | "damaged_or_wrong"
  | "customer_unreachable"
  | "other";

type ReturnStatus = "pending" | "approved" | "rejected" | "closed";

type ReturnRow = {
  id: string;
  reason: ReturnReason;
  reason_note: string | null;
  status: ReturnStatus;
  notes: string | null;
  created_at: string;
  closed_at: string | null;
  shipment: {
    id: string;
    tracking_number: string;
    receiver_name: string;
  } | null;
  customer: {
    id: string;
    full_name: string;
    company_name: string | null;
    customer_type: "individual" | "company";
    phone: string;
  } | null;
};

type FilterTab = "all" | ReturnStatus;

// ============================================================
// خرائط العرض (Arabic labels)
// ============================================================

const reasonLabels: Record<ReturnReason, string> = {
  customer_refused: "العميل رفض الاستلام",
  damaged_or_wrong: "منتج تالف / خاطئ",
  customer_unreachable: "العميل مش راد على المندوب",
  other: "سبب آخر",
};

const statusLabels: Record<ReturnStatus, string> = {
  pending: "قيد المراجعة",
  approved: "تمت الموافقة",
  rejected: "مرفوض",
  closed: "مغلق",
};

const statusStyles: Record<ReturnStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-info-100 text-info-600",
  rejected: "bg-red-100 text-red-600",
  closed: "bg-green-100 text-green-700",
};

// ============================================================
// الصفحة الرئيسية
// ============================================================

export default function ReturnsPage() {
  const supabase = createClient();

  const [returns, setReturns] = useState<ReturnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [showAddModal, setShowAddModal] = useState(false);

  async function fetchReturns() {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("returns")
      .select(
        `id, reason, reason_note, status, notes, created_at, closed_at,
         shipment:shipments(id, tracking_number, receiver_name),
         customer:customers(id, full_name, company_name, customer_type, phone)`
      )
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError("تعذر تحميل بيانات المرتجعات، برجاء المحاولة مرة أخرى");
      console.error("Returns fetch error:", fetchError.message);
      setLoading(false);
      return;
    }

    setReturns((data as unknown as ReturnRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchReturns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredReturns = useMemo(() => {
    return returns.filter((r) => {
      const matchesFilter = filter === "all" || r.status === filter;
      const q = search.trim().toLowerCase();
      const customerName =
        r.customer?.customer_type === "company"
          ? r.customer?.company_name
          : r.customer?.full_name;
      const matchesSearch =
        !q ||
        customerName?.toLowerCase().includes(q) ||
        r.shipment?.tracking_number.toLowerCase().includes(q) ||
        r.customer?.phone.includes(q) ||
        r.reason_note?.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [returns, search, filter]);

  const stats = useMemo(() => {
    const pending = returns.filter((r) => r.status === "pending").length;
    const approved = returns.filter((r) => r.status === "approved").length;
    const closed = returns.filter((r) => r.status === "closed").length;
    return { total: returns.length, pending, approved, closed };
  }, [returns]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900">
            <RotateCcw className="h-5 w-5 text-white" />
          </span>
          <div>
            <h1 className="font-display text-xl font-bold text-navy-950">
              المرتجعات
            </h1>
            <p className="text-sm text-gray-500">
              دورة عمل كاملة للمرتجعات من الطلب حتى الإغلاق، بأسباب وحالات موثقة.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-red-600/20 transition hover:bg-red-700"
        >
          <Plus className="h-4 w-4" />
          تسجيل مرتجع
        </button>
      </div>

      {/* كروت الإحصائيات */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="إجمالي المرتجعات" value={stats.total} />
        <StatCard label="قيد المراجعة" value={stats.pending} />
        <StatCard label="تمت الموافقة" value={stats.approved} />
        <StatCard label="مغلقة" value={stats.closed} />
      </div>

      {/* البحث والفلترة */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم التتبع أو اسم العميل..."
            className="w-full rounded-lg border border-gray-200 py-2.5 pe-3.5 ps-10 text-sm text-navy-950 placeholder:text-gray-400 focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
          />
        </div>

        <div className="flex flex-wrap gap-2 rounded-lg bg-gray-50 p-1">
          {(
            [
              { key: "all", label: "الكل" },
              { key: "pending", label: "قيد المراجعة" },
              { key: "approved", label: "تمت الموافقة" },
              { key: "rejected", label: "مرفوض" },
              { key: "closed", label: "مغلق" },
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
      </div>

      {/* القائمة */}
      <div className="mt-4 rounded-2xl border border-gray-100 bg-white shadow-card">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">جاري تحميل المرتجعات...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <p className="text-sm text-red-500">{error}</p>
            <button
              onClick={fetchReturns}
              className="text-sm font-semibold text-navy-700 hover:text-red-600"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : filteredReturns.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <RotateCcw className="h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">
              {returns.length === 0
                ? "لا توجد مرتجعات مسجّلة بعد"
                : "لا توجد نتائج مطابقة للبحث"}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filteredReturns.map((r) => {
              const customerName =
                r.customer?.customer_type === "company"
                  ? r.customer?.company_name
                  : r.customer?.full_name;

              return (
                <li key={r.id} className="flex items-center gap-4 px-5 py-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy-700">
                    <Package className="h-4.5 w-4.5" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-bold text-navy-950">
                        {customerName ?? "عميل غير معروف"}
                      </p>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${statusStyles[r.status]}`}
                      >
                        {statusLabels[r.status]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {reasonLabels[r.reason]}
                      {r.reason === "other" && r.reason_note
                        ? ` — ${r.reason_note}`
                        : ""}
                    </p>
                  </div>

                  <div className="hidden shrink-0 flex-col items-start gap-1 text-xs text-gray-500 sm:flex">
                    <span dir="ltr">{r.shipment?.tracking_number ?? "—"}</span>
                    {r.customer?.phone && (
                      <span className="flex items-center gap-1.5" dir="ltr">
                        <Phone className="h-3 w-3" />
                        {r.customer.phone}
                      </span>
                    )}
                  </div>

                  <span className="hidden shrink-0 text-xs text-gray-400 lg:block">
                    {new Date(r.created_at).toLocaleDateString("ar-EG")}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showAddModal && (
        <AddReturnModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false);
            fetchReturns();
          }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
      <p className="font-display text-2xl font-extrabold text-navy-950 tnum">{value}</p>
      <p className="mt-1 text-xs font-medium text-gray-500">{label}</p>
    </div>
  );
}

// ============================================================
// مودال تسجيل مرتجع جديد
// ============================================================

type FoundShipment = {
  id: string;
  customer_id: string;
  tracking_number: string;
  receiver_name: string;
  receiver_phone: string;
};

function AddReturnModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const supabase = createClient();

  const [trackingNumber, setTrackingNumber] = useState("");
  const [searchingShipment, setSearchingShipment] = useState(false);
  const [foundShipment, setFoundShipment] = useState<FoundShipment | null>(null);
  const [shipmentError, setShipmentError] = useState<string | null>(null);

  const [reason, setReason] = useState<ReturnReason>("customer_refused");
  const [reasonNote, setReasonNote] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFindShipment() {
    const query = trackingNumber.trim();
    if (!query) return;

    setSearchingShipment(true);
    setShipmentError(null);
    setFoundShipment(null);

    const { data, error: findError } = await supabase
      .from("shipments")
      .select("id, customer_id, tracking_number, receiver_name, receiver_phone")
      .eq("tracking_number", query)
      .maybeSingle();

    setSearchingShipment(false);

    if (findError) {
      setShipmentError("حصل خطأ أثناء البحث عن الشحنة");
      console.error("Find shipment error:", findError.message);
      return;
    }

    if (!data) {
      setShipmentError("مفيش شحنة برقم التتبع ده");
      return;
    }

    setFoundShipment(data as FoundShipment);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!foundShipment) {
      setError("لازم تدوّري على الشحنة برقم التتبع الأول");
      return;
    }

    if (reason === "other" && !reasonNote.trim()) {
      setError("برجاء كتابة تفاصيل السبب");
      return;
    }

    setSaving(true);

    const { data, error: insertError } = await supabase
      .from("returns")
      .insert({
        shipment_id: foundShipment.id,
        customer_id: foundShipment.customer_id,
        reason,
        reason_note: reason === "other" ? reasonNote.trim() : null,
        notes: notes.trim() || null,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      setError("تعذر تسجيل المرتجع، برجاء المحاولة مرة أخرى");
      console.error("Insert return error:", insertError.message);
      setSaving(false);
      return;
    }

    await logActivity({
      action: "سجّل مرتجع جديد",
      entityType: "return",
      entityId: data.id,
      entityLabel: foundShipment.tracking_number,
    });

    setSaving(false);
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-popover">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-navy-950">
            تسجيل مرتجع جديد
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          {/* البحث عن الشحنة */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-navy-900">
              رقم تتبع الشحنة
            </label>
            <div className="flex gap-2">
              <input
                dir="ltr"
                value={trackingNumber}
                onChange={(e) => {
                  setTrackingNumber(e.target.value);
                  setFoundShipment(null);
                  setShipmentError(null);
                }}
                placeholder="EX123456789"
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
              />
              <button
                type="button"
                onClick={handleFindShipment}
                disabled={searchingShipment || !trackingNumber.trim()}
                className="shrink-0 rounded-lg bg-navy-900 px-4 text-sm font-bold text-white transition hover:bg-navy-800 disabled:opacity-50"
              >
                {searchingShipment ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "بحث"
                )}
              </button>
            </div>
            {shipmentError && (
              <p className="mt-1.5 text-xs text-red-500">{shipmentError}</p>
            )}
            {foundShipment && (
              <div className="mt-2 rounded-lg bg-green-50 p-3 text-xs text-green-800">
                <p className="font-bold">{foundShipment.receiver_name}</p>
                <p dir="ltr">{foundShipment.receiver_phone}</p>
              </div>
            )}
          </div>

          {/* سبب الإرجاع */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-navy-900">
              سبب الإرجاع
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as ReturnReason)}
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
            >
              {(Object.keys(reasonLabels) as ReturnReason[]).map((key) => (
                <option key={key} value={key}>
                  {reasonLabels[key]}
                </option>
              ))}
            </select>
          </div>

          {reason === "other" && (
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-navy-900">
                تفاصيل السبب
              </label>
              <input
                value={reasonNote}
                onChange={(e) => setReasonNote(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-navy-900">
              ملاحظات (اختياري)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "جارٍ الحفظ..." : "حفظ المرتجع"}
          </button>
        </form>
      </div>
    </div>
  );
}