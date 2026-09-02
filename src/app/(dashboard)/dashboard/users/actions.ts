"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { logActivity } from "@/utils/log-activity";

type ActionResult = { success: true } | { success: false; error: string };

// يتحقق إن المستخدم الحالي أدمن قبل أي عملية حساسة — مش بس على الواجهة،
// لأن أي حد يقدر يستدعي الـ Server Action مباشرة لو مش اتحقق هنا
async function requireAdmin() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.account_type !== "admin") throw new Error("unauthorized");

  return user;
}

export async function inviteOfficeStaff(input: {
  fullName: string;
  email: string;
  phone?: string;
}): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { success: false, error: "غير مصرح لك بهذا الإجراء" };
  }

  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();

  if (!email || !fullName) {
    return { success: false, error: "الاسم والبريد الإلكتروني مطلوبين" };
  }

  const admin = createAdminClient();

  // بيبعت إيميل دعوة فيه لينك، الموظف بيحدد الباسورد بنفسه من خلاله
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    email,
    {
      data: { full_name: fullName },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/accept-invite`,
    }
  );

  if (inviteError || !invited.user) {
    return {
      success: false,
      error: inviteError?.message.includes("already registered")
        ? "في مستخدم مسجل بالإيميل ده بالفعل"
        : "تعذر إرسال الدعوة، برجاء المحاولة مرة أخرى",
    };
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: invited.user.id,
    email,
    full_name: fullName,
    phone: input.phone?.trim() || null,
    account_type: "office",
    is_active: true,
  });

  if (profileError) {
    console.error("Office profile upsert error:", profileError.message);
    return { success: false, error: "تم إرسال الدعوة لكن حصل خطأ في حفظ بيانات الموظف" };
  }

  await logActivity({
    action: "دعا موظف مكتب جديد",
    entityType: "profile",
    entityId: invited.user.id,
    entityLabel: fullName,
  });

  revalidatePath("/users");
  return { success: true };
}