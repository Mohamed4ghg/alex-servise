"use client";

import { useEffect, useState } from "react";
import { Eye, Package, Phone, Plus, Search, TrendingUp, Wallet, X } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { AgentStatusBadge } from "@/components/ui/StatusBadge";
import type { AgentStatus } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

type Agent = {
  id: string;
  name: string;
  avatar: string | null;
  phone: string | null;
  area: string | null;
  status: AgentStatus;
  shipmentsToday: number;
  successRate: number;
  lastSeen: string;
  collectedToday: number;
  handedOverToday: number;
  delivered: number;
  remaining: number;
};

const VALID_STATUSES: AgentStatus[] = ["available", "on_task", "unavailable", "offline"];

function normalizeStatus(value: string | null): AgentStatus {
  const found = VALID_STATUSES.find((s) => s === value);
  return found ?? "offline";
}

function formatLastSeen(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 1) return "الآن";
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;

  return date.toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
}

function mapAgent(row: any): Agent {
  return {
    id: row.id,
    name: row.name,
    avatar: row.avatar,
    phone: row.phone,
    area: row.area,
    status: normalizeStatus(row.status),
    shipmentsToday: row.shipments_today ?? 0,
    successRate: row.success_rate ?? 0,
    lastSeen: formatLastSeen(row.last_seen),
    collectedToday: row.collected_today ?? 0,
    handedOverToday: row.handed_over_today ?? 0,
    delivered: row.delivered ?? 0,
    remaining: row.remaining ?? 0,
  };
}

function initialsFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "؟";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] ?? "") + (parts[1][0] ?? "");
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Agent | null>(null);

  // --- Add agent modal state ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formArea, setFormArea] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function fetchAgents() {
    const supabase = createClient();
    setLoading(true);
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      const mapped = (data ?? []).map(mapAgent);
      setAgents(mapped);
      setSelected((prev) => mapped.find((a) => a.id === prev?.id) ?? mapped[0] ?? null);
    }
    setLoading(false);
  }

  useEffect(() => {
    const supabase = createClient();

    fetchAgents();

    const channel = supabase
      .channel("agents-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agents" },
        () => fetchAgents()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function resetForm() {
    setFormName("");
    setFormPhone("");
    setFormArea("");
    setFormError(null);
  }

  function openAddModal() {
    resetForm();
    setShowAddModal(true);
  }

  function closeAddModal() {
    if (submitting) return;
    setShowAddModal(false);
    resetForm();
  }

  async function handleAddAgent(e: React.FormEvent) {
    e.preventDefault();

    if (!formName.trim()) {
      setFormError("اسم المندوب مطلوب");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const supabase = createClient();
    const newId = `AGT-${Date.now()}`;

    const { error: insertError } = await supabase.from("agents").insert({
      id: newId,
      name: formName.trim(),
      phone: formPhone.trim() || null,
      area: formArea.trim() || null,
      avatar: initialsFromName(formName),
      status: "offline",
    });

    setSubmitting(false);

    if (insertError) {
      // e.g. "new row violates row-level security policy" means the
      // logged-in user isn't admin/staff according to public.profiles.role
      setFormError(insertError.message);
      return;
    }

    setShowAddModal(false);
    resetForm();
    fetchAgents();
  }

  const filtered = agents.filter(
    (a) => a.name.includes(search) || (a.area ?? "").includes(search)
  );

  const addButton = (
    <button
      onClick={openAddModal}
      className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-red-600/20 hover:bg-red-700"
    >
      <Plus className="h-3.5 w-3.5" /> إضافة مندوب
    </button>
  );

  const addModal = showAddModal ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-navy-950">إضافة مندوب جديد</h2>
          <button
            onClick={closeAddModal}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleAddAgent} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">الاسم *</label>
            <input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-navy-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-100"
              placeholder="اسم المندوب"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">رقم الهاتف</label>
            <input
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-navy-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-100"
              placeholder="01xxxxxxxxx"
              dir="ltr"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">المنطقة</label>
            <input
              value={formArea}
              onChange={(e) => setFormArea(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-navy-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-100"
              placeholder="مثال: دقهلية"
            />
          </div>

          {formError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{formError}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={closeAddModal}
              disabled={submitting}
              className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-navy-900 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
            >
              {submitting ? "جاري الإضافة..." : "إضافة"}
            </button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  if (loading) {
    return <div className="p-8 text-center text-sm text-gray-400">جاري تحميل بيانات المندوبين...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-sm text-red-600">حدث خطأ: {error}</div>;
  }

  if (!selected) {
    return (
      <div>
        <PageHeader
          title="إدارة المندوبين"
          subtitle="0 مندوب مسجّل بالنظام"
          actions={addButton}
        />
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400 shadow-[var(--shadow-card)]">
          لا يوجد مندوبين مسجّلين بعد.
        </div>
        {addModal}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="إدارة المندوبين"
        subtitle={`${agents.length} مندوب مسجّل بالنظام`}
        actions={addButton}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-[var(--shadow-card)]">
            <div className="relative">
              <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث باسم المندوب أو المنطقة..."
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pe-9 ps-3 text-sm focus:border-navy-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-100"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white shadow-[var(--shadow-card)]">
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-right text-xs text-gray-400">
                    <th className="px-5 py-3 font-medium">المندوب</th>
                    <th className="px-5 py-3 font-medium">المنطقة</th>
                    <th className="px-5 py-3 font-medium">الحالة</th>
                    <th className="px-5 py-3 font-medium">شحنات اليوم</th>
                    <th className="px-5 py-3 font-medium">نسبة النجاح</th>
                    <th className="px-5 py-3 font-medium">آخر ظهور</th>
                    <th className="px-5 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr
                      key={a.id}
                      onClick={() => setSelected(a)}
                      className={`cursor-pointer border-b border-gray-50 last:border-0 hover:bg-gray-50 ${
                        selected.id === a.id ? "bg-navy-50/60" : ""
                      }`}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-100 text-xs font-bold text-navy-900">
                            {a.avatar}
                          </span>
                          <div>
                            <p className="font-semibold text-navy-950">{a.name}</p>
                            <p className="text-xs text-gray-400 tnum" dir="ltr">{a.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-600">{a.area}</td>
                      <td className="px-5 py-3"><AgentStatusBadge status={a.status} /></td>
                      <td className="px-5 py-3 text-gray-600 tnum">{a.shipmentsToday}</td>
                      <td className="px-5 py-3 font-semibold text-success-600 tnum">{a.successRate}%</td>
                      <td className="px-5 py-3 text-xs text-gray-400">{a.lastSeen}</td>
                      <td className="px-5 py-3">
                        <button className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Detail panel */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-navy-900 text-lg font-bold text-white">
              {selected.avatar}
            </span>
            <div>
              <p className="font-display text-base font-bold text-navy-950">{selected.name}</p>
              <AgentStatusBadge status={selected.status} className="mt-1" />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
            <Phone className="h-3.5 w-3.5 text-gray-400" />
            <span dir="ltr">{selected.phone}</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <MiniStat icon={Package} label="شحنات اليوم" value={String(selected.shipmentsToday)} />
            <MiniStat icon={TrendingUp} label="نسبة النجاح" value={`${selected.successRate}%`} />
            <MiniStat icon={Wallet} label="تحصيل اليوم" value={formatCurrency(selected.collectedToday)} />
            <MiniStat icon={Wallet} label="تم تسليمه للمكتب" value={formatCurrency(selected.handedOverToday)} />
          </div>

          <div className="mt-5">
            <p className="text-xs font-semibold text-gray-500">أداء التسليم اليوم</p>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-success-600"
                style={{
                  width: `${selected.shipmentsToday ? (selected.delivered / selected.shipmentsToday) * 100 : 0}%`,
                }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-gray-400">
              <span>{selected.delivered} تم التسليم</span>
              <span>{selected.remaining} متبقي</span>
            </div>
          </div>

          <button className="mt-5 w-full rounded-lg bg-navy-900 py-2.5 text-sm font-semibold text-white hover:bg-navy-800">
            عرض السجل الكامل
          </button>
        </div>
      </div>

      {addModal}
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="mt-1 text-sm font-bold text-navy-950 tnum">{value}</p>
    </div>
  );
}