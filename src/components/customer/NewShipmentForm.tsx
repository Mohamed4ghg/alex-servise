// src/components/customer/NewShipmentForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function NewShipmentForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    const payload = {
      receiver_name: formData.get("receiver_name"),
      receiver_phone: formData.get("receiver_phone"),
      receiver_address: formData.get("receiver_address"),
      receiver_area: formData.get("receiver_area"),
      receiver_notes: formData.get("receiver_notes"),
      type: formData.get("type"),
      description: formData.get("description"),
      weight_kg: formData.get("weight_kg")
        ? Number(formData.get("weight_kg"))
        : null,
      pieces_count: formData.get("pieces_count")
        ? Number(formData.get("pieces_count"))
        : null,
      value: formData.get("value") ? Number(formData.get("value")) : null,
      priority: formData.get("priority"),
      expected_delivery_date: formData.get("expected_delivery_date") || null,
    };

    try {
      const res = await fetch("/api/customer/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "حصل خطأ، حاول تاني");
        setLoading(false);
        return;
      }

      router.push(`/customer/shipments/${result.shipment.id}`);
      router.refresh();
    } catch {
      setError("حصل خطأ في الاتصال، حاول تاني");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </div>
      )}

      <fieldset className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <legend className="px-2 text-sm font-bold text-navy-950">
          بيانات المستلم
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="اسم المستلم *" name="receiver_name" required />
          <Field label="رقم تليفون المستلم *" name="receiver_phone" required type="tel" />
          <Field label="المنطقة" name="receiver_area" />
          <Field label="العنوان بالتفصيل *" name="receiver_address" required className="sm:col-span-2" />
          <Field label="ملاحظات للمندوب" name="receiver_notes" className="sm:col-span-2" />
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <legend className="px-2 text-sm font-bold text-navy-950">
          تفاصيل الشحنة
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="نوع الشحنة" name="type" placeholder="مثال: ملابس، إلكترونيات" />
          <Field label="وصف المحتوى" name="description" />
          <Field label="الوزن (كجم)" name="weight_kg" type="number" step="0.1" />
          <Field label="عدد القطع" name="pieces_count" type="number" />
          <Field label="قيمة الشحنة (ج.م)" name="value" type="number" step="0.01" />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-600">الأولوية</label>
            <select
              name="priority"
              defaultValue="normal"
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-navy-950 focus:outline-none"
            >
              <option value="normal">عادي</option>
              <option value="urgent">مستعجل</option>
            </select>
          </div>
          <Field
            label="تاريخ التسليم المتوقع"
            name="expected_delivery_date"
            type="date"
          />
        </div>
      </fieldset>

      <p className="text-xs text-gray-400">
        * السعر ورسوم التحصيل هيتحددوا بعد مراجعة الطلب من فريقنا.
      </p>

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-red-600 py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_-10px_rgba(220,38,38,0.6)] transition hover:bg-red-700 disabled:opacity-60"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? "جاري الإرسال..." : "إرسال طلب الشحنة"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  step,
  className,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  step?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <label className="text-sm font-medium text-gray-600">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        step={step}
        className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-navy-950 focus:outline-none"
      />
    </div>
  );
}