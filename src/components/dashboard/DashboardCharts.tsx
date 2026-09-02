"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type WeeklyPoint = { day: string; shipments: number; delivered: number };
type StatusSlice = { name: string; value: number; color: string };

export function DashboardCharts({
  weeklyShipments,
  statusDistribution,
}: {
  weeklyShipments: WeeklyPoint[];
  statusDistribution: StatusSlice[];
}) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[var(--shadow-card)] lg:col-span-2">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-bold text-navy-950">الشحنات الأسبوعية</h3>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-navy-700" /> إجمالي</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> تم التسليم</span>
          </div>
        </div>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyShipments} barGap={4}>
              <CartesianGrid vertical={false} stroke="#eef1f4" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#717d8c" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#717d8c" }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: "1px solid #eef1f4", fontSize: 12, direction: "rtl" }}
                cursor={{ fill: "#f7f8fa" }}
              />
              <Bar dataKey="shipments" fill="#16305c" radius={[6, 6, 0, 0]} name="إجمالي" />
              <Bar dataKey="delivered" fill="#e02030" radius={[6, 6, 0, 0]} name="تم التسليم" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[var(--shadow-card)]">
        <h3 className="font-display text-sm font-bold text-navy-950">توزيع حالات الشحنات</h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={statusDistribution} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2}>
                {statusDistribution.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #eef1f4", fontSize: 12, direction: "rtl" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {statusDistribution.map((s) => (
            <div key={s.name} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}