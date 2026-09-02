"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Settings,
  Trash2,
  User,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { deleteMyAccount } from "./actions";

export default function CustomerSettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [currentEmail, setCurrentEmail] = useState("");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900">
          <Settings className="h-5 w-5 text-white" />
        </span>
        <div>
          <h1 className="font-display text-xl font-bold text-navy-950">الإعدادات</h1>
          <p className="text-sm text-gray-500">إدارة بياناتك وحسابك</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <PersonalInfoSection supabase={supabase} onEmailLoaded={setCurrentEmail} />
        <ChangePasswordSection supabase={supabase} currentEmail={currentEmail} />
        <ChangeEmailSection supabase={supabase} currentEmail={currentEmail} />
        <NotificationPrefsSection supabase={supabase} />
        <DangerZoneSection router={router} supabase={supabase} />
      </div>
    </div>
  );
}

// ===================== بيانات شخصية =====================
function PersonalInfoSection({
  supabase,
  onEmailLoaded,
}: {
  supabase: ReturnType<typeof createClient>;
  onEmailLoaded: (email: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ fullName: "", phone: "", address: "" });

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      onEmailLoaded(user.email ?? "");

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
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: form.fullName.trim(),
        phone: form.phone.trim(),
        address: form.address.trim() || null,
      })
      .eq("id", user.id);

    if (updateError) {
      setError("تعذر حفظ التعديلات");
      setSaving(false);
      return;
    }

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

  return (
    <Section icon={User} title="البيانات الشخصية">
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      ) : (
        <form onSubmit={handleSave} className="space-y-3">
          <LabeledInput
            label="الاسم الكامل"
            icon={User}
            value={form.fullName}
            onChange={(v) => setForm((f) => ({ ...f, fullName: v }))}
          />
          <LabeledInput
            label="رقم الهاتف"
            icon={Phone}
            dir="ltr"
            value={form.phone}
            onChange={(v) => setForm((f) => ({ ...f, phone: v.replace(/\D/g, "").slice(0, 11) }))}
          />
          <LabeledInput
            label="العنوان (اختياري)"
            icon={MapPin}
            value={form.address}
            onChange={(v) => setForm((f) => ({ ...f, address: v }))}
          />
          <FormFooter error={error} success={success ? "تم الحفظ بنجاح" : null} saving={saving} label="حفظ" />
        </form>
      )}
    </Section>
  );
}

// ===================== تغيير كلمة المرور =====================
function ChangePasswordSection({
  supabase,
  currentEmail,
}: {
  supabase: ReturnType<typeof createClient>;
  currentEmail: string;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < 8) {
      setError("كلمة المرور الجديدة لازم تكون 8 أحرف على الأقل");
      return;
    }

    setSaving(true);

    // نتأكد من كلمة المرور الحالية الأول عن طريق إعادة تسجيل الدخول (أمان إضافي)
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: currentEmail,
      password: currentPassword,
    });

    if (reauthError) {
      setError("كلمة المرور الحالية غير صحيحة");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    setSaving(false);
    if (updateError) {
      setError("تعذر تغيير كلمة المرور");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setSuccess(true);
  }

  return (
    <Section icon={Lock} title="تغيير كلمة المرور">
      <form onSubmit={handleSubmit} className="space-y-3">
        <LabeledInput
          label="كلمة المرور الحالية"
          type="password"
          dir="ltr"
          value={currentPassword}
          onChange={setCurrentPassword}
        />
        <LabeledInput
          label="كلمة المرور الجديدة"
          type="password"
          dir="ltr"
          value={newPassword}
          onChange={setNewPassword}
          placeholder="8 أحرف على الأقل"
        />
        <FormFooter error={error} success={success ? "تم تغيير كلمة المرور" : null} saving={saving} label="تغيير كلمة المرور" />
      </form>
    </Section>
  );
}

// ===================== تغيير البريد الإلكتروني =====================
function ChangeEmailSection({
  supabase,
  currentEmail,
}: {
  supabase: ReturnType<typeof createClient>;
  currentEmail: string;
}) {
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);

    const { error: updateError } = await supabase.auth.updateUser({ email: newEmail.trim() });

    setSaving(false);
    if (updateError) {
      setError("تعذر تغيير البريد الإلكتروني");
      return;
    }

    setSuccess(true);
  }

  return (
    <Section icon={Mail} title="البريد الإلكتروني">
      <p className="mb-3 text-xs text-gray-400">
        البريد الحالي: <span dir="ltr">{currentEmail}</span>
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <LabeledInput
          label="البريد الإلكتروني الجديد"
          icon={Mail}
          type="email"
          dir="ltr"
          value={newEmail}
          onChange={setNewEmail}
        />
        <FormFooter
          error={error}
          success={success ? "بعتنالك رابط تأكيد على البريد الجديد، افتحه عشان التغيير يتفعّل" : null}
          saving={saving}
          label="تغيير البريد"
        />
      </form>
    </Section>
  );
}

// ===================== تفضيلات الإشعارات =====================
function NotificationPrefsSection({ supabase }: { supabase: ReturnType<typeof createClient> }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySms, setNotifySms] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("notify_email, notify_sms")
        .eq("id", user.id)
        .single();

      if (data) {
        setNotifyEmail(data.notify_email ?? true);
        setNotifySms(data.notify_sms ?? false);
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    setSaving(true);
    setSuccess(false);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    await supabase
      .from("profiles")
      .update({ notify_email: notifyEmail, notify_sms: notifySms })
      .eq("id", user.id);

    setSaving(false);
    setSuccess(true);
  }

  return (
    <Section icon={Bell} title="تفضيلات الإشعارات">
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      ) : (
        <div className="space-y-3">
          <ToggleRow
            label="إشعارات عبر البريد الإلكتروني"
            checked={notifyEmail}
            onChange={setNotifyEmail}
          />
          <ToggleRow label="إشعارات عبر الرسائل النصية" checked={notifySms} onChange={setNotifySms} />

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-2 flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-sm font-bold text-white hover:bg-navy-800 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            حفظ التفضيلات
          </button>
          {success && (
            <p className="flex items-center gap-1.5 text-xs text-success-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> تم الحفظ
            </p>
          )}
        </div>
      )}
    </Section>
  );
}

// ===================== منطقة الخطر: حذف الحساب =====================
function DangerZoneSection({
  router,
  supabase,
}: {
  router: ReturnType<typeof useRouter>;
  supabase: ReturnType<typeof createClient>;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleDelete() {
    if (confirmText !== "حذف حسابي") {
      setError('اكتب "حذف حسابي" بالظبط عشان تأكد الحذف');
      return;
    }

    setError(null);
    setDeleting(true);

    const result = await deleteMyAccount();

    if (!result.success) {
      setError(result.error ?? "حصل خطأ غير متوقع");
      setDeleting(false);
      return;
    }

    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div className="rounded-2xl border border-red-100 bg-red-50/50 p-5">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <h3 className="text-sm font-bold text-red-600">منطقة الخطر</h3>
      </div>
      <p className="mt-2 text-xs leading-5 text-red-500/80">
        حذف حسابك نهائي ومش هينفع يترجع. بياناتك الشخصية هتتمسح، لكن سجل شحناتك القديمة هيفضل محفوظ لأغراض المحاسبة.
      </p>

      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="mt-4 flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          حذف حسابي
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-semibold text-red-600">
            اكتب "حذف حسابي" في الخانة دي للتأكيد:
          </p>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-100"
          />
          {error && (
            <p className="flex items-center gap-1.5 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5" /> {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              تأكيد الحذف النهائي
            </button>
            <button
              onClick={() => {
                setShowConfirm(false);
                setConfirmText("");
                setError(null);
              }}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== مكونات مساعدة =====================
function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[var(--shadow-card)]">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-navy-950">
        <Icon className="h-4 w-4" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function LabeledInput({
  label,
  icon: Icon,
  type = "text",
  dir,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  icon?: React.ElementType;
  type?: string;
  dir?: "ltr" | "rtl";
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-gray-600">{label}</label>
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 focus-within:border-navy-400 focus-within:ring-2 focus-within:ring-navy-100">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-gray-400" />}
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
    <label className="flex cursor-pointer items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
      <span className="text-sm text-navy-900">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
      />
    </label>
  );
}

function FormFooter({
  error,
  success,
  saving,
  label,
}: {
  error: string | null;
  success: string | null;
  saving: boolean;
  label: string;
}) {
  return (
    <>
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-500">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}
      {success && (
        <p className="flex items-center gap-1.5 text-xs text-success-600">
          <CheckCircle2 className="h-3.5 w-3.5" /> {success}
        </p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-sm font-bold text-white hover:bg-navy-800 disabled:opacity-50"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {label}
      </button>
    </>
  );
}