"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Package,
  Plus,
  Printer,
  Search,
  X,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { logActivity } from "@/utils/log-activity";
import { createCustomer, type Customer } from "@/utils/customers-helper";

type Agent = { id: string; name: string; area: string | null };

function customerLabel(c: Customer) {
  return `${c.full_name || c.name || "بدون اسم"} — ${c.phone}`;
}

function generateTrackingNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TRK-${y}${m}${d}-${rand}`;
}

const EGYPT_PHONE_REGEX = /^01[0125][0-9]{8}$/;

type FieldErrors = {
  customer?: string;
  receiverName?: string;
  receiverPhone?: string;
  receiverAddress?: string;
  value?: string;
};

export default function CreateShipmentPage() {
  const router = useRouter();
  const supabase = createClient();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);

  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  const [form, setForm] = useState({
    receiverName: "",
    receiverPhone: "",
    receiverAddress: "",
    receiverArea: "",
    receiverNotes: "",
    type: "عادي",
    description: "",
    weightKg: "",
    piecesCount: "1",
    value: "",
    collectionAmount: "",
    priority: "normal",
    expectedDeliveryDate: "",
    agentId: "",
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdShipment, setCreatedShipment] = useState<{
    trackingNumber: string;
    id: string;
  } | null>(null);

  useEffect(() => {
    (async () => {
      setLoadingLists(true);
      const [customersRes, agentsRes] = await Promise.all([
        supabase.from("customers").select("id, full_name, name, phone"),
        supabase.from("agents").select("id, name, area"),
      ]);
      setCustomers(customersRes.data ?? []);
      setAgents(agentsRes.data ?? []);
      setLoadingLists(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers.slice(0, 8);
    return customers
      .filter(
        (c) =>
          (c.full_name || c.name || "").toLowerCase().includes(q) ||
          c.phone.includes(q)
      )
      .slice(0, 8);
  }, [customers, customerSearch]);

  function update<K extends keyof typeof form>(field: K, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function markTouched(field: string) {
    setTouched((t) => ({ ...t, [field]: true }));
  }

  const errors: FieldErrors = useMemo(() => {
    const e: FieldErrors = {};

    if (!selectedCustomer) {
      e.customer = "لازم تختار العميل صاحب الشحنة";
    }
    if (!form.receiverName.trim()) {
      e.receiverName = "اسم المستلم مطلوب";
    }
    if (!form.receiverPhone.trim()) {
      e.receiverPhone = "رقم هاتف المستلم مطلوب";
    } else if (!EGYPT_PHONE_REGEX.test(form.receiverPhone.trim())) {
      e.receiverPhone = "رقم الهاتف غير صحيح (مثال: 01012345678)";
    }
    if (!form.receiverAddress.trim()) {
      e.receiverAddress = "عنوان المستلم مطلوب";
    }
    if (!form.value || Number(form.value) <= 0) {
      e.value = "قيمة الشحنة مطلوبة ولازم تكون أكبر من صفر";
    }

    return e;
  }, [selectedCustomer, form]);

  const isValid = Object.keys(errors).length === 0;

  function shouldShowError(field: keyof FieldErrors) {
    return (touched[field] || attemptedSubmit) && !!errors[field];
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setAttemptedSubmit(true);

    if (!isValid || !selectedCustomer) return;

    setSaving(true);

    const trackingNumber = generateTrackingNumber();
    const id = crypto.randomUUID();

    const { error: insertError } = await supabase.from("shipments").insert({
      id,
      tracking_number: trackingNumber,
      customer_id: selectedCustomer.id,
      agent_id: form.agentId || null,
      receiver_name: form.receiverName.trim(),
      receiver_phone: form.receiverPhone.trim(),
      receiver_address: form.receiverAddress.trim(),
      receiver_area: form.receiverArea.trim() || null,
      receiver_notes: form.receiverNotes.trim() || null,
      type: form.type,
      description: form.description.trim() || null,
      weight_kg: form.weightKg ? Number(form.weightKg) : null,
      pieces_count: Number(form.piecesCount) || 1,
      value: Number(form.value),
      collection_amount: form.collectionAmount ? Number(form.collectionAmount) : 0,
      status: form.agentId ? "assigned" : "pending",
      priority: form.priority,
      expected_delivery_date: form.expectedDeliveryDate || null,
      timeline: [
        {
          status: form.agentId ? "assigned" : "pending",
          at: new Date().toISOString(),
        },
      ],
    });

    if (insertError) {
      setSubmitError("تعذر إنشاء الشحنة، برجاء المحاولة مرة أخرى");
      console.error("Create shipment error:", insertError.message);
      setSaving(false);
      return;
    }

    await logActivity({
      action: "أنشأ شحنة جديدة",
      entityType: "shipment",
      entityId: id,
      entityLabel: `شحنة #${trackingNumber}`,
    });

    setSaving(false);
    setCreatedShipment({ trackingNumber, id });
  }

  if (createdShipment) {
    return (
      <ShipmentWaybill
        trackingNumber={createdShipment.trackingNumber}
        customer={selectedCustomer!}
        receiverName={form.receiverName}
        receiverPhone={form.receiverPhone}
        receiverAddress={form.receiverAddress}
        receiverArea={form.receiverArea}
        collectionAmount={form.collectionAmount}
        value={form.value}
        onCreateAnother={() => window.location.reload()}
        onGoToReports={() => router.push("/dashboard/reports")}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900">
          <Package className="h-5 w-5 text-white" />
        </span>
        <div>
          <h1 className="font-display text-xl font-bold text-navy-950">
            إنشاء شحنة جديدة
          </h1>
          <p className="text-sm text-gray-500">
            أدخل بيانات العميل والمستلم والشحنة
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6" noValidate>
        {/* اختيار العميل */}
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-sm font-bold text-navy-950">
            بيانات العميل (صاحب الشحنة) <span className="text-red-500">*</span>
          </h2>

          {selectedCustomer ? (
            <div className="mt-3 flex items-center justify-between rounded-lg border border-success-600/40 bg-success-100/30 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-navy-950">
                <CheckCircle2 className="h-4 w-4 text-success-600" />
                {customerLabel(selectedCustomer)}
              </span>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="text-gray-400 hover:text-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="relative mt-3">
              <div className="relative">
                <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onBlur={() => markTouched("customer")}
                  placeholder="ابحث بالاسم أو الهاتف..."
                  className={`w-full rounded-lg border py-2.5 pe-3.5 ps-10 text-sm focus:outline-none focus:ring-2 ${
                    shouldShowError("customer")
                      ? "border-red-500/60 focus:ring-red-500/20"
                      : "border-gray-200 focus:border-navy-400 focus:ring-navy-100"
                  }`}
                />
              </div>

              {showCustomerDropdown && (
                <div className="absolute z-10 mt-1.5 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-popover">
                  {loadingLists ? (
                    <p className="px-4 py-3 text-sm text-gray-400">جاري التحميل...</p>
                  ) : filteredCustomers.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-400">لا يوجد عملاء مطابقين</p>
                  ) : (
                    filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(c);
                          setShowCustomerDropdown(false);
                          setCustomerSearch("");
                        }}
                        className="block w-full px-4 py-2.5 text-right text-sm hover:bg-gray-50"
                      >
                        {customerLabel(c)}
                      </button>
                    ))
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCustomer(true);
                      setShowCustomerDropdown(false);
                    }}
                    className="flex w-full items-center gap-1.5 border-t border-gray-100 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    إضافة عميل جديد
                  </button>
                </div>
              )}
              {shouldShowError("customer") && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-red-400">
                  <AlertCircle className="h-3 w-3" />
                  {errors.customer}
                </p>
              )}
            </div>
          )}
        </section>

        {/* بيانات المستلم */}
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-sm font-bold text-navy-950">بيانات المستلم</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <TextField
              label="اسم المستلم"
              value={form.receiverName}
              onChange={(v) => update("receiverName", v)}
              onBlur={() => markTouched("receiverName")}
              error={shouldShowError("receiverName") ? errors.receiverName : undefined}
              required
            />
            <TextField
              label="هاتف المستلم"
              value={form.receiverPhone}
              onChange={(v) => update("receiverPhone", v)}
              onBlur={() => markTouched("receiverPhone")}
              error={shouldShowError("receiverPhone") ? errors.receiverPhone : undefined}
              dir="ltr"
              required
            />
            <TextField label="المنطقة" value={form.receiverArea} onChange={(v) => update("receiverArea", v)} />
            <TextField
              label="العنوان بالتفصيل"
              value={form.receiverAddress}
              onChange={(v) => update("receiverAddress", v)}
              onBlur={() => markTouched("receiverAddress")}
              error={shouldShowError("receiverAddress") ? errors.receiverAddress : undefined}
              required
            />
          </div>
          <div className="mt-4">
            <TextField label="ملاحظات التسليم (اختياري)" value={form.receiverNotes} onChange={(v) => update("receiverNotes", v)} />
          </div>
        </section>

        {/* تفاصيل الشحنة */}
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-sm font-bold text-navy-950">تفاصيل الشحنة</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-navy-900">نوع الشحنة</label>
              <select
                value={form.type}
                onChange={(e) => update("type", e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
              >
                <option value="عادي">عادي</option>
                <option value="مستندات">مستندات</option>
                <option value="مبرد">مبرد</option>
                <option value="كسور">كسور</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-navy-900">الأولوية</label>
              <select
                value={form.priority}
                onChange={(e) => update("priority", e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
              >
                <option value="normal">عادية</option>
                <option value="high">مرتفعة</option>
                <option value="urgent">عاجلة</option>
              </select>
            </div>
            <TextField label="الوزن (كجم)" value={form.weightKg} onChange={(v) => update("weightKg", v)} type="number" />
            <TextField label="عدد القطع" value={form.piecesCount} onChange={(v) => update("piecesCount", v)} type="number" />
            <TextField
              label="قيمة الشحنة (ج.م)"
              value={form.value}
              onChange={(v) => update("value", v)}
              onBlur={() => markTouched("value")}
              error={shouldShowError("value") ? errors.value : undefined}
              type="number"
              required
            />
            <TextField label="مبلغ التحصيل عند التسليم (ج.م)" value={form.collectionAmount} onChange={(v) => update("collectionAmount", v)} type="number" />
            <TextField label="تاريخ التسليم المتوقع" value={form.expectedDeliveryDate} onChange={(v) => update("expectedDeliveryDate", v)} type="date" />
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-navy-900">إسناد لمندوب (اختياري)</label>
              <select
                value={form.agentId}
                onChange={(e) => update("agentId", e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
              >
                <option value="">بدون إسناد الآن</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} {a.area ? `— ${a.area}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <TextField label="وصف المحتويات (اختياري)" value={form.description} onChange={(v) => update("description", v)} />
          </div>
        </section>

        {submitError && (
          <p className="flex items-center justify-center gap-1.5 text-center text-sm text-red-500">
            <AlertCircle className="h-4 w-4" />
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 py-3.5 text-sm font-bold text-white shadow-sm shadow-red-600/20 transition hover:bg-red-700 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "جارٍ إنشاء الشحنة..." : "إنشاء الشحنة"}
        </button>
      </form>

      {showAddCustomer && (
        <QuickAddCustomerModal
          onClose={() => setShowAddCustomer(false)}
          onCreated={(customer) => {
            setCustomers((prev) => [customer, ...prev]);
            setSelectedCustomer(customer);
            setShowAddCustomer(false);
          }}
        />
      )}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  onBlur,
  type = "text",
  dir,
  required,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  type?: string;
  dir?: "ltr" | "rtl";
  required?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-navy-900">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        dir={dir}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={`w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 ${
          error
            ? "border-red-500/60 focus:ring-red-500/20"
            : "border-gray-200 focus:border-navy-400 focus:ring-navy-100"
        }`}
      />
      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-400">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

function QuickAddCustomerModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (customer: Customer) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError("الاسم ورقم الهاتف مطلوبين");
      return;
    }

    setSaving(true);
    setError(null);

    const { customer, error: createError } = await createCustomer({
      fullName: name,
      phone,
    });

    setSaving(false);

    if (createError || !customer) {
      setError(createError ?? "تعذر إضافة العميل");
      return;
    }

    onCreated(customer);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-popover">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-navy-950">إضافة عميل سريع</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-3">
          <TextField label="الاسم" value={name} onChange={setName} required />
          <TextField label="رقم الهاتف" value={phone} onChange={setPhone} dir="ltr" required />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "جارٍ الحفظ..." : "حفظ العميل"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ===== إيصال الشحنة القابل للطباعة (Waybill) =====
function ShipmentWaybill({
  trackingNumber,
  customer,
  receiverName,
  receiverPhone,
  receiverAddress,
  receiverArea,
  value,
  collectionAmount,
  onCreateAnother,
  onGoToReports,
}: {
  trackingNumber: string;
  customer: Customer;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  receiverArea: string;
  value: string;
  collectionAmount: string;
  onCreateAnother: () => void;
  onGoToReports: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="flex flex-col items-center text-center print:hidden">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-100">
          <CheckCircle2 className="h-7 w-7 text-success-600" />
        </span>
        <h2 className="mt-4 font-display text-xl font-bold text-navy-950">
          تم إنشاء الشحنة بنجاح
        </h2>
      </div>

      {/* الإيصال نفسه - ده اللي بيتطبع */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-[var(--shadow-card)] print:border-2 print:border-black print:shadow-none">
        <div className="flex items-center justify-between border-b border-dashed border-gray-200 pb-4">
          <div>
            <p className="font-display text-lg font-extrabold text-navy-950">
              ALEX Service
            </p>
            <p className="text-xs text-gray-400">إيصال شحنة</p>
          </div>
          <div className="text-left">
            <p className="text-xs text-gray-400">رقم التتبع</p>
            <p className="font-display text-lg font-bold text-navy-950 tnum" dir="ltr">
              {trackingNumber}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-semibold text-gray-400">المرسل</p>
            <p className="mt-0.5 font-bold text-navy-950">
              {customer.full_name || customer.name}
            </p>
            <p className="text-gray-500" dir="ltr">
              {customer.phone}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400">المستلم</p>
            <p className="mt-0.5 font-bold text-navy-950">{receiverName}</p>
            <p className="text-gray-500" dir="ltr">
              {receiverPhone}
            </p>
          </div>
        </div>

        <div className="mt-4 border-t border-dashed border-gray-200 pt-4">
          <p className="text-xs font-semibold text-gray-400">عنوان التسليم</p>
          <p className="mt-0.5 text-sm text-navy-950">
            {receiverArea ? `${receiverArea} — ` : ""}
            {receiverAddress}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-dashed border-gray-200 pt-4 text-sm">
          <div>
            <p className="text-xs font-semibold text-gray-400">قيمة الشحنة</p>
            <p className="mt-0.5 font-bold text-navy-950 tnum">{value} ج.م</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400">مبلغ التحصيل</p>
            <p className="mt-0.5 font-bold text-red-600 tnum">
              {collectionAmount || 0} ج.م
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-center border-t border-dashed border-gray-200 pt-4">
          <div className="font-mono text-2xl tracking-widest text-navy-950">
            *{trackingNumber}*
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-center gap-3 print:hidden">
        <button
          onClick={onCreateAnother}
          className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold text-navy-800 transition hover:border-navy-300"
        >
          إنشاء شحنة أخرى
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold text-navy-800 transition hover:border-navy-300"
        >
          <Printer className="h-4 w-4" />
          طباعة الإيصال
        </button>
        <button
          onClick={onGoToReports}
          className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
        >
          الذهاب للتقارير
        </button>
      </div>
    </div>
  );
}