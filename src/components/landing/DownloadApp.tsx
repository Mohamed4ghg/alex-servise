"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bell, MapPin, ShieldCheck, Zap } from "lucide-react";

const APP_FEATURES = [
  {
    icon: Bell,
    title: "إشعارات فورية",
    desc: "تابع كل تحديث لحظة بلحظة",
  },
  {
    icon: MapPin,
    title: "تتبع مباشر",
    desc: "اعرف موقعك وشحناتك مباشرة",
  },
  {
    icon: Zap,
    title: "أداء أفضل",
    desc: "تصميم سريع وخفيف لتجربة سلسة",
  },
];

export function DownloadApp() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-navy-950 py-20">
      <div className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-red-600/20 blur-[110px]" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-navy-500/30 blur-[110px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-14 lg:grid-cols-2 lg:items-center lg:gap-8">
          {/* عنصر خارجي مسؤول بس عن الإزاحة الثابتة ناحية الشمال */}
          <div className="order-2 flex justify-center lg:order-2 lg:justify-start lg:-translate-x-38">
            {/* عنصر داخلي مسؤول عن أنيميشن الظهور - منفصل عشان مايتعارضش مع الإزاحة */}
            <div
              className={`reveal-right relative ${visible ? "is-visible" : ""}`}
            >
              <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle,theme(colors.red.600/25)_1px,transparent_1px)] bg-[length:22px_22px] opacity-40" />
              <div className="pointer-events-none absolute -inset-10 -z-10 rounded-full bg-red-600/10 blur-[80px]" />

              <Image
                src="/images/phone.png"
                alt="تطبيق ALEX Service على الموبايل"
                width={420}
                height={560}
                className="h-auto w-full max-w-[400px] drop-shadow-2xl sm:max-w-[440px]"
                priority
              />
            </div>
          </div>

          {/* النص والمميزات والأزرار - يظهروا من الشمال وبيستقروا على اليمين */}
          <div
            className={`reveal-left order-1 text-center lg:order-1 lg:text-right ${
              visible ? "is-visible" : ""
            }`}
          >
            <span className="text-sm font-bold text-red-500">
              حمّل تطبيقنا الآن
            </span>

            <h2 className="mt-3 font-display text-3xl font-extrabold leading-tight text-white sm:text-4xl">
              إدارة شحناتك من
              <br />
              هاتفك بكل <span className="text-red-500">سهولة</span>
            </h2>

            <p className="mx-auto mt-4 max-w-md text-navy-100/80 lg:mx-0">
              تطبيق ALEX Service يتيح للمندوبين متابعة الشحنات، تحديث الحالة،
              واستلام التحصيلات من أي مكان وفي أي وقت.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
              {APP_FEATURES.map((f) => (
                <div key={f.title} className="flex flex-col items-center gap-2 lg:items-start">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                    <f.icon className="h-5 w-5 text-red-400" />
                  </span>
                  <div className="text-center lg:text-right">
                    <p className="text-sm font-bold text-white">{f.title}</p>
                    <p className="mt-0.5 text-xs leading-5 text-navy-100/60">
                      {f.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
              <Link
                href="#"
                className="store-btn flex items-center gap-3 rounded-lg border border-white/15 bg-white/[0.06] px-6 py-3.5"
              >
                <PlayIcon className="h-8 w-8" />
                <span className="text-right leading-tight">
                  <span className="block text-[11px] text-navy-100/60">
                    GET IT ON
                  </span>
                  <span className="block text-lg font-bold text-white">
                    Google Play
                  </span>
                </span>
              </Link>

              <Link
                href="#"
                className="store-btn flex items-center gap-3 rounded-lg border border-white/15 bg-white/[0.06] px-6 py-3.5"
              >
                <AppleIcon className="h-8 w-8 text-white" />
                <span className="text-right leading-tight">
                  <span className="block text-[11px] text-navy-100/60">
                    Download on the
                  </span>
                  <span className="block text-lg font-bold text-white">
                    App Store
                  </span>
                </span>
              </Link>
            </div>

            <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-navy-100/60 lg:justify-start">
              <ShieldCheck className="h-3.5 w-3.5 text-red-400" />
              آمن 100% ولا يتطلب بيانات حساسة
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path
        d="M4 3.5c-.3.2-.5.6-.5 1v15c0 .4.2.8.5 1l8.5-8.5L4 3.5Z"
        fill="#EA4335"
      />
      <path
        d="M12.5 12 4 20.5c.2.1.4.2.7.2.2 0 .5 0 .7-.2l9.9-5.7-2.8-2.8Z"
        fill="#34A853"
      />
      <path
        d="M17.9 10.3 15.3 8.8 12.5 12l2.8 2.8 2.6-1.5c.7-.4.7-1.6 0-2Z"
        fill="#FBBC04"
      />
      <path
        d="M4 3.5 12.5 12l2.8-2.8-9.9-5.7c-.2-.1-.5-.2-.7-.2-.3 0-.5.1-.7.2Z"
        fill="#4285F4"
      />
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M16.365 1.43c0 1.14-.462 2.096-1.194 2.858-.796.834-2.032 1.483-3.176 1.395-.15-1.11.437-2.246 1.16-2.99.79-.826 2.216-1.44 3.21-1.263Zm3.9 17.36c-.516 1.187-.762 1.72-1.428 2.767-.926 1.463-2.232 3.28-3.85 3.293-1.437.013-1.808-.94-3.756-.93-1.947.01-2.354.945-3.792.93-1.618-.017-2.855-1.66-3.782-3.122-2.594-4.076-2.867-8.858-1.267-11.401 1.135-1.81 2.928-2.87 4.615-2.87 1.717 0 2.798.947 4.222.947 1.38 0 2.216-.949 4.198-.949 1.503 0 3.096.82 4.23 2.235-3.718 2.038-3.114 7.343.61 9.1Z" />
    </svg>
  );
}