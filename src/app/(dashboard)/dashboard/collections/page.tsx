"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Loader2,
  Printer,
  Wallet,
  X,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { logActivity } from "@/utils/log-activity";

type Agent = { id: string; name: string; area: string | null };
type Shipment = { agent_id: string | null; collection_amount: number | null; status: string | null };
type Handover = {
  id: string;
  agent_id: string;
  amount: number;
  note: string | null;
  created_at: string;
};

function formatCurrency(n: number) {
  return n.toLocaleString("ar-EG", { maximumFractionDigits: 0 });
}

export default function CollectionsPage() {
  const supabase = createClient();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [handovers, setHandovers] = useState<Handover[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [handoverAgent, setHandoverAgent] = useState<Agent | null>(null);
  const [lastHandover, setLastHandover] = useState<{ agent: Agent; amount: number } | null>(null);

  async function fetchData() {
    setLoading(true);
    setError(null);

    const [agentsRes, shipmentsRes, handoversRes] = await Promise.all([
      supabase.from("agents").select("id, name, area"),
      supabase.from("shipments").select("agent_id, collection_amount, status"),
      supabase
        .from("handovers")
        .select("id, agent_id, amount, note, created_at")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    if (agentsRes.error || shipmentsRes.error || handoversRes.error) {
      setError("تعذر تحميل بيانات التحصيلات، برجاء المحاولة مرة أخرى");
      console.error(
        "Collections fetch error:",
        agentsRes.error?.message || shipmentsRes.error?.message || handoversRes.error?.message
      );
      setLoading(false);
      return;
    }

    setAgents(agentsRes.data ?? []);
    setShipments(shipmentsRes.data ?? []);
    setHandovers(handoversRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("handovers_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "handovers" },
        (payload) => {
          setHandovers((prev) => [payload.new as Handover, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // حساب المحصّل والمُسلَّم والمتبقي لكل مندوب من البيانات الحقيقية مباشرة
  const agentBalances = useMemo(() => {
    return agents.map((agent) => {
      const collected = shipments
        .filter((s) => s.agent_id === agent.id && s.status === "delivered")
        .reduce((sum, s) => sum + (s.collection_amount ?? 0), 0);

      const handedOver = handovers
        .filter((h) => h.agent_id === agent.id)
        .reduce((sum, h) => sum + h.amount, 0);

      return {
        agent,
        collected,
        handedOver,
        remaining: collected - handedOver,
      };
    });
  }, [agents, shipments, handovers]);

  const totals = useMemo(() => {
    return agentBalances.reduce(
      (acc, a) => ({
        collected: acc.collected + a.collected,
        handedOver: acc.handedOver + a.handedOver,
        remaining: acc.remaining + a.remaining,
      }),
      { collected: 0, handedOver: 0, remaining: 0 }
    );
  }, [agentBalances]);

  async function handleRecordHandover(amount: number, note: string) {
    if (!handoverAgent) return;

    const { data, error: insertError } = await supabase
      .from("handovers")
      .insert({ agent_id: handoverAgent.id, amount, note: note || null })
      .select()
      .single();

    if (insertError) {
      throw new Error("تعذر تسجيل التسليم، برجاء المحاولة مرة أخرى");
    }

    await logActivity({
      action: `سجّل تسليم تحصيل من ${handoverAgent.name} بمبلغ`,
      entityType: "handover",
      entityId: data.id,
      entityLabel: `${formatCurrency(amount)} ج.م`,
    });

    setLastHandover({ agent: handoverAgent, amount });
    setHandoverAgent(null);
  }

  if (lastHandover) {
    return (
      <HandoverReceipt
        agent={lastHandover.agent}
        amount={lastHandover.amount}
        onClose={() => setLastHandover(null)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900">
          <Wallet className="h-5 w-5 text-white" />
        </span>
        <div>
          <h1 className="font-display text-xl font-bold text-navy-950">
            التحصيلات
          </h1>
          <p className="text-sm text-gray-500">
            متابعة المبالغ المحصّلة والمسلّمة للمكتب لكل مندوب
          </p>
        </div>
      </div>

      {/* كروت الإجمالي */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[var(--shadow-card)]">
          <p className="text-xs font-medium text-gray-500">إجمالي المحصّل</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-navy-950 tnum">
            {formatCurrency(totals.collected)} ج.م
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[var(--shadow-card)]">
          <p className="text-xs font-medium text-gray-500">إجمالي المسلّم للمكتب</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-success-600 tnum">
            {formatCurrency(totals.handedOver)} ج.م
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[var(--shadow-card)]">
          <p className="text-xs font-medium text-gray-500">إجمالي المتبقي مع المندوبين</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-red-600 tnum">
            {formatCurrency(totals.remaining)} ج.م
          </p>
        </div>
      </div>

      {/* جدول المندوبين */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[var(--shadow-card)]">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">جاري تحميل البيانات...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <p className="text-sm text-red-500">{error}</p>
            <button onClick={fetchData} className="text-sm font-semibold text-navy-700 hover:text-red-600">
              إعادة المحاولة
            </button>
          </div>
        ) : agentBalances.length === 0 ? (
          <p className="px-5 py-16 text-center text-sm text-gray-400">لا يوجد مندوبون بعد</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-right text-xs font-semibold text-gray-500">
                <th className="px-5 py-3">المندوب</th>
                <th className="px-5 py-3">المحصّل</th>
                <th className="px-5 py-3">المسلّم</th>
                <th className="px-5 py-3">المتبقي</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {agentBalances.map(({ agent, collected, handedOver, remaining }) => (
                <tr key={agent.id}>
                  <td className="px-5 py-3 font-bold text-navy-950">
                    {agent.name}
                    {agent.area && <span className="mr-1.5 text-xs font-normal text-gray-400">({agent.area})</span>}
                  </td>
                  <td className="px-5 py-3 tnum text-gray-600">{formatCurrency(collected)} ج.م</td>
                  <td className="px-5 py-3 tnum text-success-600">{formatCurrency(handedOver)} ج.م</td>
                  <td className={`px-5 py-3 tnum font-bold ${remaining > 0 ? "text-red-600" : "text-gray-400"}`}>
                    {formatCurrency(remaining)} ج.م
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => setHandoverAgent(agent)}
                      disabled={remaining <= 0}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      تسجيل تسليم
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* آخر عمليات التسليم */}
      <div className="mt-6">
        <h2 className="text-sm font-bold text-navy-950">آخر عمليات التسليم</h2>
        <div className="mt-3 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[var(--shadow-card)]">
          {handovers.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">لا توجد عمليات تسليم بعد</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {handovers.slice(0, 10).map((h) => {
                const agentName = agents.find((a) => a.id === h.agent_id)?.name ?? "مندوب";
                return (
                  <li key={h.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-success-600" />
                      <span className="font-semibold text-navy-950">{agentName}</span>
                      {h.note && <span className="text-xs text-gray-400">— {h.note}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="tnum font-bold text-success-600">{formatCurrency(h.amount)} ج.م</span>
                      <span className="text-xs text-gray-400 tnum">
                        {new Date(h.created_at).toLocaleString("ar-EG")}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {handoverAgent && (
        <RecordHandoverModal
          agent={handoverAgent}
          maxAmount={agentBalances.find((a) => a.agent.id === handoverAgent.id)?.remaining ?? 0}
          onClose={() => setHandoverAgent(null)}
          onSubmit={handleRecordHandover}
        />
      )}
    </div>
  );
}

function RecordHandoverModal({
  agent,
  maxAmount,
  onClose,
  onSubmit,
}: {
  agent: Agent;
  maxAmount: number;
  onClose: () => void;
  onSubmit: (amount: number, note: string) => Promise<void>;
}) {
  const [amount, setAmount] = useState(String(maxAmount));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);

    if (!value || value <= 0) {
      setError("المبلغ لازم يكون أكبر من صفر");
      return;
    }
    if (value > maxAmount) {
      setError(`المبلغ أكبر من المتبقي مع المندوب (${formatCurrency(maxAmount)} ج.م)`);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSubmit(value, note);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-popover">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-navy-950">تسجيل تسليم</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          من <span className="font-semibold text-navy-950">{agent.name}</span> — المتبقي حاليًا:{" "}
          <span className="font-bold text-red-600 tnum">{formatCurrency(maxAmount)} ج.م</span>
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-navy-900">المبلغ المسلَّم</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-navy-900">ملاحظة (اختياري)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
            />
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-sm text-red-500">
              <AlertCircle className="h-3.5 w-3.5" />
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "جارٍ الحفظ..." : "تأكيد التسليم"}
          </button>
        </form>
      </div>
    </div>
  );
}

function HandoverReceipt({
  agent,
  amount,
  onClose,
}: {
  agent: Agent;
  amount: number;
  onClose: () => void;
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="flex flex-col items-center text-center print:hidden">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-100">
          <CheckCircle2 className="h-7 w-7 text-success-600" />
        </span>
        <h2 className="mt-4 font-display text-xl font-bold text-navy-950">تم تسجيل التسليم بنجاح</h2>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 print:border-2 print:border-black">
        <p className="font-display text-lg font-extrabold text-navy-950">ALEX Service</p>
        <p className="text-xs text-gray-400">إيصال تسليم تحصيل</p>

        <div className="mt-4 space-y-2 border-t border-dashed border-gray-200 pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">المندوب</span>
            <span className="font-bold text-navy-950">{agent.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">المبلغ</span>
            <span className="font-bold text-red-600 tnum">{formatCurrency(amount)} ج.م</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">التاريخ</span>
            <span className="text-navy-950 tnum">{new Date().toLocaleString("ar-EG")}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-center gap-3 print:hidden">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold text-navy-800 transition hover:border-navy-300"
        >
          <Printer className="h-4 w-4" />
          طباعة
        </button>
        <button
          onClick={onClose}
          className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
        >
          الرجوع للتحصيلات
        </button>
      </div>
    </div>
  );
}