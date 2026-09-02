"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function deleteMyAccount(): Promise<{ success: boolean; error?: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "لازم تكون مسجل دخول" };
  }

  const adminClient = createAdminClient();

  // نفك ربط سجل العميل من الحساب (بنسيب سجلات الشحنات القديمة زي ما هي
  // للسجلات المالية/المحاسبية، بس بنشيل الربط بحساب الدخول اللي هيتمسح)
  await adminClient.from("customers").update({ user_id: null }).eq("user_id", user.id);

  // امسح صف البروفايل
  const { error: profileError } = await adminClient
    .from("profiles")
    .delete()
    .eq("id", user.id);

  if (profileError) {
    console.error("Delete profile error:", profileError.message);
    return { success: false, error: "تعذر حذف بيانات الحساب" };
  }

  // امسح حساب الدخول نفسه من Supabase Auth
  const { error: authError } = await adminClient.auth.admin.deleteUser(user.id);

  if (authError) {
    console.error("Delete auth user error:", authError.message);
    return { success: false, error: "تعذر حذف الحساب، برجاء المحاولة مرة أخرى" };
  }

  return { success: true };
}