import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  Truck,
  UserPlus,
  Zap,
} from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-navy-950">
      <div className="pointer-events-none absolute -left-40 top-1/3 h-96 w-96 rounded-full bg-red-600/20 blur-[110px]" />
      <div className="pointer-events-none absolute -right-32 -top-20 h-80 w-80 rounded-full bg-navy-500/30 blur-[110px]" />

      <div className="relative mx-auto grid max-w-7xl gap-14 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:pt-28 lg:pb-8">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white ring-1 ring-white/15">
            <Zap className="h-3.5 w-3.5 text-red-400" />
            منصة إدارة شحن جاهزة للعمل الفعلي
          </span>

          <h1 className="animate-fade-in-right mt-6 font-display text-4xl font-extrabold leading-[1.15] text-white sm:text-5xl">
            إدارة شحناتك
          </h1>

          <p className="mt-2 font-display text-xl font-bold text-navy-100 sm:text-2xl">
            <span className="text-white">أسهل</span>{" "}
           <span className="text-white-500">··</span>{" "}
           <span className="text-red-500">أسرع</span>{" "}
           <span className="text-white-500">··</span>{" "}
           <span className="text-white">أدق</span>
          </p>

          <p className="mt-5 max-w-xl text-base leading-8 text-navy-100 sm:text-lg">
            نظام متكامل لإدارة الشحنات والمندوبين والعملاء، مع تتبع مباشر وتقارير دقيقة
            وتحكم كامل من مكان واحد — من إنشاء الشحنة حتى تحصيل قيمتها.
          </p>

          <div className="animate-fade-in-right [animation-delay:150ms] mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-600/25 transition hover:bg-red-700"
            >
              تسجيل الدخول
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-600/25 transition hover:bg-red-700"
            >
              <UserPlus className="h-4 w-4" />
              إنشاء حساب
            </Link>

            <Link
              href="#how-it-works"
              className="px-3 py-3 text-sm font-semibold text-navy-100 underline-offset-4 hover:text-white hover:underline"
            >
              تعرف على المزيد
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-navy-100/90">
            <div className="flex items-center gap-2 text-xs font-medium">
              <ShieldCheck className="h-4 w-4 text-red-400" />
              بيانات مشفّرة وصلاحيات دقيقة
            </div>

            <div className="flex items-center gap-2 text-xs font-medium">
              <Truck className="h-4 w-4 text-red-400" />
              تتبع مندوبين بالـ GPS مباشرة
            </div>
          </div>
        </div>

        <div className="relative animate-fade-up [animation-delay:150ms]">
          <TrackingShowcase />
        </div>
      </div>
    </section>
  );
}

function TrackingShowcase() {
  return (
    <div className="relative mx-auto w-full max-w-4xl pt-20 pb-0">
      {/* GPS يمين - خلف اللاب والموبايل */}
      <div className="animate-gps-float pointer-events-none absolute -right-7 bottom-14 z-10 w-[70%]">
        <div className="animate-gps-draw">
          <Image
            src="/images/gps_r.png"
            alt=""
            width={700}
            height={700}
            className="h-auto w-full object-contain"
            priority
          />
        </div>
      </div>

      {/* GPS شمال - خلف اللاب والموبايل */}
      <div className="animate-gps-float pointer-events-none absolute -left-8 bottom-8 z-10 w-[55%]">
        <div className="animate-gps-draw">
          <Image
            src="/images/gps_l.png"
            alt=""
            width={700}
            height={700}
            className="h-auto w-full object-contain"
            priority
          />
        </div>
      </div>

      {/* اللاب والموبايل */}
      <div className="relative z-30">
        <Image
          src="/images/lap.png"
          alt="لوحة تحكم ALEX Service على اللابتوب والموبايل"
          width={560}
          height={400}
          className="mx-auto h-auto w-full max-w-[1000px]"
          priority
        />
      </div>

      {/* التراك */}
      <div className="animate-truck-loop absolute bottom-8 left-[-6%] z-20 w-[38%] sm:left-[-26%]">
        <div className="animate-truck-peek-left">
          <Image
            src="/images/truck.png"
            alt="عربية توصيل ALEX Service"
            width={280}
            height={200}
            className="h-auto w-full drop-shadow-2xl"
            priority
          />
        </div>
      </div>
    </div>
  );
}