"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  Building2,
  CheckCircle2,
  Gauge,
  Headphones,
  IdCard,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Truck,
  User,
  UserPlus,
} from "lucide-react";

const SIDE_FEATURES = [
  { icon: ShieldCheck, title: "أمان عالي", desc: "حماية بياناتك ومعلوماتك" },
  { icon: Gauge, title: "تقارير لحظية", desc: "احصل على تقارير دقيقة في أي وقت" },
  { icon: Headphones, title: "دعم متواصل", desc: "فريق دعم جاهز لمساعدتك 24/7" },
  { icon: Bell, title: "إشعارات فورية", desc: "تابع كل تحديث لحظة بلحظة" },
];

type AccountType = "buyer" | "agent";

const ACCOUNT_TYPES: {
  value: AccountType;
  title: string;
  icon: React.ElementType;
}[] = [
  { value: "buyer", title: "مشتري", icon: ShoppingBag },
  { value: "agent", title: "مندوب توصيل", icon: Truck },
];

// ترجمة رسايل الخطأ الشائعة اللي بترجع من Supabase للعربي
function translateAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("user already registered") || lower.includes("already been registered")) {
    return "البريد الإلكتروني ده مسجل بالفعل، جرب تسجل الدخول بدل كده";
  }
  if (lower.includes("password should be at least")) {
    return "كلمة المرور لازم تكون 8 أحرف على الأقل";
  }
  if (lower.includes("unable to validate email") || lower.includes("invalid email")) {
    return "البريد الإلكتروني غير صحيح، تأكد من كتابته بشكل سليم";
  }
  if (lower.includes("rate limit") || lower.includes("only request this after")) {
    return "في محاولات كتير في وقت قصير، برجاء الانتظار شوية وإعادة المحاولة";
  }
  if (lower.includes("network") || lower.includes("fetch failed")) {
    return "في مشكلة في الاتصال بالإنترنت، تأكد من الاتصال وحاول تاني";
  }
  if (lower.includes("weak password")) {
    return "كلمة المرور ضعيفة، استخدم كلمة مرور أقوى";
  }

  return "حصل خطأ أثناء إنشاء الحساب، برجاء المحاولة مرة أخرى";
}

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

// ===== منطق التحقق (Validation) =====
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EGYPT_PHONE_REGEX = /^01[0125][0-9]{8}$/;

function getPasswordStrength(password: string): {
  score: 0 | 1 | 2 | 3;
  label: string;
  color: string;
} {
  if (!password) return { score: 0, label: "", color: "" };

  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: "ضعيفة", color: "bg-red-500" };
  if (score === 2) return { score: 2, label: "متوسطة", color: "bg-warning-600" };
  return { score: 3, label: "قوية", color: "bg-success-600" };
}

type FieldErrors = {
  fullName?: string;
  businessName?: string;
  nationalId?: string;
  email?: string;
  phone?: string;
  address?: string;
  vehicleType?: string;
  region?: string;
  password?: string;
  confirmPassword?: string;
  agree?: string;
};

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createClient();

  const [agree, setAgree] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("buyer");
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: "",
    businessName: "",
    email: "",
    phone: "",
    address: "",
    vehicleType: "",
    region: "",
    nationalId: "",
    password: "",
    confirmPassword: "",
  });

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function markTouched(field: string) {
    setTouched((t) => ({ ...t, [field]: true }));
  }

  const errors: FieldErrors = useMemo(() => {
    const e: FieldErrors = {};

    if (!form.fullName.trim()) {
      e.fullName = "الاسم الكامل مطلوب";
    } else if (form.fullName.trim().length < 3) {
      e.fullName = "الاسم لازم يكون 3 أحرف على الأقل";
    }

    if (accountType === "agent" && !form.nationalId.trim()) {
      e.nationalId = "الرقم القومي مطلوب";
    } else if (accountType === "agent" && !/^\d{14}$/.test(form.nationalId.trim())) {
      e.nationalId = "الرقم القومي لازم يكون 14 رقم";
    }

    if (!form.email.trim()) {
      e.email = "البريد الإلكتروني مطلوب";
    } else if (!EMAIL_REGEX.test(form.email.trim())) {
      e.email = "صيغة البريد الإلكتروني غير صحيحة";
    }

    if (!form.phone.trim()) {
      e.phone = "رقم الهاتف مطلوب";
    } else if (!EGYPT_PHONE_REGEX.test(form.phone.trim())) {
      e.phone = "رقم الهاتف غير صحيح (مثال: 01012345678)";
    }

    if (accountType === "agent" && !form.vehicleType) {
      e.vehicleType = "اختر نوع المركبة";
    }

    if (accountType === "agent" && !form.region.trim()) {
      e.region = "المنطقة مطلوبة";
    }

    if (!form.password) {
      e.password = "كلمة المرور مطلوبة";
    } else if (form.password.length < 8) {
      e.password = "كلمة المرور لازم تكون 8 أحرف على الأقل";
    }

    if (!form.confirmPassword) {
      e.confirmPassword = "تأكيد كلمة المرور مطلوب";
    } else if (form.confirmPassword !== form.password) {
      e.confirmPassword = "كلمة المرور غير متطابقة";
    }

    if (!agree) {
      e.agree = "لازم توافق على الشروط والأحكام";
    }

    return e;
  }, [form, accountType, agree]);

  const isValid = Object.keys(errors).length === 0;
  const passwordStrength = getPasswordStrength(form.password);

  function shouldShowError(field: keyof FieldErrors) {
    return (touched[field] || attemptedSubmit) && !!errors[field];
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setAttemptedSubmit(true);

    if (!isValid) {
      return;
    }

    setLoading(true);

    // فحص مسبق: هل رقم الهاتف ده مسجل قبل كده في جدول profiles؟
    // (رقم الهاتف مش identity حقيقي في Supabase Auth، فلازم نتحقق منه يدويًا)
    const { data: existingPhone, error: phoneCheckError } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone", form.phone)
      .maybeSingle();

    if (phoneCheckError) {
      // لو الجدول أو العمود اسمه مختلف، هيظهر تفاصيل الإيرور هنا في الـ console
      console.error("Phone check error:", phoneCheckError.message, phoneCheckError);
    }

    if (existingPhone) {
      setSubmitError("رقم الهاتف ده مسجل بالفعل، جرب تسجل الدخول بدل كده");
      setLoading(false);
      return;
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        // بعد الضغط على رابط التأكيد في الإيميل، Supabase هيرجّع المستخدم للمسار ده
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: form.fullName,
          account_type: accountType,
          business_name: accountType === "buyer" ? form.businessName : null,
          national_id: accountType === "agent" ? form.nationalId : null,
          phone: form.phone,
          address: accountType === "buyer" ? form.address : null,
          vehicle_type: accountType === "agent" ? form.vehicleType : null,
          region: accountType === "agent" ? form.region : null,
        },
      },
    });

    if (signUpError) {
      // === سطر تشخيص مؤقت: هيوريك رسالة الخطأ الحقيقية والكود بتاعها في الـ Console ===
      console.error("RAW signUp error:", {
        message: signUpError.message,
        status: (signUpError as any).status,
        name: signUpError.name,
        full: signUpError,
      });
      // ================================================================

      setSubmitError(translateAuthError(signUpError.message));
      setLoading(false);
      return;
    }

    // للتشخيص: افتح الـ Console وشوف الشكل الفعلي للرد من Supabase
    console.log("signUp response:", signUpData);

    // Supabase (لحماية خصوصية المستخدمين) بيرجّع نجاح من غير Error حتى لو
    // الإيميل ده مسجل ومؤكد بالفعل، لكن من غير ما يبعت أي رسالة فعليًا.
    // العلامة على الحالة دي إن مصفوفة identities بتاعت المستخدم بترجع فاضية
    // أو null حسب نسخة الـ SDK، فبنتأكد من الحالتين مع بعض.
    const identities = signUpData.user?.identities;
    const isDuplicateConfirmedEmail =
      signUpData.user && (!identities || identities.length === 0);

    if (isDuplicateConfirmedEmail) {
      setSubmitError("البريد الإلكتروني ده مسجل بالفعل، جرب تسجل الدخول بدل كده");
      setLoading(false);
      return;
    }

    setLoading(false);
    // Supabase لسه ما دخّلش المستخدم (مفيش session) لحد ما يأكد إيميله،
    // فبدل ما نوديه على صفحة تسجيل الدخول على طول، نوريه شاشة "تحقق من بريدك".
    setAwaitingConfirmation(true);
  }

  async function handleResendEmail() {
    setResending(true);
    setResendMessage(null);

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: form.email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setResending(false);
    setResendMessage(
      error
        ? "تعذر إعادة إرسال الإيميل، برجاء المحاولة بعد قليل"
        : "تم إعادة إرسال رابط التأكيد إلى بريدك الإلكتروني"
    );
  }

  if (awaitingConfirmation) {
    return (
      <main
        className="flex min-h-screen items-center justify-center px-4 py-12"
        style={{ backgroundColor: "#0A1730" }}
      >
        <div className="w-full max-w-md text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-600/15 ring-1 ring-red-500/20">
            <Mail className="h-7 w-7 text-red-500" />
          </span>

          <h2 className="mt-6 font-display text-2xl font-extrabold text-white">
            تحقق من بريدك الإلكتروني
          </h2>
          <p className="mt-3 text-sm leading-7 text-navy-100/70">
            بعتنالك رابط تأكيد على{" "}
            <span className="font-semibold text-white" dir="ltr">
              {form.email}
            </span>
            . اضغط على الرابط عشان تفعّل حسابك، وبعدين هتقدر تسجل الدخول.
          </p>

          {resendMessage && (
            <p className="mt-4 text-sm text-navy-100/80">{resendMessage}</p>
          )}

          <button
            type="button"
            onClick={handleResendEmail}
            disabled={resending}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resending && <Loader2 className="h-4 w-4 animate-spin" />}
            {resending ? "جارٍ الإرسال..." : "إعادة إرسال رابط التأكيد"}
          </button>

          <p className="mt-6 text-sm text-navy-100/60">
            غلطت في الإيميل؟{" "}
            <button
              type="button"
              onClick={() => setAwaitingConfirmation(false)}
              className="font-semibold text-red-500 hover:text-red-400"
            >
              ارجع للتسجيل
            </button>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* ===== Brand panel - على الشمال ===== */}
      <div
        className="relative order-2 hidden flex-col justify-between overflow-hidden bg-navy-950 bg-cover bg-center p-12 lg:flex xl:p-16"
        style={{ backgroundImage: "url(/images/sign-up-photo.png)" }}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-navy-950/95 via-navy-950/55 to-navy-950/95" />
        <div className="pointer-events-none absolute inset-0 bg-navy-950/20" />

        <Link href="/" className="relative z-10">
          <Logo dark />
        </Link>

        <div className="relative z-10 mt-10 max-w-lg animate-fade-up xl:mt-12">
          <h1 className="font-display text-3xl font-extrabold leading-[1.3] text-white xl:text-4xl">
            أنشئ حسابك الآن
            <br />
            وابدأ إدارة شحناتك <span className="text-red-500">بذكاء</span>
          </h1>
          <p className="mt-4 text-sm leading-7 text-navy-100/80 xl:text-base">
            انضم إلى آلاف الشركات والأفراد الذين يعتمدون على Alex Service
            لإدارة شحناتهم بسهولة واحترافية.
          </p>
        </div>

        <div className="relative z-10 mt-auto grid grid-cols-2 gap-3">
          {SIDE_FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-600/15 ring-1 ring-red-500/20">
                <f.icon className="h-4.5 w-4.5 text-red-400" />
              </span>
              <div>
                <p className="text-sm font-bold text-white">{f.title}</p>
                <p className="mt-0.5 text-xs leading-5 text-navy-100/60">
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Form panel - على اليمين ===== */}
      <div
        className="order-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:py-16"
        style={{ backgroundColor: "#0A1730" }}
      >
        <div className="w-full max-w-xl">
          <div className="mb-6 flex items-center justify-center lg:hidden">
            <Link href="/">
              <Logo dark />
            </Link>
          </div>

          <div className="flex flex-col items-center text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600/15 ring-1 ring-red-500/20">
              <UserPlus className="h-6 w-6 text-red-500" />
            </span>
            <h2 className="mt-4 font-display text-2xl font-extrabold text-white">
              إنشاء حساب جديد
            </h2>
            <p className="mt-1.5 text-sm text-navy-100/70">
              املأ البيانات أدناه لإنشاء حسابك في Alex Service
            </p>
          </div>

          {/* ===== اختيار نوع الحساب ===== */}
          <div className="mt-6">
            <p className="mb-2 text-center text-xs font-semibold text-navy-100/70">
              أنشئ حسابك كـ
            </p>
            <div className="mx-auto flex w-fit gap-2 rounded-lg border border-white/10 bg-white/5 p-1">
              {ACCOUNT_TYPES.map((t) => {
                const active = accountType === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setAccountType(t.value)}
                    className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-bold transition ${
                      active
                        ? "bg-red-600 text-white shadow-sm shadow-red-600/30"
                        : "text-navy-100/60 hover:text-navy-100"
                    }`}
                  >
                    <t.icon className="h-3.5 w-3.5" />
                    {t.title}
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="الاسم الكامل"
                icon={User}
                value={form.fullName}
                onChange={(v) => update("fullName", v)}
                onBlur={() => markTouched("fullName")}
                placeholder="أدخل اسمك الكامل"
                error={shouldShowError("fullName") ? errors.fullName : undefined}
                valid={touched.fullName && !errors.fullName}
                required
              />
              {accountType === "buyer" ? (
                <Field
                  label="اسم الشركة (اختياري)"
                  icon={Building2}
                  value={form.businessName}
                  onChange={(v) => update("businessName", v)}
                  placeholder="أدخل اسم الشركة"
                />
              ) : (
                <Field
                  label="الرقم القومي"
                  icon={IdCard}
                  value={form.nationalId}
                  onChange={(v) => update("nationalId", v.replace(/\D/g, "").slice(0, 14))}
                  onBlur={() => markTouched("nationalId")}
                  placeholder="أدخل الرقم القومي"
                  error={shouldShowError("nationalId") ? errors.nationalId : undefined}
                  valid={touched.nationalId && !errors.nationalId}
                  required
                />
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="البريد الإلكتروني"
                icon={Mail}
                type="email"
                dir="ltr"
                value={form.email}
                onChange={(v) => update("email", v)}
                onBlur={() => markTouched("email")}
                placeholder="example@alexservice.com"
                error={shouldShowError("email") ? errors.email : undefined}
                valid={touched.email && !errors.email}
                required
              />
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-navy-100">
                  رقم الهاتف <span className="text-red-500">*</span>
                </label>
                <div
                  className={`flex items-center gap-2 rounded-lg border bg-white/5 px-3.5 py-2.5 transition focus-within:ring-2 ${
                    shouldShowError("phone")
                      ? "border-red-500/60 focus-within:ring-red-500/20"
                      : touched.phone && !errors.phone
                      ? "border-success-600/60 focus-within:ring-success-600/20"
                      : "border-white/10 focus-within:border-red-500/60 focus-within:ring-red-500/20"
                  }`}
                >
                  <span className="shrink-0 text-sm font-semibold text-navy-100/60">
                    🇪🇬 +20
                  </span>
                  <span className="h-4 w-px bg-white/10" />
                  <input
                    type="tel"
                    dir="ltr"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value.replace(/\D/g, "").slice(0, 11))}
                    onBlur={() => markTouched("phone")}
                    placeholder="01012345678"
                    className="w-full bg-transparent text-sm text-white placeholder:text-navy-100/40 focus:outline-none"
                  />
                  {touched.phone && !errors.phone ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success-600" />
                  ) : (
                    <Phone className="h-4 w-4 shrink-0 text-navy-100/40" />
                  )}
                </div>
                {shouldShowError("phone") && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-red-400">
                    <AlertCircle className="h-3 w-3" />
                    {errors.phone}
                  </p>
                )}
              </div>
            </div>

            {accountType === "buyer" ? (
              <Field
                label="العنوان"
                icon={MapPin}
                value={form.address}
                onChange={(v) => update("address", v)}
                placeholder="أدخل عنوان شركتك أو موقعك"
              />
            ) : (
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-navy-100">
                  نوع المركبة <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.vehicleType}
                  onChange={(e) => update("vehicleType", e.target.value)}
                  onBlur={() => markTouched("vehicleType")}
                  className={`w-full rounded-lg border bg-white/5 px-3.5 py-2.5 text-sm text-white transition focus:outline-none focus:ring-2 ${
                    shouldShowError("vehicleType")
                      ? "border-red-500/60 focus:ring-red-500/20"
                      : "border-white/10 focus:border-red-500/60 focus:ring-red-500/20"
                  }`}
                >
                  <option value="" className="text-navy-950">اختر نوع المركبة</option>
                  <option value="motorcycle" className="text-navy-950">دراجة نارية</option>
                  <option value="car" className="text-navy-950">سيارة</option>
                  <option value="tricycle" className="text-navy-950">تروسيكل</option>
                  <option value="bicycle" className="text-navy-950">دراجة</option>
                </select>
                {shouldShowError("vehicleType") && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-red-400">
                    <AlertCircle className="h-3 w-3" />
                    {errors.vehicleType}
                  </p>
                )}
              </div>
            )}

            {accountType === "agent" && (
              <Field
                label="المنطقة"
                icon={MapPin}
                value={form.region}
                onChange={(v) => update("region", v)}
                onBlur={() => markTouched("region")}
                placeholder="مثال: سموحة، الإسكندرية"
                error={shouldShowError("region") ? errors.region : undefined}
                valid={touched.region && !errors.region}
                required
              />
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Field
                  label="كلمة المرور"
                  type="password"
                  value={form.password}
                  onChange={(v) => update("password", v)}
                  onBlur={() => markTouched("password")}
                  placeholder="8 أحرف على الأقل"
                  error={shouldShowError("password") ? errors.password : undefined}
                  required
                />
                {form.password && (
                  <div className="mt-1.5">
                    <div className="flex gap-1">
                      {[1, 2, 3].map((i) => (
                        <span
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            passwordStrength.score >= i
                              ? passwordStrength.color
                              : "bg-white/10"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="mt-1 text-[11px] text-navy-100/50">
                      قوة كلمة المرور:{" "}
                      <span
                        className={
                          passwordStrength.score === 1
                            ? "text-red-400"
                            : passwordStrength.score === 2
                            ? "text-warning-600"
                            : "text-success-600"
                        }
                      >
                        {passwordStrength.label}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              <Field
                label="تأكيد كلمة المرور"
                type="password"
                value={form.confirmPassword}
                onChange={(v) => update("confirmPassword", v)}
                onBlur={() => markTouched("confirmPassword")}
                placeholder="أعد كتابة كلمة المرور"
                error={shouldShowError("confirmPassword") ? errors.confirmPassword : undefined}
                valid={touched.confirmPassword && !errors.confirmPassword && form.confirmPassword.length > 0}
                required
              />
            </div>

            <div>
              <label className="flex cursor-pointer items-start gap-2.5 text-xs text-navy-100/60">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => {
                    setAgree(e.target.checked);
                    markTouched("agree");
                  }}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-white/5 text-red-600 focus:ring-red-500"
                />
                بإنشاء حساب، أنت توافق على{" "}
                <Link href="/terms" className="text-red-500 hover:text-red-400">
                  الشروط والأحكام
                </Link>{" "}
                و{" "}
                <Link href="/privacy" className="text-red-500 hover:text-red-400">
                  سياسة الخصوصية
                </Link>
              </label>
              {shouldShowError("agree") && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-red-400">
                  <AlertCircle className="h-3 w-3" />
                  {errors.agree}
                </p>
              )}
            </div>

            {submitError && (
              <p className="flex items-center justify-center gap-1.5 text-center text-sm text-red-500">
                <AlertCircle className="h-4 w-4" />
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-600/25 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "جاري إنشاء الحساب..." : "إنشاء الحساب"}
              {!loading && <ArrowLeft className="h-4 w-4" />}
            </button>

            <p className="text-center text-sm text-navy-100/70">
              هل تمتلك حساب بالفعل؟{" "}
              <Link
                href="/login"
                className="font-semibold text-red-500 hover:text-red-400"
              >
                تسجيل الدخول
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  icon: Icon,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  onBlur,
  dir,
  error,
  valid,
  required,
}: {
  label: string;
  icon?: React.ElementType;
  name?: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  dir?: "ltr" | "rtl";
  error?: string;
  valid?: boolean;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-navy-100">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div
        className={`flex items-center gap-2 rounded-lg border bg-white/5 px-3.5 py-2.5 transition focus-within:ring-2 ${
          error
            ? "border-red-500/60 focus-within:ring-red-500/20"
            : valid
            ? "border-success-600/60 focus-within:ring-success-600/20"
            : "border-white/10 focus-within:border-red-500/60 focus-within:ring-red-500/20"
        }`}
      >
        <input
          name={name}
          type={type}
          dir={dir}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-white placeholder:text-navy-100/40 focus:outline-none"
        />
        {valid ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success-600" />
        ) : (
          Icon && <Icon className="h-4 w-4 shrink-0 text-navy-100/40" />
        )}
      </div>
      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-400">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}