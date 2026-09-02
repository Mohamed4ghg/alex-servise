"use client";

import { useEffect, useRef, useState } from "react";
import { Navigation, MapPin, AlertTriangle, Radio } from "lucide-react";

const UPDATE_INTERVAL_MS = 10000; // كل 10 ثواني

export function LiveTrackingClient() {
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [lastCoords, setLastCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function sendLocation(lat: number, lng: number) {
    try {
      const res = await fetch("/api/agent/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });
      if (!res.ok) {
        const result = await res.json();
        setError(result.error || "تعذّر إرسال الموقع");
        return;
      }
      setLastCoords({ lat, lng });
      setLastUpdatedAt(new Date());
      setError(null);
    } catch {
      setError("تعذّر الاتصال بالسيرفر");
    }
  }

  function startBroadcasting() {
    if (!navigator.geolocation) {
      setError("متصفحك مش بيدعم تحديد الموقع");
      return;
    }

    setLoading(true);
    setError(null);

    // نطلب الموقع أول مرة فورًا
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        sendLocation(pos.coords.latitude, pos.coords.longitude);
        setIsBroadcasting(true);
        setLoading(false);

        // بعد كده كل UPDATE_INTERVAL_MS نجيب الموقع الحالي ونبعته
        intervalRef.current = setInterval(() => {
          navigator.geolocation.getCurrentPosition(
            (p) => sendLocation(p.coords.latitude, p.coords.longitude),
            () => setError("تعذّر تحديد موقعك، تأكد إن صلاحية الموقع مفعّلة")
          );
        }, UPDATE_INTERVAL_MS);
      },
      () => {
        setError("محتاجين إذنك بالوصول للموقع عشان تبدأ البث");
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  }

  async function stopBroadcasting() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsBroadcasting(false);

    try {
      await fetch("/api/agent/location", { method: "DELETE" });
    } catch {
      // مش مؤثر لو فشل — المهم إن البث اتوقف محليًا
    }
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-full ${
                isBroadcasting ? "bg-red-50" : "bg-gray-50"
              }`}
            >
              <Radio
                className={`h-5 w-5 ${
                  isBroadcasting ? "text-red-600" : "text-gray-400"
                }`}
              />
            </span>
            <div>
              <p className="font-bold text-navy-950">
                {isBroadcasting ? "البث شغّال" : "البث متوقف"}
              </p>
              <p className="text-xs text-gray-500">
                {isBroadcasting
                  ? "العملاء بيقدروا يتابعوا موقعك دلوقتي"
                  : "دوس ابدأ عشان تشارك موقعك"}
              </p>
            </div>
          </div>

          {isBroadcasting && (
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
            </span>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {lastCoords && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-500">
            <MapPin className="h-4 w-4" />
            <span dir="ltr">
              {lastCoords.lat.toFixed(5)}, {lastCoords.lng.toFixed(5)}
            </span>
            {lastUpdatedAt && (
              <span className="mr-auto">
                آخر تحديث: {lastUpdatedAt.toLocaleTimeString("ar-EG")}
              </span>
            )}
          </div>
        )}

        <button
          onClick={isBroadcasting ? stopBroadcasting : startBroadcasting}
          disabled={loading}
          className={`mt-6 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold text-white transition disabled:opacity-60 ${
            isBroadcasting
              ? "bg-gray-900 hover:bg-black"
              : "bg-red-600 shadow-[0_10px_24px_-10px_rgba(220,38,38,0.6)] hover:bg-red-700"
          }`}
        >
          <Navigation className="h-4 w-4" />
          {loading
            ? "جاري التفعيل..."
            : isBroadcasting
              ? "إيقاف البث"
              : "بدء البث المباشر"}
        </button>
      </div>

      <p className="text-center text-xs text-gray-400">
        الموقع بيتحدث كل 10 ثواني تقريبًا طول ما البث شغّال. إغلاق الصفحة بيوقف البث تلقائيًا.
      </p>
    </div>
  );
}