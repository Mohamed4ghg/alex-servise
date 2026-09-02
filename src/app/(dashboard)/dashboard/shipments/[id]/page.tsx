"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowRight,
  Box,
  Copy,
  Loader2,
  MapPin,
  User,
  UserRound,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { logActivity } from "@/utils/log-activity";
import type { AgentLocation, ReceiverLocation } from "./ShipmentMap";

// الخريطة بتستخدم window/document (Leaflet) فمحتاجة تتحمل client-only بدون SSR
const ShipmentMap = dynamic(() => import("./ShipmentMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[220px] items-center justify-center rounded-xl bg-navy-100/60 text-xs text-navy-500">
      جاري تحميل الخريطة...
    </div>
  ),
});

// ============================================================
// حالات الشحنة — مفاتيح إنجليزية في الداتابيز، تسميات عربية في الواجهة
// ============================================================

type ShipmentStatus =
  | "pending"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "returned"
  | "cancelled";

const statusLabels: Record<ShipmentStatus, string> = {
  pending: "قيد الانتظار",
  picked_up: "تم الاستلام",
  in_transit: "في الطريق",
  out_for_delivery: "خارج للتسليم",
  delivered: "تم التسليم",
  returned: "مرتجع",
  cancelled: "ملغي",
};

const statusStyles: Record<ShipmentStatus, string> = {
  pending: "border-gray-300 bg-gray-50 text-gray-600",
  picked_up: "border-info-200 bg-info-50 text-info-600",
  in_transit: "border-amber-200 bg-amber-50 text-amber-700",
  out_for_delivery: "border-amber-300 bg-amber-100 text-amber-800",
  delivered: "border-green-200 bg-green-50 text-green-700",
  returned: "border-red-200 bg-red-50 text-red-600",
  cancelled: "border-gray-300 bg-gray-100 text-gray-500",
};

const priorityLabels: Record<string, string> = {
  urgent: "عاجلة",
  high: "مرتفعة",
  normal: "عادية",
};

// ============================================================
// أنواع البيانات
// ============================================================

type TimelineEvent = {
  label: string;
  date: string;
  time: string;
  actor?: string;
};

type Customer = {
  id: string;
  full_name: string;
  company_name: string | null;
  customer_type: "individual" | "company";
  phone: string;
  address: string | null;
  area: string | null;
};

type Agent = {
  id: string;
  name: string;
  phone: string;
  area: string;
};

type Shipment = {
  id: string;
  tracking_number: string;
  customer_id: string;
  agent_id: string | null;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  receiver_area: string;
  receiver_notes: string | null;
  type: string;
  description: string | null;
  weight_kg: number;
  pieces_count: number;
  value: number;
  collection_amount: number;
  status: ShipmentStatus;
  priority: string | null;
  expected_delivery_date: string | null;
  timeline: TimelineEvent[] | null;
  created_at: string;
  customer: Customer | null;
  agent: Agent | null;
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP" }).format(n);
}

// ============================================================
// الصفحة
// ============================================================

export default function ShipmentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  if (!id) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
      </div>
    );
  }

  return <ShipmentDetailsContent id={id} />;
}

function ShipmentDetailsContent({ id }: { id: string }) {
  const supabase = createClient();

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [agentLocation, setAgentLocation] = useState<AgentLocation | null>(null);
  const [receiverLocation, setReceiverLocation] = useState<ReceiverLocation | null>(null);
  const [allAgents, setAllAgents] = useState<Agent[]>([]);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reassignOpen, setReassignOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<ShipmentStatus | null>(null);
  const [reassigning, setReassigning] = useState(false);

  async function fetchShipment() {
    setLoading(true);
    setError(null);
    setNotFound(false);

    const { data, error: fetchError } = await supabase
      .from("shipments")
      .select(
        `id, tracking_number, customer_id, agent_id, receiver_name, receiver_phone,
         receiver_address, receiver_area, receiver_notes, type, description,
         weight_kg, pieces_count, value, collection_amount, status, priority,
         expected_delivery_date, timeline, created_at,
         customer:customers(id, full_name, company_name, customer_type, phone, address, area),
         agent:agents(id, name, phone, area)`
      )
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      setError("تعذر تحميل بيانات الشحنة، برجاء المحاولة مرة أخرى");
      console.error("Shipment fetch error:", fetchError.message);
      setLoading(false);
      return;
    }

    if (!data) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const shipmentData = data as unknown as Shipment;
    setShipment(shipmentData);

    // موقع المندوب الحي (آخر تحديث)
    if (shipmentData.agent_id) {
      const { data: locData } = await supabase
        .from("agent_locations")
        .select("latitude, longitude, heading, updated_at")
        .eq("agent_id", shipmentData.agent_id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (locData) setAgentLocation(locData as AgentLocation);
      else setAgentLocation(null);
    } else {
      setAgentLocation(null);
    }

    // موقع المستلم التقريبي (من جدول areas بالاسم)
    if (shipmentData.receiver_area) {
      const { data: areaData } = await supabase
        .from("areas")
        .select("latitude, longitude, name")
        .eq("name", shipmentData.receiver_area)
        .maybeSingle();

      if (areaData) {
        setReceiverLocation({
          latitude: Number(areaData.latitude),
          longitude: Number(areaData.longitude),
          areaName: areaData.name,
        });
      } else {
        setReceiverLocation(null);
      }
    }

    setLoading(false);
  }

  async function fetchAgentsList() {
    const { data } = await supabase.from("agents").select("id, name, phone, area");
    setAllAgents((data as Agent[]) ?? []);
  }

  useEffect(() => {
    fetchShipment();
    fetchAgentsList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleStatusChange(newStatus: ShipmentStatus) {
    if (!shipment || newStatus === shipment.status) return;
    setUpdatingStatus(newStatus);

    const now = new Date();
    const newEvent: TimelineEvent = {
      label: statusLabels[newStatus],
      date: now.toLocaleDateString("ar-EG"),
      time: now.toLocaleTimeString("ar-EG"),
    };
    const updatedTimeline = [...(shipment.timeline ?? []), newEvent];

    const { error: updateError } = await supabase
      .from("shipments")
      .update({ status: newStatus, timeline: updatedTimeline })
      .eq("id", shipment.id);

    if (updateError) {
      alert("تعذر تحديث حالة الشحنة");
      console.error("Status update error:", updateError.message);
      setUpdatingStatus(null);
      return;
    }

    await logActivity({
      action: `غيّر حالة الشحنة إلى "${statusLabels[newStatus]}"`,
      entityType: "shipment",
      entityId: shipment.id,
      entityLabel: shipment.tracking_number,
    });

    setUpdatingStatus(null);
    fetchShipment();
  }

  async function handleReassign(newAgentId: string) {
    if (!shipment) return;
    setReassigning(true);

    const newAgent = allAgents.find((a) => a.id === newAgentId);

    const { error: updateError } = await supabase
      .from("shipments")
      .update({ agent_id: newAgentId })
      .eq("id", shipment.id);

    if (updateError) {
      alert("تعذر إسناد المندوب");
      console.error("Reassign error:", updateError.message);
      setReassigning(false);
      return;
    }

    await logActivity({
      action: `أسند الشحنة إلى المندوب ${newAgent?.name ?? ""}`,
      entityType: "shipment",
      entityId: shipment.id,
      entityLabel: shipment.tracking_number,
    });

    setReassigning(false);
    setReassignOpen(false);
    fetchShipment();
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm">جاري تحميل بيانات الشحنة...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 py-20 text-center">
        <p className="font-display text-base font-bold text-navy-950">لم يتم العثور على الشحنة</p>
        <Link href="/dashboard/shipments" className="mt-3 inline-block text-sm font-semibold text-red-600">
          العودة لقائمة الشحنات
        </Link>
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <p className="text-sm text-red-500">{error}</p>
        <button onClick={fetchShipment} className="text-sm font-semibold text-navy-700 hover:text-red-600">
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const customerLabel =
    shipment.customer?.customer_type === "company"
      ? shipment.customer?.company_name
      : shipment.customer?.full_name;

  return (
    <div>
      <Link href="/dashboard/shipments" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-navy-900">
        <ArrowRight className="h-4 w-4" /> العودة لقائمة الشحنات
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-extrabold text-navy-950 tnum">{shipment.tracking_number}</h1>
            <button
              onClick={() => navigator.clipboard.writeText(shipment.tracking_number)}
              className="text-gray-400 hover:text-navy-700"
              title="نسخ رقم الشحنة"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            تم الإنشاء في {new Date(shipment.created_at).toLocaleDateString("ar-EG")}
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1.5 text-sm font-bold ${statusStyles[shipment.status]}`}>
          {statusLabels[shipment.status]}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* يسار: التفاصيل */}
        <div className="space-y-4 lg:col-span-2">
          <InfoCard icon={User} title="بيانات العميل">
            <Row label="الاسم" value={customerLabel ?? "—"} />
            <Row label="الهاتف" value={shipment.customer?.phone ?? "—"} dir="ltr" />
            <Row
              label="العنوان"
              value={`${shipment.customer?.address ?? "—"}، ${shipment.customer?.area ?? "—"}`}
            />
          </InfoCard>

          <InfoCard icon={UserRound} title="بيانات المستلم">
            <Row label="الاسم" value={shipment.receiver_name} />
            <Row label="الهاتف" value={shipment.receiver_phone} dir="ltr" />
            <Row label="العنوان" value={`${shipment.receiver_address}، ${shipment.receiver_area}`} />
            {shipment.receiver_notes && <Row label="ملاحظات" value={shipment.receiver_notes} />}
          </InfoCard>

          <InfoCard icon={Box} title="بيانات الشحنة">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="النوع" value={shipment.type} />
              <Stat label="الوزن" value={`${shipment.weight_kg} كجم`} />
              <Stat label="عدد القطع" value={String(shipment.pieces_count)} />
              <Stat label="القيمة" value={formatCurrency(shipment.value)} />
              <Stat label="التحصيل" value={formatCurrency(shipment.collection_amount)} />
              <Stat
                label="الأولوية"
                value={shipment.priority ? priorityLabels[shipment.priority] ?? shipment.priority : "—"}
              />
            </div>
          </InfoCard>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
            <h3 className="font-display text-sm font-bold text-navy-950">السجل الزمني للشحنة</h3>
            {!shipment.timeline || shipment.timeline.length === 0 ? (
              <p className="mt-4 text-sm text-gray-400">مفيش أحداث مسجّلة بعد.</p>
            ) : (
              <ol className="mt-5 space-y-0">
                {shipment.timeline.map((t, i) => (
                  <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
                    {i !== (shipment.timeline?.length ?? 0) - 1 && (
                      <span className="absolute right-[9px] top-5 h-full w-0.5 bg-navy-100" />
                    )}
                    <span className="relative z-10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy-900">
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    </span>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="text-sm font-semibold text-navy-950">{t.label}</span>
                        <span className="text-xs text-gray-400 tnum">{t.date} — {t.time}</span>
                      </div>
                      {t.actor && <p className="mt-0.5 text-xs text-gray-500">بواسطة: {t.actor}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* يمين: sidebar */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-navy-950">المندوب المسؤول</h3>
              <button
                onClick={() => setReassignOpen((v) => !v)}
                className="text-xs font-semibold text-red-600 hover:underline"
              >
                {shipment.agent ? "إعادة إسناد" : "إسناد مندوب"}
              </button>
            </div>
            {shipment.agent ? (
              <div className="mt-3 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100 text-sm font-bold text-navy-900">
                  {shipment.agent.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </span>
                <div>
                  <p className="text-sm font-semibold text-navy-950">{shipment.agent.name}</p>
                  <p className="text-xs text-gray-400">المنطقة: {shipment.agent.area}</p>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-400">لم يتم إسناد الشحنة لمندوب بعد.</p>
            )}
            {reassignOpen && (
              <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-3">
                {reassigning && (
                  <div className="flex items-center gap-2 px-2.5 py-2 text-xs text-gray-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> جارٍ الإسناد...
                  </div>
                )}
                {!reassigning &&
                  allAgents.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => handleReassign(a.id)}
                      disabled={a.id === shipment.agent_id}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs hover:bg-gray-50 disabled:opacity-40"
                    >
                      <span className="font-medium text-navy-900">{a.name}</span>
                      <span className="text-gray-400">{a.area}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
            <h3 className="font-display text-sm font-bold text-navy-950">تغيير الحالة</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(Object.keys(statusLabels) as ShipmentStatus[]).map((key) => (
                <button
                  key={key}
                  onClick={() => handleStatusChange(key)}
                  disabled={key === shipment.status || updatingStatus !== null}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] font-semibold transition ${
                    key === shipment.status
                      ? "border-navy-900 bg-navy-900 text-white"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  } disabled:opacity-60`}
                >
                  {updatingStatus === key && <Loader2 className="h-3 w-3 animate-spin" />}
                  {statusLabels[key]}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-navy-50 p-5">
            <div className="flex items-center gap-2 text-navy-900">
              <MapPin className="h-4 w-4" />
              <p className="text-xs font-semibold">موقع المندوب والمستلم على الخريطة</p>
            </div>
            <div className="mt-3 h-56 overflow-hidden rounded-xl">
              <ShipmentMap
                agentLocation={agentLocation}
                agentName={shipment.agent?.name ?? null}
                receiverLocation={receiverLocation}
                receiverAddress={shipment.receiver_address}
              />
            </div>
            {!receiverLocation && (
              <p className="mt-2 text-[11px] text-navy-500">
                لا توجد إحداثيات محفوظة لمنطقة &quot;{shipment.receiver_area}&quot; في جدول المناطق بعد.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-navy-700" />
        <h3 className="font-display text-sm font-bold text-navy-950">{title}</h3>
      </div>
      <div className="mt-4 space-y-2.5">{children}</div>
    </div>
  );
}

function Row({ label, value, dir }: { label: string; value: string; dir?: "rtl" | "ltr" }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium text-navy-900 tnum" dir={dir}>{value}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className="text-[11px] text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-navy-950 tnum">{value}</p>
    </div>
  );
}