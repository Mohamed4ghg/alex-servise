import { cn } from "@/lib/utils";

// القيم دي مطابقة لعمود shipment_statuses.color في الداتابيز فعليًا
const COLOR_STYLES: Record<string, string> = {
  gray: "bg-gray-100 text-gray-600",
  info: "bg-blue-50 text-blue-700",
  warning: "bg-amber-50 text-amber-700",
  success: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-700",
};

export function StatusBadge({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  const className = COLOR_STYLES[color] ?? COLOR_STYLES.gray;

  return (
    <span className={cn("rounded-full px-3 py-1 text-xs font-bold", className)}>
      {label}
    </span>
  );
}