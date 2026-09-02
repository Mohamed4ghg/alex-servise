export type ShipmentStatus =
  | "pending"
  | "assigned"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "failed"
  | "returned"
  | "cancelled";

export const SHIPMENT_STATUS_LABEL: Record<ShipmentStatus, string> = {
  pending: "قيد الانتظار",
  assigned: "تم الإسناد",
  picked_up: "تم الاستلام",
  in_transit: "قيد التوصيل",
  delivered: "تم التسليم",
  failed: "فشل التسليم",
  returned: "مرتجع",
  cancelled: "ملغي",
};