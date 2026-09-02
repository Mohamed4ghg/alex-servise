// src/components/customer/AgentLiveLocation.tsx
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, RefreshCw, WifiOff } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type LocationData = {
  lat: number | null;
  lng: number | null;
  last_seen: string | null;
  status: string | null;
  agent_name: string | null;
};

// Leaflet بيلمس window مباشرة، فلازم نستورد الخريطة على العميل بس (ssr: false)
const LiveMap = dynamic(() => import("./LiveMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 items-center justify-center rounded-2xl bg-gray-50">
      <RefreshCw className="h-5 w-5 animate-spin text-gray-300" />
    </div>
  ),
});

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "لحظات";
  const minutes = Math.floor(seconds / 60);
  return `من ${minutes} دقيقة`;
}

export function AgentLiveLocation({ shipmentId }: { shipmentId: string }) {
  const supabase = createClient();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchLocation() {
      const { data } = await supabase
        .rpc("get_shipment_agent_location", { p_shipment_id: shipmentId })
        .maybeSingle();
      if (!cancelled) {
        setLocation((data as LocationData) ?? null);
        setLoading(false);
      }
    }

    fetchLocation();
    const interval = setInterval(fetchLocation, 12000); // نفس تقريبًا معدل بث المندوب (10 ثواني)
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [shipmentId, supabase]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-white px-4 py-5 text-sm text-gray-400">
        <RefreshCw className="h-4 w-4 animate-spin" />
        جاري تحميل الموقع...
      </div>
    );
  }

  if (!location || location.lat === null || location.lng === null || location.status !== "online") {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-gray-100 bg-white px-4 py-10 text-center">
        <WifiOff className="h-6 w-6 text-gray-300" />
        <p className="text-sm font-medium text-gray-500">المندوب مش بيبث موقعه حاليًا</p>
        <p className="text-xs text-gray-400">هيبان هنا تلقائيًا أول ما يبدأ البث المباشر</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-bold text-navy-950">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
          </span>
          {location.agent_name ?? "المندوب"} في الطريق إليك
        </div>
        {location.last_seen && (
          <span className="text-xs text-gray-400">آخر تحديث {timeAgo(location.last_seen)}</span>
        )}
      </div>

      <LiveMap lat={location.lat} lng={location.lng} label={location.agent_name ?? "المندوب"} />

      <div className="flex items-center gap-1.5 border-t border-gray-100 px-4 py-2.5 text-xs text-gray-400">
        <MapPin className="h-3.5 w-3.5" />
        <span dir="ltr">
          {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
        </span>
      </div>
    </div>
  );
}