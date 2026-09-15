"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
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

function generateTrackingNumber() {
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  const time = Date.now().toString(36).toUpperCase();
  return `AS-${time}${random}`;
}

/**
 * استيراد شحنات دفعة واحدة من ملف Excel.
 * قابل للاستخدام في صفحة العميل (بيبعت customerId بتاعه هو) أو صفحة الأدمن
 * (الأدمن بيختار العميل الأول من قائمة، وبيبعت الـid بتاعه هنا).
 */
export default function BulkImportShipments({ customerId }: { customerId: string }) {
  const supabase = createClient();

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);

  const validRows = rows.filter((r) => r.errors.length === 0);
  const invalidRows = rows.filter((r) => r.errors.length > 0);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setGlobalError(null);
    setResult(null);
    setRows([]);
    setParsing(true);

    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
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

        const headerRow = json[0].map((h) => String(h).trim());
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
          if (!receiverPhone || receiverPhone.length !== 11) errors.push("الهاتف لازم 11 رقم");
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

    reader.readAsBinaryString(file);
  }

  async function handleImport() {
    if (validRows.length === 0) return;
    setSubmitting(true);
    setResult(null);

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
      .select("id");

    setSubmitting(false);

    if (insertError) {
      console.error("Bulk import error:", insertError.message);
      setGlobalError("حصل خطأ أثناء رفع الشحنات، برجاء المحاولة مرة أخرى");
      setResult({ success: 0, failed: records.length });
      return;
    }

    setResult({ success: data?.length ?? records.length, failed: invalidRows.length });
    setRows([]);
    setFileName(null);
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([EXPECTED_HEADERS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الشحنات");
    XLSX.writeFile(wb, "نموذج_استيراد_الشحنات.xlsx");
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
        الأعمدة المطلوبة في الصف الأول بنفس الأسماء: {EXPECTED_HEADERS.join(" - ")}
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
              {validRows.length} صف سليم
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
            {submitting ? "جاري رفع الشحنات..." : `رفع ${validRows.length} شحنة`}
          </button>
        </div>
      )}

      {result && (
        <p className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-success-700">
          <CheckCircle2 className="h-4 w-4" /> تم رفع {result.success} شحنة بنجاح
        </p>
      )}
    </div>
  );
}