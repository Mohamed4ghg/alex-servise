import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import UsersPageClient from "./users-page-client";

// Server Component: بيتحقق من صلاحية المستخدم قبل ما الصفحة تتحمل أصلاً.
// لو مش مدير، بيتحوّل بعيد فورًا من غير ما يشوف أي محتوى من الصفحة خالص.
// جلب قائمة المستخدمين نفسها بيحصل جوه UsersPageClient على الكلاينت.
export default async function UsersPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.account_type !== "admin") {
    redirect("/dashboard?error=unauthorized");
  }

  return <UsersPageClient />;
}