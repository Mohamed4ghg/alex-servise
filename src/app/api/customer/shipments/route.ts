import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

function generateTrackingNumber() {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `ASE-${datePart}-${randomPart}`;
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);

  // 1) التحقق من الهوية
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  // 2) قراءة البيانات والتحقق منها
  const body = await request.json();
  const {
    receiver_name,
    receiver_phone,
    receiver_address,
    receiver_area,
    receiver_notes,
    type,
    description,
    weight_kg,
    pieces_count,
    value,
    priority,
    expected_delivery_date,
  } = body;

  if (!receiver_name || !receiver_phone || !receiver_address) {
    return NextResponse.json(
      { error: "اسم المستلم وتليفونه وعنوانه مطلوبين" },
      { status: 400 }
    );
  }

  // 3) نجيب customer_id بتاع اليوزر عن طريق الـ RPC الآمنة
  const { data: existingCustomerId } = await supabase.rpc("my_customer_id");

  let customerId = existingCustomerId as string | null;

  const admin = createAdminClient();

  // 4) لو أول مرة، ننشئله صف عميل تلقائيًا من بيانات الـ profile بتاعه
  if (!customerId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone, address, email")
      .eq("id", user.id)
      .single();

    const newCustomerId = randomUUID();

    const { error: customerInsertError } = await admin.from("customers").insert({
      id: newCustomerId,
      name: profile?.full_name || user.email?.split("@")[0] || "عميل",
      full_name: profile?.full_name || null,
      phone: profile?.phone || null,
      address: profile?.address || null,
      email: profile?.email || user.email || null,
      customer_type: "individual",
      type: "individual",
      user_id: user.id,
      created_by: user.id,
    });

    if (customerInsertError) {
      return NextResponse.json(
        { error: "حصل خطأ أثناء إنشاء ملف العميل" },
        { status: 500 }
      );
    }

    customerId = newCustomerId;
  }

  // 5) إنشاء الشحنة — status ثابت "pending" مفروض من السيرفر، مش من العميل
  const { data: shipment, error: insertError } = await admin
    .from("shipments")
    .insert({
      id: randomUUID(),
      tracking_number: generateTrackingNumber(),
      customer_id: customerId,
      receiver_name,
      receiver_phone,
      receiver_address,
      receiver_area: receiver_area || null,
      receiver_notes: receiver_notes || null,
      type: type || null,
      description: description || null,
      weight_kg: weight_kg || null,
      pieces_count: pieces_count || null,
      value: value || null,
      collection_amount: null, // ⚠️ بيتحدد لاحقًا من الموظف — مفيش تسعير تلقائي حاليًا
      status: "pending",
      priority: priority || "normal",
      expected_delivery_date: expected_delivery_date || null,
    })
    .select("id, tracking_number")
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: "حصل خطأ أثناء إنشاء الشحنة" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, shipment });
}