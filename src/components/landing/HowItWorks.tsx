"use client";

import { useEffect, useRef, useState } from "react";

const STEPS = [
  { n: "01", title: "إنشاء الشحنة", desc: "بيانات العميل والمستلم والشحنة في خطوات بسيطة وسريعة." },
  { n: "02", title: "إسنادها للمندوب", desc: "توزيع تلقائي أو يدوي حسب المنطقة والحمولة." },
  { n: "03", title: "استلام المندوب", desc: "تأكيد الاستلام من واجهة المندوب مباشرة." },
  { n: "04", title: "تتبع التوصيل", desc: "متابعة الموقع والحالة لحظة بلحظة على الخريطة." },
  { n: "05", title: "تحديث الحالة", desc: "كل تغيير يُسجَّل في السجل الزمني للشحنة فورًا." },
  { n: "06", title: "التسليم والتحصيل", desc: "تأكيد التسليم وتسجيل التحصيل وإغلاق الشحنة." },
];

function getRevealClass(index: number) {
  const col = index % 3;
  if (col === 0) return "reveal-right"; // العمود اليمين
  if (col === 2) return "reveal-left"; // العمود الشمال
  return "reveal-up"; // العمود الأوسط
}

export function HowItWorks() {
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
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} id="how-it-works" className="bg-navy-950 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className={`reveal-up mx-auto max-w-2xl text-center ${visible ? "is-visible" : ""}`}>
          <span className="text-sm font-bold text-red-500">كيف نعمل؟</span>
          <h2 className="mt-2 font-display text-3xl font-extrabold text-white sm:text-4xl">
            رحلة الشحنة من الإنشاء حتى التسليم
          </h2>
          <p className="mt-3 text-navy-100/80">
            دورة عمل مترابطة فعليًا — كل خطوة تحدّث النظام بالكامل في نفس اللحظة.
          </p>
        </div>

        <div className="relative mt-16 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          <div className="absolute inset-x-0 top-6 hidden h-px bg-white/10 lg:block" />
          {STEPS.map((s, i) => (
            <div
              key={s.n}
              style={{ "--step-index": i } as React.CSSProperties}
              className={`relative ${getRevealClass(i)} ${visible ? "is-visible" : ""}`}
            >
              <div className="flex items-center gap-3">
                <span className="font-display text-2xl font-extrabold text-red-500 tnum">{s.n}</span>
                <span className="h-px flex-1 bg-white/10" />
              </div>
              <h3 className="mt-3 font-display text-lg font-bold text-white">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-navy-100/70">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}