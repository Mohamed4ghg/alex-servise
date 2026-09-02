import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowLeft, Package, PackageOpen } from "lucide-react";
import { createClient } from "@/utils/supabase/server";

// ألوان الحالات مطابقة لجدول shipment_statuses الحقيقي (color: gray/info/warning/red/success)
const STATUS_COLOR_CLASSES: Record<string, string> = {
  gray: "bg-gray-100 text-gray-600",
  info: "bg-info-100 text-info-600",
  warning: "bg-warning-100 text-warning-600",
  red: "bg-red-100 text-red-600",
  success: "bg-success-100 text-success-600",
};

export default async function CustomerShipmentsPage() {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);

  // بنجيب أسماء وألوان الحالات من الجدول الحقيقي بدل ما نكتبها يدوي
  const { data: statusRows } = await supabase
    .from("shipment_statuses")
    .select("key, label, color")
    .order("sort_order");

  const statusMap: Record<string, { label: string; color: string }> = {};
  statusRows?.forEach((s) => {
    statusMap[s.key] = { label: s.label, color: s.color };
  });

  // الـ RLS بيتكفل بإرجاع شحنات العميل الحالي بس (customer_id = my_customer_id())
  const { data: shipments, error } = await supabase
    .from("shipments")
    .select(
      "id, tracking_number, receiver_name, receiver_area, status, priority, collection_amount, expected_delivery_date, created_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load customer shipments:", error);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-xl font-extrabold text-navy-950 sm:text-2xl">
          شحناتي
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          تابع كل شحناتك وحالتها الحالية من هنا
        </p>
      </div>

      {(!shipments || shipments.length === 0) ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-16 text-center shadow-[var(--shadow-card)]">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <PackageOpen className="h-6 w-6 text-gray-400" />
          </span>
          <p className="mt-4 text-sm font-semibold text-navy-900">
            لسه معندكش أي شحنات
          </p>
          <p className="mt-1 text-xs text-gray-500">
            هتظهر شحناتك هنا أول ما يتم إنشاؤها
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[var(--shadow-card)]">
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-right text-xs text-gray-400">
                  <th className="px-5 py-3 font-medium">رقم الشحنة</th>
                  <th className="px-5 py-3 font-medium">المستلم</th>
                  <th className="px-5 py-3 font-medium">المنطقة</th>
                  <th className="px-5 py-3 font-medium">الحالة</th>
                  <th className="px-5 py-3 font-medium">التحصيل</th>
                  <th className="px-5 py-3 font-medium">التسليم المتوقع</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {shipments.map((s) => {
                  const statusInfo = statusMap[s.status] ?? {
                    label: s.status,
                    color: "gray",
                  };
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/customer/shipments/${s.id}`}
                          className="flex items-center gap-1.5 font-semibold text-navy-900 tnum hover:text-red-600"
                        >
                          <Package className="h-3.5 w-3.5 text-gray-400" />
                          {s.tracking_number}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {s.receiver_name ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {s.receiver_area ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            STATUS_COLOR_CLASSES[statusInfo.color] ??
                            "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-semibold text-navy-900 tnum">
                        {s.collection_amount
                          ? `${Number(s.collection_amount).toLocaleString("ar-EG")} ج.م`
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-gray-600 tnum">
                        {s.expected_delivery_date
                          ? new Date(s.expected_delivery_date).toLocaleDateString("ar-EG")
                          : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/customer/shipments/${s.id}`}
                          className="flex items-center gap-1 text-xs font-semibold text-navy-700 hover:text-red-600"
                        >
                          التفاصيل <ArrowLeft className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}