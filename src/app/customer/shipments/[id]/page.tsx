import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Banknote,
  Box,
  Calendar,
  CheckCircle2,
  MapPin,
  Package,
  Phone,
  User,
  Weight,
} from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { AgentLiveLocation } from "@/components/customer/AgentLiveLocation";

const STATUS_COLOR_CLASSES: Record<string, string> = {
  gray: "bg-gray-100 text-gray-600",
  info: "bg-info-100 text-info-600",
  warning: "bg-warning-100 text-warning-600",
  red: "bg-red-100 text-red-600",
  success: "bg-success-100 text-success-600",
};

type TimelineEntry = {
  status: string;
  label: string;
  at: string;
};

export default async function CustomerShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);

  const [{ data: shipment, error }, { data: statusRows }] = await Promise.all([
    supabase
      .from("shipments")
      .select(
        `id, tracking_number, receiver_name, receiver_phone, receiver_address, receiver_area,
         receiver_notes, type, description, weight_kg, pieces_count, value, collection_amount,
         status, priority, expected_delivery_date, timeline, created_at`
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("shipment_statuses").select("key, label, color").order("sort_order"),
  ]);

  if (error) {
    console.error("Failed to load shipment detail:", error);
  }

  // الـ RLS بيتكفل إن الصف ده يرجع بس لو الشحنة دي فعلاً بتاعة العميل الحالي
  // لو مش بتاعته، الاستعلام هيرجع null من غير ما يوضح إن الشحنة موجودة لحد تاني
  if (error || !shipment) {
    notFound();
  }

  const statusMap: Record<string, { label: string; color: string }> = {};
  statusRows?.forEach((s) => {
    statusMap[s.key] = { label: s.label, color: s.color };
  });

  const statusInfo = statusMap[shipment.status] ?? {
    label: shipment.status,
    color: "gray",
  };
  const timeline = (shipment.timeline as TimelineEntry[] | null) ?? [];

  return (
    <div>
      <Link
        href="/customer/shipments"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:text-red-600"
      >
        <ArrowRight className="h-4 w-4" />
        رجوع لكل الشحنات
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-xl font-extrabold text-navy-950 sm:text-2xl">
            <Package className="h-5 w-5 text-gray-400" />
            {shipment.tracking_number}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            أُنشئت في{" "}
            {new Date(shipment.created_at).toLocaleDateString("ar-EG", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-sm font-bold ${
            STATUS_COLOR_CLASSES[statusInfo.color] ?? "bg-gray-100 text-gray-600"
          }`}
        >
          {statusInfo.label}
        </span>
      </div>

      {/* خريطة موقع المندوب — بتبان بس لو الشحنة قيد التوصيل والمندوب شغّال البث */}
      {shipment.status === "in_transit" && (
        <div className="mt-6">
          <AgentLiveLocation shipmentId={shipment.id} />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* بيانات المستلم والشحنة */}
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[var(--shadow-card)]">
            <h3 className="font-display text-sm font-bold text-navy-950">
              بيانات المستلم
            </h3>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoRow icon={User} label="الاسم" value={shipment.receiver_name} />
              <InfoRow icon={Phone} label="رقم الهاتف" value={shipment.receiver_phone} dir="ltr" />
              <InfoRow icon={MapPin} label="المنطقة" value={shipment.receiver_area} />
              <InfoRow icon={MapPin} label="العنوان بالتفصيل" value={shipment.receiver_address} />
            </div>
            {shipment.receiver_notes && (
              <p className="mt-4 rounded-lg bg-gray-50 p-3 text-xs leading-6 text-gray-600">
                ملاحظات: {shipment.receiver_notes}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[var(--shadow-card)]">
            <h3 className="font-display text-sm font-bold text-navy-950">
              تفاصيل الشحنة
            </h3>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <InfoRow icon={Box} label="النوع" value={shipment.type} />
              <InfoRow
                icon={Weight}
                label="الوزن"
                value={shipment.weight_kg ? `${shipment.weight_kg} كجم` : null}
              />
              <InfoRow
                icon={Package}
                label="عدد القطع"
                value={shipment.pieces_count?.toString()}
              />
              <InfoRow
                icon={Banknote}
                label="قيمة الشحنة"
                value={
                  shipment.value
                    ? `${Number(shipment.value).toLocaleString("ar-EG")} ج.م`
                    : null
                }
              />
            </div>
            {shipment.description && (
              <p className="mt-4 rounded-lg bg-gray-50 p-3 text-xs leading-6 text-gray-600">
                {shipment.description}
              </p>
            )}
          </div>
        </div>

        {/* التحصيل + الجدول الزمني */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[var(--shadow-card)]">
            <h3 className="font-display text-sm font-bold text-navy-950">التحصيل</h3>
            <p className="mt-2 font-display text-2xl font-extrabold text-navy-900 tnum">
              {shipment.collection_amount
                ? `${Number(shipment.collection_amount).toLocaleString("ar-EG")} ج.م`
                : "—"}
            </p>
            {shipment.expected_delivery_date && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
                <Calendar className="h-3.5 w-3.5" />
                التسليم المتوقع:{" "}
                {new Date(shipment.expected_delivery_date).toLocaleDateString("ar-EG")}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[var(--shadow-card)]">
            <h3 className="font-display text-sm font-bold text-navy-950">
              مراحل الشحنة
            </h3>
            {timeline.length === 0 ? (
              <p className="mt-3 text-xs text-gray-400">مفيش تحديثات لسه</p>
            ) : (
              <ol className="mt-4 space-y-4">
                {timeline.map((t, i) => (
                  <li key={i} className="relative flex gap-3 pr-1">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-100">
                      <CheckCircle2 className="h-3.5 w-3.5 text-success-600" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-navy-900">
                        {t.label}
                      </p>
                      <p className="mt-0.5 text-[11px] text-gray-400 tnum">
                        {new Date(t.at).toLocaleString("ar-EG")}
                      </p>
                    </div>
                    {i < timeline.length - 1 && (
                      <span className="absolute right-2.5 top-6 h-full w-px bg-gray-100" />
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  dir,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-50">
        <Icon className="h-3.5 w-3.5 text-gray-400" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-navy-900" dir={dir}>
          {value || "—"}
        </p>
      </div>
    </div>
  );
}