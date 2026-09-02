"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ============================================================
// أيقونات مخصصة (بتتجنب مشكلة مسارات الصور الافتراضية في Leaflet مع Next.js)
// ============================================================

const agentIcon = L.divIcon({
  className: "",
  html: `<div style="
    background:#1e3a5f; color:#fff; width:34px; height:34px; border-radius:50%;
    display:flex; align-items:center; justify-content:center; font-size:16px;
    border:3px solid #fff; box-shadow:0 2px 6px rgba(0,0,0,0.3);
  ">🚚</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const receiverIcon = L.divIcon({
  className: "",
  html: `<div style="
    background:#dc2626; color:#fff; width:30px; height:30px; border-radius:50% 50% 50% 0;
    transform:rotate(-45deg); display:flex; align-items:center; justify-content:center;
    border:3px solid #fff; box-shadow:0 2px 6px rgba(0,0,0,0.3);
  "><span style="transform:rotate(45deg); font-size:13px;">📍</span></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

// ============================================================
// أنواع البيانات
// ============================================================

export type AgentLocation = {
  latitude: number;
  longitude: number;
  heading: number | null;
  updated_at: string;
};

export type ReceiverLocation = {
  latitude: number;
  longitude: number;
  areaName: string;
};

type ShipmentMapProps = {
  agentLocation: AgentLocation | null;
  agentName: string | null;
  receiverLocation: ReceiverLocation | null;
  receiverAddress: string;
};

function FitBounds({
  points,
}: {
  points: [number, number][];
}) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
    } else {
      map.fitBounds(points, { padding: [40, 40] });
    }
  }, [map, points]);
  return null;
}

export default function ShipmentMap({
  agentLocation,
  agentName,
  receiverLocation,
  receiverAddress,
}: ShipmentMapProps) {
  const points: [number, number][] = [];
  if (agentLocation) points.push([agentLocation.latitude, agentLocation.longitude]);
  if (receiverLocation) points.push([receiverLocation.latitude, receiverLocation.longitude]);

  // مركز افتراضي (القاهرة) لو مفيش أي إحداثيات متاحة خالص
  const fallbackCenter: [number, number] = [30.0444, 31.2357];

  if (points.length === 0) {
    return (
      <div className="flex h-full min-h-[220px] items-center justify-center rounded-xl bg-navy-100/60 text-xs text-navy-500">
        لا توجد إحداثيات متاحة لعرض الخريطة
      </div>
    );
  }

  return (
    <MapContainer
      center={points[0] ?? fallbackCenter}
      zoom={13}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%", minHeight: 220, borderRadius: 12 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitBounds points={points} />

      {agentLocation && (
        <Marker
          position={[agentLocation.latitude, agentLocation.longitude]}
          icon={agentIcon}
        >
          <Popup>
            <p className="font-bold">{agentName ?? "المندوب"}</p>
            <p className="text-xs text-gray-500">
              آخر تحديث: {new Date(agentLocation.updated_at).toLocaleTimeString("ar-EG")}
            </p>
          </Popup>
        </Marker>
      )}

      {receiverLocation && (
        <Marker
          position={[receiverLocation.latitude, receiverLocation.longitude]}
          icon={receiverIcon}
        >
          <Popup>
            <p className="font-bold">موقع المستلم (تقريبي)</p>
            <p className="text-xs text-gray-500">{receiverLocation.areaName}</p>
            <p className="text-xs text-gray-500">{receiverAddress}</p>
          </Popup>
        </Marker>
      )}

      {agentLocation && receiverLocation && (
        <Polyline
          positions={[
            [agentLocation.latitude, agentLocation.longitude],
            [receiverLocation.latitude, receiverLocation.longitude],
          ]}
          pathOptions={{ color: "#1e3a5f", weight: 2, dashArray: "6 6" }}
        />
      )}
    </MapContainer>
  );
}