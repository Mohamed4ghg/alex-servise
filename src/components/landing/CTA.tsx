import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function CTA() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl bg-navy-900 px-8 py-14 text-center sm:px-16">
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-red-600/25 blur-[100px]" />
        <h2 className="relative font-display text-3xl font-extrabold text-white sm:text-4xl">
          جاهز لتنظيم عمليات الشحن لديك؟
        </h2>
        <p className="relative mx-auto mt-3 max-w-xl text-navy-100/80">
          ابدأ بإدارة الشحنات والمندوبين والتحصيلات من لوحة تحكم واحدة، اليوم.
        </p>
        <Link
          href="/login"
          className="relative mt-7 inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-red-600/25 transition hover:bg-red-700"
        >
          ابدأ الآن
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
