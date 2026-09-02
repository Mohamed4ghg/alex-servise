"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Mail, MapPin, Phone, User, UserRound } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function CustomerProfilePage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [email, setEmail] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    async function load() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setEmail(user.email ?? "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone, address")
        .eq("id", user.id)
        .single();

      if (profile) {
        setForm({
          fullName: profile.full_name ?? "",
          phone: profile.phone ?? "",
          address: profile.address ?? "",
        });
      }

      setLoading(false);
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setSuccess(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!form.fullName.trim() || !form.phone.trim()) {
      setError("الاسم ورقم الهاتف مطلوبين");
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("لازم تكون مسجل دخول");
      setSaving(false);
      return;
    }

    // حدّث بيانات البروفايل (المصدر الرئيسي للبيانات)
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: form.fullName.trim(),
        phone: form.phone.trim(),
        address: form.address.trim() || null,
      })
      .eq("id", user.id);

    if (profileError) {
      console.error("Update profile error:", profileError.message);
      setError("تعذر حفظ التعديلات، برجاء المحاولة مرة أخرى");
      setSaving(false);
      return;
    }

    // لو عنده سجل عميل مرتبط بالفعل (عمل شحنة قبل كده)، حدّث بياناته هناك كمان
    // عشان الشحنات الجاية تاخد الاسم/الهاتف المحدّث
    await supabase
      .from("customers")
      .update({
        full_name: form.fullName.trim(),
        name: form.fullName.trim(),
        phone: form.phone.trim(),
        address: form.address.trim() || null,
      })
      .eq("user_id", user.id);

    setSaving(false);
    setSuccess(true);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900">
          <UserRound className="h-5 w-5 text-white" />
        </span>
        <div>
          <h1 className="font-display text-xl font-bold text-navy-950">بيانات حسابي</h1>
          <p className="text-sm text-gray-500">عدّل بياناتك الشخصية</p>
        </div>
      </div>

      <form
        onSubmit={handleSave}
        className="mt-6 space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-[var(--shadow-card)]"
      >
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-navy-900">
            البريد الإلكتروني
          </label>
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5">
            <Mail className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              value={email}
              disabled
              dir="ltr"
              className="w-full bg-transparent text-sm text-gray-500"
            />
          </div>
          <p className="mt-1 text-xs text-gray-400">
            البريد الإلكتروني مرتبط بحسابك ومينفعش يتغيّر من هنا
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-navy-900">
            الاسم الكامل <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3.5 py-2.5 focus-within:border-navy-400 focus-within:ring-2 focus-within:ring-navy-100">
            <User className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              value={form.fullName}
              onChange={(e) => update("fullName", e.target.value)}
              className="w-full bg-transparent text-sm focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-navy-900">
            رقم الهاتف <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3.5 py-2.5 focus-within:border-navy-400 focus-within:ring-2 focus-within:ring-navy-100">
            <Phone className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              dir="ltr"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value.replace(/\D/g, "").slice(0, 11))}
              className="w-full bg-transparent text-sm focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-navy-900">
            العنوان (اختياري)
          </label>
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3.5 py-2.5 focus-within:border-navy-400 focus-within:ring-2 focus-within:ring-navy-100">
            <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              className="w-full bg-transparent text-sm focus:outline-none"
            />
          </div>
        </div>

        {error && (
          <p className="flex items-center gap-1.5 text-sm text-red-500">
            <AlertCircle className="h-4 w-4" /> {error}
          </p>
        )}
        {success && (
          <p className="flex items-center gap-1.5 text-sm text-success-600">
            <CheckCircle2 className="h-4 w-4" /> تم حفظ التعديلات بنجاح
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
        </button>
      </form>
    </div>
  );
}