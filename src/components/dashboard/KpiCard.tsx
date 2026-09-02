import { ArrowDown, ArrowUp, LucideIcon } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  delta,
  deltaLabel,
  isCurrency,
  icon: Icon,
}: {
  label: string;
  value: number;
  delta?: number;
  deltaLabel?: string;
  isCurrency?: boolean;
  icon?: LucideIcon;
}) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold text-gray-500">{label}</p>
        {Icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-2xl font-extrabold text-navy-950 tnum">
        {isCurrency ? formatCurrency(value) : formatNumber(value)}
      </p>
      {delta !== undefined && (
        <div className="mt-2 flex items-center gap-1 text-xs font-semibold">
          <span className={`flex items-center gap-0.5 ${positive ? "text-success-600" : "text-red-600"}`}>
            {positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(delta)}%
          </span>
          <span className="font-normal text-gray-400">{deltaLabel}</span>
        </div>
      )}
    </div>
  );
}
