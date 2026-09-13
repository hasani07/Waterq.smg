"use client";

import { useEffect, useState } from "react";
import { supabase, DevicePublic } from "@/lib/supabase";
import SensorHistoryChart from "@/components/SensorHistoryChart";
import AnalyticsGrid from "@/components/AnalyticsGrid";

export default function AnalyticsPage() {
  const [devices, setDevices] = useState<DevicePublic[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("devices_public").select("*").order("device_code");
      setDevices((data ?? []) as DevicePublic[]);
      if (data && data.length > 0) setSelectedId(data[0].id);
    })();
  }, []);

  return (
    <main>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Analytics</h1>
          <p className="mt-2 font-body text-sm text-ink/60">
            Ringkasan tren 7 hari terakhir & grafik detail per sensor.
          </p>
        </div>
        <select
          value={selectedId ?? ""}
          onChange={(e) => setSelectedId(e.target.value)}
          className="glass-pill bg-ink/5 px-4 py-2 font-body text-sm text-ink outline-none"
        >
          {devices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.device_code} — {d.name}
            </option>
          ))}
        </select>
      </div>

      <div className="glass-card px-6 py-6">
        <p className="mb-4 font-display text-lg font-bold text-ink">Ringkasan 7 Hari Terakhir</p>
        <AnalyticsGrid deviceId={selectedId} />
      </div>

      <div className="mt-6">
        <SensorHistoryChart devices={devices} primaryDeviceId={selectedId} />
      </div>
    </main>
  );
}
