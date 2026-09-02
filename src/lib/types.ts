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

export type AgentStatus = "active" | "inactive" | "on_delivery";

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
}

export interface TimelineEvent {
  label: string;
  date: string;
  time: string;
}

export interface Shipment {
  id: string;
  trackingNumber: string;
  code: string;
  status: ShipmentStatus;
  customer: Customer;
  receiver: {
    name: string;
    area: string;
    phone: string;
    address?: string;
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
}