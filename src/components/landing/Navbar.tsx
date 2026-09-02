"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Menu, X, PackageSearch } from "lucide-react";

const LINKS = [
  { href: "#features", label: "المميزات" },
  { href: "#how-it-works", label: "كيف نعمل؟" },
  { href: "#about", label: "عن الشركة" },
  { href: "#faq", label: "الأسئلة الشائعة" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center">
          <Image
            src="/images/logo.png"
            alt="Alex Service"
            width={140}
            height={40}
            className="h-14 w-auto sm:h-15"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-gray-600 transition hover:text-navy-900"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/tracking"
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold text-navy-800 transition hover:bg-navy-50"
          >
            <PackageSearch className="h-4 w-4" />
            تتبع شحنتك
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-navy-900 transition hover:border-navy-300"
          >
            تسجيل الدخول
          </Link>
          <Link
            href="/sign-up"
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-red-600/20 transition hover:bg-red-700"
          >
            إنشاء حساب
          </Link>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-navy-900 lg:hidden"
          aria-label="فتح القائمة"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-100 bg-white px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3">
            <Link
              href="/tracking"
              className="rounded-lg px-3 py-2.5 text-center text-sm font-semibold text-navy-800 hover:bg-navy-50"
            >
              تتبع شحنتك
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-gray-200 px-3 py-2.5 text-center text-sm font-semibold text-navy-900"
            >
              تسجيل الدخول
            </Link>
            <Link
              href="/sign-up"
              className="rounded-lg bg-red-600 px-3 py-2.5 text-center text-sm font-semibold text-white"
            >
              إنشاء حساب
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}