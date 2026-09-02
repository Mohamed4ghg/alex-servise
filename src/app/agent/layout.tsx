import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { AlertTriangle, Headset, LogOut } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { AgentSidebar } from "@/components/agent/AgentSidebar";

// Server Action للخروج - لازم
async function signOut() {
  "use server";
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // نجيب الاتنين مرة واحدة - أسرع
  const [{ data: profile }, { data: agent }] = await Promise.all([
    supabase.from("profiles").select("account_type, full_name").eq("id", user.id).maybeSingle(),
    supabase.from("agents").select("id, name").eq("user_id", user.id).maybeSingle(),
  ]);

  // لو مالوش بروفايل أصلاً - ده حساب بايظ
  if (!profile) {
    redirect("/login");
  }

  const isAgent = profile.account_type === "agent";
  const isAdmin = profile.account_type === "admin";

  // حماية - مش مندوب ولا أدمن
  if (!isAgent && !isAdmin) {
    redirect("/"); // أو صفحة /unauthorized
  }

  // مندوب بس مش مربوط بجدول agents
  if (isAgent && !agent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a1020] px-4" dir="rtl">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white p-8 text-center shadow-2xl">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
            <AlertTriangle className="h-7 w-7 text-amber-600" />
          </span>
          <h1 className="mt-6 font-display text-xl font-bold text-gray-900">
            حسابك لسه مش مربوط
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-500">
            حسابك متسجل كمندوب لكن مش مربوط بأي بيانات في جدول المناديب.
            كلم الإدارة تربط حسابك ب ID المندوب.
          </p>
          <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-left font-mono text-xs text-gray-400" dir="ltr">
            UID: {user.id.slice(0, 8)}...
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <form action={signOut}>
              <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-black">
                <LogOut className="h-4 w-4" />
                خروج
              </button>
            </form>
            <Link
              href="https://wa.me/201000000000"
              className="flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
            >
              <Headset className="h-4 w-4" />
              الإدارة
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const displayName =
    agent?.name || profile.full_name || user.email?.split("@")[0] || "مستخدم";

  // كله تمام - الأدمن مسموح له يدخل حتى لو مالوش صف agent
  return (
    <div className="min-h-screen bg-[#f6f7f9]" dir="rtl">
      <AgentSidebar agentName={displayName} />
      <main className="lg:pr-64">{children}</main>
    </div>
  );
}