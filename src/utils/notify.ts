import { createClient } from "@/utils/supabase/client";

type NotificationType = "info" | "success" | "warning" | "danger";

type NotifyInput = {
  userId: string; // المستخدم اللي هيوصله الإشعار
  type?: NotificationType;
  title: string;
  message: string;
  link?: string;
};

/**
 * إرسال إشعار لمستخدم معيّن. استخدمها بعد أي حدث يهم المستخدم ده،
 * مثال: إسناد شحنة له، تغيير حالة شحنة يتابعها، تحصيل جديد، إلخ.
 *
 * مثال الاستخدام:
 * await notify({
 *   userId: agent.id,
 *   type: "info",
 *   title: "شحنة جديدة",
 *   message: "تم إسناد شحنة #TRK-2024-00125 إليك",
 *   link: "/dashboard/shipments/123",
 * });
 */
export async function notify({
  userId,
  type = "info",
  title,
  message,
  link,
}: NotifyInput) {
  const supabase = createClient();

  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    message,
    link: link ?? null,
  });

  if (error) {
    console.error("notify error:", error.message);
  }
}