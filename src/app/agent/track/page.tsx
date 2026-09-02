import { LiveTrackingClient } from "@/components/agent/LiveTrackingClient";

export default function AgentTrackPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-extrabold text-navy-950">
          البث المباشر
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          فعّل البث عشان العملاء يقدروا يتابعوا موقعك أثناء توصيل شحنتهم
        </p>
      </div>

      <LiveTrackingClient />
    </div>
  );
}