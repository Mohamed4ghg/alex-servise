"use client";

import { ChevronDown } from "lucide-react";

export const FAQS = [
  {
    q: "كام المدة اللي بياخدها تجهيز النظام وتشغيله؟",
    a: "حسب حجم التخصيص المطلوب، بس النسخة الأساسية جاهزة للتشغيل خلال أيام قليلة، والتخصيصات الإضافية بتتفق عليها حسب المتطلبات.",
  },
  {
    q: "هل ينفع أضيف مندوبين وفروع جديدة بعد التشغيل؟",
    a: "أيوه، النظام مصمم يستحمل التوسع، تقدر تضيف مندوبين وفروع ومستخدمين جدد في أي وقت.",
  },
  {
    q: "هل فيه إشعارات تلقائية للعميل عند تغيير حالة الشحنة؟",
    a: "نعم، ممكن نفعّل إشعارات فورية SMS أو واتساب أو إيميل لحظة تحديث حالة الشحنة.",
  },
  {
    q: "هل بياناتي وبيانات عملائي محمية؟",
    a: "أيوه، البيانات محفوظة في قاعدة بيانات آمنة مع صلاحيات وصول محكومة RLS.",
  },
  {
    q: "هل ينفع أدمج النظام مع أنظمة تانية بستخدمها؟",
    a: "أيوه، النظام مبني بشكل يسهّل ربطه بأنظمة خارجية عن طريق API.",
  },
  {
    q: "هل فيه تقارير ومتابعة لأداء المندوبين والتحصيلات؟",
    a: "نعم، لوحة التحكم بتوفر تقارير تفصيلية عن أداء كل مندوب وحالة الشحنات.",
  },
];

export default function FAQ() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl text-center">
        <span className="text-sm font-bold text-red-600">الأسئلة الشائعة</span>
        <h2 className="mt-2 font-display text-3xl font-extrabold text-navy-950 sm:text-4xl">
          عندك سؤال؟ إجابتك هنا
        </h2>
        <p className="mt-3 text-gray-500">
          تجميعة لأكتر الأسئلة اللي بتوصلنا من شركات الشحن قبل ما تبدأ معانا.
        </p>
      </div>

      <div className="mt-10 space-y-3">
        {FAQS.map((item, i) => (
          <details
            key={i}
            open={i === 0}
            className="group rounded-2xl border border-gray-100 bg-white shadow-[var(--shadow-card)] transition open:shadow-[var(--shadow-card-hover)]"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 marker:content-none">
              <span className="font-display text-base font-bold text-navy-950">
                {item.q}
              </span>
              <ChevronDown className="h-5 w-5 shrink-0 text-red-600 transition-transform duration-300 group-open:rotate-180" />
            </summary>
            <p className="px-5 pb-5 text-sm leading-7 text-gray-500">
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}