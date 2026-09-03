"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

type ActionResult = { success: boolean; error?: string };

async function requireStaffOrAdmin() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { authorized: false as const, error: "لازم تكون مسجل دخول" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" && profile?.role !== "staff") {
    return { authorized: false as const, error: "الصلاحية دي للأدمن أو الموظفين بس" };
  }

  return { authorized: true as const };
}

// ===== 1) تغيير كلمة المرور لأي حساب =====
export async function adminResetPassword(
  userId: string,
  newPassword: string
): Promise<ActionResult> {
  const check = await requireStaffOrAdmin();
  if (!check.authorized) return { success: false, error: check.error };

  if (newPassword.length < 8) {
    return { success: false, error: "كلمة المرور لازم تكون 8 أحرف على الأقل" };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) {
    console.error("Reset password error:", error.message);
    return { success: false, error: "تعذر تغيير كلمة المرور، حاول تاني" };
  }

  return { success: true };
}

// ===== 2) تحويل الرول من عميل لمندوب أو العكس =====
export async function adminChangeUserRole(
  userId: string,
  newRole: "customer" | "agent"
): Promise<ActionResult> {
  const check = await requireStaffOrAdmin();
  if (!check.authorized) return { success: false, error: check.error };

  const adminClient = createAdminClient();

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role, full_name, phone, email")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return { success: false, error: "الحساب مش موجود" };
  }

  if (profile.role !== "customer" && profile.role !== "agent") {
    return { success: false, error: "الحساب ده مش عميل ولا مندوب، مينفعش نحوّله" };
  }

  if (profile.role === newRole) {
    return { success: false, error: "الحساب أصلاً بنفس النوع ده" };
  }

  // امسح الصف من الجدول القديم (بناءً على user_id مش id)
  const oldTable = profile.role === "customer" ? "customers" : "agents";
  const { error: deleteError } = await adminClient
    .from(oldTable)
    .delete()
    .eq("user_id", userId);

  if (deleteError) {
    console.error("Delete old record error:", deleteError.message);
    return { success: false, error: "حصلت مشكلة أثناء نقل الحساب" };
  }

  // اعمل صف جديد في الجدول الجديد
  if (newRole === "agent") {
    const { error: insertError } = await adminClient.from("agents").insert({
      id: crypto.randomUUID(),
      name: profile.full_name ?? "مندوب جديد",
      phone: profile.phone,
      user_id: userId,
    });
    if (insertError) {
      console.error("Insert agent error:", insertError.message);
      return { success: false, error: "حصلت مشكلة أثناء إنشاء بيانات المندوب" };
    }
  } else {
    const { error: insertError } = await adminClient.from("customers").insert({
      id: crypto.randomUUID(),
      name: profile.full_name ?? "عميل جديد",
      full_name: profile.full_name,
      phone: profile.phone,
      email: profile.email,
      user_id: userId,
    });
    if (insertError) {
      console.error("Insert customer error:", insertError.message);
      return { success: false, error: "حصلت مشكلة أثناء إنشاء بيانات العميل" };
    }
  }

  // حدّث الـ role في profiles
  const { error: updateRoleError } = await adminClient
    .from("profiles")
    .update({ role: newRole, account_type: newRole })
    .eq("id", userId);

  if (updateRoleError) {
    console.error("Update role error:", updateRoleError.message);
    return { success: false, error: "الحساب اتنقل لكن حصلت مشكلة في تحديث الصلاحية" };
  }

  return { success: true };
}

// ===== 3) حظر / إلغاء حظر حساب =====
export async function adminSetUserBan(
  userId: string,
  banned: boolean
): Promise<ActionResult> {
  const check = await requireStaffOrAdmin();
  if (!check.authorized) return { success: false, error: check.error };

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: banned ? "876000h" : "none",
  });

  if (error) {
    console.error("Ban user error:", error.message);
    return { success: false, error: "تعذر تنفيذ العملية" };
  }

  return { success: true };
}

// ===== 4) إنشاء حساب موظف جديد =====
export async function createStaffAccount(
  fullName: string,
  email: string,
  password: string
): Promise<ActionResult> {
  const check = await requireStaffOrAdmin();
  if (!check.authorized) return { success: false, error: check.error };

  if (!fullName.trim()) {
    return { success: false, error: "الاسم مطلوب" };
  }

  if (password.length < 8) {
    return { success: false, error: "كلمة المرور لازم تكون 8 أحرف على الأقل" };
  }

  const adminClient = createAdminClient();

  // اعمل يوزر جديد في auth
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    console.error("Create staff auth user error:", authError?.message);
    return { success: false, error: "تعذر إنشاء الحساب، البريد الإلكتروني ممكن يكون مستخدم بالفعل" };
  }

  const userId = authData.user.id;

  // اعمل صف في profiles بدور staff
  const { error: profileError } = await adminClient.from("profiles").upsert({
    id: userId,
    full_name: fullName,
    email,
    role: "staff",
    account_type: "staff",
  });

  if (profileError) {
    console.error("Create staff profile error:", profileError.message);
    // نظف اليوزر اللي اتعمل في auth لو فشل إنشاء البروفايل
    await adminClient.auth.admin.deleteUser(userId);
    return { success: false, error: "حصلت مشكلة أثناء إنشاء بيانات الموظف" };
  }

  return { success: true };
}