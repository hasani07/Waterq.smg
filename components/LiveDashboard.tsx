"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Wifi, WifiOff, Clock, Radio, MapPin } from "lucide-react";
import { supabase, DevicePublic, SensorReading, DeviceStatus } from "@/lib/supabase";
import { formatUptime, formatDateTime } from "@/lib/format";
import SensorHistoryChart from "./SensorHistoryChart";
import AIRecommendationPanel from "./AIRecommendationPanel";
import GlassCard from "./GlassCard";
import SensorTile from "./SensorTile";

// Leaflet butuh `window`, jadi wajib di-load client-only (ssr: false)
const DeviceMap = dynamic(() => import("./DeviceMap"), {
  ssr: false,
  loading: () => (
    <div className="glass-card-sm flex h-[380px] items-center justify-center font-body text-sm text-ink/40">
      Memuat peta...
    </div>
  ),
});

export default function LiveDashboard({
  devices,
  initialDeviceId,
}: {
  devices: DevicePublic[];
  initialDeviceId?: string | null;
}) {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(
    (initialDeviceId && devices.some((d) => d.id === initialDeviceId)
      ? initialDeviceId
      : devices[0]?.id) ?? null,
  );
  const [reading, setReading] = useState<SensorReading | null>(null);
  const [status, setStatus] = useState<DeviceStatus | null>(null);

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) ?? null;

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
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "device_status_log",
          filter: `device_id=eq.${selectedDeviceId}`,
        },
        (payload) => {
          setStatus(payload.new as DeviceStatus);
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
      <GlassCard className="border-dashed text-center" padding="px-6 py-12">
        <p className="font-display text-lg text-ink">Belum ada stasiun terdaftar</p>
        <p className="mt-2 font-body text-sm text-ink/60">
          Tambahkan device lewat tabel <code className="text-teal">devices</code> di Supabase,
          atau lewat Panel Setting begitu sudah dibuat.
        </p>
      </GlassCard>
    );
  }

  const uptimeSeconds =
    status?.is_online && status?.online_since
      ? (Date.now() - new Date(status.online_since).getTime()) / 1000
      : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Bar ringkasan device terpilih */}
      <GlassCard padding="px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal/10">
              <MapPin size={18} className="text-teal" />
            </span>
            <div>
              <p className="font-display text-base font-bold text-ink">
                {selectedDevice?.device_code} — {selectedDevice?.name}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-3">
                <span
                  className={`flex items-center gap-1 font-body text-xs ${
                    status?.is_online ? "text-teal" : "text-alert"
                  }`}
                >
                  {status?.is_online ? <Wifi size={12} /> : <WifiOff size={12} />}
                  {status?.is_online ? "Online" : "Offline"}
                </span>
                <span className="flex items-center gap-1 font-body text-xs text-ink/50">
                  <Radio size={12} />
                  {formatDateTime(reading?.recorded_at)}
                </span>
                <span className="flex items-center gap-1 font-body text-xs text-ink/50">
                  <Clock size={12} />
                  Uptime {formatUptime(uptimeSeconds)}
                </span>
              </div>
            </div>
          </div>

          <select
            value={selectedDeviceId ?? ""}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="glass-pill bg-ink/5 px-4 py-2 font-body text-sm text-ink outline-none"
          >
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.device_code} — {d.name}
              </option>
            ))}
          </select>
        </div>
      </GlassCard>

      {/* Kartu-kartu sensor */}
      <GlassCard>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          <SensorTile sensorKey="ph" value={reading?.ph} unit="" />
          <SensorTile sensorKey="do" value={reading?.do_mg_l} unit="mg/L" />
          <SensorTile sensorKey="turbidity" value={reading?.turbidity_ntu} unit="NTU" />
          <SensorTile sensorKey="ec" value={reading?.ec_us_cm} unit="µS/cm" />
          <SensorTile sensorKey="tds" value={reading?.tds_ppm} unit="ppm" />
          <SensorTile sensorKey="rainfall" value={reading?.rainfall_mm} unit="mm" />
          <SensorTile
            sensorKey="water_level"
            value={reading?.water_level_raw_distance_cm}
            unit="cm"
          />
          <SensorTile sensorKey="battery" value={reading?.battery_percent} unit="%" />
        </div>
      </GlassCard>

      {/* Peta */}
      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
          <p className="font-display text-lg font-bold text-ink">Peta Stasiun</p>
        </div>
        <div className="overflow-hidden rounded-2xl">
          <DeviceMap
            devices={devices}
            selectedDeviceId={selectedDeviceId}
            onSelect={setSelectedDeviceId}
          />
        </div>
      </GlassCard>

      {/* Grafik historis selebar penuh */}
      <SensorHistoryChart devices={devices} primaryDeviceId={selectedDeviceId} />

      {/* Rekomendasi AI */}
      <AIRecommendationPanel deviceId={selectedDeviceId} />
    </div>
  );
}
