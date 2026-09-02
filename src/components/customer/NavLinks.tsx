"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Box, PackagePlus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/customer", label: "الرئيسية", icon: Home },
  { href: "/customer/shipments", label: "شحناتي", icon: Box },
  { href: "/customer/new", label: "شحنة جديدة", icon: PackagePlus },
];

export function NavLinks({ variant }: { variant: "mobile" | "sidebar" }) {
  const pathname = usePathname();

  if (variant === "mobile") {
    return (
      <div className="flex items-center gap-2 overflow-x-auto border-t bg-white px-4 py-3 lg:hidden">
        {NAV_ITEMS.map(({ href, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "shrink-0 rounded-full px-5 py-2 text-sm font-bold transition",
                isActive
                  ? "bg-navy-950 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {label}
            </Link>
          );
        })}
      </div>
    );
  }

  // variant === "sidebar"
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition",
              isActive
                ? "bg-navy-950 font-bold text-white shadow-sm"
                : "text-gray-500 hover:bg-gray-100 hover:text-navy-950"
            )}
          >
            <Icon className="h-4.5 w-4.5 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}