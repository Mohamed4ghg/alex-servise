"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, UserPlus } from "lucide-react";
import { createStaffAccount } from "./actions";

export default function NewStaffForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const result = await createStaffAccount(fullName, email, password);

    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "حصل خطأ غير متوقع");
      return;
    }

    setSuccess(true);
    setFullName("");
    setEmail("");
    setPassword("");

    // ريفريش الصفحة عشان القائمة تتحدث بالموظف الجديد
    setTimeout(() => window.location.reload(), 1000);
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[var(--shadow-card)]">
      <h2 className="flex items-center gap-2 text-sm font-bold text-navy-950">
        <UserPlus className="h-4 w-4" />
        إضافة موظف جديد
      </h2>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">الاسم الكامل</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">البريد الإلكتروني</label>
          <input
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">كلمة المرور المبدئية</label>
          <input
            type="password"
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8 أحرف على الأقل"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-100"
            required
          />
        </div>

        {error && (
          <p className="flex items-center gap-1.5 text-xs text-red-500">
            <AlertCircle className="h-3.5 w-3.5" /> {error}
          </p>
        )}
        {success && (
          <p className="flex items-center gap-1.5 text-xs text-success-600">
            <CheckCircle2 className="h-3.5 w-3.5" /> تم إنشاء حساب الموظف بنجاح
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
        </button>
      </form>
    </div>
  );
}