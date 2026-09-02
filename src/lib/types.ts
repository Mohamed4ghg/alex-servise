export type ShipmentStatus =
  | "pending"
  | "assigned"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "failed"
  | "returned"
  | "cancelled"
  | "new"
  | "out_for_delivery";

export const SHIPMENT_STATUS_LABEL: Record<ShipmentStatus, string> = {
  pending: "قيد الانتظار",
  assigned: "تم الإسناد",
  picked_up: "تم الاستلام",
  in_transit: "قيد التوصيل",
  delivered: "تم التسليم",
  failed: "فشل التسليم",
  returned: "مرتجع",
  cancelled: "ملغي",
  new: "جديد",
  out_for_delivery: "خارج للتوصيل",
};

export type AgentStatus = "active" | "inactive" | "on_delivery" | "available" | "on_task" | "unavailable" | "offline";

export interface Agent {
  id: string;
  name: string;
  phone: string;
  status: AgentStatus;
  avatar: string;
  area: string;
  shipmentsToday: number;
  delivered: number;
  remaining: number;
  successRate: number;
  lastSeen: string;
  lat: number;
  lng: number;
  collectedToday: number;
  handedOverToday: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  area: string;
  type: "company" | "individual" | string;
  shipmentsCount: number;
  totalValue: number;
  totalCollections: number;
}

export interface TimelineEvent {
  label: string;
  date: string;
  time: string;
  actor: string;
}

export type ShipmentPriority = "urgent" | "high" | "normal";

export interface Shipment {
  id: string;
  trackingNumber: string;
  code: string; // هنجيبه من trackingNumber
  status: ShipmentStatus;
  customer: {
    name: string;
    phone: string;
    address?: string;
    area?: string;
    type?: string;
  };
  receiver: {
    name: string;
    area: string;
    phone: string;
    address: string;
    notes?: string;
  };
  type: string;
  description: string;
  weightKg: number;
  piecesCount: number;
  value: number;
  collectionAmount: number;
  agentId?: string;
  agentName?: string;
  priority: ShipmentPriority;
  createdAt: string;
  expectedDeliveryDate: string;
  timeline: TimelineEvent[];
}

export interface Notification {
  id: string;
  message: string;
  read?: boolean;
  createdAt?: string;
  type: "info" | "success" | "warning" | "danger" | string;
  time: string;
}