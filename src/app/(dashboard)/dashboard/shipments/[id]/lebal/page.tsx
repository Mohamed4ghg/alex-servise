"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { ArrowRight, Loader2, Printer } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

// ============================================================
// أنواع البيانات (نفس الأعمدة اللي محتاجينها بس)
// ============================================================

type Customer = {
  full_name: string;
  company_name: string | null;
  customer_type: "individual" | "company";
  phone: string;
  address: string | null;
  area: string | null;
};

type ShipmentLabelData = {
  id: string;
  tracking_number: string;
  qr_token: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  receiver_area: string;
  type: string;
  description: string | null;
  weight_kg: number;
  pieces_count: number;
  collection_amount: number;
  priority: string | null;
  created_at: string;
  customer: Customer | null;
};

const priorityLabels: Record<string, string> = {
  urgent: "عاجلة",
  high: "مرتفعة",
  normal: "عادية",
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP" }).format(n);
}

// ============================================================
// الصفحة
// ============================================================

export default function ShipmentLabelPage({ params }: { params: Promise<{ id: string }> }) {
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

  return <ShipmentLabelContent id={id} />;
}

function ShipmentLabelContent({ id }: { id: string }) {
  const supabase = createClient();

  const [shipment, setShipment] = useState<ShipmentLabelData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      setNotFound(false);

      const { data, error: fetchError } = await supabase
        .from("shipments")
        .select(
          `id, tracking_number, qr_token, receiver_name, receiver_phone,
           receiver_address, receiver_area, type, description, weight_kg,
           pieces_count, collection_amount, priority, created_at,
           customer:customers(full_name, company_name, customer_type, phone, address, area)`
        )
        .eq("id", id)
        .maybeSingle();

      if (fetchError) {
        console.error("Shipment label fetch error:", fetchError.message);
        setError("تعذر تحميل بيانات الشحنة");
        setLoading(false);
        return;
      }

      if (!data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const shipmentData = data as unknown as ShipmentLabelData;
      setShipment(shipmentData);

      // بنولّد QR كود بيشفّر qr_token بتاع الشحنة (مش رقم التتبع الظاهر)،
      // ده نفس الكود اللي مودال مسح التسليم بيقارن بيه في صفحة تفاصيل الشحنة
      try {
        const dataUrl = await QRCode.toDataURL(shipmentData.qr_token, {
          width: 260,
          margin: 1,
          errorCorrectionLevel: "M",
        });
        setQrDataUrl(dataUrl);
      } catch (err) {
        console.error("QR generation error:", err);
      }

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm">جاري تحميل الملصق...</p>
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
      </div>
    );
  }

  const senderLabel =
    shipment.customer?.customer_type === "company"
      ? shipment.customer?.company_name
      : shipment.customer?.full_name;

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      {/* ===== شريط أعلى الصفحة - مش بيتطبع ===== */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/dashboard/shipments/${shipment.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-navy-900"
        >
          <ArrowRight className="h-4 w-4" /> العودة لتفاصيل الشحنة
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-lg bg-navy-900 px-4 py-2 text-sm font-bold text-white hover:bg-navy-800"
        >
          <Printer className="h-4 w-4" />
          طباعة الملصق
        </button>
      </div>

      {/* ===== الملصق نفسه - ده اللي بيتطبع ===== */}
      <div className="shipment-label mt-6 rounded-2xl border-2 border-navy-900 bg-white p-5 print:mt-0 print:rounded-none">
        <div className="flex items-center justify-between border-b-2 border-dashed border-gray-300 pb-3">
          <div>
            <p className="font-display text-lg font-extrabold text-navy-950">ALEX Service</p>
            <p className="text-[11px] text-gray-400">ملصق شحنة</p>
          </div>
          {shipment.priority && shipment.priority !== "normal" && (
            <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600">
              {priorityLabels[shipment.priority] ?? shipment.priority}
            </span>
          )}
        </div>

        {/* رقم التتبع */}
        <div className="mt-3 text-center">
          <p className="text-[11px] text-gray-400">رقم التتبع</p>
          <p className="font-display text-2xl font-extrabold text-navy-950 tnum" dir="ltr">
            {shipment.tracking_number}
          </p>
        </div>

        {/* QR كود التأكيد */}
        <div className="mt-3 flex justify-center">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="QR كود تأكيد التسليم" className="h-[150px] w-[150px]" />
          ) : (
            <div className="flex h-[150px] w-[150px] items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
              تعذر توليد الكود
            </div>
          )}
        </div>
        <p className="mt-1.5 text-center text-[10px] text-gray-400">
          يمسحه المندوب لتأكيد التسليم — لا يمثّل رقم التتبع
        </p>

        {/* المرسل والمستلم */}
        <div className="mt-4 grid grid-cols-2 gap-3 border-t-2 border-dashed border-gray-300 pt-3 text-xs">
          <div>
            <p className="font-bold text-gray-400">من (المرسل)</p>
            <p className="mt-1 font-semibold text-navy-950">{senderLabel ?? "—"}</p>
            <p className="text-gray-500" dir="ltr">{shipment.customer?.phone ?? "—"}</p>
          </div>
          <div>
            <p className="font-bold text-gray-400">إلى (المستلم)</p>
            <p className="mt-1 font-semibold text-navy-950">{shipment.receiver_name}</p>
            <p className="text-gray-500" dir="ltr">{shipment.receiver_phone}</p>
          </div>
        </div>

        <div className="mt-3 border-t-2 border-dashed border-gray-300 pt-3 text-xs">
          <p className="font-bold text-gray-400">عنوان التسليم</p>
          <p className="mt-1 font-semibold text-navy-950">
            {shipment.receiver_area} — {shipment.receiver_address}
          </p>
        </div>

        {/* تفاصيل الشحنة */}
        <div className="mt-3 grid grid-cols-3 gap-2 border-t-2 border-dashed border-gray-300 pt-3 text-center text-xs">
          <div>
            <p className="text-gray-400">النوع</p>
            <p className="mt-0.5 font-bold text-navy-950">{shipment.type}</p>
          </div>
          <div>
            <p className="text-gray-400">الوزن</p>
            <p className="mt-0.5 font-bold text-navy-950">{shipment.weight_kg} كجم</p>
          </div>
          <div>
            <p className="text-gray-400">القطع</p>
            <p className="mt-0.5 font-bold text-navy-950">{shipment.pieces_count}</p>
          </div>
        </div>

        {shipment.description && (
          <p className="mt-2 text-center text-[11px] text-gray-500">{shipment.description}</p>
        )}

        {/* مبلغ التحصيل - أبرز حاجة في الملصق */}
        <div className="mt-3 rounded-xl bg-navy-900 py-3 text-center">
          <p className="text-[11px] text-white/70">مبلغ التحصيل عند التسليم (COD)</p>
          <p className="mt-0.5 font-display text-xl font-extrabold text-white tnum">
            {formatCurrency(shipment.collection_amount)}
          </p>
        </div>

        <p className="mt-3 text-center font-mono text-lg tracking-[0.3em] text-navy-950">
          *{shipment.tracking_number}*
        </p>
      </div>

      {/* CSS مخصص لوضع الطباعة: يخفي كل حاجة غير الملصق ويظبط مقاس الصفحة */}
      <style jsx global>{`
        @media print {
          @page {
            size: 10cm 15cm;
            margin: 6mm;
          }
          body * {
            visibility: hidden;
          }
          .shipment-label,
          .shipment-label * {
            visibility: visible;
          }
          .shipment-label {
            position: absolute;
            inset: 0;
            border-width: 1.5px !important;
          }
        }
      `}</style>
    </div>
  );
}