"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff, X } from "lucide-react";
import { supabase, DevicePublic, SensorReading, DeviceStatus } from "@/lib/supabase";
import Logo from "@/components/Logo";

type ThresholdRow = { sensor_type: string; min_value: number | null; max_value: number | null };

const SENSOR_FIELDS = [
  { key: "ph", label: "pH", unit: "" },
  { key: "do_mg_l", label: "DO", unit: "mg/L", thresholdKey: "do" },
  { key: "turbidity_ntu", label: "Turbidity", unit: "NTU", thresholdKey: "turbidity" },
  { key: "ec_us_cm", label: "EC", unit: "µS/cm", thresholdKey: "ec" },
  { key: "tds_ppm", label: "TDS", unit: "ppm", thresholdKey: "tds" },
  { key: "rainfall_mm", label: "Rainfall", unit: "mm", thresholdKey: "rainfall" },
  { key: "water_level_raw_distance_cm", label: "Water Level", unit: "cm", thresholdKey: "water_level" },
  { key: "battery_percent", label: "Baterai", unit: "%", thresholdKey: "battery" },
] as const;

const REFRESH_MS = 15000;
const CYCLE_MS = 8000; // ganti device tiap 8 detik di mode Cycle

type EarlyWarning = { device: DevicePublic; level: "waspada" | "bahaya"; reason: string };
type EwSettings = { rapid_rise_cm: number; rainfall_waspada_mm: number; rainfall_bahaya_mm: number };

export default function KioskPage() {
  const [devices, setDevices] = useState<DevicePublic[]>([]);
  const [readings, setReadings] = useState<Record<string, SensorReading>>({});
  const [previousReadings, setPreviousReadings] = useState<Record<string, SensorReading>>({});
  const [statuses, setStatuses] = useState<Record<string, DeviceStatus>>({});
  const [thresholds, setThresholds] = useState<Record<string, ThresholdRow>>({});
  const [ewSettings, setEwSettings] = useState<EwSettings>({
    rapid_rise_cm: 5,
    rainfall_waspada_mm: 5,
    rainfall_bahaya_mm: 15,
  });
  const [now, setNow] = useState(new Date());
  const [mode, setMode] = useState<"grid" | "cycle">("grid");
  const [cycleIndex, setCycleIndex] = useState(0);

  async function loadData() {
    const { data: deviceData } = await supabase
      .from("devices_public")
      .select("*")
      .order("device_code");
    const devicesList = (deviceData ?? []) as DevicePublic[];
    setDevices(devicesList);

    const { data: statusData } = await supabase.from("device_status_log").select("*");
    const statusMap: Record<string, DeviceStatus> = {};
    (statusData ?? []).forEach((s: DeviceStatus) => {
      statusMap[s.device_id] = s;
    });
    setStatuses(statusMap);

    const { data: thresholdData } = await supabase
      .from("threshold_settings")
      .select("sensor_type, min_value, max_value")
      .is("device_id", null);
    const thresholdMap: Record<string, ThresholdRow> = {};
    (thresholdData ?? []).forEach((t: ThresholdRow) => {
      thresholdMap[t.sensor_type] = t;
    });
    setThresholds(thresholdMap);

    const { data: ewData } = await supabase
      .from("early_warning_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (ewData) {
      setEwSettings({
        rapid_rise_cm: ewData.rapid_rise_cm,
        rainfall_waspada_mm: ewData.rainfall_waspada_mm,
        rainfall_bahaya_mm: ewData.rainfall_bahaya_mm,
      });
    }

    const readingMap: Record<string, SensorReading> = {};
    const previousMap: Record<string, SensorReading> = {};
    for (const d of devicesList) {
      const { data: recent } = await supabase
        .from("sensor_readings")
        .select("*")
        .eq("device_id", d.id)
        .order("recorded_at", { ascending: false })
        .limit(2);
      if (recent && recent[0]) readingMap[d.id] = recent[0] as SensorReading;
      if (recent && recent[1]) previousMap[d.id] = recent[1] as SensorReading;
    }
    setReadings(readingMap);
    setPreviousReadings(previousMap);
  }

  useEffect(() => {
    loadData();
    const dataInterval = setInterval(loadData, REFRESH_MS);
    const clockInterval = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearInterval(dataInterval);
      clearInterval(clockInterval);
    };
  }, []);

  useEffect(() => {
    if (mode !== "cycle" || devices.length === 0) return;
    const cycleInterval = setInterval(() => {
      setCycleIndex((i) => (i + 1) % devices.length);
    }, CYCLE_MS);
    return () => clearInterval(cycleInterval);
  }, [mode, devices.length]);

  function isBreach(sensorKey: string, thresholdKey: string, value: number | null | undefined) {
    if (value === null || value === undefined) return false;
    const t = thresholds[thresholdKey];
    if (!t) return false;
    if (t.min_value !== null && value < t.min_value) return true;
    if (t.max_value !== null && value > t.max_value) return true;
    return false;
  }

  // Deteksi peringatan dini banjir: kombinasi kenaikan air cepat (raw distance turun,
  // karena sensor ultrasonic ngukur jarak ke air -- makin dekat = air makin naik) + curah hujan.
  function computeEarlyWarnings(): EarlyWarning[] {
    const warnings: EarlyWarning[] = [];
    for (const d of devices) {
      const current = readings[d.id];
      const previous = previousReadings[d.id];
      if (!current) continue;

      const rainfall = current.rainfall_mm ?? 0;
      let waterRiseCm = 0;
      if (previous?.water_level_raw_distance_cm != null && current.water_level_raw_distance_cm != null) {
        waterRiseCm = previous.water_level_raw_distance_cm - current.water_level_raw_distance_cm;
      }

      const rapidRise = waterRiseCm >= ewSettings.rapid_rise_cm;

      if (rapidRise && rainfall >= ewSettings.rainfall_bahaya_mm) {
        warnings.push({
          device: d,
          level: "bahaya",
          reason: `Air naik ${waterRiseCm.toFixed(1)} cm + curah hujan ${rainfall} mm`,
        });
      } else if (rapidRise || rainfall >= ewSettings.rainfall_waspada_mm) {
        warnings.push({
          device: d,
          level: "waspada",
          reason: rapidRise
            ? `Air naik ${waterRiseCm.toFixed(1)} cm sejak update terakhir`
            : `Curah hujan terdeteksi ${rainfall} mm`,
        });
      }
    }
    return warnings;
  }

  return (
    <main className="min-h-screen p-6">
      {/* Banner Peringatan Dini -- paling atas, gak mungkin kelewatan */}
      {(() => {
        const warnings = computeEarlyWarnings();
        const bahaya = warnings.filter((w) => w.level === "bahaya");
        const waspada = warnings.filter((w) => w.level === "waspada");

        if (bahaya.length > 0) {
          return (
            <div className="mb-4 animate-pulse rounded-2xl bg-alert px-6 py-4 text-white shadow-lg">
              <p className="font-display text-xl font-bold md:text-2xl">
                🚨 PERINGATAN DINI BANJIR
              </p>
              <div className="mt-1 flex flex-col gap-0.5">
                {bahaya.map((w) => (
                  <p key={w.device.id} className="font-body text-sm md:text-base">
                    <span className="font-semibold">{w.device.device_code} — {w.device.name}:</span> {w.reason}
                  </p>
                ))}
              </div>
            </div>
          );
        }

        if (waspada.length > 0) {
          return (
            <div className="mb-4 rounded-2xl bg-sediment px-6 py-4 text-white shadow-lg">
              <p className="font-display text-lg font-bold">⚠️ Waspada</p>
              <div className="mt-1 flex flex-col gap-0.5">
                {waspada.map((w) => (
                  <p key={w.device.id} className="font-body text-sm">
                    <span className="font-semibold">{w.device.device_code} — {w.device.name}:</span> {w.reason}
                  </p>
                ))}
              </div>
            </div>
          );
        }

        return (
          <div className="mb-4 flex items-center gap-2 rounded-2xl bg-teal/10 px-6 py-3 text-teal">
            <span className="h-2.5 w-2.5 rounded-full bg-teal" />
            <p className="font-body text-sm font-medium">
              Semua stasiun normal, tidak ada indikasi peringatan dini.
            </p>
          </div>
        );
      })()}

      {/* Header ringkas */}
      <div className="glass-card mb-4 flex items-center justify-between px-6 py-4">
        <Logo size={36} />
        <div className="flex items-center gap-4">
          <div className="glass-pill flex items-center gap-1 p-1">
            <button
              onClick={() => setMode("grid")}
              className={`rounded-full px-3 py-1.5 font-body text-xs transition-colors ${
                mode === "grid" ? "bg-teal text-white" : "text-ink/60"
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setMode("cycle")}
              className={`rounded-full px-3 py-1.5 font-body text-xs transition-colors ${
                mode === "cycle" ? "bg-teal text-white" : "text-ink/60"
              }`}
            >
              Cycle
            </button>
          </div>
          <span className="font-body text-sm text-ink/60">
            {now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </span>
          <span className="font-display text-2xl font-bold tabular-nums text-teal">
            {now.toLocaleTimeString("id-ID")}
          </span>
          <a
            href="/"
            className="glass-pill flex h-9 w-9 items-center justify-center text-ink/50 hover:text-ink"
            title="Keluar dari Kiosk Mode"
          >
            <X size={18} />
          </a>
        </div>
      </div>

      {/* Konten sesuai mode */}
      {mode === "grid" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-2">
          {devices.map((d) => renderDeviceCard(d, false))}
        </div>
      ) : (
        <div>
          {devices[cycleIndex] && renderDeviceCard(devices[cycleIndex], true)}
          {/* Indikator titik posisi device yang lagi ditampilin */}
          <div className="mt-4 flex justify-center gap-2">
            {devices.map((d, idx) => (
              <button
                key={d.id}
                onClick={() => setCycleIndex(idx)}
                className={`h-2.5 rounded-full transition-all ${
                  idx === cycleIndex ? "w-8 bg-teal" : "w-2.5 bg-ink/20"
                }`}
                aria-label={`Lihat ${d.device_code}`}
              />
            ))}
          </div>
        </div>
      )}
    </main>
  );

  function renderDeviceCard(d: DevicePublic, big: boolean) {
    const reading = readings[d.id];
    const status = statuses[d.id];
    const hasBreach = SENSOR_FIELDS.some((f) =>
      isBreach(
        f.key,
        (f as { thresholdKey?: string }).thresholdKey ?? f.key,
        reading?.[f.key as keyof SensorReading] as number | null,
      ),
    );

    return (
      <div
        key={d.id}
        className={`glass-card px-6 py-5 ${big ? "mx-auto max-w-3xl" : ""} ${
          hasBreach ? "ring-4 ring-alert" : ""
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/50 pb-3">
          <div>
            <p className={`font-display font-bold text-ink ${big ? "text-4xl" : "text-2xl"}`}>
              {d.name}
            </p>
            <p className={`font-body text-ink/50 ${big ? "text-base" : "text-sm"}`}>
              {d.device_code}
            </p>
          </div>
          <span
            className={`flex items-center gap-2 font-body font-medium ${
              big ? "text-xl" : "text-base"
            } ${status?.is_online ? "text-teal" : "text-alert"}`}
          >
            {status?.is_online ? <Wifi size={big ? 26 : 20} /> : <WifiOff size={big ? 26 : 20} />}
            {status?.is_online ? "Online" : "Offline"}
          </span>
        </div>

        <div className={`mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4`}>
          {SENSOR_FIELDS.map((f) => {
            const value = reading?.[f.key as keyof SensorReading] as number | null | undefined;
            const breach = isBreach(
              f.key,
              (f as { thresholdKey?: string }).thresholdKey ?? f.key,
              value,
            );
            return (
              <div
                key={f.key}
                className={`rounded-xl px-3 py-3 ${breach ? "bg-alert/10" : "bg-ink/5"} ${big ? "py-5" : ""}`}
              >
                <p
                  className={`font-body uppercase tracking-wide text-ink/40 ${
                    big ? "text-xs" : "text-[11px]"
                  }`}
                >
                  {f.label}
                </p>
                <p
                  className={`mt-1 font-display font-bold tabular-nums ${
                    big ? "text-4xl" : "text-2xl"
                  } ${breach ? "text-alert" : "text-ink"}`}
                >
                  {value ?? "—"}
                  <span className="ml-1 font-body text-xs font-normal text-ink/40">{f.unit}</span>
                </p>
              </div>
            );
          })}
        </div>

        <p className="mt-3 font-body text-xs text-ink/40">
          Update terakhir:{" "}
          {reading ? new Date(reading.recorded_at).toLocaleString("id-ID") : "belum ada data"}
        </p>
      </div>
    );
  }
}
