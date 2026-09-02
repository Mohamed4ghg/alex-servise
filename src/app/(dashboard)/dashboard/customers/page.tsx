"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { logActivity } from "@/utils/log-activity";

type CustomerType = "individual" | "company";

type Customer = {
  id: string;
  customer_type: CustomerType;
  full_name: string;
  company_name: string | null;
  phone: string;
  email: string | null;
  city: string | null;
  created_at: string;
};

type FilterTab = "all" | CustomerType;

function initials(name: string) {
  return name.trim().slice(0, 2);
}

export default function CustomersPage() {
  const supabase = createClient();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [showAddModal, setShowAddModal] = useState(false);

  async function fetchCustomers() {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("customers")
      .select("id, customer_type, full_name, company_name, phone, email, city, created_at")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError("تعذر تحميل بيانات العملاء، برجاء المحاولة مرة أخرى");
      console.error("Customers fetch error:", fetchError.message);
      setLoading(false);
      return;
    }

    setCustomers(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesFilter = filter === "all" || c.customer_type === filter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        c.full_name.toLowerCase().includes(q) ||
        c.company_name?.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email?.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [customers, search, filter]);

  const stats = useMemo(() => {
    const companies = customers.filter((c) => c.customer_type === "company").length;
    const individuals = customers.filter((c) => c.customer_type === "individual").length;
    const thisMonth = customers.filter((c) => {
      const created = new Date(c.created_at);
      const now = new Date();
      return (
        created.getMonth() === now.getMonth() &&
        created.getFullYear() === now.getFullYear()
      );
    }).length;
    return { total: customers.length, companies, individuals, thisMonth };
  }, [customers]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900">
            <UserRound className="h-5 w-5 text-white" />
          </span>
          <div>
            <h1 className="font-display text-xl font-bold text-navy-950">
              إدارة العملاء
            </h1>
            <p className="text-sm text-gray-500">
              سجل كامل للعملاء أفراد وشركات، مع بياناتهم الأساسية.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-red-600/20 transition hover:bg-red-700"
        >
          <Plus className="h-4 w-4" />
          إضافة عميل
        </button>
      </div>

      {/* كروت الإحصائيات */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="إجمالي العملاء" value={stats.total} />
        <StatCard label="عملاء أفراد" value={stats.individuals} />
        <StatCard label="عملاء شركات" value={stats.companies} />
        <StatCard label="عملاء جدد هذا الشهر" value={stats.thisMonth} />
      </div>

      {/* البحث والفلترة */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الهاتف أو البريد..."
            className="w-full rounded-lg border border-gray-200 py-2.5 pe-3.5 ps-10 text-sm text-navy-950 placeholder:text-gray-400 focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
          />
        </div>

        <div className="flex gap-2 rounded-lg bg-gray-50 p-1">
          {(
            [
              { key: "all", label: "الكل" },
              { key: "individual", label: "أفراد" },
              { key: "company", label: "شركات" },
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
            <p className="text-sm">جاري تحميل العملاء...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <p className="text-sm text-red-500">{error}</p>
            <button
              onClick={fetchCustomers}
              className="text-sm font-semibold text-navy-700 hover:text-red-600"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Users className="h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">
              {customers.length === 0
                ? "لا يوجد عملاء مسجّلون بعد"
                : "لا توجد نتائج مطابقة للبحث"}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filteredCustomers.map((c) => (
              <li key={c.id} className="flex items-center gap-4 px-5 py-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy-50 font-display text-sm font-bold text-navy-700">
                  {initials(c.company_name || c.full_name)}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-bold text-navy-950">
                      {c.customer_type === "company" ? c.company_name : c.full_name}
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        c.customer_type === "company"
                          ? "bg-info-100 text-info-600"
                          : "bg-navy-100 text-navy-700"
                      }`}
                    >
                      {c.customer_type === "company" ? (
                        <Building2 className="h-2.5 w-2.5" />
                      ) : (
                        <UserRound className="h-2.5 w-2.5" />
                      )}
                      {c.customer_type === "company" ? "شركة" : "فرد"}
                    </span>
                  </div>
                  {c.customer_type === "company" && (
                    <p className="text-xs text-gray-400">{c.full_name}</p>
                  )}
                </div>

                <div className="hidden shrink-0 flex-col items-start gap-1 text-xs text-gray-500 sm:flex">
                  <span className="flex items-center gap-1.5" dir="ltr">
                    <Phone className="h-3 w-3" />
                    {c.phone}
                  </span>
                  {c.email && (
                    <span className="flex items-center gap-1.5" dir="ltr">
                      <Mail className="h-3 w-3" />
                      {c.email}
                    </span>
                  )}
                </div>

                {c.city && (
                  <span className="hidden shrink-0 items-center gap-1.5 text-xs text-gray-400 lg:flex">
                    <MapPin className="h-3 w-3" />
                    {c.city}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {showAddModal && (
        <AddCustomerModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false);
            fetchCustomers();
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

function AddCustomerModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const supabase = createClient();
  const [customerType, setCustomerType] = useState<CustomerType>("individual");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !phone.trim()) {
      setError("الاسم ورقم الهاتف مطلوبين");
      return;
    }

    setSaving(true);

    const { data, error: insertError } = await supabase
      .from("customers")
      .insert({
        customer_type: customerType,
        full_name: fullName.trim(),
        company_name: customerType === "company" ? companyName.trim() : null,
        phone: phone.trim(),
        email: email.trim() || null,
        city: city.trim() || null,
      })
      .select()
      .single();

    if (insertError) {
      setError("تعذر إضافة العميل، برجاء المحاولة مرة أخرى");
      console.error("Insert customer error:", insertError.message);
      setSaving(false);
      return;
    }

    await logActivity({
      action: "أضاف عميل جديد",
      entityType: "customer",
      entityId: data.id,
      entityLabel:
        customerType === "company" ? companyName.trim() : fullName.trim(),
    });

    setSaving(false);
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-popover">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-navy-950">
            إضافة عميل جديد
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
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-50 p-1">
            <button
              type="button"
              onClick={() => setCustomerType("individual")}
              className={`rounded-md py-2 text-sm font-bold transition ${
                customerType === "individual"
                  ? "bg-white text-navy-950 shadow-sm"
                  : "text-gray-500"
              }`}
            >
              فرد
            </button>
            <button
              type="button"
              onClick={() => setCustomerType("company")}
              className={`rounded-md py-2 text-sm font-bold transition ${
                customerType === "company"
                  ? "bg-white text-navy-950 shadow-sm"
                  : "text-gray-500"
              }`}
            >
              شركة
            </button>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-navy-900">
              {customerType === "company" ? "اسم الشخص المسؤول" : "الاسم الكامل"}
            </label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
            />
          </div>

          {customerType === "company" && (
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-navy-900">
                اسم الشركة
              </label>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-navy-900">
              رقم الهاتف
            </label>
            <input
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-navy-900">
              البريد الإلكتروني (اختياري)
            </label>
            <input
              dir="ltr"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-navy-900">
              المدينة (اختياري)
            </label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
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
            {saving ? "جارٍ الحفظ..." : "حفظ العميل"}
          </button>
        </form>
      </div>
    </div>
  );
}