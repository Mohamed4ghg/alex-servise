"use client";

import { useState } from "react";
import { ChevronDown, MessageCircleQuestion, Phone } from "lucide-react";

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
    <section id="faq" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-5 lg:gap-14">
        {/* العمود التعريفي - ثابت على الشمال */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-24">
            <span className="text-sm font-bold text-red-600">
              الأسئلة الشائعة
            </span>
            <h2 className="mt-2 font-display text-3xl font-extrabold leading-tight text-navy-950 sm:text-4xl">
              عندك سؤال؟
              <br />
              إجابتك هنا
            </h2>
            <p className="mt-4 text-sm leading-7 text-gray-500">
              تجميعة لأكتر الأسئلة اللي بتوصلنا من شركات الشحن قبل ما تبدأ
              معانا. مش لاقي سؤالك؟ تواصل معانا مباشرة.
            </p>

            <div className="mt-8 flex items-start gap-3 rounded-2xl border border-gray-100 bg-navy-950 p-5 shadow-[var(--shadow-card)]">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-600">
                <MessageCircleQuestion className="h-5 w-5 text-white" />
              </span>
              <div>
                <p className="font-display text-sm font-bold text-white">
                  لسه محتاج مساعدة؟
                </p>
                <p className="mt-1 text-xs leading-5 text-navy-100/70">
                  فريقنا جاهز يرد على أي استفسار خلال دقايق.
                </p>
                <a
                  href="#contact"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-300"
                >
                  <Phone className="h-3.5 w-3.5" />
                  تواصل معانا
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* قائمة الأسئلة */}
        <div className="lg:col-span-3">
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
        </div>
      </div>
    </section>
  );
}