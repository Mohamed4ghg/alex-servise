"use client";

import { useEffect, useRef, useState } from "react";
import {
  Package,
  Users,
  MapPin,
  UserRound,
  BarChart3,
  Bell,
  Wallet,
  RotateCcw,
} from "lucide-react";

const FEATURES = [
  { icon: Package, title: "إدارة الشحنات", desc: "إنشاء ومتابعة كل الشحنات بحالاتها من مكان واحد، بدون تعقيد." },
  { icon: Users, title: "إدارة المندوبين", desc: "إسناد المهام ومتابعة الأداء ونسب التسليم لكل مندوب." },
  { icon: MapPin, title: "تتبع مباشر GPS", desc: "موقع كل مندوب لحظة بلحظة على خريطة واحدة." },
  { icon: UserRound, title: "إدارة العملاء", desc: "سجل كامل لكل عميل، أفراد وشركات، وتاريخ تعاملاته." },
  { icon: BarChart3, title: "التقارير والإحصائيات", desc: "تقارير جاهزة للتصدير تغطي الأداء والإيرادات والمناطق." },
  { icon: Bell, title: "الإشعارات", desc: "تنبيهات فورية مرتبطة بأحداث حقيقية داخل النظام." },
  { icon: Wallet, title: "التحصيلات", desc: "متابعة دقيقة للمبالغ المحصلة والمسلّمة لكل مندوب." },
  { icon: RotateCcw, title: "المرتجعات", desc: "دورة عمل واضحة لكل مرتجع من الطلب حتى الإغلاق." },
];

export function Features() {
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
      { threshold: 0.10 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="features"
      className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 -mt-12"
    >
      <div className={`reveal-up mx-auto max-w-2xl text-center ${visible ? "is-visible" : ""}`}>
        <span className="text-sm font-bold text-red-600">المميزات</span>
        <h2 className="mt-2 font-display text-3xl font-extrabold text-navy-950 sm:text-4xl">
          كل ما تحتاجه لإدارة الشحن في نظام واحد
        </h2>
        <p className="mt-3 text-gray-500">
          مصمم خصيصًا لشركات الشحن والتوصيل — لا Prototype ولا واجهات منفصلة.
        </p>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className={`reveal-up group rounded-2xl border border-gray-100 bg-white p-6 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] ${
              visible ? "is-visible" : ""
            }`}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900 transition group-hover:bg-red-600">
              <f.icon className="h-5 w-5 text-white" />
            </div>
            <h3 className="mt-4 font-display text-base font-bold text-navy-950">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-6 text-gray-500">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}