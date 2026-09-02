import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

// دالة مساعدة: بتعمل redirect response جديد لكن بتنقل معاه
// أي كوكيز اتحدثت (زي الـ refreshed session token) من supabaseResponse
function redirectWithCookies(
  url: URL,
  supabaseResponse: NextResponse
): NextResponse {
  const redirectResponse = NextResponse.redirect(url);
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
  });
  return redirectResponse;
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, supabase, user } = await updateSession(request);

  const pathname = request.nextUrl.pathname;

  // كل منطقة مسار مستقل تمامًا، مفيش تداخل
  const isDashboardRoute = pathname.startsWith("/dashboard"); // أدمن/موظفين بس
  const isAgentRoute = pathname.startsWith("/agent");
  const isCustomerRoute = pathname.startsWith("/customer");
  const isProtectedRoute = isDashboardRoute || isAgentRoute || isCustomerRoute;

  if (!isProtectedRoute) {
    return supabaseResponse;
  }

  // مفيش يوزر مسجل دخول أصلاً
  if (!user) {
    return redirectWithCookies(new URL("/login", request.url), supabaseResponse);
  }

  // role هو المصدر الوحيد للصلاحيات (RBAC) - القيم: admin / staff / agent / customer / user
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle(); // مش .single() عشان متديش Error لو الصف مش موجود

  if (profileError) {
    console.error("Middleware: failed to fetch user profile", {
      userId: user.id,
      error: profileError,
    });
    return redirectWithCookies(new URL("/", request.url), supabaseResponse);
  }

  // مسجل دخول لكن معندوش صف profile خالص (حالة غير طبيعية، تحتاج مراجعة)
  if (!profile) {
    console.error("Middleware: authenticated user has no profile row", {
      userId: user.id,
    });
    return redirectWithCookies(new URL("/login", request.url), supabaseResponse);
  }

  const role = profile.role;

  // مندوب بيحاول يدخل مكان مش بتاعه
  if (isAgentRoute && role !== "agent" && role !== "admin") {
    return redirectWithCookies(new URL("/", request.url), supabaseResponse);
  }

  // عميل بيحاول يدخل مكان مش بتاعه
  if (isCustomerRoute && role !== "customer" && role !== "admin") {
    return redirectWithCookies(new URL("/", request.url), supabaseResponse);
  }

  // لوحة الأدمن/الموظفين: مسموح بس لـ admin و staff
  if (isDashboardRoute && role !== "admin" && role !== "staff") {
    return redirectWithCookies(new URL("/", request.url), supabaseResponse);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};