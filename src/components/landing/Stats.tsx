"use client";

import { useEffect, useRef, useState } from "react";
import { Package, TrendingUp, User, Users } from "lucide-react";
import { LANDING_STATS } from "@/lib/mock-data";
import { formatNumber } from "@/lib/utils";

const STAT_ICONS = [TrendingUp, Users, User, Package];

function Counter({ target, suffix }: { target: number; suffix?: string }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;

          const duration = 1200;
          const start = performance.now();

          const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);

            setValue(Math.round(target * eased));

            if (progress < 1) {
              requestAnimationFrame(tick);
            }
          };

          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref} className="tnum">
      {formatNumber(value)}
      {suffix}
    </span>
  );
}

export function Stats() {
  return (
    <section className="relative">
      <div className="animate-fade-up relative z-20 mx-auto -mt-4 max-w-7xl px-4 sm:px-6 lg:-mt-8 lg:px-8">
        <div className="grid grid-cols-2 gap-8 rounded-2xl border border-gray-100 bg-white px-6 py-8 shadow-2xl shadow-black/10 sm:px-10 sm:py-10 lg:grid-cols-4">
          {LANDING_STATS.map((s, i) => {
            const Icon = STAT_ICONS[i % STAT_ICONS.length];

            return (
              <div
                key={s.label}
                className="flex items-center justify-center gap-3 text-center sm:justify-start sm:text-right"
              >
                <div>
                  <p className="font-display text-2xl font-extrabold text-navy-950 sm:text-3xl">
                    <Counter target={s.value} suffix={s.suffix} />
                  </p>

                  <p className="mt-1 text-sm font-medium text-gray-500">
                    {s.label}
                  </p>
                </div>

                <Icon
                  className="h-6 w-6 shrink-0 text-red-500"
                  strokeWidth={2}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white pt-20 lg:pt-28" />
    </section>
  );
}