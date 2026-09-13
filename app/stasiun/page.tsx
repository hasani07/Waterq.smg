"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Wifi, WifiOff } from "lucide-react";
import { supabase, DevicePublic, SensorReading, DeviceStatus } from "@/lib/supabase";
import { formatDateTime } from "@/lib/format";

const DeviceMap = dynamic(() => import("@/components/DeviceMap"), {
  ssr: false,
  loading: () => (
    <div className="glass-card-sm flex h-[380px] items-center justify-center font-body text-sm text-ink/40">
      Memuat peta...
    </div>
  ),
});

export default function StasiunPage() {
  const [devices, setDevices] = useState<DevicePublic[]>([]);
  const [readings, setReadings] = useState<Record<string, SensorReading>>({});
  const [statuses, setStatuses] = useState<Record<string, DeviceStatus>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: deviceData } = await supabase
        .from("devices_public")
        .select("*")
        .order("device_code");
      const devicesList = (deviceData ?? []) as DevicePublic[];
      setDevices(devicesList);
      if (devicesList.length > 0) setSelectedId(devicesList[0].id);

      const { data: statusData } = await supabase.from("device_status_log").select("*");
      const statusMap: Record<string, DeviceStatus> = {};
      (statusData ?? []).forEach((s: DeviceStatus) => {
        statusMap[s.device_id] = s;
      });
      setStatuses(statusMap);

      const readingMap: Record<string, SensorReading> = {};
      for (const d of devicesList) {
        const { data: r } = await supabase
          .from("sensor_readings")
          .select("*")
          .eq("device_id", d.id)
          .order("recorded_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (r) readingMap[d.id] = r as SensorReading;
      }
      setReadings(readingMap);
    })();
  }, []);

  return (
    <main>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-ink">Stasiun</h1>
        <p className="mt-2 font-body text-sm text-ink/60">
          Semua stasiun pemantauan yang terpasang di sepanjang DAS Semarang.
        </p>
      </div>

      <div className="glass-card px-6 py-6">
        <DeviceMap devices={devices} selectedDeviceId={selectedId} onSelect={setSelectedId} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {devices.map((d) => {
          const status = statuses[d.id];
          const reading = readings[d.id];
          return (
            <div key={d.id} className="glass-card-sm px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display text-base font-bold text-ink">
                    {d.device_code} — {d.name}
                  </p>
                  <p className="font-body text-xs text-ink/50">
                    Update: {formatDateTime(reading?.recorded_at)}
                  </p>
                </div>
                <span
                  className={`flex items-center gap-1 font-body text-xs ${
                    status?.is_online ? "text-teal" : "text-alert"
                  }`}
                >
                  {status?.is_online ? <Wifi size={13} /> : <WifiOff size={13} />}
                  {status?.is_online ? "Online" : "Offline"}
                </span>
              </div>
              <Link
                href={`/?device=${d.id}`}
                className="glass-pill mt-3 inline-block px-4 py-1.5 font-body text-xs text-teal hover:opacity-80"
              >
                Lihat di Dashboard →
              </Link>
            </div>
          );
        })}
      </div>
    </main>
  );
}
