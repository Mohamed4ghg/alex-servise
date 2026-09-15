"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Loader2,
  MapPin,
  PackagePlus,
  Phone,
  User,
  DollarSign,
  FileText,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { createCustomer } from "@/utils/customers-helper";
import BulkImportShipments from "@/components/shipments/BulkImportShipments";

export default function NewShipmentPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // بيانات العميل الحالي (لازمة عشان نبعتها للفورم العادي ولمكون الرفع الجماعي)
  const [customer, setCustomer] = useState<{ id: string } | null>(null);
  const [customerLoading, setCustomerLoading] = useState(true);

  const [form, setForm] = useState({
    receiverName: "",
    receiverPhone: "",
    receiverAddress: "",
    receiverArea: "",
    description: "",
    collectionAmount: "",
  });

  // نجيب/نربط العميل مرة واحدة لما الصفحة تفتح، عشان يبقى متاح لمكون الرفع الجماعي كمان
  useEffect(() => {
    (async () => {
      setCustomerLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (!user) {
        setCustomerLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .single();

      const { customer: c } = await createCustomer({
        fullName: profile?.full_name ?? "عميل",
        phone: profile?.phone ?? "",
      });

      if (c) setCustomer(c);
      setCustomerLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    // بيانات المستلم الأساسية
    if (
      !form.receiverName.trim() ||
      !form.receiverPhone.trim() ||
      !form.receiverAddress.trim() ||
      !form.receiverArea.trim()
    ) {
      setError("برجاء ملء بيانات المستلم كاملة (الاسم، الهاتف، العنوان، المدينة)");
      return;
    }

    // رقم هاتف مصري لازم يكون 11 رقم
    if (form.receiverPhone.trim().length !== 11) {
      setError("رقم هاتف المستلم لازم يكون 11 رقم");
      return;
    }

    // نوع البضاعة إلزامي — زي عمود "نوع البضاعة" في الشيت
    if (!form.description.trim()) {
      setError("برجاء كتابة نوع البضاعة");
      return;
    }

    // مبلغ التحصيل (COD) إلزامي — زي عمود COD في الشيت
    if (!form.collectionAmount.trim() || Number(form.collectionAmount) < 0) {
      setError("برجاء إدخال مبلغ التحصيل (COD)");
      return;
    }

    if (!customer) {
      setError("تعذر ربط حسابك كعميل، برجاء تحديث الصفحة والمحاولة مرة أخرى");
      return;
    }

    setLoading(true);

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
      description: form.description.trim(),
      collection_amount: Number(form.collectionAmount),
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

      {/* رفع أكتر من شحنة دفعة واحدة من Excel */}
      {!customerLoading && customer && (
        <div className="mt-6">
          <BulkImportShipments customerId={customer.id} />
        </div>
      )}

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
          label="المدينة"
          icon={MapPin}
          value={form.receiverArea}
          onChange={(v) => update("receiverArea", v)}
          placeholder="مثال: الإسكندرية"
          required
        />

        <hr className="border-gray-100" />

        <h2 className="text-sm font-bold text-navy-950">تفاصيل الشحنة</h2>

        <TextField
          label="نوع البضاعة"
          icon={FileText}
          value={form.description}
          onChange={(v) => update("description", v)}
          placeholder="مثال: Notebook, EXPEDITION..."
          required
        />

        <TextField
          label="مبلغ التحصيل (COD)"
          icon={DollarSign}
          type="number"
          value={form.collectionAmount}
          onChange={(v) => update("collectionAmount", v)}
          required
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