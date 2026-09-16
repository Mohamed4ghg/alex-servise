"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Package,
  Upload,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

// نفس ترتيب وأسماء الأعمدة المتوقعة في الشيت بالظبط (الصف الأول = العناوين)
const EXPECTED_HEADERS = [
  "اسم المستلم",
  "رقم الهاتف",
  "العنوان",
  "المدينة",
  "نوع البضاعة",
  "مبلغ التحصيل",
];

type ParsedRow = {
  rowNumber: number;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  receiverArea: string;
  description: string;
  collectionAmount: number;
  errors: string[];
};

// شحنة اتضافت فعليًا في الداتابيز بنجاح، بنعرضها في شاشة التأكيد
type CreatedShipment = {
  id: string;
  trackingNumber: string;
  receiverName: string;
  receiverPhone: string;
  collectionAmount: number;
};

// بيشيل المسافات العادية + المسافات والرموز المخفية (zero-width, BOM..) اللي بتيجي أحيانًا من ملفات إكسل
function normalizeHeader(s: unknown) {
  return String(s ?? "")
    .replace(/[\u200B-\u200F\uFEFF\u00A0]/g, "")
    .trim();
}

// رقم موبايل مصري: يبدأ بـ 01 ويتبعه 9 أرقام (11 رقم بالظبط)، أرقام فقط
const EGYPT_PHONE_REGEX = /^01\d{9}$/;

function generateTrackingNumber() {
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  const time = Date.now().toString(36).toUpperCase();
  return `AS-${time}${random}`;
}

/**
 * استيراد شحنات دفعة واحدة من ملف Excel.
 * قابل للاستخدام في صفحة العميل (بيبعت customerId بتاعه هو) أو صفحة الأدمن
 * (الأدمن بيختار العميل الأول من قائمة، وبيبعت الـid بتاعه هنا).
 *
 * الملف ممكن يحتوي على أكتر من شحنة (صف = شحنة)، فبعد نجاح الرفع بنعرض
 * شاشة تأكيد فيها كل الشحنات اللي اتضافت فعليًا مع رقم التتبع بتاعها.
 *
 * onSuccess (اختياري): بيتنفذ بعد نجاح رفع الشحنات في قاعدة البيانات.
 * مفيد لو الصفحة اللي بتستخدم الكومبوننت عايزة تعمل حاجة بعد النجاح،
 * زي قفل مودال أو عمل refresh لقائمة الشحنات.
 *
 * ملاحظة: لو الجدول shipments عنده default value لعمود id (زي gen_random_uuid())
 * وعمود tracking_number عنده unique constraint مربوط بـ sequence أو function في
 * الداتابيز، يفضل تشيل توليد id/tracking_number من هنا خالص وتسيبهم للداتابيز
 * عشان تضمن عدم التصادم. التوليد هنا (Date.now + Math.random) احتمال تصادمه
 * ضعيف لكنه مش صفر.
 */
export default function BulkImportShipments({
  customerId,
  onSuccess,
}: {
  customerId: string;
  onSuccess?: () => void;
}) {
  const supabase = createClient();

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // بعد نجاح الرفع، بنسيب الشحنات اللي اتضافت هنا عشان شاشة التأكيد
  const [createdShipments, setCreatedShipments] = useState<CreatedShipment[] | null>(null);
  const [failedCount, setFailedCount] = useState(0);

  const validRows = rows.filter((r) => r.errors.length === 0);
  const invalidRows = rows.filter((r) => r.errors.length > 0);

  function resetAll() {
    setRows([]);
    setFileName(null);
    setGlobalError(null);
    setCreatedShipments(null);
    setFailedCount(0);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setGlobalError(null);
    setCreatedShipments(null);
    setRows([]);
    setParsing(true);

    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        // ArrayBuffer بدل BinaryString (الطريقة الحديثة والموصى بيها من مكتبة xlsx)
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          raw: false,
          defval: "",
        }) as string[][];

        if (json.length < 2) {
          setGlobalError("الشيت فاضي أو مفيهوش بيانات");
          setParsing(false);
          return;
        }

        const headerRow = json[0].map(normalizeHeader);
        const missingHeaders = EXPECTED_HEADERS.filter((h) => !headerRow.includes(h));

        if (missingHeaders.length > 0) {
          setGlobalError(
            `الأعمدة دي ناقصة أو أسماؤها مش مطابقة: ${missingHeaders.join("، ")}`
          );
          setParsing(false);
          return;
        }

        const colIndex: Record<string, number> = {};
        EXPECTED_HEADERS.forEach((h) => {
          colIndex[h] = headerRow.indexOf(h);
        });

        const parsed: ParsedRow[] = [];
        const seenPhones = new Map<string, number>(); // phone -> أول سطر ظهر فيه

        for (let i = 1; i < json.length; i++) {
          const raw = json[i];
          if (!raw || raw.every((c) => !String(c ?? "").trim())) continue; // سطر فاضي بالكامل، نتجاهله

          const receiverName = String(raw[colIndex["اسم المستلم"]] ?? "").trim();
          const receiverPhone = String(raw[colIndex["رقم الهاتف"]] ?? "").trim();
          const receiverAddress = String(raw[colIndex["العنوان"]] ?? "").trim();
          const receiverArea = String(raw[colIndex["المدينة"]] ?? "").trim();
          const description = String(raw[colIndex["نوع البضاعة"]] ?? "").trim();
          const collectionRaw = String(raw[colIndex["مبلغ التحصيل"]] ?? "").trim();
          const collectionAmount = Number(collectionRaw);

          const errors: string[] = [];
          if (!receiverName) errors.push("الاسم فاضي");

          if (!receiverPhone) {
            errors.push("الهاتف فاضي");
          } else if (!EGYPT_PHONE_REGEX.test(receiverPhone)) {
            errors.push("الهاتف لازم يكون رقم مصري صحيح (01 ويتبعه 9 أرقام)");
          } else if (seenPhones.has(receiverPhone)) {
            errors.push(`الرقم مكرر مع صف ${seenPhones.get(receiverPhone)}`);
          } else {
            seenPhones.set(receiverPhone, i + 1);
          }

          if (!receiverAddress) errors.push("العنوان فاضي");
          if (!receiverArea) errors.push("المدينة فاضية");
          if (!description) errors.push("نوع البضاعة فاضي");
          if (!collectionRaw || isNaN(collectionAmount) || collectionAmount < 0) {
            errors.push("مبلغ التحصيل غلط");
          }

          parsed.push({
            rowNumber: i + 1,
            receiverName,
            receiverPhone,
            receiverAddress,
            receiverArea,
            description,
            collectionAmount: isNaN(collectionAmount) ? 0 : collectionAmount,
            errors,
          });
        }

        if (parsed.length === 0) {
          setGlobalError("مفيش صفوف فيها بيانات في الشيت");
        }

        setRows(parsed);
      } catch (err) {
        console.error("Excel parse error:", err);
        setGlobalError("تعذر قراءة الملف، تأكد إنه ملف Excel صحيح (.xlsx أو .xls)");
      } finally {
        setParsing(false);
      }
    };

    reader.onerror = () => {
      setGlobalError("حصل خطأ أثناء قراءة الملف");
      setParsing(false);
    };

    reader.readAsArrayBuffer(file);
  }

  async function handleImport() {
    if (validRows.length === 0) return;
    setSubmitting(true);
    setGlobalError(null);

    const records = validRows.map((r) => ({
      id: `shp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tracking_number: generateTrackingNumber(),
      customer_id: customerId,
      receiver_name: r.receiverName,
      receiver_phone: r.receiverPhone,
      receiver_address: r.receiverAddress,
      receiver_area: r.receiverArea,
      description: r.description,
      collection_amount: r.collectionAmount,
      pieces_count: 1,
      status: "pending",
      priority: "normal",
    }));

    const { data, error: insertError } = await supabase
      .from("shipments")
      .insert(records)
      .select("id, tracking_number, receiver_name, receiver_phone, collection_amount");

    setSubmitting(false);

    if (insertError) {
      console.error("Bulk import error:", insertError.message);
      setGlobalError("حصل خطأ أثناء رفع الشحنات، برجاء المحاولة مرة أخرى");
      return;
    }

    // نعرض شاشة تأكيد فيها كل شحنة اتضافت فعليًا (ممكن يبقوا أكتر من شحنة في نفس الملف)
    const confirmed: CreatedShipment[] = (data ?? []).map((d) => ({
      id: d.id,
      trackingNumber: d.tracking_number,
      receiverName: d.receiver_name,
      receiverPhone: d.receiver_phone,
      collectionAmount: d.collection_amount ?? 0,
    }));

    setCreatedShipments(confirmed);
    setFailedCount(invalidRows.length);
    setRows([]);
    setFileName(null);
    onSuccess?.();
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([EXPECTED_HEADERS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الشحنات");
    XLSX.writeFile(wb, "نموذج_استيراد_الشحنات.xlsx");
  }

  // ===== شاشة تأكيد بيانات الشحنات بعد نجاح الرفع =====
  if (createdShipments) {
    const totalCollection = createdShipments.reduce((sum, s) => sum + s.collectionAmount, 0);

    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-100">
            <CheckCircle2 className="h-7 w-7 text-success-600" />
          </span>
          <h2 className="mt-4 font-display text-lg font-bold text-navy-950">
            تم إنشاء {createdShipments.length} شحنة بنجاح
          </h2>
          {failedCount > 0 && (
            <p className="mt-1 text-sm text-red-500">
              {failedCount} صف اتشال ولم يتم رفعه لوجود مشكلة في بياناته
            </p>
          )}
        </div>

        <div className="mt-5 max-h-80 overflow-auto rounded-xl border border-gray-100">
          <table className="w-full text-right text-xs">
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                <th className="px-3 py-2 font-semibold text-gray-500">رقم التتبع</th>
                <th className="px-3 py-2 font-semibold text-gray-500">المستلم</th>
                <th className="px-3 py-2 font-semibold text-gray-500">الهاتف</th>
                <th className="px-3 py-2 font-semibold text-gray-500">التحصيل</th>
              </tr>
            </thead>
            <tbody>
              {createdShipments.map((s) => (
                <tr key={s.id} className="border-t border-gray-50">
                  <td className="px-3 py-2 font-mono font-semibold text-navy-950" dir="ltr">
                    {s.trackingNumber}
                  </td>
                  <td className="px-3 py-2 font-medium text-navy-900">{s.receiverName}</td>
                  <td className="px-3 py-2" dir="ltr">
                    {s.receiverPhone}
                  </td>
                  <td className="px-3 py-2 tnum">{s.collectionAmount} ج.م</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 text-sm">
          <span className="flex items-center gap-1.5 font-semibold text-navy-900">
            <Package className="h-4 w-4" />
            إجمالي عدد الشحنات
          </span>
          <span className="font-bold text-navy-950 tnum">{createdShipments.length}</span>
        </div>
        <div className="mt-2 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 text-sm">
          <span className="font-semibold text-navy-900">إجمالي مبلغ التحصيل</span>
          <span className="font-bold text-red-600 tnum">{totalCollection} ج.م</span>
        </div>

        <button
          onClick={resetAll}
          className="mt-5 w-full rounded-lg border border-gray-200 py-2.5 text-sm font-semibold text-navy-800 transition hover:border-navy-300"
        >
          استيراد ملف تاني
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-navy-700" />
          <h2 className="font-display text-sm font-bold text-navy-950">
            استيراد شحنات من ملف Excel
          </h2>
        </div>
        <button
          onClick={downloadTemplate}
          className="text-xs font-semibold text-navy-700 hover:underline"
        >
          تحميل نموذج فاضي
        </button>
      </div>

      <p className="mt-2 text-xs text-gray-500">
        الأعمدة المطلوبة في الصف الأول بنفس الأسماء: {EXPECTED_HEADERS.join(" - ")}. ممكن
        الملف يحتوي على أكتر من صف/شحنة في نفس الوقت.
      </p>

      <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-8 text-center hover:border-navy-300">
        <Upload className="h-6 w-6 text-gray-400" />
        <span className="text-sm font-semibold text-navy-900">
          {fileName ?? "اضغط لاختيار ملف Excel (.xlsx / .xls)"}
        </span>
        <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
      </label>

      {parsing && (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> جاري قراءة الملف...
        </div>
      )}

      {globalError && (
        <p className="mt-4 flex items-center gap-1.5 text-sm text-red-500">
          <AlertCircle className="h-4 w-4" /> {globalError}
        </p>
      )}

      {rows.length > 0 && (
        <div className="mt-5">
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
            <span className="rounded-full bg-success-50 px-3 py-1 text-success-700">
              {validRows.length} صف سليم (شحنة)
            </span>
            {invalidRows.length > 0 && (
              <span className="rounded-full bg-red-50 px-3 py-1 text-red-600">
                {invalidRows.length} صف فيه مشكلة (مش هيتضاف)
              </span>
            )}
          </div>

          <div className="mt-3 max-h-80 overflow-auto rounded-xl border border-gray-100">
            <table className="w-full text-right text-xs">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <th className="px-3 py-2 font-semibold text-gray-500">#</th>
                  <th className="px-3 py-2 font-semibold text-gray-500">الاسم</th>
                  <th className="px-3 py-2 font-semibold text-gray-500">الهاتف</th>
                  <th className="px-3 py-2 font-semibold text-gray-500">المدينة</th>
                  <th className="px-3 py-2 font-semibold text-gray-500">نوع البضاعة</th>
                  <th className="px-3 py-2 font-semibold text-gray-500">التحصيل</th>
                  <th className="px-3 py-2 font-semibold text-gray-500">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.rowNumber} className={r.errors.length > 0 ? "bg-red-50/50" : ""}>
                    <td className="px-3 py-2 text-gray-400">{r.rowNumber}</td>
                    <td className="px-3 py-2 font-medium text-navy-900">{r.receiverName || "—"}</td>
                    <td className="px-3 py-2" dir="ltr">{r.receiverPhone || "—"}</td>
                    <td className="px-3 py-2">{r.receiverArea || "—"}</td>
                    <td className="px-3 py-2">{r.description || "—"}</td>
                    <td className="px-3 py-2">{r.collectionAmount}</td>
                    <td className="px-3 py-2">
                      {r.errors.length === 0 ? (
                        <span className="flex items-center gap-1 text-success-600">
                          <CheckCircle2 className="h-3.5 w-3.5" /> جاهز
                        </span>
                      ) : (
                        <span className="text-red-500">{r.errors.join("، ")}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleImport}
            disabled={submitting || validRows.length === 0}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting
              ? "جاري رفع الشحنات..."
              : `تأكيد ورفع ${validRows.length} شحنة`}
          </button>
        </div>
      )}
    </div>
  );
}