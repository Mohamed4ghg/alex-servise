"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, MapPin, PackageSearch, Phone, Search, Truck, User } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { getShipmentByTracking } from "@/lib/mock-data";
import { Shipment } from "@/lib/types";
import { ShipmentStatusBadge } from "@/components/ui/StatusBadge";

export default function TrackingPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Shipment | null | undefined>(undefined);
  const [searched, setSearched] = useState(false);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearched(true);
    setResult(getShipmentByTracking(query) ?? null);
  }

  return (
    <main>
      <Navbar />

      <section className="bg-navy-950 py-16">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white ring-1 ring-white/15">
            <PackageSearch className="h-3.5 w-3.5 text-red-400" />
            بوابة تتبع الشحنات
          </span>
          <h1 className="mt-5 font-display text-3xl font-extrabold text-white sm:text-4xl">تتبع شحنتك في ثوانٍ</h1>
          <p className="mt-3 text-navy-100/80">أدخل رقم الشحنة لعرض حالتها الحالية وسجل حركتها بالكامل.</p>

          {/* عربية الشحن المتحركة */}
          <div className="truck-track relative mx-auto mt-6 h-14 max-w-md overflow-hidden">
            <span className="truck-road absolute bottom-1 left-0 right-0 h-px bg-white/15" />
            <Truck className="truck-icon absolute bottom-2 h-8 w-8 text-red-400" />
          </div>

          <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="مثال: TRK-2026-01235"
                className="w-full rounded-xl border-0 bg-white py-3.5 pe-11 ps-4 text-sm text-navy-950 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 tnum"
                dir="ltr"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-red-600 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-red-700"
            >
              تتبع الشحنة
            </button>
          </form>
          <p className="mt-3 text-xs text-navy-100/50">
            جرّب مثلاً: <span className="tnum">TRK-2026-01200</span>
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        {!searched && (
          <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
            <PackageSearch className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-4 text-sm text-gray-400">أدخل رقم الشحنة أعلاه لعرض تفاصيل التتبع.</p>
          </div>
        )}

        {searched && result === null && (
          <div className="rounded-2xl border border-red-100 bg-red-50 py-16 text-center">
            <p className="font-display text-base font-bold text-red-600">لم يتم العثور على شحنة بهذا الرقم</p>
            <p className="mt-2 text-sm text-red-500/80">تأكد من رقم الشحنة وحاول مرة أخرى.</p>
          </div>
        )}

        {result && (
          <div className="animate-fade-up space-y-6">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-gray-400">رقم الشحنة</p>
                  <p className="font-display text-xl font-extrabold text-navy-950 tnum">{result.trackingNumber}</p>
                </div>
                <ShipmentStatusBadge status={result.status} />
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <InfoBlock icon={User} label="اسم المستلم" value={result.receiver.name} />
                <InfoBlock icon={MapPin} label="المنطقة" value={result.receiver.area} />
                <InfoBlock icon={Phone} label="موعد التوصيل المتوقع" value={result.expectedDeliveryDate} />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
              <h2 className="font-display text-base font-bold text-navy-950">سجل تحركات الشحنة</h2>
              <ol className="mt-6 space-y-0">
                {result.timeline.map((t, i) => (
                  <li key={i} className="relative flex gap-4 pb-7 last:pb-0">
                    {i !== result.timeline.length - 1 && (
                      <span className="absolute right-[9px] top-5 h-full w-0.5 bg-navy-100" />
                    )}
                    <span className="relative z-10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-navy-900">
                      {i === result.timeline.length - 1 && result.status === "delivered" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </span>
                    <div className="flex flex-1 flex-wrap items-center justify-between gap-1">
                      <span className="text-sm font-semibold text-navy-950">{t.label}</span>
                      <span className="text-xs text-gray-400 tnum">{t.date} — {t.time}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <p className="text-center text-xs text-gray-400">
              هل تواجه مشكلة في شحنتك؟{" "}
              <Link href="#" className="font-semibold text-red-600 hover:underline">
                تواصل مع خدمة العملاء
              </Link>
            </p>
          </div>
        )}
      </section>

      <Footer />

      <style jsx>{`
        .truck-icon {
          animation: truckDrive 2.4s ease-out 1;
          animation-fill-mode: forwards;
        }
        @keyframes truckDrive {
          0% {
            right: -15%;
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          85% {
            opacity: 1;
          }
          100% {
            right: 100%;
            opacity: 0;
          }
        }
        .truck-road {
          background-image: repeating-linear-gradient(
            to left,
            rgba(255, 255, 255, 0.25) 0px,
            rgba(255, 255, 255, 0.25) 6px,
            transparent 6px,
            transparent 14px
          );
        }
      `}</style>
    </main>
  );
}

function InfoBlock({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-navy-50 p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1.5 text-sm font-bold text-navy-950">{value}</p>
    </div>
  );
}