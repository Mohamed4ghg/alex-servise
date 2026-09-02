import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function AuthCodeErrorPage() {
  return (
    <main
      className="flex min-h-screen items-center justify-center px-4"
      style={{ backgroundColor: "#0A1730" }}
    >
      <div className="w-full max-w-md text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-600/15 ring-1 ring-red-500/20">
          <AlertTriangle className="h-7 w-7 text-red-500" />
        </span>

        <h1 className="mt-6 font-display text-2xl font-extrabold text-white">
          الرابط غير صالح أو منتهي الصلاحية
        </h1>
        <p className="mt-3 text-sm leading-7 text-navy-100/70">
          رابط التأكيد ده يمكن يكون اتستخدم قبل كده أو انتهت صلاحيته. جرب
          تسجّل حساب جديد أو تطلب رابط تأكيد جديد.
        </p>

        <Link
          href="/sign-up"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-red-600/25 transition hover:bg-red-700"
        >
          الرجوع لإنشاء حساب
        </Link>
      </div>
    </main>
  );
}