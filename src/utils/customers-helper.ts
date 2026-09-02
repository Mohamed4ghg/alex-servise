import { createClient } from "@/utils/supabase/client";

export type NewCustomerInput = {
  fullName: string;
  phone: string;
  customerType?: "individual" | "company";
  companyName?: string;
  email?: string;
  city?: string;
  address?: string;
  notes?: string;
};

export type Customer = {
  id: string;
  full_name: string | null;
  name: string | null;
  phone: string;
  user_id?: string | null;
};

/**
 * إنشاء عميل جديد أو ربط عميل موجود بحساب المستخدم الحالي.
 * لو فيه عميل بنفس رقم التليفون من غير حساب مربوط، بيتم ربطه
 * بدل عمل تكرار.
 */
export async function createCustomer(
  input: NewCustomerInput
): Promise<{ customer: Customer | null; error: string | null }> {
  const supabase = createClient();
  const type = input.customerType ?? "individual";
  const phone = input.phone.trim();

  // هات المستخدم الحالي لو مسجل دخول
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id ?? null;

  // لو فيه يوزر مسجل دخول، شوف هل فيه عميل بنفس التليفون أصلاً
  if (userId) {
    const { data: existing } = await supabase
      .from("customers")
      .select("id, full_name, name, phone, user_id")
      .eq("phone", phone)
      .maybeSingle();

    if (existing) {
      // لو موجود ومش مربوط بحد، اربطه بالحساب الحالي
      if (!existing.user_id) {
        const { data: updated, error: updateError } = await supabase
          .from("customers")
          .update({ user_id: userId })
          .eq("id", existing.id)
          .select("id, full_name, name, phone, user_id")
          .single();

        if (updateError) {
          console.error("link customer error:", updateError.message);
          return { customer: null, error: "تعذر ربط العميل، برجاء المحاولة مرة أخرى" };
        }
        return { customer: updated, error: null };
      }
      // موجود ومربوط بالفعل (بنفس اليوزر أو غيره) - رجّعه زي ما هو
      return { customer: existing, error: null };
    }
  }

  // مفيش عميل بنفس التليفون، اعمل واحد جديد
  const { data, error } = await supabase
    .from("customers")
    .insert({
      full_name: input.fullName.trim(),
      name: input.fullName.trim(),
      customer_type: type,
      type,
      company_name: type === "company" ? input.companyName?.trim() || null : null,
      phone,
      email: input.email?.trim() || null,
      city: input.city?.trim() || null,
      address: input.address?.trim() || null,
      notes: input.notes?.trim() || null,
      user_id: userId,
    })
    .select("id, full_name, name, phone, user_id")
    .single();

  if (error) {
    console.error("createCustomer error:", error.message);
    return { customer: null, error: "تعذر إضافة العميل، برجاء المحاولة مرة أخرى" };
  }

  return { customer: data, error: null };
}