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
// أضفنا عمودي "اسم العميل" و"رقم هاتف العميل" عشان الاستيراد يقدر يحدد/ينشئ
// العميل بنفسه من غير ما يتطلب اختيار عميل من الواجهة الأول
const EXPECTED_HEADERS = [
  "اسم العميل",
  "رقم هاتف العميل",
  "اسم المستلم",
  "رقم الهاتف",
  "العنوان",
  "المدينة",
  "نوع البضاعة",
  "مبلغ التحصيل",
];

type ParsedRow = {
  rowNumber: number;
  customerName: string;
  customerPhone: string;
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
 *
 * كل صف في الشيت بيحتوي على بيانات العميل (اسمه ورقم هاتفه) بجانب بيانات
 * المستلم، فمش لازم تختار عميل من الواجهة قبل الاستيراد. بيانات العميل
 * بتتقرا من الشيت مباشرة: لو رقم الهاتف موجود بالفعل في جدول customers
 * بيتم استخدام نفس العميل، ولو مش موجود بيتعمل عميل جديد تلقائيًا
 * (عن طريق دالة الداتابيز find_or_create_customer).
 *
 * customerId (اختياري، للتوافق مع استخدام قديم): لو اتبعت، كل الشحنات
 * هتتسجل باسم العميل ده على طول من غير ما تدور على بيانات العميل في الشيت.
 *
 * agentId (اختياري): لو المندوب هو اللي بيستورد، مرر id بتاعه من جدول agents
 * وكل الشحنات هتتسجل باسمه (الداتابيز بتسمح للمندوب يضيف شحنات لنفسه بس).
 * للأدمن سيبه فاضي.
 *
 * onSuccess (اختياري): بيتنفذ بعد نجاح رفع الشحنات في قاعدة البيانات.
 *
 * ملاحظة: توليد tracking_number هنا (Date.now + Math.random) احتمال تصادمه
 * ضعيف لكنه مش صفر، والعمود عليه unique constraint.
 */
export default function BulkImportShipments({
  customerId,
  agentId,
  onSuccess,
}: {
  customerId?: string;
  agentId?: string;
  onSuccess?: () => void;
}) {
  const supabase = createClient();

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [importStage, setImportStage] = useState<string | null>(null);

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
    setImportStage(null);
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

        // لو الملف اتبعت مع customerId جاهز (استخدام قديم)، أعمدة العميل
        // مش مطلوبة في الشيت
        const requiredHeaders = customerId
          ? EXPECTED_HEADERS.filter((h) => h !== "اسم العميل" && h !== "رقم هاتف العميل")
          : EXPECTED_HEADERS;

        const missingHeaders = requiredHeaders.filter((h) => !headerRow.includes(h));

        if (missingHeaders.length > 0) {
          setGlobalError(
            `الأعمدة دي ناقصة أو أسماؤها مش مطابقة: ${missingHeaders.join("، ")}`
          );
          setParsing(false);
          return;
        }

        const colIndex: Record<string, number> = {};
        requiredHeaders.forEach((h) => {
          colIndex[h] = headerRow.indexOf(h);
        });

        const parsed: ParsedRow[] = [];
        const seenReceiverPhones = new Map<string, number>(); // رقم المستلم -> أول سطر ظهر فيه

        for (let i = 1; i < json.length; i++) {
          const raw = json[i];
          if (!raw || raw.every((c) => !String(c ?? "").trim())) continue; // سطر فاضي بالكامل، نتجاهله

          const customerName = customerId
            ? ""
            : String(raw[colIndex["اسم العميل"]] ?? "").trim();
          const customerPhone = customerId
            ? ""
            : String(raw[colIndex["رقم هاتف العميل"]] ?? "").trim();
          const receiverName = String(raw[colIndex["اسم المستلم"]] ?? "").trim();
          const receiverPhone = String(raw[colIndex["رقم الهاتف"]] ?? "").trim();
          const receiverAddress = String(raw[colIndex["العنوان"]] ?? "").trim();
          const receiverArea = String(raw[colIndex["المدينة"]] ?? "").trim();
          const description = String(raw[colIndex["نوع البضاعة"]] ?? "").trim();
          const collectionRaw = String(raw[colIndex["مبلغ التحصيل"]] ?? "").trim();
          const collectionAmount = Number(collectionRaw);

          const errors: string[] = [];

          if (!customerId) {
            if (!customerName) errors.push("اسم العميل فاضي");
            if (!customerPhone) {
              errors.push("رقم هاتف العميل فاضي");
            } else if (!EGYPT_PHONE_REGEX.test(customerPhone)) {
              errors.push("رقم هاتف العميل لازم يكون رقم مصري صحيح (01 ويتبعه 9 أرقام)");
            }
          }

          if (!receiverName) errors.push("اسم المستلم فاضي");

          if (!receiverPhone) {
            errors.push("هاتف المستلم فاضي");
          } else if (!EGYPT_PHONE_REGEX.test(receiverPhone)) {
            errors.push("هاتف المستلم لازم يكون رقم مصري صحيح (01 ويتبعه 9 أرقام)");
          } else if (seenReceiverPhones.has(receiverPhone)) {
            errors.push(`رقم المستلم مكرر مع صف ${seenReceiverPhones.get(receiverPhone)}`);
          } else {
            seenReceiverPhones.set(receiverPhone, i + 1);
          }

          if (!receiverAddress) errors.push("العنوان فاضي");
          if (!receiverArea) errors.push("المدينة فاضية");
          if (!description) errors.push("نوع البضاعة فاضي");
          if (!collectionRaw || isNaN(collectionAmount) || collectionAmount < 0) {
            errors.push("مبلغ التحصيل غلط");
          }

          parsed.push({
            rowNumber: i + 1,
            customerName,
            customerPhone,
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

    // خريطة رقم هاتف العميل -> customer_id، عشان لو أكتر من صف بنفس رقم
    // العميل (يعني نفس العميل ليه أكتر من شحنة) منعملش عميل مكرر
    const customerIdByPhone = new Map<string, string>();

    if (!customerId) {
      setImportStage("جاري التحقق من بيانات العملاء...");

      const uniquePhones = Array.from(new Set(validRows.map((r) => r.customerPhone)));

      // لكل رقم عميل: ندور عليه أو ننشئه من غير ما نعرض جدول العملاء كله للمندوب
      for (const phone of uniquePhones) {
        const row = validRows.find((r) => r.customerPhone === phone)!;

        const { data: cid, error: rpcError } = await supabase.rpc("find_or_create_customer", {
          p_name: row.customerName,
          p_phone: phone,
        });

        if (rpcError || !cid) {
          console.error("find_or_create_customer error:", rpcError?.message);
          setGlobalError(
            `تعذر تحديد/إنشاء العميل "${row.customerName}" (${phone})، برجاء المحاولة مرة أخرى`
          );
          setSubmitting(false);
          setImportStage(null);
          return;
        }

        customerIdByPhone.set(phone, cid as string);
      }
    }

    setImportStage("جاري إنشاء الشحنات...");

    const records = validRows.map((r) => ({
      id: `shp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tracking_number: generateTrackingNumber(),
      customer_id: customerId ?? customerIdByPhone.get(r.customerPhone)!,
      agent_id: agentId ?? null,
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
    setImportStage(null);

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
    const headers = customerId
      ? EXPECTED_HEADERS.filter((h) => h !== "اسم العميل" && h !== "رقم هاتف العميل")
      : EXPECTED_HEADERS;
    const ws = XLSX.utils.aoa_to_sheet([headers]);
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

  const displayHeaders = customerId
    ? EXPECTED_HEADERS.filter((h) => h !== "اسم العميل" && h !== "رقم هاتف العميل")
    : EXPECTED_HEADERS;

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
        الأعمدة المطلوبة في الصف الأول بنفس الأسماء: {displayHeaders.join(" - ")}. ممكن
        الملف يحتوي على أكتر من صف/شحنة في نفس الوقت.
        {!customerId && " لو العميل مش موجود بالفعل، هيتم إنشاؤه تلقائيًا من بياناته في الشيت."}
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
                  {!customerId && (
                    <th className="px-3 py-2 font-semibold text-gray-500">العميل</th>
                  )}
                  <th className="px-3 py-2 font-semibold text-gray-500">اسم المستلم</th>
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
                    {!customerId && (
                      <td className="px-3 py-2 text-navy-700">
                        {r.customerName || "—"}
                        {r.customerPhone && (
                          <span className="block text-gray-400" dir="ltr">
                            {r.customerPhone}
                          </span>
                        )}
                      </td>
                    )}
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
              ? importStage ?? "جاري رفع الشحنات..."
              : `تأكيد ورفع ${validRows.length} شحنة`}
          </button>
        </div>
      )}
    </div>
  );
}