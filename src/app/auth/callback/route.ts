import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

// Supabase بيرجّع المستخدم هنا بعد ما يضغط على رابط تأكيد الإيميل
// (أو أي رابط auth تاني زي "نسيت كلمة المرور")
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // نعمل تسجيل خروج فورًا بعد التأكيد عشان نفرض عليه تسجيل دخول واعي
      // بدل ما يدخل تلقائي على طول (سلوك احترافي زي الشركات الكبيرة)
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/login?confirmed=true`);
    }
  }

  // لو الكود مش موجود أو حصل خطأ أثناء التفعيل
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}