import { Agent, Customer, Notification, Shipment } from "./types";

export const AREAS = [
  "سيدي جابر",
  "سموحة",
  "ميامي",
  "المنتزه",
  "العصافرة",
  "المنصورة",
  "طلخا",
  "دمياط",
];

export const AGENTS: Agent[] = [
  {
    id: "AG-01",
    name: "أحمد محمد",
    avatar: "أ.م",
    phone: "01012345678",
    status: "available",
    area: "سيدي جابر",
    shipmentsToday: 12,
    delivered: 7,
    remaining: 5,
    successRate: 96,
    lastSeen: "منذ 20 ثانية",
    lat: 31.2189,
    lng: 29.9425,
    collectedToday: 18450,
    handedOverToday: 15000,
  },
  {
    id: "AG-02",
    name: "محمد علي",
    avatar: "م.ع",
    phone: "01023456789",
    status: "on_task",
    area: "سموحة",
    shipmentsToday: 9,
    delivered: 5,
    remaining: 4,
    successRate: 91,
    lastSeen: "منذ دقيقة",
    lat: 31.2156,
    lng: 29.9553,
    collectedToday: 9200,
    handedOverToday: 6000,
  },
  {
    id: "AG-03",
    name: "كريم سعيد",
    avatar: "ك.س",
    phone: "01034567890",
    status: "available",
    area: "ميامي",
    shipmentsToday: 14,
    delivered: 14,
    remaining: 0,
    successRate: 100,
    lastSeen: "منذ 5 دقائق",
    lat: 31.2634,
    lng: 30.0356,
    collectedToday: 22100,
    handedOverToday: 22100,
  },
  {
    id: "AG-04",
    name: "عمر خالد",
    avatar: "ع.خ",
    phone: "01045678901",
    status: "unavailable",
    area: "المنتزه",
    shipmentsToday: 6,
    delivered: 2,
    remaining: 4,
    successRate: 78,
    lastSeen: "منذ 40 دقيقة",
    lat: 31.2853,
    lng: 30.0175,
    collectedToday: 3400,
    handedOverToday: 0,
  },
  {
    id: "AG-05",
    name: "يوسف إبراهيم",
    avatar: "ي.إ",
    phone: "01056789012",
    status: "offline",
    area: "المنصورة",
    shipmentsToday: 0,
    delivered: 0,
    remaining: 0,
    successRate: 88,
    lastSeen: "منذ 3 ساعات",
    lat: 31.0409,
    lng: 31.3785,
    collectedToday: 0,
    handedOverToday: 0,
  },
];

export const CUSTOMERS: Customer[] = [
  {
    id: "CU-01",
    name: "متجر النور للإلكترونيات",
    type: "company",
    phone: "01198765432",
    email: "info@alnoor-store.com",
    address: "شارع فؤاد، محطة الرمل",
    area: "سيدي جابر",
    shipmentsCount: 214,
    totalValue: 512300,
    totalCollections: 498000,
  },
  {
    id: "CU-02",
    name: "سارة عبد الرحمن",
    type: "individual",
    phone: "01087654321",
    address: "شارع الحرية، سموحة",
    area: "سموحة",
    shipmentsCount: 8,
    totalValue: 6400,
    totalCollections: 6400,
  },
  {
    id: "CU-03",
    name: "بوتيك لمسة",
    type: "company",
    phone: "01276543210",
    email: "orders@lamsa-boutique.com",
    address: "طريق الكورنيش، ميامي",
    area: "ميامي",
    shipmentsCount: 96,
    totalValue: 187000,
    totalCollections: 179500,
  },
];

const timelineFor = (status: Shipment["status"]) => {
  const base = [
    { date: "17/08/2026", time: "10:32 ص", label: "تم إنشاء الشحنة", actor: "موظف المكتب" },
    { date: "17/08/2026", time: "11:05 ص", label: "تم إسنادها لأحمد محمد", actor: "موظف المكتب" },
    { date: "17/08/2026", time: "12:20 م", label: "تم استلام الشحنة", actor: "أحمد محمد" },
  ];
  if (["out_for_delivery", "delivered", "failed", "returned"].includes(status)) {
    base.push({ date: "17/08/2026", time: "02:15 م", label: "بدأت عملية التوصيل", actor: "أحمد محمد" });
  }
  if (status === "delivered") {
    base.push({ date: "17/08/2026", time: "03:02 م", label: "تم التسليم بنجاح", actor: "أحمد محمد" });
  }
  if (status === "failed") {
    base.push({ date: "17/08/2026", time: "03:10 م", label: "فشل التسليم - العميل غير متاح", actor: "أحمد محمد" });
  }
  if (status === "returned") {
    base.push({ date: "17/08/2026", time: "04:00 م", label: "تم إرجاع الشحنة للمخزن", actor: "أحمد محمد" });
  }
  return base;
};

type ShipmentStatus = Shipment["status"];
const statusCycle: ShipmentStatus[] = [
  "new",
  "picked_up",
  "assigned",
  "out_for_delivery",
  "delivered",
  "delivered",
  "delivered",
  "failed",
  "returned",
  "cancelled",
];

const receiverNames = [
  "خالد إبراهيم",
  "منى فاروق",
  "أحمد الشريف",
  "ياسمين طارق",
  "حسام عادل",
  "نور الهدى",
  "محمود سامي",
  "رنا وليد",
];

export const SHIPMENTS: Shipment[] = Array.from({ length: 42 }).map((_, i) => {
  const status = statusCycle[i % statusCycle.length];
  const customer = CUSTOMERS[i % CUSTOMERS.length];
  const agent = AGENTS[i % AGENTS.length];
  const area = AREAS[i % AREAS.length];
  const value = 250 + ((i * 37) % 1800);
  return {
    id: `SH-${1000 + i}`,
    trackingNumber: `TRK-2026-${(1200 + i).toString().padStart(5, "0")}`,
    customer: {
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      area: customer.area,
      type: customer.type,
    },
    receiver: {
      name: receiverNames[i % receiverNames.length],
      phone: `010${(10000000 + i * 137).toString().slice(0, 8)}`,
      address: `شارع ${20 + i}، ${area}`,
      area,
      notes: i % 5 === 0 ? "يفضل التواصل قبل الوصول بـ 10 دقائق" : undefined,
    },
    type: i % 3 === 0 ? "إلكترونيات" : i % 3 === 1 ? "ملابس" : "مستندات",
    description: "طرد قياسي بحاجة لتوصيل عادي",
    weightKg: 1 + (i % 6),
    piecesCount: 1 + (i % 3),
    value,
    collectionAmount: status === "cancelled" ? 0 : value,
    status,
    agentId: status === "new" ? undefined : agent.id,
    agentName: status === "new" ? undefined : agent.name,
    priority: i % 9 === 0 ? "urgent" : i % 4 === 0 ? "high" : "normal",
    createdAt: `17/08/2026 — ${(9 + (i % 8)).toString().padStart(2, "0")}:${(i * 7) % 60}`.replace(
      /:(\d)$/,
      ":0$1"
    ),
    expectedDeliveryDate: "18/08/2026",
    timeline: timelineFor(status),
  };
});

export const getShipmentByTracking = (tracking: string) =>
  SHIPMENTS.find(
    (s) => s.trackingNumber.toLowerCase() === tracking.trim().toLowerCase()
  );

export const getShipmentById = (id: string) => SHIPMENTS.find((s) => s.id === id);

export const NOTIFICATIONS: Notification[] = [
  { id: "N-1", type: "info", message: "تم إسناد شحنة جديدة TRK-2026-01235 لأحمد محمد", time: "منذ 3 دقائق" },
  { id: "N-2", type: "success", message: "تم تسليم الشحنة TRK-2026-01220 بنجاح", time: "منذ 12 دقيقة" },
  { id: "N-3", type: "warning", message: "الشحنة TRK-2026-01198 تجاوزت وقت التسليم المتوقع", time: "منذ 25 دقيقة" },
  { id: "N-4", type: "danger", message: "المندوب عمر خالد أصبح غير متصل", time: "منذ 40 دقيقة" },
  { id: "N-5", type: "success", message: "تم تسليم التحصيلات للمكتب من قبل كريم سعيد", time: "منذ ساعة" },
];

export const DASHBOARD_KPIS = [
  { label: "إجمالي الشحنات", value: 1248, delta: 8.2, deltaLabel: "عن الأسبوع الماضي" },
  { label: "شحنات جديدة", value: 36, delta: 12.4, deltaLabel: "اليوم" },
  { label: "قيد التوصيل", value: 94, delta: -3.1, deltaLabel: "عن أمس" },
  { label: "تم التسليم", value: 987, delta: 5.6, deltaLabel: "عن الأسبوع الماضي" },
  { label: "مرتجعة", value: 21, delta: -1.8, deltaLabel: "عن الأسبوع الماضي" },
  { label: "إجمالي التحصيلات", value: 312450, isCurrency: true, delta: 9.7, deltaLabel: "عن الأسبوع الماضي" },
];

export const WEEKLY_SHIPMENTS = [
  { day: "سبت", shipments: 142, delivered: 128 },
  { day: "أحد", shipments: 168, delivered: 150 },
  { day: "اثنين", shipments: 190, delivered: 175 },
  { day: "ثلاثاء", shipments: 176, delivered: 160 },
  { day: "أربعاء", shipments: 205, delivered: 188 },
  { day: "خميس", shipments: 221, delivered: 199 },
  { day: "جمعة", shipments: 96, delivered: 87 },
];

export const STATUS_DISTRIBUTION = [
  { name: "تم التسليم", value: 987, color: "#0f8a4b" },
  { name: "قيد التوصيل", value: 94, color: "#b6790a" },
  { name: "جديدة", value: 60, color: "#2e5399" },
  { name: "مرتجعة", value: 21, color: "#c81823" },
  { name: "ملغاة", value: 14, color: "#9aa4b0" },
];

export const LANDING_STATS = [
  { label: "شحنة تم تسليمها", value: 128400 },
  { label: "عميل نشط", value: 3120 },
  { label: "مندوب توصيل", value: 214 },
  { label: "نسبة نجاح التسليم", value: 97, suffix: "%" },
];
