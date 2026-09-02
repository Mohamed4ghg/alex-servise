"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, IdCard, Loader2, MapPin, Phone, Truck, UserCheck } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type PendingAgent = {
  id: string;
  full_name: string | null;
  phone: string | null;
  national_id: string | null;
  vehicle_type: string | null;
  email: string;
};

const VEHICLE_LABELS: Record<string, string> = {
  motorcycle: "دراجة نارية",
  car: "سيارة",
  tricycle: "تروسيكل",
  bicycle: "دراجة",
};

export default function AgentApprovalsPage() {
  const supabase = createClient();

  const [pending, setPending] = useState<PendingAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [areaInputs, setAreaInputs] = useState<Record<string, string>>({});
  const [approving, setApproving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadPending() {
    setLoading(true);
    setError(null);

    // كل اليوزرز اللي عملوا حساب بـ role = agent، من غير ما يكون ليهم صف مربوط في agents
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, phone, national_id, vehicle_type, email")
      .eq("role", "agent")
      .order("created_at", { ascending: false });

    if (profilesError) {
      setError("تعذر تحميل الطلبات");
      console.error(profilesError.message);
      setLoading(false);
      return;
    }

    const { data: linkedAgents } = await supabase.from("agents").select("user_id");
    const linkedIds = new Set((linkedAgents ?? []).map((a) => a.user_id));

    const stillPending = (profiles ?? []).filter((p) => !linkedIds.has(p.id));
    setPending(stillPending);
    setLoading(false);
  }

  useEffect(() => {
    loadPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleApprove(agentProfile: PendingAgent) {
    const area = areaInputs[agentProfile.id]?.trim();

    if (!area) {
      setError("لازم تحدد المنطقة قبل الموافقة");
      return;
    }
    if (!agentProfile.phone) {
      setError("الحساب ده معندوش رقم تليفون مسجل، متأكد إنه صحيح قبل الموافقة");
      return;
    }

    setError(null);
    setApproving(agentProfile.id);

    const { error: insertError } = await supabase.from("agents").insert({
      id: crypto.randomUUID(),
      user_id: agentProfile.id,
      name: agentProfile.full_name ?? "مندوب بدون اسم",
      avatar: (agentProfile.full_name ?? "م ص").trim().slice(0, 2),
      phone: agentProfile.phone,
      area,
      status: "offline",
    });

    if (insertError) {
      console.error("Approve agent error:", insertError.message);
      setError("تعذر اعتماد المندوب، برجاء المحاولة مرة أخرى");
      setApproving(null);
      return;
    }

    setApproving(null);
    await loadPending();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900">
          <UserCheck className="h-5 w-5 text-white" />
        </span>
        <div>
          <h1 className="font-display text-xl font-bold text-navy-950">
            طلبات انضمام المندوبين
          </h1>
          <p className="text-sm text-gray-500">{pending.length} طلب في الانتظار</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {pending.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400 shadow-[var(--shadow-card)]">
          مفيش طلبات معلقة دلوقتي
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[var(--shadow-card)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-display text-base font-bold text-navy-950">
                    {p.full_name ?? "بدون اسم"}
                  </p>
                  <p className="text-xs text-gray-400" dir="ltr">
                    {p.email}
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Phone className="h-3.5 w-3.5 text-gray-400" />
                      <span dir="ltr">{p.phone ?? "—"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <IdCard className="h-3.5 w-3.5 text-gray-400" />
                      {p.national_id ?? "—"}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Truck className="h-3.5 w-3.5 text-gray-400" />
                      {p.vehicle_type ? VEHICLE_LABELS[p.vehicle_type] ?? p.vehicle_type : "—"}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-gray-500">
                      المنطقة
                    </label>
                    <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      <input
                        value={areaInputs[p.id] ?? ""}
                        onChange={(e) =>
                          setAreaInputs((prev) => ({ ...prev, [p.id]: e.target.value }))
                        }
                        placeholder="مثال: سموحة"
                        className="w-32 bg-transparent text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => handleApprove(p)}
                    disabled={approving === p.id}
                    className="flex items-center gap-1.5 rounded-lg bg-success-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-success-700 disabled:opacity-50"
                  >
                    {approving === p.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    موافقة
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}