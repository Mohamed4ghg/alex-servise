import Link from "next/link";
import { PackagePlus, ChevronLeft } from "lucide-react";
import { StatusBadge } from "./StatusBadge";

type Shipment = {
  id: string;
  tracking_number: string;
  status: string;
  receiver_area: string | null;
  receiver_address: string | null;
  value: number | null;
  collection_amount: number | null;
  created_at: string;
};

type StatusInfo = { label: string; color: string };

export function RecentShipments({
  shipments,
  statusMap,
  error,
}: {
  shipments: Shipment[];
  statusMap: Record<string, StatusInfo>;
  error?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
        <h2 className="font-display text-lg font-bold text-navy-950">
          آخر الشحنات
        </h2>
        <Link
          href="/customer/shipments"
          className="flex items-center gap-1 text-sm font-bold text-red-600 hover:text-red-700"
        >
          عرض الكل
          <ChevronLeft className="h-4 w-4" />
        </Link>
      </div>

      {error && (
        <div className="px-6 py-10 text-center text-sm text-red-500">
          حصل خطأ أثناء تحميل الشحنات، حاول تاني.
        </div>
      )}

      {!error && shipments.length === 0 && (
        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-50">
            <PackagePlus className="h-6 w-6 text-gray-400" />
          </span>
          <p className="text-sm font-medium text-gray-500">
            لسه معملتش أي شحنة
          </p>
          <Link
            href="/customer/new"
            className="mt-1 rounded-full bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700"
          >
            اعمل شحنة جديدة
          </Link>
        </div>
      )}

      {!error && shipments.length > 0 && (
        <ul className="divide-y divide-gray-50">
          {shipments.map((shipment) => {
            const statusInfo = statusMap[shipment.status] ?? {
              label: shipment.status,
              color: "gray",
            };

            return (
              <li key={shipment.id}>
                <Link
                  href={`/customer/shipments/${shipment.id}`}
                  className="flex items-center justify-between px-6 py-4 transition hover:bg-gray-50"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-navy-950">
                      #{shipment.tracking_number}
                    </span>
                    <span className="text-xs text-gray-400">
                      {shipment.receiver_area ?? shipment.receiver_address ?? "—"}{" "}
                      ·{" "}
                      {new Date(shipment.created_at).toLocaleDateString(
                        "ar-EG",
                        { day: "numeric", month: "short", year: "numeric" }
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    {(shipment.value ?? shipment.collection_amount) !==
                      null && (
                      <span className="text-sm font-bold text-navy-950">
                        {shipment.value ?? shipment.collection_amount} ج.م
                      </span>
                    )}
                    <StatusBadge
                      label={statusInfo.label}
                      color={statusInfo.color}
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}