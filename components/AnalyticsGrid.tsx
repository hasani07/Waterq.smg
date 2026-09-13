"use client";

import { useEffect, useState } from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { supabase } from "@/lib/supabase";

const SENSOR_FIELDS = [
  { key: "ph", label: "pH", color: "#14555C" },
  { key: "do_mg_l", label: "DO", color: "#2C7A82" },
  { key: "turbidity_ntu", label: "Turbidity", color: "#6B8E9E" },
  { key: "ec_us_cm", label: "EC", color: "#C1793B" },
  { key: "tds_ppm", label: "TDS", color: "#B4622E" },
  { key: "rainfall_mm", label: "Rainfall", color: "#3B6EA5" },
  { key: "water_level_raw_distance_cm", label: "Water Level", color: "#8A6BAF" },
  { key: "battery_percent", label: "Baterai", color: "#3A8F5B" },
] as const;

export default function AnalyticsGrid({ deviceId }: { deviceId: string | null }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!deviceId) return;
    setLoading(true);
    (async () => {
      const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const { data: rows } = await supabase
        .from("sensor_readings")
        .select("*")
        .eq("device_id", deviceId)
        .gte("recorded_at", from.toISOString())
        .order("recorded_at", { ascending: true })
        .limit(1000);
      setData(rows ?? []);
      setLoading(false);
    })();
  }, [deviceId]);

  function stats(key: string) {
    const values = data
      .map((r) => r[key])
      .filter((v) => v !== null && v !== undefined) as number[];
    if (values.length === 0) return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return { min: min.toFixed(2), max: max.toFixed(2), avg: avg.toFixed(2) };
  }

  if (loading) {
    return <p className="py-10 text-center font-body text-sm text-ink/40">Memuat data...</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {SENSOR_FIELDS.map((f) => {
        const s = stats(f.key);
        return (
          <div key={f.key} className="glass-card-sm px-4 py-4">
            <p className="font-body text-xs text-ink/50">{f.label} · 7 hari</p>
            <div className="mt-2 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id={`mini-${f.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={f.color} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={f.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey={f.key}
                    stroke={f.color}
                    strokeWidth={2}
                    fill={`url(#mini-${f.key})`}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {s ? (
              <div className="mt-2 flex justify-between font-body text-[11px] text-ink/50">
                <span>Min {s.min}</span>
                <span>Avg {s.avg}</span>
                <span>Max {s.max}</span>
              </div>
            ) : (
              <p className="mt-2 font-body text-[11px] text-ink/30">Belum ada data</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
