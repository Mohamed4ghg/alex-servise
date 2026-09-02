"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

type CreateStaffResult = { success: boolean; error?: string };

export async function createStaffAccount(
  fullName: string,
  email: string,
  password: string
): Promise<CreateStaffResult> {
  // ===== الخطوة 1: تحقق إن اللي بيستدعي الفانكشن ده فعلاً أدمن =====
  // (طبقة حماية إضافية، حتى لو حد حاول ينادي الفانكشن مباشرة متجاوزًا الواجهة)
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "لازم تكون مسجل دخول" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { success: false, error: "الصلاحية دي للأدمن بس" };
  }

  // ===== الخطوة 2: إنشاء الحساب باستخدام صلاحيات الأدمن الخاصة =====
  if (!fullName.trim() || !email.trim() || password.length < 8) {
    return { success: false, error: "البيانات ناقصة أو كلمة المرور أقصر من 8 أحرف" };
  }

  const adminClient = createAdminClient();

  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true, // مش محتاج تأكيد إيميل، الأدمن هو اللي بيعمله يدوي
    user_metadata: {
      full_name: fullName.trim(),
      account_type: "staff",
    },
  });

  if (createError || !newUser.user) {
    console.error("Create staff error:", createError?.message);
    return {
      success: false,
      error: createError?.message.includes("already registered")
        ? "البريد الإلكتروني ده مسجل بالفعل"
        : "تعذر إنشاء الحساب، برجاء المحاولة مرة أخرى",
    };
  }

  // ===== الخطوة 3: تأكيد الـ role = staff =====
  // الـ trigger هيحط role حسب account_type، لكن نتأكد يدوي هنا كمان للأمان
  const { error: updateError } = await adminClient
    .from("profiles")
    .update({ role: "staff", account_type: "staff" })
    .eq("id", newUser.user.id);

  if (updateError) {
    console.error("Update staff role error:", updateError.message);
    return { success: false, error: "الحساب اتعمل لكن حصلت مشكلة في تحديد الصلاحية، راجع الداتابيز" };
  }

  return { success: true };
}