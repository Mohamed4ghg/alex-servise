import { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";

export function ComingSoon({
  title,
  icon: Icon,
  phase,
  description,
}: {
  title: string;
  icon: LucideIcon;
  phase: string;
  description: string;
}) {
  return (
    <div>
      <PageHeader title={title} />
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-white py-24 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-50 text-navy-400">
          <Icon className="h-6 w-6" />
        </span>
        <span className="rounded-full bg-navy-50 px-3 py-1 text-[11px] font-bold text-navy-700">{phase}</span>
        <p className="font-display text-base font-bold text-navy-950">{title} — قيد الإنشاء</p>
        <p className="max-w-sm text-sm text-gray-400">{description}</p>
      </div>
    </div>
  );
}
