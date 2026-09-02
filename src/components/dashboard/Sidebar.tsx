"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Users,
  Briefcase,
  UserCheck,
  MapPin,
  UserRound,
  Wallet,
  RotateCcw,
  BarChart3,
  Bell,
  ShieldCheck,
  Settings,
  History,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/shipments", label: "الشحنات", icon: Package },
  { href: "/dashboard/agents", label: "المندوبين", icon: Users },
  { href: "/dashboard/agents/approvals", label: "طلبات انضمام المندوبين", icon: UserCheck },
  { href: "/dashboard/staff", label: "الموظفين", icon: Briefcase },
  { href: "/dashboard/live-map", label: "التتبع المباشر", icon: MapPin },
  { href: "/dashboard/customers", label: "العملاء", icon: UserRound },
  { href: "/dashboard/collections", label: "التحصيلات", icon: Wallet },
  { href: "/dashboard/returns", label: "المرتجعات", icon: RotateCcw },
  { href: "/dashboard/reports", label: "التقارير", icon: BarChart3 },
  { href: "/dashboard/notifications", label: "الإشعارات", icon: Bell, badge: 5 },
];

const NAV_BOTTOM = [
  { href: "/dashboard/users", label: "المستخدمون والصلاحيات", icon: ShieldCheck },
  { href: "/dashboard/activity-log", label: "سجل الأنشطة", icon: History },
  { href: "/dashboard/settings", label: "الإعدادات", icon: Settings },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const content = (
    <div className="flex h-full flex-col bg-navy-950">
      <div className="flex h-16 items-center justify-between px-5">
        <Logo dark className="scale-95" />
        <button onClick={onClose} className="text-navy-200 lg:hidden">
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="scroll-thin flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={cn(
              "flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
              isActive(item.href, item.exact)
                ? "bg-white/10 text-white"
                : "text-navy-100/70 hover:bg-white/5 hover:text-white"
            )}
          >
            <span className="flex items-center gap-3">
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </span>
            {item.badge && (
              <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="space-y-1 border-t border-white/10 px-3 py-4">
        {NAV_BOTTOM.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
              isActive(item.href) ? "bg-white/10 text-white" : "text-navy-100/70 hover:bg-white/5 hover:text-white"
            )}
          >
            <item.icon className="h-[18px] w-[18px]" />
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-64 shrink-0 lg:block">{content}</aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <aside className="absolute inset-y-0 right-0 w-72 animate-fade-up">{content}</aside>
        </div>
      )}
    </>
  );
}