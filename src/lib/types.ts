export type ShipmentStatus =
  | "pending"
  | "assigned"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "failed"
  | "returned"
  | "cancelled"
  | "new" // <--- زودتها
  | "out_for_delivery"; // <--- زودتها

export const SHIPMENT_STATUS_LABEL: Record<ShipmentStatus, string> = {
  pending: "قيد الانتظار",
  assigned: "تم الإسناد",
  picked_up: "تم الاستلام",
  in_transit: "قيد التوصيل",
  delivered: "تم التسليم",
  failed: "فشل التسليم",
  returned: "مرتجع",
  cancelled: "ملغي",
  new: "جديد", // <--- زودتها
  out_for_delivery: "خارج للتوصيل", // <--- زودتها
};

export type AgentStatus = "active" | "inactive" | "on_delivery" | "available" | "on_task" | "unavailable" | "offline"; // <--- زودت كل الحالات اللي في mock

export interface Agent {
  id: string;
  name: string;
  phone: string;
  status: AgentStatus;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  area?: string; // <--- زودتها
  type?: string; // <--- زودتها عشان mock
}

export interface TimelineEvent {
  label: string;
  date: string;
  time: string;
}

export interface Shipment {
  id: string;
  trackingNumber: string;
  code: string; // <--- اتأكد ان mock فيه code
  status: ShipmentStatus;
  customer: Customer;
  receiver: {
    name: string;
    area: string;
    phone: string;
    address?: string;
    notes?: string; // <--- زودتها
  };
  expectedDeliveryDate: string;
  timeline: TimelineEvent[];
  agentId?: string;
  notes?: string;
}

export interface Notification {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
  type?: string; // <--- زودتها عشان mock
}