import { createClient } from "@/utils/supabase/client";

export type StatusInfo = { label: string; color: string };

let cache: Record<string, StatusInfo> | null = null;
let inflight: Promise<Record<string, StatusInfo>> | null = null;

async function fetchStatusMap(): Promise<Record<string, StatusInfo>> {
  const supabase = createClient();
  const { data } = await supabase
    .from("shipment_statuses")
    .select("key, label, color");

  const map: Record<string, StatusInfo> = {};
  (data ?? []).forEach((s) => {
    map[s.key] = { label: s.label, color: s.color };
  });

  cache = map;
  return map;
}

export async function getShipmentStatusMap(): Promise<Record<string, StatusInfo>> {
  if (cache) return cache;
  if (inflight) return inflight;

  inflight = fetchStatusMap().finally(() => {
    inflight = null;
  });

  return inflight;
}