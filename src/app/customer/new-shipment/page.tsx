"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Loader2,
  MapPin,
  Package,
  PackagePlus,
  Phone,
  User,
  Weight,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { createCustomer } from "@/utils/customers-helper";

// سعر ثابت مؤقت للشحنة الواحدة، لحد ما نظام حساب السعر حسب المنطقة يتفعّل
const FLAT_SHIPPING_FEE = 50;

type ShipmentType = "delivery" | "return" | "exchange";

export default function NewShipmentPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    receiverName: "",
    receiverPhone: "",
    receiverAddress: "",
    receiverArea: "",
    receiverNotes: "",
    type: "delivery" as ShipmentType,
    description: "",
    weightKg: "",
    piecesCount: "1",
    collectionAmount: "",
  });

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function generateTrackingNumber() {
    const random = Math.random().toString(36).slice(2, 7).toUpperCase();
    const time = Date.now().toString(36).toUpperCase();
    return `AS-${time}${random}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.receiverName.trim() || !form.receiverPhone.trim() || !form.receiverAddress.trim() || !form.receiverArea.trim()) {
      setError("برجاء ملء بيانات المستلم كاملة (الاسم، الهاتف، العنوان، المنطقة)");
      return;
    }

    setLoading(true);

    // هات المستخدم الحالي
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    if (!user) {
      setError("لازم تكون مسجل دخول عشان تعمل شحنة");
      setLoading(false);
      return;
    }

    // هات بروفايله عشان نستخدم بياناته كعميل (اسم/تليفون)
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user.id)
      .single();

    // اربط أو أنشئ سجل عميل مرتبط بالحساب ده (نفس الفانكشن اللي عندنا بالفعل)
    const { customer, error: customerError } = await createCustomer({
      fullName: profile?.full_name ?? "عميل",
      phone: profile?.phone ?? "",
    });

    if (customerError || !customer) {
      setError(customerError ?? "تعذر ربط حسابك كعميل، برجاء المحاولة مرة أخرى");
      setLoading(false);
      return;
    }

    // حاول تدور على مندوب متاح في نفس منطقة المستلم (توزيع تلقائي)
    const { data: assignedAgentId } = await supabase.rpc("assign_agent_for_area", {
      area_name: form.receiverArea.trim(),
    });

    const id = crypto.randomUUID();
    const trackingNumber = generateTrackingNumber();

    const { error: insertError } = await supabase.from("shipments").insert({
      id,
      tracking_number: trackingNumber,
      customer_id: customer.id,
      agent_id: assignedAgentId ?? null,
      receiver_name: form.receiverName.trim(),
      receiver_phone: form.receiverPhone.trim(),
      receiver_address: form.receiverAddress.trim(),
      receiver_area: form.receiverArea.trim(),
      receiver_notes: form.receiverNotes.trim() || null,
      type: form.type,
      description: form.description.trim() || null,
      weight_kg: form.weightKg ? Number(form.weightKg) : null,
      pieces_count: form.piecesCount ? Number(form.piecesCount) : 1,
      value: null,
      collection_amount: form.collectionAmount ? Number(form.collectionAmount) : FLAT_SHIPPING_FEE,
      // نحدد الحالة صراحة بدل الافتراضي 'new' اللي مش موجود في shipment_statuses
      status: assignedAgentId ? "assigned" : "pending",
      priority: "normal",
    });

    if (insertError) {
      console.error("Create shipment error:", insertError.message);
      setError("تعذر إنشاء الشحنة، برجاء المحاولة مرة أخرى");
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push(`/dashboard/customer/shipments/${id}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900">
          <PackagePlus className="h-5 w-5 text-white" />
        </span>
        <div>
          <h1 className="font-display text-xl font-bold text-navy-950">إنشاء شحنة جديدة</h1>
          <p className="text-sm text-gray-500">أدخل بيانات المستلم وتفاصيل الشحنة</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-[var(--shadow-card)]">
        <h2 className="text-sm font-bold text-navy-950">بيانات المستلم</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="اسم المستلم"
            icon={User}
            value={form.receiverName}
            onChange={(v) => update("receiverName", v)}
            required
          />
          <TextField
            label="رقم هاتف المستلم"
            icon={Phone}
            dir="ltr"
            value={form.receiverPhone}
            onChange={(v) => update("receiverPhone", v.replace(/\D/g, "").slice(0, 11))}
            required
          />
        </div>

        <TextField
          label="عنوان المستلم"
          icon={MapPin}
          value={form.receiverAddress}
          onChange={(v) => update("receiverAddress", v)}
          required
        />

        <TextField
          label="المنطقة"
          icon={MapPin}
          value={form.receiverArea}
          onChange={(v) => update("receiverArea", v)}
          placeholder="مثال: سموحة، الإسكندرية"
          required
        />

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-navy-900">
            ملاحظات للمندوب (اختياري)
          </label>
          <textarea
            value={form.receiverNotes}
            onChange={(e) => update("receiverNotes", e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
          />
        </div>

        <hr className="border-gray-100" />

        <h2 className="text-sm font-bold text-navy-950">تفاصيل الشحنة</h2>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-navy-900">نوع الشحنة</label>
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-gray-50 p-1">
            {(
              [
                { key: "delivery", label: "توصيل" },
                { key: "return", label: "مرتجع" },
                { key: "exchange", label: "استبدال" },
              ] as { key: ShipmentType; label: string }[]
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => update("type", t.key)}
                className={`rounded-md py-2 text-sm font-bold transition ${
                  form.type === t.key ? "bg-white text-navy-950 shadow-sm" : "text-gray-500"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-navy-900">
            وصف المحتوى (اختياري)
          </label>
          <input
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="مثال: ملابس، إلكترونيات..."
            className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="الوزن (كجم)"
            icon={Weight}
            type="number"
            value={form.weightKg}
            onChange={(v) => update("weightKg", v)}
          />
          <TextField
            label="عدد القطع"
            icon={Package}
            type="number"
            value={form.piecesCount}
            onChange={(v) => update("piecesCount", v)}
          />
        </div>

        <TextField
          label="مبلغ التحصيل عند الاستلام (اختياري)"
          value={form.collectionAmount}
          type="number"
          onChange={(v) => update("collectionAmount", v)}
          placeholder={`افتراضي: ${FLAT_SHIPPING_FEE} جنيه (رسوم الشحن)`}
        />

        {error && (
          <p className="flex items-center gap-1.5 text-sm text-red-500">
            <AlertCircle className="h-4 w-4" /> {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "جارٍ إنشاء الشحنة..." : "إنشاء الشحنة"}
        </button>
      </form>
    </div>
  );
}

function TextField({
  label,
  icon: Icon,
  type = "text",
  dir,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  icon?: React.ElementType;
  type?: string;
  dir?: "ltr" | "rtl";
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-navy-900">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3.5 py-2.5 focus-within:border-navy-400 focus-within:ring-2 focus-within:ring-navy-100">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-gray-400" />}
        <input
          type={type}
          dir={dir}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm focus:outline-none"
        />
      </div>
    </div>
  );
}