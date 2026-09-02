"use client";

import { Suspense, useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import {
  AlertCircle,
  BarChart3,
  Bell,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  LifeBuoy,
  Loader2,
  MapPin,
  ShieldCheck,
  User,
} from "lucide-react";

const SIDE_FEATURES = [
  { icon: MapPin, label: "تتبع مباشر", sub: "لمواقع المندوبين" },
  { icon: BarChart3, label: "تقارير دقيقة", sub: "وإحصائيات شاملة" },
  { icon: Bell, label: "إشعارات فورية", sub: "لكل تحديث مهم" },
  { icon: ShieldCheck, label: "أمان عالي", sub: "لحماية بياناتك" },
];

function Logo({ dark }: { dark?: boolean }) {
  return (
    <Image
      src="/images/logo.png"
      alt="Alex Service"
      width={90}
      height={26}
      priority
      className="h-auto w-auto"
    />
  );
}

// ترجمة رسايل الخطأ الشائعة اللي بترجع من Supabase عند تسجيل الدخول
function translateAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials")) {
    return "البريد الإلكتروني أو كلمة المرور غير صحيحة";
  }
  if (lower.includes("email not confirmed")) {
    return "لازم تأكد بريدك الإلكتروني الأول قبل تسجيل الدخول، راجع رسائلك";
  }
  if (lower.includes("too many requests") || lower.includes("rate limit")) {
    return "في محاولات كتير في وقت قصير، برجاء الانتظار شوية وإعادة المحاولة";
  }
  if (lower.includes("network") || lower.includes("fetch failed")) {
    return "في مشكلة في الاتصال بالإنترنت، تأكد من الاتصال وحاول تاني";
  }
  if (lower.includes("user not found")) {
    return "مفيش حساب بالبيانات دي، تأكد من البريد الإلكتروني أو أنشئ حساب جديد";
  }

  return "حصل خطأ أثناء تسجيل الدخول، برجاء المحاولة مرة أخرى";
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const emailId = useId();
  const passwordId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [welcomeName, setWelcomeName] = useState<string | null>(null);
  const [showConfirmedBanner, setShowConfirmedBanner] = useState(
    searchParams.get("confirmed") === "true"
  );

  // نخفي البانر تلقائيًا بعد شوية، وننضّف الرابط من الباراميتر
  useEffect(() => {
    if (!showConfirmedBanner) return;

    window.history.replaceState({}, "", "/login");
    const timer = setTimeout(() => setShowConfirmedBanner(false), 6000);
    return () => clearTimeout(timer);
  }, [showConfirmedBanner]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // رسالة واحدة عامة لأي خطأ في البيانات، من غير ما نكشف هل الإيميل
    // موجود ولا لأ (نفس سلوك الشركات الكبيرة لمنع اكتشاف الإيميلات المسجلة)
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(translateAuthError(signInError.message));
      setLoading(false);
      return;
    }

    // تسجيل الدخول نجح — نجيب اسم صاحب الحساب ونوع حسابه من جدول profiles
    // (باستخدام الجلسة الحالية، آمن لأن RLS بيسمح للمستخدم يشوف صفه بس)
    const userId = signInData.user?.id;
    let fullName: string | null = null;
    let accountType: string | null = null;

    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, account_type")
        .eq("id", userId)
        .maybeSingle();

      fullName = profile?.full_name ?? null;
      accountType = profile?.account_type ?? null;
    }

    // كل نوع حساب ليه وجهته الصحيحة — نفس المناطق اللي الـ middleware بيحميها بالظبط
    const destination =
      accountType === "agent"
        ? "/agent"
        : accountType === "buyer"
        ? "/customer"
        : "/dashboard"; // admin أو office

    setWelcomeName(fullName);
    setLoginSuccess(true);
    setLoading(false);

    // نوري رسالة الترحيب لحظة صغيرة قبل ما نحوّل، زي أغلب التطبيقات الكبيرة
    setTimeout(() => {
      router.push(destination);
      router.refresh();
    }, 700);
  }

  if (loginSuccess) {
    return (
      <main
        className="flex min-h-screen items-center justify-center px-4"
        style={{ backgroundColor: "#0A1730" }}
      >
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-red-500" />
          <p className="mt-4 font-display text-xl font-bold text-white">
            {welcomeName ? `أهلاً بعودتك يا ${welcomeName} 👋` : "جارٍ تحويلك..."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* ===== Brand panel - خلفية صورة - على اليمين ===== */}
      <div
        className="relative order-2 hidden flex-col justify-between overflow-hidden bg-navy-950 bg-cover bg-center p-12 lg:flex xl:p-16"
        style={{ backgroundImage: "url(/images/login-photo.png)" }}
      >
        {/* تراكب غامق عشان النص يبان واضح فوق الصورة */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-navy-950/95 via-navy-950/55 to-navy-950/95" />
        <div className="pointer-events-none absolute inset-0 bg-navy-950/20" />

        <Link href="/" className="relative z-10">
          <Logo dark />
        </Link>

        <div className="relative z-10 mt-10 max-w-lg animate-fade-up xl:mt-12">
          <h1 className="font-display text-3xl font-extrabold leading-[1.3] text-white xl:text-4xl">
            إدارة شحناتك
            <br />
            بذكاء <span className="text-red-500">وسهولة</span>
          </h1>
          <p className="mt-4 text-sm leading-7 text-navy-100/80 xl:text-base">
            منصة متكاملة لإدارة الشحنات والمندوبين والعملاء، مع تتبع مباشر
            وتقارير دقيقة وتحكم كامل من مكان واحد.
          </p>
        </div>

        <div className="relative z-10 mt-auto grid grid-cols-4 gap-3">
          {SIDE_FEATURES.map((f) => (
            <div key={f.label} className="flex flex-col items-center gap-2 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 backdrop-blur-sm">
                <f.icon className="h-4.5 w-4.5 text-red-400" />
              </span>
              <div>
                <p className="text-xs font-bold text-white">{f.label}</p>
                <p className="mt-0.5 text-[10px] leading-4 text-navy-100/60">
                  {f.sub}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Form panel - داكن - على الشمال ===== */}
      <div className="order-1 flex items-center justify-center bg-navy-900 px-4 py-12 sm:px-6 lg:py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Link href="/">
              <Logo dark />
            </Link>
          </div>

          <h2 className="font-display text-2xl font-extrabold text-white">
            تسجيل الدخول
          </h2>
          <p className="mt-1.5 text-sm text-navy-100/70">
            مرحبًا بك في <span className="font-semibold text-red-500">Alex Service</span>
          </p>

          {showConfirmedBanner && (
            <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-success-600/30 bg-success-100/10 px-4 py-3 text-sm text-success-600">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                تم تأكيد بريدك الإلكتروني بنجاح. يمكنك تسجيل الدخول الآن.
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
            <div>
              <label htmlFor={emailId} className="mb-1.5 block text-sm font-semibold text-navy-100">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-100/40" />
                <input
                  id={emailId}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@alexservice.com"
                  dir="ltr"
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pe-3.5 ps-10 text-sm text-white placeholder:text-navy-100/40 transition focus:border-red-500/60 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
              </div>
            </div>

            <div>
              <label htmlFor={passwordId} className="mb-1.5 block text-sm font-semibold text-navy-100">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-100/40" />
                <input
                  id={passwordId}
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pe-10 ps-10 text-sm text-white transition focus:border-red-500/60 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-100/40 transition hover:text-navy-100"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 text-sm">
              <label className="flex items-center gap-2 text-navy-100/70">
                <input type="checkbox" className="h-4 w-4 rounded border-white/20 bg-white/5 text-red-600 focus:ring-red-500" />
                تذكرني
              </label>
              <a href="#" className="font-semibold text-navy-100/80 transition hover:text-red-500">
                نسيت كلمة المرور؟
              </a>
            </div>

            {error && (
              <p className="flex items-center justify-center gap-1.5 text-center text-sm text-red-500">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 py-3 text-sm font-bold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "جارٍ الدخول..." : "تسجيل الدخول"}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-1.5 text-sm text-navy-100/60">
            ليس لديك حساب؟
            <Link href="/sign-up" className="font-semibold text-red-500 hover:text-red-400">
              إنشاء حساب جديد
            </Link>
          </div>

          <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-navy-100/40">
            <LifeBuoy className="h-3.5 w-3.5" />
            تحتاج مساعدة؟
            <a href="#" className="font-semibold text-navy-100/70 hover:text-red-500">
              تواصل مع الدعم الفني
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}