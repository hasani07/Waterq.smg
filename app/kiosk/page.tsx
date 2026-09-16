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

const CYCLE_MS = 8000; // ganti device tiap 8 detik di mode Cycle

type EarlyWarning = { device: DevicePublic; level: "waspada" | "bahaya"; reason: string };
type EwSettings = { rapid_rise_cm: number; rainfall_waspada_mm: number; rainfall_bahaya_mm: number };
type SiagaRow = { device_id: string; siaga3_cm: number | null; siaga2_cm: number | null; siaga1_cm: number | null };
type CalibRow = {
  device_id: string;
  normal_water_to_sensor_cm: number;
  riverbed_to_normal_water_cm: number | null;
  effective_from: string;
};

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
  const [siagaLevels, setSiagaLevels] = useState<Record<string, SiagaRow>>({});
  const [latestCalibration, setLatestCalibration] = useState<Record<string, CalibRow>>({});
  const [now, setNow] = useState(new Date());
  const [mode, setMode] = useState<"grid" | "cycle">("grid");
  const [cycleIndex, setCycleIndex] = useState(0);
  const [alarmActive, setAlarmActive] = useState(false);

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

    const { data: siagaData } = await supabase.from("siaga_levels").select("*");
    const siagaMap: Record<string, SiagaRow> = {};
    (siagaData ?? []).forEach((s: SiagaRow) => {
      siagaMap[s.device_id] = s;
    });
    setSiagaLevels(siagaMap);

    const calibMap: Record<string, CalibRow> = {};
    for (const d of devicesList) {
      const { data: calib } = await supabase
        .from("water_level_calibration")
        .select("device_id, normal_water_to_sensor_cm, riverbed_to_normal_water_cm, effective_from")
        .eq("device_id", d.id)
        .order("effective_from", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (calib) calibMap[d.id] = calib as CalibRow;
    }
    setLatestCalibration(calibMap);

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

    // Realtime: begitu ada data sensor baru, status online/offline berubah, atau
    // notifikasi baru masuk -- langsung refresh semua data Kiosk instan.
    const channel = supabase
      .channel("kiosk-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sensor_readings" },
        () => loadData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "device_status_log" },
        () => loadData(),
      )
      .subscribe();

    // Cadangan aja (jaring pengaman kalau koneksi realtime putus), interval diperpanjang.
    const dataInterval = setInterval(loadData, 60000);
    const clockInterval = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearInterval(dataInterval);
      clearInterval(clockInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (mode !== "cycle" || devices.length === 0) return;
    const cycleInterval = setInterval(() => {
      setCycleIndex((i) => (i + 1) % devices.length);
    }, CYCLE_MS);
    return () => clearInterval(cycleInterval);
  }, [mode, devices.length]);

  // Screen Wake Lock -- biar layar TV/laptop gak mati/dim sendiri selama halaman ini kebuka.
  // Browser lama yang gak support fitur ini otomatis "diem-diem aja" (gak error).
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let wakeLock: any = null;

    async function requestWakeLock() {
      try {
        if ("wakeLock" in navigator) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          wakeLock = await (navigator as any).wakeLock.request("screen");
        }
      } catch {
        // gagal (misal baterai rendah/gak didukung) -- diemin aja, gak masalah
      }
    }

    requestWakeLock();

    // Browser otomatis lepas wake lock kalau tab disembunyiin -- minta lagi begitu keliatan lagi
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") requestWakeLock();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      wakeLock?.release?.();
    };
  }, []);

  // Auto-refresh PENUH tiap 4 jam -- biar gak lag/berat kalau tab kebuka berhari-hari nonstop.
  useEffect(() => {
    const AUTO_RELOAD_MS = 4 * 60 * 60 * 1000; // 4 jam
    const timer = setTimeout(() => window.location.reload(), AUTO_RELOAD_MS);
    return () => clearTimeout(timer);
  }, []);

  function isBreach(sensorKey: string, thresholdKey: string, value: number | null | undefined) {
    if (value === null || value === undefined) return false;
    const t = thresholds[thresholdKey];
    if (!t) return false;
    if (t.min_value !== null && value < t.min_value) return true;
    if (t.max_value !== null && value > t.max_value) return true;
    return false;
  }

  // Hitung status Siaga (metode resmi, berbasis tinggi absolut) buat 1 device
  function getSiagaStatus(deviceId: string): { level: "normal" | "siaga3" | "siaga2" | "siaga1"; heightCm: number | null } {
    const reading = readings[deviceId];
    const calib = latestCalibration[deviceId];
    const siaga = siagaLevels[deviceId];

    if (!reading?.water_level_raw_distance_cm || !calib) {
      return { level: "normal", heightCm: null };
    }

    // Tinggi air DARI DASAR SUNGAI = jarak dasar->normal + (jarak normal->sensor - jarak sensor->air sekarang)
    const heightAboveNormal = calib.normal_water_to_sensor_cm - reading.water_level_raw_distance_cm;
    const heightCm = (calib.riverbed_to_normal_water_cm ?? 0) + heightAboveNormal;

    if (!siaga) return { level: "normal", heightCm };
    if (siaga.siaga1_cm !== null && heightCm >= siaga.siaga1_cm) return { level: "siaga1", heightCm };
    if (siaga.siaga2_cm !== null && heightCm >= siaga.siaga2_cm) return { level: "siaga2", heightCm };
    if (siaga.siaga3_cm !== null && heightCm >= siaga.siaga3_cm) return { level: "siaga3", heightCm };
    return { level: "normal", heightCm };
  }

  // Deteksi peringatan dini banjir: gabungan 2 metode --
  // 1) Siaga absolut (resmi, berbasis tinggi muka air) -- diutamakan kalau datanya ada
  // 2) Rate-of-rise + curah hujan (prediktif, pelengkap) -- tetap dicek juga
  function computeEarlyWarnings(): EarlyWarning[] {
    const warnings: EarlyWarning[] = [];
    for (const d of devices) {
      const current = readings[d.id];
      const previous = previousReadings[d.id];
      if (!current) continue;

      // 1. Cek Siaga absolut dulu
      const siagaStatus = getSiagaStatus(d.id);
      if (siagaStatus.level === "siaga1") {
        warnings.push({
          device: d,
          level: "bahaya",
          reason: `SIAGA 1 (Awas) — tinggi air ${siagaStatus.heightCm?.toFixed(1)} cm dari dasar sungai`,
        });
        continue; // udah paling parah, gak perlu cek yang lain buat device ini
      }
      if (siagaStatus.level === "siaga2") {
        warnings.push({
          device: d,
          level: "bahaya",
          reason: `SIAGA 2 — tinggi air ${siagaStatus.heightCm?.toFixed(1)} cm dari dasar sungai`,
        });
        continue;
      }
      if (siagaStatus.level === "siaga3") {
        warnings.push({
          device: d,
          level: "waspada",
          reason: `SIAGA 3 (Waspada) — tinggi air ${siagaStatus.heightCm?.toFixed(1)} cm dari dasar sungai`,
        });
        continue;
      }

      // 2. Kalau Siaga masih normal (atau belum ada datanya), cek rate-of-rise + hujan
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

  // Cek status bahaya tiap kali data sensor ke-update, buat nyalain/matiin alarm
  useEffect(() => {
    const warnings = computeEarlyWarnings();
    setAlarmActive(warnings.some((w) => w.level === "bahaya"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readings, previousReadings, siagaLevels, latestCalibration, ewSettings]);

  // Bunyiin beep berulang selama status masih Bahaya. Catatan: browser modern biasanya
  // nge-block audio otomatis sebelum ada interaksi apapun di halaman -- klik sekali aja
  // di layar Monitoring Room pas pertama dibuka buat "unlock" audio-nya.
  useEffect(() => {
    if (!alarmActive) return;

    function playBeep() {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = 880;
        gain.gain.value = 0.3;
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start();
        setTimeout(() => {
          oscillator.stop();
          ctx.close();
        }, 400);
      } catch {
        // audio gagal (belum di-unlock/gak didukung) -- diemin aja
      }
    }

    playBeep();
    const interval = setInterval(playBeep, 20000);
    return () => clearInterval(interval);
  }, [alarmActive]);

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
            title="Keluar dari Monitoring Room"
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
    const siagaStatus = getSiagaStatus(d.id);
    const hasBreach = SENSOR_FIELDS.some((f) =>
      isBreach(
        f.key,
        (f as { thresholdKey?: string }).thresholdKey ?? f.key,
        reading?.[f.key as keyof SensorReading] as number | null,
      ),
    );

    const siagaBadge: Record<string, { label: string; className: string }> = {
      normal: { label: "Normal", className: "bg-teal/10 text-teal" },
      siaga3: { label: "Siaga 3", className: "bg-sediment/15 text-sediment" },
      siaga2: { label: "Siaga 2", className: "bg-alert/15 text-alert" },
      siaga1: { label: "Siaga 1 - AWAS", className: "bg-alert text-white" },
    };
    const badge = siagaBadge[siagaStatus.level];

    return (
      <div
        key={d.id}
        className={`glass-card px-6 py-5 ${big ? "mx-auto max-w-3xl" : ""} ${
          hasBreach || siagaStatus.level !== "normal" ? "ring-4 ring-alert" : ""
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
          <div className="flex flex-col items-end gap-1.5">
            <span
              className={`flex items-center gap-2 font-body font-medium ${
                big ? "text-xl" : "text-base"
              } ${status?.is_online ? "text-teal" : "text-alert"}`}
            >
              {status?.is_online ? <Wifi size={big ? 26 : 20} /> : <WifiOff size={big ? 26 : 20} />}
              {status?.is_online ? "Online" : "Offline"}
            </span>
            <span className={`rounded-full px-3 py-1 font-body text-xs font-medium ${badge.className}`}>
              {badge.label}
            </span>
          </div>
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
                  className={`font-body font-semibold uppercase tracking-wide text-ink/75 ${
                    big ? "text-sm" : "text-xs"
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
                  <span className="ml-1 font-body text-xs font-medium text-ink/55">{f.unit}</span>
                </p>
              </div>
            );
          })}
        </div>

        <p className="mt-3 font-body text-xs text-ink/55">
          Update terakhir:{" "}
          {reading ? new Date(reading.recorded_at).toLocaleString("id-ID") : "belum ada data"}
        </p>
      </div>
    );
  }
}
