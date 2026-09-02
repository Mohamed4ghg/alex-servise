"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type {
  MapContainerProps,
  TileLayerProps,
  MarkerProps,
  PopupProps,
} from "react-leaflet";
import { MapPin, RefreshCw, Truck } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import "leaflet/dist/leaflet.css";
import type * as LeafletTypes from "leaflet";

// Leaflet محتاج window، فلازم نعمله import ديناميكي بدون SSR.
// بنحدد نوع الـ Props صراحةً هنا عشان TypeScript يقدر يتعرف على
// الخصائص الصحيحة (center, zoom, attribution, icon...) بدل ما يفتكرها مش موجودة.
const MapContainer = dynamic<MapContainerProps>(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic<TileLayerProps>(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic<MarkerProps>(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false }
);
const Popup = dynamic<PopupProps>(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false }
);

type AgentLocation = {
  agent_id: string;
  latitude: number;
  longitude: number;
  updated_at: string;
  full_name?: string;
};

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // آخر تحديث خلال دقيقتين = أونلاين
const CAIRO_CENTER: [number, number] = [30.0444, 31.2357];

export default function LiveMapPage() {
  const supabase = createClient();
  const [agents, setAgents] = useState<AgentLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [leafletIcon, setLeafletIcon] = useState<LeafletTypes.Icon | null>(
    null
  );

  // تجهيز أيقونة الماركر (لازم يحصل بعد التحميل في المتصفح بس)
  useEffect(() => {
    import("leaflet").then((leafletModule) => {
      const L = leafletModule.default;
      const icon = new L.Icon({
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });
      setLeafletIcon(icon);
    });
  }, []);

  async function fetchAgentLocations() {
    const { data, error } = await supabase
      .from("agent_locations")
      .select("agent_id, latitude, longitude, updated_at, profiles(full_name)");

    if (error) {
      console.error("Agent locations fetch error:", error.message);
      setLoading(false);
      return;
    }

    setAgents(
      (data ?? []).map((row: any) => ({
        agent_id: row.agent_id,
        latitude: row.latitude,
        longitude: row.longitude,
        updated_at: row.updated_at,
        full_name: row.profiles?.full_name,
      }))
    );
    setLoading(false);
  }

  useEffect(() => {
    fetchAgentLocations();

    // تحديث لحظي: أي مندوب يتحرك، موقعه يتحدث على الخريطة فورًا
    const channel = supabase
      .channel("agent_locations_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_locations" },
        () => {
          fetchAgentLocations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onlineCount = useMemo(
    () =>
      agents.filter(
        (a) => Date.now() - new Date(a.updated_at).getTime() < ONLINE_THRESHOLD_MS
      ).length,
    [agents]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900">
            <MapPin className="h-5 w-5 text-white" />
          </span>
          <div>
            <h1 className="font-display text-xl font-bold text-navy-950">
              التتبع المباشر
            </h1>
            <p className="text-sm text-gray-500">
              <span className="font-bold text-success-600">{onlineCount}</span>{" "}
              مندوب متصل الآن من إجمالي {agents.length}
            </p>
          </div>
        </div>

        <button
          onClick={fetchAgentLocations}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-semibold text-navy-800 transition hover:border-navy-300"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          تحديث
        </button>
      </div>

      <div className="mt-6 h-[560px] overflow-hidden rounded-2xl border border-gray-100 shadow-card">
        {loading ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <p className="text-sm">جاري تحميل الخريطة...</p>
          </div>
        ) : (
          <MapContainer
            center={CAIRO_CENTER}
            zoom={11}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {leafletIcon &&
              agents.map((agent) => {
                const isOnline =
                  Date.now() - new Date(agent.updated_at).getTime() <
                  ONLINE_THRESHOLD_MS;
                return (
                  <Marker
                    key={agent.agent_id}
                    position={[agent.latitude, agent.longitude]}
                    icon={leafletIcon}
                  >
                    <Popup>
                      <div className="text-right" dir="rtl">
                        <p className="flex items-center gap-1.5 font-bold">
                          <Truck className="h-3.5 w-3.5" />
                          {agent.full_name || "مندوب"}
                        </p>
                        <p
                          className={`mt-1 text-xs ${
                            isOnline ? "text-green-600" : "text-gray-400"
                          }`}
                        >
                          {isOnline ? "متصل الآن" : "غير متصل"}
                        </p>
                        <p className="mt-1 text-[11px] text-gray-400">
                          آخر تحديث:{" "}
                          {new Date(agent.updated_at).toLocaleTimeString(
                            "ar-EG"
                          )}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
          </MapContainer>
        )}
      </div>

      {!loading && agents.length === 0 && (
        <p className="mt-4 text-center text-sm text-gray-400">
          لا يوجد مندوبين يبثّون موقعهم حاليًا
        </p>
      )}
    </div>
  );
}