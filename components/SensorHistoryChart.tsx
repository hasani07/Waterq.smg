"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { supabase, DevicePublic } from "@/lib/supabase";

const SENSOR_OPTIONS = [
  { key: "ph", label: "pH" },
  { key: "do_mg_l", label: "DO (mg/L)" },
  { key: "turbidity_ntu", label: "Turbidity (NTU)" },
  { key: "ec_us_cm", label: "EC (µS/cm)" },
  { key: "tds_ppm", label: "TDS (ppm)" },
  { key: "rainfall_mm", label: "Rainfall (mm)" },
  { key: "water_level_raw_distance_cm", label: "Water Level (raw, cm)" },
  { key: "battery_percent", label: "Baterai (%)" },
] as const;

type SensorKey = (typeof SENSOR_OPTIONS)[number]["key"];
type RangeKey = "yesterday" | "7d" | "30d" | "365d" | "custom";

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "yesterday", label: "Kemarin" },
  { key: "7d", label: "7 Hari" },
  { key: "30d", label: "1 Bulan" },
  { key: "365d", label: "1 Tahun" },
  { key: "custom", label: "Custom" },
];

const LINE_COLORS = ["#14555C", "#C1793B", "#B4442E", "#2C7A82", "#6B4E9B"];

function rangeToDates(range: RangeKey, customFrom: string, customTo: string) {
  const now = new Date();
  let from: Date;
  let to: Date = now;

  switch (range) {
    case "yesterday":
      from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "7d":
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "365d":
      from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case "custom":
      from = customFrom ? new Date(customFrom) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      to = customTo ? new Date(customTo) : now;
      break;
  }
  return { from, to };
}

export default function SensorHistoryChart({
  devices,
  primaryDeviceId,
}: {
  devices: DevicePublic[];
  primaryDeviceId: string | null;
}) {
  const [sensorKey, setSensorKey] = useState<SensorKey>("ph");
  const [range, setRange] = useState<RangeKey>("7d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const activeDeviceIds = primaryDeviceId
    ? [primaryDeviceId, ...compareIds.filter((id) => id !== primaryDeviceId)]
    : compareIds;

  useEffect(() => {
    if (activeDeviceIds.length === 0) {
      setChartData([]);
      return;
    }
    setLoading(true);
    const { from, to } = rangeToDates(range, customFrom, customTo);
    const deviceCodeMap = new Map(devices.map((d) => [d.id, d.device_code]));

    (async () => {
      const { data, error } = await supabase
        .from("sensor_readings")
        .select(`device_id, recorded_at, ${sensorKey}`)
        .in("device_id", activeDeviceIds)
        .gte("recorded_at", from.toISOString())
        .lte("recorded_at", to.toISOString())
        .order("recorded_at", { ascending: true })
        .limit(2000);

      if (error) {
        console.error("Gagal ambil data grafik:", error.message);
        setLoading(false);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const grouped = new Map<string, any>();
      (data ?? []).forEach((row: any) => {
        const t = new Date(row.recorded_at).toLocaleString("id-ID", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        if (!grouped.has(t)) grouped.set(t, { time: t });
        const code = deviceCodeMap.get(row.device_id) ?? row.device_id;
        grouped.get(t)[code] = row[sensorKey];
      });
      setChartData(Array.from(grouped.values()));
      setLoading(false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })();
  }, [sensorKey, range, customFrom, customTo, primaryDeviceId, compareIds.join(",")]);

  const otherDevices = devices.filter((d) => d.id !== primaryDeviceId);
  const activeLabels = activeDeviceIds
    .map((id) => devices.find((d) => d.id === id)?.device_code)
    .filter(Boolean) as string[];

  return (
    <div className="border border-line bg-white/60 px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-display text-lg font-bold text-ink">Grafik Historis</p>
          <p className="font-body text-xs text-ink/50">Riwayat pembacaan sensor dari waktu ke waktu</p>
        </div>

        <select
          value={sensorKey}
          onChange={(e) => setSensorKey(e.target.value as SensorKey)}
          className="border border-line bg-white px-3 py-2 font-body text-sm text-ink"
        >
          {SENSOR_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Filter rentang waktu */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setRange(opt.key)}
            className={`border px-3 py-1.5 font-body text-xs transition-colors ${
              range === opt.key
                ? "border-teal bg-teal text-white"
                : "border-line bg-white text-ink/70 hover:border-teal"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {range === "custom" && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="font-body text-xs text-ink/60">
            Dari{" "}
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="ml-1 border border-line px-2 py-1 font-body text-xs"
            />
          </label>
          <label className="font-body text-xs text-ink/60">
            Sampai{" "}
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="ml-1 border border-line px-2 py-1 font-body text-xs"
            />
          </label>
        </div>
      )}

      {/* Banding antar device */}
      {otherDevices.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <p className="font-body text-xs text-ink/50">Bandingkan dengan stasiun lain:</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {otherDevices.map((d) => (
              <label key={d.id} className="flex items-center gap-1.5 font-body text-xs text-ink/70">
                <input
                  type="checkbox"
                  checked={compareIds.includes(d.id)}
                  onChange={(e) => {
                    setCompareIds((prev) =>
                      e.target.checked ? [...prev, d.id] : prev.filter((id) => id !== d.id),
                    );
                  }}
                />
                {d.device_code} — {d.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="mt-6">
        {loading ? (
          <p className="py-16 text-center font-body text-sm text-ink/40">Memuat data...</p>
        ) : chartData.length === 0 ? (
          <p className="py-16 text-center font-body text-sm text-ink/40">
            Belum ada data untuk rentang waktu ini.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData}>
              <CartesianGrid stroke="#D9E0DC" strokeDasharray="3 3" />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="#122320" />
              <YAxis tick={{ fontSize: 11 }} stroke="#122320" />
              <Tooltip />
              {activeLabels.length > 1 && <Legend />}
              {activeLabels.map((label, idx) => (
                <Line
                  key={label}
                  type="monotone"
                  dataKey={label}
                  stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
