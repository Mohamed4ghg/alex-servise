import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Accent = "navy" | "blue" | "green" | "amber";

const ACCENT_STYLES: Record<Accent, { bg: string; icon: string }> = {
  navy: { bg: "bg-navy-950", icon: "text-white" },
  blue: { bg: "bg-blue-50", icon: "text-blue-600" },
  green: { bg: "bg-emerald-50", icon: "text-emerald-600" },
  amber: { bg: "bg-amber-50", icon: "text-amber-600" },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "navy",
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  accent?: Accent;
}) {
  const styles = ACCENT_STYLES[accent];
  const isDark = accent === "navy";

  return (
    <div
      className={cn(
        "rounded-2xl border border-gray-100 p-5 shadow-sm transition hover:shadow-md",
        isDark ? "bg-navy-950" : "bg-white"
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl",
            styles.bg
          )}
        >
          <Icon className={cn("h-5 w-5", styles.icon)} />
        </span>
      </div>

      <div className="mt-4">
        <p
          className={cn(
            "text-3xl font-extrabold",
            isDark ? "text-white" : "text-navy-950"
          )}
        >
          {value}
        </p>
        <p
          className={cn(
            "mt-1 text-sm font-medium",
            isDark ? "text-gray-300" : "text-gray-500"
          )}
        >
          {label}
        </p>
      </div>
    </div>
  );
}