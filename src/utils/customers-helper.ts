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

const CUSTOMER_COLUMNS = "id, full_name, name, phone, user_id";

/**
 * إنشاء سجل عميل (للأدمن/الـ staff).
 *
 * مهم: العميل الجديد بيتسجل من غير user_id (مش مربوط بحساب)، والمستخدم الحالي
 * بيتسجل في created_by بس. قبل كده كان بيتربط بحساب اللي بينشئه، وده كان بيخلي
 * الأدمن يبقى "مالك" لكل العملاء اللي بيضيفهم.
 *
 * لو فيه عميل بنفس رقم التليفون بيرجّعه زي ما هو بدل ما يكرره.
 *
 * لو المطلوب ربط حساب العميل الحالي بسجل عميل (صفحة العميل)، استخدم
 * getOrCreateMyCustomer بدلها.
 */
export async function createCustomer(
  input: NewCustomerInput
): Promise<{ customer: Customer | null; error: string | null }> {
  const supabase = createClient();
  const type = input.customerType ?? "individual";
  const phone = input.phone.trim();

  const { data: userData } = await supabase.auth.getUser();
  const createdBy = userData?.user?.id ?? null;

  // لو فيه عميل بنفس التليفون، رجّعه من غير ما تغير ربطه بأي حساب
  if (phone) {
    const { data: existing } = await supabase
      .from("customers")
      .select(CUSTOMER_COLUMNS)
      .eq("phone", phone)
      .limit(1)
      .maybeSingle();

    if (existing) return { customer: existing, error: null };
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({
      full_name: input.fullName.trim(),
      name: input.fullName.trim(),
      customer_type: type,
      type,
      company_name: type === "company" ? input.companyName?.trim() || null : null,
      phone: phone || null,
      email: input.email?.trim() || null,
      city: input.city?.trim() || null,
      address: input.address?.trim() || null,
      notes: input.notes?.trim() || null,
      user_id: null,
      created_by: createdBy,
    })
    .select(CUSTOMER_COLUMNS)
    .single();

  if (error) {
    console.error("createCustomer error:", error.message);
    return { customer: null, error: "تعذر إضافة العميل، برجاء المحاولة مرة أخرى" };
  }

  return { customer: data, error: null };
}

/**
 * سجل العميل الخاص بالمستخدم الحالي (لصفحة العميل).
 * بيدور بالـ user_id الأول، ولو مفيش بيربط عميل موجود بنفس الرقم، ولو مفيش
 * بينشئ عميل جديد. الدالة دي بتشتغل في الداتابيز (find-or-link-or-create)
 * عشان مفيش تكرار ولا مشاكل صلاحيات.
 */
export async function getOrCreateMyCustomer(input: {
  fullName: string;
  phone: string;
}): Promise<{ customer: Customer | null; error: string | null }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .rpc("get_or_create_my_customer", {
      p_name: input.fullName,
      p_phone: input.phone,
    })
    .single();

  if (error || !data) {
    console.error("getOrCreateMyCustomer error:", error?.message);
    return { customer: null, error: "تعذر ربط حسابك كعميل، برجاء المحاولة مرة أخرى" };
  }

  const c = data as Customer;
  return {
    customer: { id: c.id, full_name: c.full_name, name: c.name, phone: c.phone, user_id: c.user_id },
    error: null,
  };
}