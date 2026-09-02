"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Pause, Play, ShieldAlert, Wifi, WifiOff } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

// أقل مسافة تحرك (بالمتر) قبل ما نبعت تحديث جديد لقاعدة البيانات
const MIN_DISTANCE_METERS = 25;
// أقصى وقت ننتظره من غير تحديث حتى لو المندوب واقف مكانه (بالمللي ثانية)
const MAX_INTERVAL_MS = 30_000;

// حساب المسافة بين نقطتين بالمتر (معادلة Haversine)
function distanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isSecureContext() {
  if (typeof window === "undefined") return true;
  return (
    window.location.protocol === "https:" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );
}

export default function AgentTrackPage() {
  const supabase = createClient();
  const [status, setStatus] = useState<"idle" | "tracking" | "paused" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [insecureContext, setInsecureContext] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<{ lat: number; lng: number; time: number } | null>(
    null
  );

  async function sendLocation(position: GeolocationPosition) {
    const { latitude, longitude, heading } = position.coords;
    const now = Date.now();
    const last = lastSentRef.current;

    // نبعت تحديث بس لو: (تحرك مسافة كافية) أو (عدّى وقت كافي من غير تحديث)
    if (last) {
      const moved = distanceInMeters(last.lat, last.lng, latitude, longitude);
      const elapsed = now - last.time;
      if (moved < MIN_DISTANCE_METERS && elapsed < MAX_INTERVAL_MS) {
        return;
      }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setStatus("error");
      setErrorMessage("لازم تسجل الدخول الأول");
      return;
    }

    const { error } = await supabase.from("agent_locations").upsert({
      agent_id: user.id,
      latitude,
      longitude,
      heading: heading ?? null,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Location update error:", error.message);
      return;
    }

    lastSentRef.current = { lat: latitude, lng: longitude, time: now };
    setLastUpdate(new Date());
    setStatus("tracking");
    setErrorMessage(null);
  }

  function startTracking() {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setErrorMessage("المتصفح ده مبيدعمش تحديد الموقع");
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        sendLocation(position);
      },
      (err) => {
        setStatus("error");
        setErrorMessage(
          err.code === err.PERMISSION_DENIED
            ? "لازم توافق على إذن الموقع عشان تقدر تشتغل"
            : "تعذر تحديد موقعك، تأكد إن GPS مفعّل"
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );

    watchIdRef.current = id;
  }

  function stopTracking() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setStatus("paused");
  }

  useEffect(() => {
    if (!isSecureContext()) {
      setInsecureContext(true);
      return;
    }

    startTracking();

    // نوقف التتبع تلقائيًا لو المستخدم غيّر التاب أو قفل الشاشة،
    // ونرجع نشغّله لما يرجع تاني، عشان نوفّر البطارية
    function handleVisibilityChange() {
      if (document.hidden) {
        stopTracking();
      } else if (status !== "error") {
        startTracking();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (insecureContext) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-navy-950 px-4 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-warning-100/10">
          <ShieldAlert className="h-9 w-9 text-warning-600" />
        </span>
        <h1 className="mt-6 font-display text-xl font-bold text-white">
          الصفحة محتاجة اتصال آمن (HTTPS)
        </h1>
        <p className="mt-2 max-w-xs text-sm leading-6 text-navy-100/60">
          المتصفح مش بيسمح بالوصول للموقع الجغرافي إلا من خلال رابط آمن. تأكد
          إنك فاتح الرابط بصيغة https:// وليس http://
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-navy-950 px-4 text-center">
      <span
        className={`flex h-20 w-20 items-center justify-center rounded-full ${
          status === "tracking" ? "bg-success-600/15" : "bg-red-600/15"
        }`}
      >
        {status === "tracking" ? (
          <Wifi className="h-9 w-9 text-success-600" />
        ) : (
          <WifiOff className="h-9 w-9 text-red-500" />
        )}
      </span>

      <h1 className="mt-6 font-display text-xl font-bold text-white">
        {status === "tracking"
          ? "جاري إرسال موقعك مباشرة"
          : status === "paused"
          ? "التتبع متوقف مؤقتًا"
          : status === "error"
          ? "في مشكلة في تحديد موقعك"
          : "جاري تفعيل تتبع الموقع..."}
      </h1>

      {errorMessage && (
        <p className="mt-2 text-sm text-red-400">{errorMessage}</p>
      )}

      {lastUpdate && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-navy-100/60">
          <MapPin className="h-3.5 w-3.5" />
          آخر تحديث: {lastUpdate.toLocaleTimeString("ar-EG")}
        </p>
      )}

      <button
        onClick={() => (status === "paused" ? startTracking() : stopTracking())}
        className="mt-6 flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
      >
        {status === "paused" ? (
          <>
            <Play className="h-4 w-4" />
            استئناف التتبع
          </>
        ) : (
          <>
            <Pause className="h-4 w-4" />
            إيقاف مؤقت
          </>
        )}
      </button>

      <p className="mt-8 max-w-xs text-xs leading-6 text-navy-100/50">
        سيب الصفحة دي مفتوحة طول فترة عملك. موقعك بيتحدث بس لما تتحرك مسافة
        كافية، عشان نوفّر بطارية موبايلك.
      </p>
    </main>
  );
}