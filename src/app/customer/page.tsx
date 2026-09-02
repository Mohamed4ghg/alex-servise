import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { StatCard } from "@/components/customer/StatCard";
import { RecentShipments } from "@/components/customer/RecentShipments";
import { Package, Truck, CheckCircle2, Clock, UserX } from "lucide-react";

const IN_TRANSIT_KEYS = ["assigned", "picked_up", "in_transit"];

export default async function CustomerDashboardPage() {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "زائر";

  // ⚠️ العميل مالوش SELECT policy على customers مباشرة.
  // my_customer_id() هي الـ RPC الرسمية (SECURITY DEFINER) اللي بتتخطى الـ RLS بأمان.
  const { data: customerId } = await supabase.rpc("my_customer_id");

  // لو الحساب مسجل كعميل بس لسه ملوش صف في customers (حالة نادرة)،
  // بنوريه رسالة واضحة بدل داشبورد فاضي بصمت من غير سبب
  if (!customerId) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center px-6 py-24 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-warning-100">
          <UserX className="h-7 w-7 text-warning-600" />
        </span>
        <h1 className="mt-6 font-display text-xl font-bold text-navy-950">
          حسابك لسه مش مربوط ببيانات عميل
        </h1>
        <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500">
          تواصل مع الدعم لربط حسابك، وهتقدر بعدها تشوف كل شحناتك وحالتها هنا.
        </p>
      </div>
    );
  }

  // بنقسّم الاستعلام لاتنين بدل ما نجيب كل الأعمدة لكل الشحنات مرة واحدة:
  // 1) استعلام خفيف على status بس لحساب الإحصائيات، حتى لو عنده مئات الشحنات
  // 2) استعلام تاني محدود بـ 5 بس، للعرض في "أحدث الشحنات"
  const [{ data: statusRows, error: statsError }, { data: recentRows, error: recentError }, { data: statuses }] =
    await Promise.all([
      supabase.from("shipments").select("status").eq("customer_id", customerId),
      supabase
        .from("shipments")
        .select(
          "id, tracking_number, status, receiver_area, receiver_address, value, collection_amount, created_at"
        )
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("shipment_statuses")
        .select("key, label, color")
        .eq("is_active", true),
    ]);

  const statusMap = Object.fromEntries(
    (statuses ?? []).map((s) => [s.key, { label: s.label, color: s.color }])
  );

  const allStatuses = statusRows ?? [];

  const stats = {
    total: allStatuses.length,
    inTransit: allStatuses.filter((s) => IN_TRANSIT_KEYS.includes(s.status ?? ""))
      .length,
    delivered: allStatuses.filter((s) => s.status === "delivered").length,
    pending: allStatuses.filter((s) => s.status === "pending").length,
  };

  // نتأكد إن القيم المالية أرقام فعلية قبل ما توصل لمكونات العرض
  const recentShipments = (recentRows ?? []).map((s) => ({
    ...s,
    value: s.value != null ? Number(s.value) : null,
    collection_amount:
      s.collection_amount != null ? Number(s.collection_amount) : null,
  }));

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8 flex flex-col gap-1">
        <h1 className="font-display text-2xl font-extrabold text-navy-950">
          أهلاً، {userName} 👋
        </h1>
        <p className="text-sm text-gray-500">
          نظرة سريعة على شحناتك وحالتها الحالية
        </p>
      </div>

      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="إجمالي الشحنات" value={stats.total} icon={Package} accent="navy" />
        <StatCard label="شحنات جارية" value={stats.inTransit} icon={Truck} accent="blue" />
        <StatCard label="تم التسليم" value={stats.delivered} icon={CheckCircle2} accent="green" />
        <StatCard label="قيد الانتظار" value={stats.pending} icon={Clock} accent="amber" />
      </div>

      <RecentShipments
        shipments={recentShipments}
        statusMap={statusMap}
        error={!!statsError || !!recentError}
      />
    </div>
  );
}