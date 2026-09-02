import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const body = await request.json();
  const { lat, lng } = body;

  if (typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json({ error: "إحداثيات غير صحيحة" }, { status: 400 });
  }

  // نتأكد من هوية المندوب عن طريق الـ RPC الآمنة
  const { data: agentId } = await supabase.rpc("my_agent_id");

  if (!agentId) {
    return NextResponse.json({ error: "الحساب مش مربوط بمندوب" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { error: updateError } = await admin
    .from("agents")
    .update({
      lat,
      lng,
      last_seen: new Date().toISOString(),
      status: "online",
    })
    .eq("id", agentId);

  if (updateError) {
    return NextResponse.json({ error: "حصل خطأ أثناء تحديث الموقع" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { data: agentId } = await supabase.rpc("my_agent_id");

  if (!agentId) {
    return NextResponse.json({ error: "الحساب مش مربوط بمندوب" }, { status: 403 });
  }

  const admin = createAdminClient();

  await admin
    .from("agents")
    .update({ status: "offline" })
    .eq("id", agentId);

  return NextResponse.json({ success: true });
}