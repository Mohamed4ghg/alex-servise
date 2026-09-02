"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Bell,
  Building2,
  CheckCircle2,
  Loader2,
  Lock,
  MapPin,
  Plus,
  Save,
  Settings,
  ShieldCheck,
  Trash2,
  Truck,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { logActivity } from "@/utils/log-activity";

type TabKey = "company" | "areas" | "statuses" | "notifications";

const tabs: { key: TabKey; label: string; icon: typeof Building2 }[] = [
  { key: "company", label: "بيانات الشركة", icon: Building2 },
  { key: "areas", label: "المناطق", icon: MapPin },
  { key: "statuses", label: "حالات الشحنات", icon: Truck },
  { key: "notifications", label: "الإشعارات", icon: Bell },
];

// ============================================================
// اسم الشركة الثابت — لا يمكن تعديله من واجهة الإعدادات إطلاقاً
// أي محاولة حفظ يتم فيها فرض هذه القيمة دائماً بغض النظر عن أي إدخال آخر
// ============================================================
const FIXED_COMPANY_NAME = "Alex Service";

// قيم افتراضية احترافية تُستخدم أول مرة فقط (لو الصف لسه مش موجود في قاعدة البيانات)
const DEFAULT_COMPANY_SETTINGS = {
  logo_url: "",
  phone: "+20 100 000 0000",
  email: "info@alexservice.com",
  address: "الإسكندرية، جمهورية مصر العربية",
  tax_number: "000-000-000",
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("company");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900">
          <Settings className="h-5 w-5 text-white" />
        </span>
        <div>
          <h1 className="font-display text-xl font-bold text-navy-950">
            الإعدادات
          </h1>
          <p className="text-sm text-gray-500">
            بيانات الشركة، المناطق، حالات الشحنات، وإعدادات الإشعارات والتحصيل والتتبع.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-gray-100">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                isActive
                  ? "border-red-600 text-navy-950"
                  : "border-transparent text-gray-500 hover:text-navy-800"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === "company" && <CompanySettingsTab />}
        {activeTab === "areas" && <AreasSettingsTab />}
        {activeTab === "statuses" && <StatusesSettingsTab />}
        {activeTab === "notifications" && <NotificationsSettingsTab />}
      </div>
    </div>
  );
}

// ============================================================
// تاب بيانات الشركة
// ============================================================

type CompanySettings = {
  id: string;
  company_name: string | null;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  tax_number: string | null;
  updated_at: string;
};

function CompanySettingsTab() {
  const supabase = createClient();

  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [logoUrl, setLogoUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [taxNumber, setTaxNumber] = useState("");

  async function fetchSettings() {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("company_settings")
      .select("id, company_name, logo_url, phone, email, address, tax_number, updated_at")
      .eq("id", "main")
      .maybeSingle();

    if (fetchError) {
      setError("تعذر تحميل بيانات الشركة، برجاء المحاولة مرة أخرى");
      console.error("Company settings fetch error:", fetchError.message);
      setLoading(false);
      return;
    }

    if (data) {
      setSettings(data);
      setLogoUrl(data.logo_url ?? "");
      setPhone(data.phone ?? DEFAULT_COMPANY_SETTINGS.phone);
      setEmail(data.email ?? DEFAULT_COMPANY_SETTINGS.email);
      setAddress(data.address ?? DEFAULT_COMPANY_SETTINGS.address);
      setTaxNumber(data.tax_number ?? DEFAULT_COMPANY_SETTINGS.tax_number);
    } else {
      // لا يوجد صف بعد — نعرض القيم الافتراضية على أن أول حفظ ينشئها في القاعدة
      setPhone(DEFAULT_COMPANY_SETTINGS.phone);
      setEmail(DEFAULT_COMPANY_SETTINGS.email);
      setAddress(DEFAULT_COMPANY_SETTINGS.address);
      setTaxNumber(DEFAULT_COMPANY_SETTINGS.tax_number);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);

    const { error: upsertError } = await supabase.from("company_settings").upsert({
      id: "main",
      // اسم الشركة مفروض دائماً ولا يعتمد على أي إدخال من المستخدم
      company_name: FIXED_COMPANY_NAME,
      logo_url: logoUrl.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      tax_number: taxNumber.trim() || null,
      updated_at: new Date().toISOString(),
    });

    if (upsertError) {
      setError("تعذر حفظ البيانات، برجاء المحاولة مرة أخرى");
      console.error("Company settings save error:", upsertError.message);
      setSaving(false);
      return;
    }

    await logActivity({
      action: "عدّل بيانات الشركة",
      entityType: "company_settings",
      entityId: "main",
      entityLabel: FIXED_COMPANY_NAME,
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return <TabLoading text="جاري تحميل بيانات الشركة..." />;

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Letterhead / brand header — enterprise style */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
        <div className="relative bg-gradient-to-l from-navy-950 via-navy-900 to-navy-950 px-6 py-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-white/20 bg-white shadow-lg">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={FIXED_COMPANY_NAME} className="h-full w-full object-contain p-1.5" />
              ) : (
                <Building2 className="h-8 w-8 text-navy-900" />
              )}
            </div>
            <div className="flex-1 text-center sm:text-right">
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                <h2 className="font-display text-lg font-bold text-white">{FIXED_COMPANY_NAME}</h2>
                <span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/80">
                  <ShieldCheck className="h-3 w-3" />
                  حساب موثّق
                </span>
              </div>
              <p className="mt-1 text-xs text-white/50">
                الاسم التجاري ثابت على مستوى النظام ولا يمكن تعديله من هذه الشاشة
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-navy-900">
            اسم الشركة
            <Lock className="h-3.5 w-3.5 text-gray-400" />
          </label>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3.5 py-2.5">
            <span className="text-sm font-semibold text-navy-950">{FIXED_COMPANY_NAME}</span>
            <span className="text-xs font-medium text-gray-400">مقفول</span>
          </div>
          <p className="mt-1.5 text-xs text-gray-400">
            لتغيير الاسم التجاري تواصل مع الدعم الفني.
          </p>
        </div>
      </div>

      {/* Contact & legal details */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
        <h3 className="text-sm font-bold text-navy-950">بيانات التواصل والسجل الضريبي</h3>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-semibold text-navy-900">رابط اللوجو</label>
            <input
              dir="ltr"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-navy-900">رقم الهاتف</label>
            <input
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-navy-900">البريد الإلكتروني</label>
            <input
              dir="ltr"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-semibold text-navy-900">العنوان</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-navy-900">الرقم الضريبي / السجل التجاري</label>
            <input
              dir="ltr"
              value={taxNumber}
              onChange={(e) => setTaxNumber(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
            />
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

        <SaveBar saving={saving} saved={saved} updatedAt={settings?.updated_at} />
      </div>
    </form>
  );
}

// ============================================================
// تاب المناطق — إدارة كاملة (إضافة / تفعيل / حذف)
// ============================================================

type DeliveryArea = {
  id: string;
  name: string;
  delivery_fee: number;
  is_active: boolean;
};

function AreasSettingsTab() {
  const supabase = createClient();
  const [areas, setAreas] = useState<DeliveryArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newFee, setNewFee] = useState("0");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  async function fetchAreas() {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("delivery_areas")
      .select("id, name, delivery_fee, is_active")
      .order("name");

    if (fetchError) {
      setError("تعذر تحميل المناطق");
      console.error("Areas fetch error:", fetchError.message);
      setLoading(false);
      return;
    }
    setAreas(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchAreas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);

    if (!newName.trim()) {
      setAddError("اسم المنطقة مطلوب");
      return;
    }

    setAdding(true);
    const { data, error: insertError } = await supabase
      .from("delivery_areas")
      .insert({ name: newName.trim(), delivery_fee: Number(newFee) || 0 })
      .select()
      .single();

    if (insertError) {
      setAddError(
        insertError.message.includes("duplicate")
          ? "المنطقة دي مضافة بالفعل"
          : "تعذر إضافة المنطقة"
      );
      setAdding(false);
      return;
    }

    setAreas((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    await logActivity({ action: "أضاف منطقة توصيل جديدة", entityType: "delivery_area", entityId: data.id, entityLabel: data.name });
    setNewName("");
    setNewFee("0");
    setAdding(false);
  }

  async function toggleActive(area: DeliveryArea) {
    setAreas((prev) => prev.map((a) => (a.id === area.id ? { ...a, is_active: !a.is_active } : a)));
    await supabase.from("delivery_areas").update({ is_active: !area.is_active }).eq("id", area.id);
  }

  async function handleDelete(area: DeliveryArea) {
    if (!window.confirm(`هل تريد حذف منطقة "${area.name}"؟`)) return;
    setAreas((prev) => prev.filter((a) => a.id !== area.id));
    await supabase.from("delivery_areas").delete().eq("id", area.id);
    await logActivity({ action: "حذف منطقة توصيل", entityType: "delivery_area", entityId: area.id, entityLabel: area.name });
  }

  if (loading) return <TabLoading text="جاري تحميل المناطق..." />;

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleAdd}
        className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-card sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="mb-1.5 block text-sm font-semibold text-navy-900">اسم المنطقة</label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="مثال: مدينة نصر"
            className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
          />
        </div>
        <div className="w-full sm:w-40">
          <label className="mb-1.5 block text-sm font-semibold text-navy-900">رسوم التوصيل</label>
          <input
            type="number"
            value={newFee}
            onChange={(e) => setNewFee(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
          />
        </div>
        <button
          type="submit"
          disabled={adding}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
        >
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          إضافة
        </button>
      </form>
      {addError && <p className="text-sm text-red-500">{addError}</p>}

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
        {error ? (
          <p className="px-5 py-10 text-center text-sm text-red-500">{error}</p>
        ) : areas.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-gray-400">لا توجد مناطق مضافة بعد</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {areas.map((a) => (
              <li key={a.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className={`h-2 w-2 rounded-full ${a.is_active ? "bg-success-600" : "bg-gray-300"}`} />
                  <span className="font-semibold text-navy-950">{a.name}</span>
                  <span className="text-xs text-gray-400 tnum">{a.delivery_fee} ج.م</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleActive(a)}
                    className="text-xs font-semibold text-navy-700 hover:text-red-600"
                  >
                    {a.is_active ? "إيقاف" : "تفعيل"}
                  </button>
                  <button onClick={() => handleDelete(a)} className="text-gray-400 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ============================================================
// تاب حالات الشحنات — تخصيص التسمية واللون (عرض فقط للقيم الفعلية)
// ============================================================

type ShipmentStatusRow = {
  id: string;
  key: string;
  label: string;
  color: string;
  is_active: boolean;
};

const COLOR_OPTIONS = [
  { value: "gray", className: "bg-gray-400" },
  { value: "info", className: "bg-info-600" },
  { value: "warning", className: "bg-warning-600" },
  { value: "success", className: "bg-success-600" },
  { value: "red", className: "bg-red-600" },
];

function StatusesSettingsTab() {
  const supabase = createClient();
  const [statuses, setStatuses] = useState<ShipmentStatusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function fetchStatuses() {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("shipment_statuses")
      .select("id, key, label, color, is_active")
      .order("sort_order");

    if (fetchError) {
      setError("تعذر تحميل حالات الشحنات");
      console.error("Statuses fetch error:", fetchError.message);
      setLoading(false);
      return;
    }
    setStatuses(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateLabel(row: ShipmentStatusRow, label: string) {
    setStatuses((prev) => prev.map((s) => (s.id === row.id ? { ...s, label } : s)));
  }

  async function saveRow(row: ShipmentStatusRow) {
    setSavingId(row.id);
    await supabase
      .from("shipment_statuses")
      .update({ label: row.label, color: row.color })
      .eq("id", row.id);
    await logActivity({ action: "عدّل حالة شحنة", entityType: "shipment_status", entityId: row.id, entityLabel: row.label });
    setSavingId(null);
  }

  async function updateColor(row: ShipmentStatusRow, color: string) {
    const updated = { ...row, color };
    setStatuses((prev) => prev.map((s) => (s.id === row.id ? updated : s)));
    await supabase.from("shipment_statuses").update({ color }).eq("id", row.id);
  }

  if (loading) return <TabLoading text="جاري تحميل حالات الشحنات..." />;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-lg bg-navy-50 px-4 py-3 text-xs leading-6 text-gray-600">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-navy-400" />
        دي أسماء وألوان الحالات المعروضة فقط. مفاتيح الحالة (key) مربوطة مباشرة
        بعمود <code dir="ltr">status</code> في جدول الشحنات ولا يمكن تغييرها من هنا.
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
        {error ? (
          <p className="px-5 py-10 text-center text-sm text-red-500">{error}</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {statuses.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <code className="w-28 shrink-0 text-xs text-gray-400" dir="ltr">
                  {s.key}
                </code>
                <input
                  value={s.label}
                  onChange={(e) => updateLabel(s, e.target.value)}
                  onBlur={() => saveRow(s)}
                  className="min-w-[140px] flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
                />
                <div className="flex items-center gap-1.5">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => updateColor(s, c.value)}
                      className={`h-6 w-6 rounded-full ${c.className} ${
                        s.color === c.value ? "ring-2 ring-offset-2 ring-navy-400" : ""
                      }`}
                    />
                  ))}
                </div>
                {savingId === s.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ============================================================
// تاب الإشعارات والتحصيل والتتبع
// ============================================================

type AppSettings = {
  notify_customer_on_status_change: boolean;
  notify_agent_on_assignment: boolean;
  notify_admin_on_new_shipment: boolean;
  max_agent_cash_limit: number;
  location_update_interval_seconds: number;
  updated_at: string;
};

function NotificationsSettingsTab() {
  const supabase = createClient();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function fetchSettings() {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("app_settings")
      .select("*")
      .eq("id", "main")
      .maybeSingle();

    if (fetchError) {
      setError("تعذر تحميل الإعدادات");
      console.error("App settings fetch error:", fetchError.message);
      setLoading(false);
      return;
    }
    setSettings(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setSaved(false);

    const { error: updateError } = await supabase
      .from("app_settings")
      .update({ ...settings, updated_at: new Date().toISOString() })
      .eq("id", "main");

    if (updateError) {
      setError("تعذر حفظ الإعدادات");
      setSaving(false);
      return;
    }

    await logActivity({ action: "عدّل إعدادات الإشعارات والتحصيل والتتبع", entityType: "app_settings", entityId: "main", entityLabel: "الإعدادات العامة" });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return <TabLoading text="جاري تحميل الإعدادات..." />;
  if (!settings) return <p className="text-sm text-red-500">{error}</p>;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
      <h3 className="text-sm font-bold text-navy-950">الإشعارات</h3>
      <div className="mt-3 space-y-3">
        <ToggleRow
          label="إشعار العميل عند تغيير حالة الشحنة"
          checked={settings.notify_customer_on_status_change}
          onChange={(v) => update("notify_customer_on_status_change", v)}
        />
        <ToggleRow
          label="إشعار المندوب عند إسناد شحنة له"
          checked={settings.notify_agent_on_assignment}
          onChange={(v) => update("notify_agent_on_assignment", v)}
        />
        <ToggleRow
          label="إشعار المدير عند إنشاء شحنة جديدة"
          checked={settings.notify_admin_on_new_shipment}
          onChange={(v) => update("notify_admin_on_new_shipment", v)}
        />
      </div>

      <h3 className="mt-6 text-sm font-bold text-navy-950">التحصيل</h3>
      <div className="mt-3">
        <label className="mb-1.5 block text-sm font-semibold text-navy-900">
          الحد الأقصى للمبلغ مع المندوب قبل التسليم الإجباري (ج.م)
        </label>
        <input
          type="number"
          value={settings.max_agent_cash_limit}
          onChange={(e) => update("max_agent_cash_limit", Number(e.target.value))}
          className="w-full max-w-xs rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
        />
        <p className="mt-1 text-xs text-gray-400">0 يعني بدون حد أقصى</p>
      </div>

      <h3 className="mt-6 text-sm font-bold text-navy-950">التتبع</h3>
      <div className="mt-3">
        <label className="mb-1.5 block text-sm font-semibold text-navy-900">
          فاصل تحديث موقع المندوب (بالثواني)
        </label>
        <input
          type="number"
          value={settings.location_update_interval_seconds}
          onChange={(e) => update("location_update_interval_seconds", Number(e.target.value))}
          className="w-full max-w-xs rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
        />
      </div>

      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

      <SaveBar saving={saving} saved={saved} updatedAt={settings.updated_at} onSave={handleSave} />
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
    <label className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-100 px-4 py-3">
      <span className="text-sm text-navy-900">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-red-600" : "bg-gray-200"}`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
            checked ? "right-1" : "right-6"
          }`}
        />
      </button>
    </label>
  );
}

function TabLoading({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-white py-16 text-gray-400 shadow-card">
      <Loader2 className="h-6 w-6 animate-spin" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

function SaveBar({
  saving,
  saved,
  updatedAt,
  onSave,
}: {
  saving: boolean;
  saved: boolean;
  updatedAt?: string;
  onSave?: () => void;
}) {
  return (
    <div className="mt-6 flex items-center gap-3">
      <button
        type={onSave ? "button" : "submit"}
        onClick={onSave}
        disabled={saving}
        className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
      </button>
      {saved && (
        <span className="flex items-center gap-1.5 text-sm font-semibold text-success-600">
          <CheckCircle2 className="h-4 w-4" />
          تم الحفظ بنجاح
        </span>
      )}
      {updatedAt && !saved && (
        <span className="text-xs text-gray-400">
          آخر تحديث: {new Date(updatedAt).toLocaleDateString("ar-EG")}
        </span>
      )}
    </div>
  );
}