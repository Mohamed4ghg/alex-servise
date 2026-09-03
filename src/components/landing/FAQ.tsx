"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export const FAQS = [
  {
    q: "إزاي أتابع شحنتي وأعرف هي وصلت فين؟",
    a: "بمجرد ما تتسجل الشحنة، هتلاقي رقم تتبع خاص بيها. ادخل بيه على صفحة تتبع الشحنة أو من حسابك مباشرة، وهتشوف حالتها لحظة بلحظة لحد ما توصلك.",
  },
  {
    q: "هيوصلني إشعار لما حالة شحنتي تتغيّر؟",
    a: "أيوه، بنبعتلك إشعار فوري (وممكن SMS أو واتساب أو إيميل حسب اختيارك) في كل مرة حالة شحنتك بتتحدث، من لحظة الاستلام لحد التسليم.",
  },
  {
    q: "هل ينفع أدفع تحصيل عند الاستلام (كاش أون ديليفري)؟",
    a: "أيوه، المندوب بيحصّل المبلغ منك وقت التسليم مباشرة، والمبلغ ده بيتسجل ويتحدث في حسابك فور التحصيل.",
  },
  {
    q: "عايز أرجّع شحنة، أعمل إيه؟",
    a: "تقدر تطلب مرتجع بسهولة من نفس صفحة الشحنة، وهنتابع الطلب من لحظة تقديمه لحد ما يتم استلام المرتجع وإغلاق الطلب.",
  },
  {
    q: "لو غيّرت رأيي في عنوان التسليم، أقدر أعدّله؟",
    a: "تقدر تتواصل مع خدمة العملاء قبل ما الشحنة تخرج للتوصيل، وهنحاول نعدّل العنوان أو نأجّل التسليم حسب حالة الشحنة وقتها.",
  },
  {
    q: "بياناتي ورقم هاتفي محفوظين بأمان؟",
    a: "أيوه، بياناتك محفوظة في قاعدة بيانات آمنة، ومفيش حد يقدر يشوفها غير المصرّح لهم فقط داخل النظام.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="space-y-3">
        {FAQS.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div
              key={i}
              className={`overflow-hidden rounded-2xl border bg-white shadow-[var(--shadow-card)] transition-all duration-300 ${
                isOpen
                  ? "border-red-200 shadow-[var(--shadow-card-hover)]"
                  : "border-gray-100"
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="flex w-full items-center gap-4 px-5 py-4 text-right"
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-display text-xs font-extrabold tnum transition-colors ${
                    isOpen
                      ? "bg-red-600 text-white"
                      : "bg-navy-50 text-navy-400"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>

                <span
                  className={`flex-1 font-display text-base font-bold transition-colors ${
                    isOpen ? "text-red-600" : "text-navy-950"
                  }`}
                >
                  {item.q}
                </span>

                <ChevronDown
                  className={`h-5 w-5 shrink-0 transition-transform duration-300 ${
                    isOpen ? "rotate-180 text-red-600" : "text-gray-400"
                  }`}
                />
              </button>

              <div
                className="grid transition-all duration-300 ease-in-out"
                style={{
                  gridTemplateRows: isOpen ? "1fr" : "0fr",
                }}
              >
                <div className="overflow-hidden">
                  <p className="px-5 pb-5 ps-[3.75rem] text-sm leading-7 text-gray-500">
                    {item.a}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}