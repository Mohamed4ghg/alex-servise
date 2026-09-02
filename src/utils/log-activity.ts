import { createClient } from "@/utils/supabase/client";

type LogActivityInput = {
  action: string; // مثال: "أنشأ شحنة جديدة"
  entityType?: string; // مثال: "shipment"
  entityId?: string;
  entityLabel?: string; // مثال: "شحنة #TRK-2024-00125"
  metadata?: Record<string, unknown>;
};

/**
 * تسجيل حدث في سجل الأنشطة. استخدمها في أي مكان بعد أي عملية مهمة
 * (إنشاء شحنة، تحديث حالة، إسناد مندوب، إلخ).
 *
 * مثال الاستخدام:
 * await logActivity({
 *   action: "أنشأ شحنة جديدة",
 *   entityType: "shipment",
 *   entityId: shipment.id,
 *   entityLabel: `شحنة #${shipment.tracking_number}`,
 * });
 */
export async function logActivity({
  action,
  entityType,
  entityId,
  entityLabel,
  metadata,
}: LogActivityInput) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return; // مفيش مستخدم مسجل دخول، متسجلش حاجة

  // نجيب اسم المستخدم من profiles عشان نخزنه مباشرة في السجل
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const { error } = await supabase.from("activity_logs").insert({
    actor_id: user.id,
    actor_name: profile?.full_name ?? user.email ?? "مستخدم",
    action,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    entity_label: entityLabel ?? null,
    metadata: metadata ?? null,
  });

  if (error) {
    console.error("logActivity error:", error.message);
  }
}