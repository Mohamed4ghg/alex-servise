"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Loader2,
  Mail,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { logActivity } from "@/utils/log-activity";
import { inviteOfficeStaff } from "./actions";

type AccountType = "admin" | "office" | "agent" | "buyer";

type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  account_type: AccountType;
  business_name: string | null;
  created_at: string;
};

const ROLE_META: Record<
  AccountType,
  { label: string; badge: string; icon: React.ElementType }
> = {
  admin: { label: "مدير", badge: "bg-red-100 text-red-600", icon: ShieldCheck },
  office: { label: "موظف مكتب", badge: "bg-info-100 text-info-600", icon: Building2 },
  agent: { label: "مندوب", badge: "bg-warning-100 text-warning-600", icon: Truck },
  buyer: { label: "عميل", badge: "bg-navy-100 text-navy-700", icon: ShoppingBag },
};

type FilterTab = "all" | AccountType;

type PendingChange = { profile: Profile; newRole: AccountType };

export default function UsersPageClient() {
  const supabase = createClient();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  async function fetchProfiles() {
    setLoading(true);
    setError(null);

    const [{ data: userData }, profilesRes] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from("profiles")
        .select("id, full_name, phone, account_type, business_name, created_at")
        .order("created_at", { ascending: false }),
    ]);

    setCurrentUserId(userData.user?.id ?? null);

    if (profilesRes.error) {
      setError("تعذر تحميل المستخدمين، برجاء المحاولة مرة أخرى");
      console.error("Profiles fetch error:", profilesRes.error.message);
      setLoading(false);
      return;
    }

    setProfiles(profilesRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return profiles.filter((p) => {
      const matchesFilter = filter === "all" || p.account_type === filter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.full_name?.toLowerCase().includes(q) ||
        p.phone?.includes(q) ||
        p.business_name?.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [profiles, search, filter]);

  const counts = useMemo(() => {
    const c: Record<AccountType, number> = { admin: 0, office: 0, agent: 0, buyer: 0 };
    for (const p of profiles) {
      if (p.account_type in c) c[p.account_type] += 1;
    }
    return c;
  }, [profiles]);

  function requestRoleChange(profile: Profile, newRole: AccountType) {
    if (newRole === profile.account_type) return;
    setActionError(null);

    // حماية: منع إزالة آخر مدير في النظام
    if (profile.account_type === "admin" && newRole !== "admin" && counts.admin <= 1) {
      setActionError("لا يمكن إزالة صلاحية آخر مدير في النظام. عيّن مديرًا آخر أولًا.");
      return;
    }

    setPendingChange({ profile, newRole });
  }

  async function confirmRoleChange() {
    if (!pendingChange) return;
    const { profile, newRole } = pendingChange;

    setUpdatingId(profile.id);
    setPendingChange(null);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ account_type: newRole })
      .eq("id", profile.id);

    if (updateError) {
      setActionError(
        updateError.message.includes("غير مسموح")
          ? updateError.message
          : "تعذر تحديث الصلاحية، برجاء المحاولة مرة أخرى"
      );
      console.error("Role update error:", updateError.message);
      setUpdatingId(null);
      return;
    }

    setProfiles((prev) =>
      prev.map((p) => (p.id === profile.id ? { ...p, account_type: newRole } : p))
    );

    await logActivity({
      action: `غيّر صلاحية ${profile.full_name} إلى`,
      entityType: "user",
      entityId: profile.id,
      entityLabel: ROLE_META[newRole].label,
    });

    setUpdatingId(null);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900">
            <ShieldCheck className="h-5 w-5 text-white" />
          </span>
          <div>
            <h1 className="font-display text-xl font-bold text-navy-950">
              المستخدمون والصلاحيات
            </h1>
            <p className="text-sm text-gray-500">
              إدارة أدوار المستخدمين: مدير، موظف مكتب، مندوب، عميل
            </p>
          </div>
        </div>
        <button
          onClick={() => setInviteModalOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
        >
          <UserPlus className="h-4 w-4" />
          دعوة موظف جديد
        </button>
      </div>

      {/* كروت الإحصائيات */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {(Object.keys(ROLE_META) as AccountType[]).map((role) => {
          const meta = ROLE_META[role];
          return (
            <div
              key={role}
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-center gap-2">
                <meta.icon className="h-4 w-4 text-gray-400" />
                <p className="text-xs font-medium text-gray-500">{meta.label}</p>
              </div>
              <p className="mt-2 font-display text-xl font-extrabold text-navy-950 tnum">
                {counts[role]}
              </p>
            </div>
          );
        })}
      </div>

      {actionError && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {actionError}
        </div>
      )}

      {/* البحث والفلترة */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الهاتف..."
            className="w-full rounded-lg border border-gray-200 py-2.5 pe-3.5 ps-10 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
          />
        </div>

        <div className="flex flex-wrap gap-2 rounded-lg bg-gray-50 p-1">
          {(["all", "admin", "office", "agent", "buyer"] as FilterTab[]).map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                filter === key
                  ? "bg-white text-navy-950 shadow-sm"
                  : "text-gray-500 hover:text-navy-800"
              }`}
            >
              {key === "all" ? "الكل" : ROLE_META[key as AccountType].label}
            </button>
          ))}
        </div>
      </div>

      {/* القائمة */}
      <div className="mt-4 rounded-2xl border border-gray-100 bg-white shadow-[var(--shadow-card)]">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">جاري تحميل المستخدمين...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <p className="text-sm text-red-500">{error}</p>
            <button
              onClick={fetchProfiles}
              className="text-sm font-semibold text-navy-700 hover:text-red-600"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Users className="h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">لا يوجد مستخدمون مطابقون</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filtered.map((p) => {
              const meta = ROLE_META[p.account_type] ?? ROLE_META.buyer;
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-50 font-display text-sm font-bold text-navy-700">
                    {p.full_name?.slice(0, 2) ?? "؟"}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-bold text-navy-950">
                        {p.full_name}
                        {p.id === currentUserId && (
                          <span className="mr-1.5 text-xs font-normal text-gray-400">
                            (أنت)
                          </span>
                        )}
                      </p>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.badge}`}>
                        <meta.icon className="h-2.5 w-2.5" />
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400" dir="ltr">
                      {p.phone ?? "—"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {updatingId === p.id && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
                    )}
                    <select
                      value={p.account_type}
                      disabled={updatingId === p.id}
                      onChange={(e) =>
                        requestRoleChange(p, e.target.value as AccountType)
                      }
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-navy-800 focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100 disabled:opacity-50"
                    >
                      <option value="buyer">عميل</option>
                      <option value="agent">مندوب</option>
                      <option value="office">موظف مكتب</option>
                      <option value="admin">مدير</option>
                    </select>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-xs text-gray-400">
        <AlertCircle className="h-3.5 w-3.5" />
        تغيير الصلاحية بيتحدث فورًا ويتسجل في سجل الأنشطة.
      </p>

      {pendingChange && (
        <ConfirmRoleChangeModal
          profile={pendingChange.profile}
          newRole={pendingChange.newRole}
          isSelf={pendingChange.profile.id === currentUserId}
          onCancel={() => setPendingChange(null)}
          onConfirm={confirmRoleChange}
        />
      )}

      {inviteModalOpen && (
        <InviteOfficeStaffModal
          onClose={() => setInviteModalOpen(false)}
          onInvited={() => {
            setInviteModalOpen(false);
            fetchProfiles();
          }}
        />
      )}
    </div>
  );
}

function ConfirmRoleChangeModal({
  profile,
  newRole,
  isSelf,
  onCancel,
  onConfirm,
}: {
  profile: Profile;
  newRole: AccountType;
  isSelf: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const oldMeta = ROLE_META[profile.account_type];
  const newMeta = ROLE_META[newRole];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-popover">
        <div className="flex items-start justify-between">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-warning-100">
            <AlertTriangle className="h-5 w-5 text-warning-600" />
          </span>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <h3 className="mt-4 font-display text-lg font-bold text-navy-950">
          تأكيد تغيير الصلاحية
        </h3>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          هتغيّر صلاحية{" "}
          <span className="font-bold text-navy-950">{profile.full_name}</span>{" "}
          من <span className="font-semibold">{oldMeta.label}</span> إلى{" "}
          <span className="font-semibold">{newMeta.label}</span>.
        </p>

        {isSelf && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
            ⚠️ ده حسابك إنت شخصيًا — ممكن تفقد وصولك لهذه الصفحة فورًا.
          </p>
        )}

        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-semibold text-navy-800 transition hover:border-navy-300"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
          >
            تأكيد التغيير
          </button>
        </div>
      </div>
    </div>
  );
}

function InviteOfficeStaffModal({
  onClose,
  onInvited,
}: {
  onClose: () => void;
  onInvited: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim()) {
      setError("الاسم والبريد الإلكتروني مطلوبين");
      return;
    }

    setSending(true);
    const result = await inviteOfficeStaff({ fullName, email, phone });
    setSending(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    onInvited();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-popover">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-navy-950">دعوة موظف مكتب جديد</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          هنبعتله إيميل فيه لينك يحدد بيه الباسورد بنفسه، وهيتسجل بصلاحية "موظف مكتب" مباشرة.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-navy-900">الاسم الكامل</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
            />
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-navy-900">
              <Mail className="h-3.5 w-3.5" />
              البريد الإلكتروني
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
            <label className="mb-1.5 block text-sm font-semibold text-navy-900">رقم الهاتف (اختياري)</label>
            <input
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={sending}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {sending ? "جارٍ الإرسال..." : "إرسال الدعوة"}
          </button>
        </form>
      </div>
    </div>
  );
}