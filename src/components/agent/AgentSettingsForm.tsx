"use client";

import { useState } from "react";
import { Loader2, Check, Mail } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type FormData = {
  full_name: string;
  phone: string;
  address: string;
  email: string;
  vehicle_type: string;
  region: string;
  notify_email: boolean;
  notify_sms: boolean;
};

export function AgentSettingsForm({ initialData }: { initialData: FormData }) {
  const supabase = createClient();
  const [form, setForm] = useState<FormData>(initialData);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [emailInput, setEmailInput] = useState(initialData.email);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("انتهت الجلسة، سجّل دخولك تاني");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        phone: form.phone,
        address: form.address,
        vehicle_type: form.vehicle_type,
        region: form.region,
        notify_email: form.notify_email,
        notify_sms: form.notify_sms,
      })
      .eq("id", user.id);

    setSaving(false);

    if (updateError) {
      setError("حصل خطأ أثناء الحفظ، حاول تاني");
      return;
    }

    setSaved(true);
  }

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setEmailSaving(true);
    setEmailError(null);
    setEmailMessage(null);

    if (emailInput === initialData.email) {
      setEmailSaving(false);
      return;
    }

    const { error: authError } = await supabase.auth.updateUser({
      email: emailInput,
    });

    setEmailSaving(false);

    if (authError) {
      setEmailError(authError.message || "حصل خطأ، حاول تاني");
      return;
    }

    setEmailMessage(
      "بعتنالك لينك تأكيد على الإيميل الجديد — لازم تضغط عليه عشان التغيير يتفعّل."
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <legend className="px-2 text-sm font-bold text-navy-950">
            البيانات الشخصية
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="الاسم الكامل"
              value={form.full_name}
              onChange={(v) => update("full_name", v)}
            />
            <Field
              label="رقم التليفون"
              value={form.phone}
              onChange={(v) => update("phone", v)}
              type="tel"
            />
            <Field
              label="المنطقة"
              value={form.region}
              onChange={(v) => update("region", v)}
            />
            <Field
              label="العنوان"
              value={form.address}
              onChange={(v) => update("address", v)}
              className="sm:col-span-2"
            />
            <Field
              label="نوع المركبة"
              value={form.vehicle_type}
              onChange={(v) => update("vehicle_type", v)}
              placeholder="موتوسيكل، تكتك، عربية..."
            />
          </div>
        </fieldset>

        <fieldset className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <legend className="px-2 text-sm font-bold text-navy-950">
            الإشعارات
          </legend>
          <div className="space-y-3">
            <ToggleRow
              label="إشعارات البريد الإلكتروني"
              checked={form.notify_email}
              onChange={(v) => update("notify_email", v)}
            />
            <ToggleRow
              label="إشعارات الرسائل النصية (SMS)"
              checked={form.notify_sms}
              onChange={(v) => update("notify_sms", v)}
            />
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-navy-950 py-3.5 text-sm font-bold text-white transition hover:bg-navy-900 disabled:opacity-60 sm:w-auto sm:px-8"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saved && !saving && <Check className="h-4 w-4" />}
          {saving ? "جاري الحفظ..." : saved ? "تم الحفظ" : "حفظ التغييرات"}
        </button>
      </form>

      <fieldset className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <legend className="flex items-center gap-2 px-2 text-sm font-bold text-navy-950">
          <Mail className="h-4 w-4" />
          البريد الإلكتروني
        </legend>

        {emailMessage && (
          <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {emailMessage}
          </div>
        )}
        {emailError && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {emailError}
          </div>
        )}

        <form
          onSubmit={handleEmailChange}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-600">
              الإيميل الحالي
            </label>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-navy-950 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={emailSaving || emailInput === initialData.email}
            className="rounded-full bg-red-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {emailSaving ? "جاري الإرسال..." : "تغيير الإيميل"}
          </button>
        </form>
        <p className="mt-2 text-xs text-gray-400">
          هيتبعتلك لينك تأكيد على الإيميل الجديد قبل ما التغيير يتفعّل فعليًا.
        </p>
      </fieldset>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <label className="text-sm font-medium text-gray-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-navy-950 focus:outline-none"
      />
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <span className="relative inline-flex h-6 w-11 items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="absolute inset-0 rounded-full bg-gray-200 transition peer-checked:bg-navy-950" />
        <span className="absolute h-4 w-4 translate-x-1 rounded-full bg-white transition peer-checked:translate-x-6" />
      </span>
    </label>
  );
}