"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase, DevicePublic, SensorReading, DeviceStatus } from "@/lib/supabase";
import { formatUptime, formatDateTime } from "@/lib/format";
import SensorHistoryChart from "./SensorHistoryChart";
import AIRecommendationPanel from "./AIRecommendationPanel";

// Leaflet butuh `window`, jadi wajib di-load client-only (ssr: false)
const DeviceMap = dynamic(() => import("./DeviceMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[380px] items-center justify-center border border-line bg-white/40 font-body text-sm text-ink/40">
      Memuat peta...
    </div>
  ),
});

function readout(label: string, value: number | null | undefined, unit: string) {
  return (
    <div className="flex items-baseline justify-between border-b border-line py-2.5 last:border-b-0">
      <span className="font-body text-sm text-ink/60">{label}</span>
      <span className="font-display text-xl text-sediment tabular-nums">
        {value !== null && value !== undefined ? value : "—"}
        <span className="ml-1 font-body text-xs text-ink/40">{unit}</span>
      </span>
    </div>
  );
}

export default function LiveDashboard({ devices }: { devices: DevicePublic[] }) {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(
    devices[0]?.id ?? null,
  );
  const [reading, setReading] = useState<SensorReading | null>(null);
  const [status, setStatus] = useState<DeviceStatus | null>(null);

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) ?? null;

  // Ambil bacaan terbaru + status tiap kali device yang dipilih berubah,
  // dan subscribe Realtime biar update otomatis begitu ada data baru masuk.
  useEffect(() => {
    if (!selectedDeviceId) return;

    let active = true;

    async function loadInitial() {
      const { data: readingData } = await supabase
        .from("sensor_readings")
        .select("*")
        .eq("device_id", selectedDeviceId)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: statusData } = await supabase
        .from("device_status_log")
        .select("*")
        .eq("device_id", selectedDeviceId)
        .maybeSingle();

      if (active) {
        setReading(readingData ?? null);
        setStatus(statusData ?? null);
      }
    }

    loadInitial();

    const channel = supabase
      .channel(`sensor-readings-${selectedDeviceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sensor_readings",
          filter: `device_id=eq.${selectedDeviceId}`,
        },
        (payload) => {
          setReading(payload.new as SensorReading);
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [selectedDeviceId]);

  if (devices.length === 0) {
    return (
      <div className="border border-dashed border-line px-6 py-12 text-center">
        <p className="font-display text-lg text-ink">Belum ada stasiun terdaftar</p>
        <p className="mt-2 font-body text-sm text-ink/60">
          Tambahkan device lewat tabel <code className="text-teal">devices</code> di Supabase,
          atau lewat Panel Setting begitu sudah dibuat.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Panel pembacaan sensor - device terpilih */}
      <div className="border border-line bg-white/60 px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
          <div>
            <p className="font-display text-xl font-bold text-ink">
              {selectedDevice?.name ?? "—"}
            </p>
            <p className="font-body text-xs text-ink/50">{selectedDevice?.device_code}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className={`font-body text-xs ${
                status?.is_online ? "text-teal" : "text-alert"
              }`}
            >
              ● {status?.is_online ? "Online" : "Offline"}
            </span>
            <span className="font-body text-xs text-ink/50">
              Update terakhir: {formatDateTime(reading?.recorded_at)}
            </span>
            <span className="font-body text-xs text-ink/50">
              Uptime: {formatUptime(status?.uptime_seconds)}
            </span>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-1 gap-x-8 md:grid-cols-2">
          <div>
            {readout("pH", reading?.ph, "")}
            {readout("DO", reading?.do_mg_l, "mg/L")}
            {readout("Turbidity", reading?.turbidity_ntu, "NTU")}
            {readout("EC", reading?.ec_us_cm, "µS/cm")}
          </div>
          <div>
            {readout("TDS", reading?.tds_ppm, "ppm")}
            {readout("Rainfall", reading?.rainfall_mm, "mm")}
            {readout("Water Level (raw)", reading?.water_level_raw_distance_cm, "cm")}
            {readout("Baterai", reading?.battery_percent, "%")}
          </div>
        </div>
      </div>

      {/* Peta + dropdown */}
      <div className="border border-line bg-white/60 px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
          <p className="font-display text-lg font-bold text-ink">Peta Stasiun</p>
          <select
            value={selectedDeviceId ?? ""}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="border border-line bg-white px-3 py-2 font-body text-sm text-ink"
          >
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.device_code} — {d.name}
              </option>
            ))}
          </select>
        </div>
        <DeviceMap
          devices={devices}
          selectedDeviceId={selectedDeviceId}
          onSelect={setSelectedDeviceId}
        />
      </div>

      {/* Grafik historis */}
      <SensorHistoryChart devices={devices} primaryDeviceId={selectedDeviceId} />

      {/* Rekomendasi AI */}
      <AIRecommendationPanel deviceId={selectedDeviceId} />
    </div>
  );
}
