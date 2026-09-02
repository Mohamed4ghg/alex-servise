"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getShipmentStatusMap, type StatusInfo } from "@/lib/status-cache";

// عمود color في shipment_statuses بيرجع اسم عائلة لون (gray, info, warning,
// success, red)، والكلاسات دي بتحوله لكلاسات Tailwind فعلية
const COLOR_CLASSES: Record<string, string> = {
  gray: "bg-gray-100 text-gray-600 ring-gray-200",
  info: "bg-info-100 text-info-600 ring-info-100",
  warning: "bg-warning-100 text-warning-600 ring-warning-100",
  success: "bg-success-100 text-success-600 ring-success-100",
  red: "bg-red-100 text-red-600 ring-red-100",
};

export function ShipmentStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const [info, setInfo] = useState<StatusInfo | null>(null);

  useEffect(() => {
    let mounted = true;
    getShipmentStatusMap().then((map) => {
      if (mounted) setInfo(map[status] ?? null);
    });
    return () => {
      mounted = false;
    };
  }, [status]);

  const colorClass = COLOR_CLASSES[info?.color ?? "gray"];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset whitespace-nowrap",
        colorClass,
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {info?.label ?? status}
    </span>
  );
}

// بادچ المندوبين - عرّفنا الأنواع هنا مباشرة عشان نتجنب مشكلة الاستيراد
// من lib/types لحد ما نتأكد إيه اللي موجود جواه فعلياً
type AgentStatus = "available" | "on_task" | "unavailable" | "offline";

const AGENT_STATUS_LABEL: Record<AgentStatus, string> = {
  available: "متاح",
  on_task: "في مهمة",
  unavailable: "غير متاح",
  offline: "غير متصل",
};

const agentDotStyles: Record<AgentStatus, string> = {
  available: "bg-success-600",
  on_task: "bg-warning-600",
  unavailable: "bg-red-600",
  offline: "bg-gray-400",
};

export function AgentStatusBadge({
  status,
  className,
}: {
  status: AgentStatus;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700", className)}>
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          agentDotStyles[status],
          status === "available" && "pulse-dot"
        )}
      />
      {AGENT_STATUS_LABEL[status]}
    </span>
  );
}