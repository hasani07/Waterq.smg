"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
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
  { key: "yesterday", label: "24 Jam Terakhir" },
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

// Tooltip kustom bergaya kaca, senada dengan tema Neo-Glassmorphism
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function GlassTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="glass-card-sm px-4 py-3">
      <p className="font-body text-[11px] text-ink/50">{label}</p>
      <div className="mt-1 flex flex-col gap-1">
        {payload.map((p: { name: string; value: number; color: string }) => (
          <div key={p.name} className="flex items-center gap-2 font-body text-xs">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-ink/70">{p.name}:</span>
            <span className="font-display font-bold text-ink">{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
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

    const deviceCodeMap = new Map(devices.map((d) => [d.id, d.device_code]));

    async function fetchChartData(showLoading: boolean) {
      if (showLoading) setLoading(true);
      const { from, to } = rangeToDates(range, customFrom, customTo);

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
        if (showLoading) setLoading(false);
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
      if (showLoading) setLoading(false);
    }

    fetchChartData(true); // fetch pertama, tampilkan loading

    // Realtime: begitu ada data sensor baru masuk buat salah satu device aktif, langsung
    // refresh grafiknya instan -- gak nunggu interval.
    const channel = supabase
      .channel(`chart-realtime-${activeDeviceIds.join("-")}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sensor_readings" },
        (payload) => {
          const deviceId = (payload.new as { device_id: string }).device_id;
          if (activeDeviceIds.includes(deviceId)) fetchChartData(false);
        },
      )
      .subscribe();

    // Cadangan (jaga-jaga kalau koneksi realtime putus) -- interval diperpanjang jadi 2 menit
    // karena sekarang push realtime yang jadi jalur utama, ini cuma jaring pengaman.
    const intervalId = setInterval(() => fetchChartData(false), 120000);
    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensorKey, range, customFrom, customTo, primaryDeviceId, compareIds.join(",")]);

  const otherDevices = devices.filter((d) => d.id !== primaryDeviceId);
  const activeLabels = activeDeviceIds
    .map((id) => devices.find((d) => d.id === id)?.device_code)
    .filter(Boolean) as string[];

  return (
    <div className="glass-card px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-display text-lg font-bold text-ink">Grafik Historis</p>
          <p className="font-body text-xs text-ink/50">
            Riwayat pembacaan sensor · update realtime
          </p>
        </div>

        <select
          value={sensorKey}
          onChange={(e) => setSensorKey(e.target.value as SensorKey)}
          className="glass-pill bg-ink/5 px-4 py-2 font-body text-sm text-ink outline-none"
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
            className={`glass-pill px-4 py-1.5 font-body text-xs transition-colors ${
              range === opt.key ? "bg-teal text-white" : "bg-ink/5 text-ink/70 hover:text-teal"
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
              className="glass-pill ml-1 bg-ink/5 px-3 py-1.5 font-body text-xs outline-none"
            />
          </label>
          <label className="font-body text-xs text-ink/60">
            Sampai{" "}
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="glass-pill ml-1 bg-ink/5 px-3 py-1.5 font-body text-xs outline-none"
            />
          </label>
        </div>
      )}

      {/* Banding antar device */}
      {otherDevices.length > 0 && (
        <div className="mt-4 border-t border-white/50 pt-3">
          <p className="font-body text-xs text-ink/50">Bandingkan dengan stasiun lain:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {otherDevices.map((d) => (
              <label
                key={d.id}
                className={`glass-pill flex items-center gap-1.5 px-3 py-1.5 font-body text-xs transition-colors ${
                  compareIds.includes(d.id) ? "bg-teal/10 text-teal" : "bg-ink/5 text-ink/60"
                }`}
              >
                <input
                  type="checkbox"
                  checked={compareIds.includes(d.id)}
                  onChange={(e) => {
                    setCompareIds((prev) =>
                      e.target.checked ? [...prev, d.id] : prev.filter((id) => id !== d.id),
                    );
                  }}
                  className="accent-teal"
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
          <ResponsiveContainer width="100%" height={460}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                {activeLabels.map((label, idx) => (
                  <linearGradient key={label} id={`fill-${label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={LINE_COLORS[idx % LINE_COLORS.length]}
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="95%"
                      stopColor={LINE_COLORS[idx % LINE_COLORS.length]}
                      stopOpacity={0}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid stroke="#14555C" strokeOpacity={0.08} vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11, fill: "#12232099" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#12232099" }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip content={<GlassTooltip />} />
              {activeLabels.length > 1 && (
                <Legend wrapperStyle={{ fontSize: 12, fontFamily: "var(--font-ibm-plex)" }} />
              )}
              {activeLabels.map((label, idx) => (
                <Area
                  key={label}
                  type="monotone"
                  dataKey={label}
                  stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                  strokeWidth={2.5}
                  fill={`url(#fill-${label})`}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
