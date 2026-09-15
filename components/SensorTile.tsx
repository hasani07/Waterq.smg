import {
  FlaskConical,
  Droplets,
  Waves,
  Zap,
  Layers,
  CloudRain,
  ArrowUpDown,
  BatteryMedium,
  LucideIcon,
} from "lucide-react";

type SensorKey = "ph" | "do" | "turbidity" | "ec" | "tds" | "rainfall" | "water_level" | "battery";

const SENSOR_META: Record<SensorKey, { icon: LucideIcon; label: string; accent: string }> = {
  ph: { icon: FlaskConical, label: "pH", accent: "#14555C" },
  do: { icon: Droplets, label: "DO", accent: "#2C7A82" },
  turbidity: { icon: Waves, label: "Turbidity", accent: "#6B8E9E" },
  ec: { icon: Zap, label: "EC", accent: "#C1793B" },
  tds: { icon: Layers, label: "TDS", accent: "#B4622E" },
  rainfall: { icon: CloudRain, label: "Rainfall", accent: "#3B6EA5" },
  water_level: { icon: ArrowUpDown, label: "Water Level", accent: "#8A6BAF" },
  battery: { icon: BatteryMedium, label: "Baterai", accent: "#3A8F5B" },
};

export default function SensorTile({
  sensorKey,
  value,
  unit,
}: {
  sensorKey: SensorKey;
  value: number | null | undefined;
  unit: string;
}) {
  const meta = SENSOR_META[sensorKey];
  const Icon = meta.icon;

  return (
    <div className="glass-card-sm flex flex-col gap-3 px-4 py-4 transition-transform hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: `${meta.accent}1A` }}
        >
          <Icon size={18} color={meta.accent} strokeWidth={2.2} />
        </span>
        <span className="font-body text-[11px] font-semibold uppercase tracking-wide text-ink/70">
          {meta.label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-display text-2xl font-bold text-ink tabular-nums">
          {value !== null && value !== undefined ? value : "—"}
        </span>
        {unit && <span className="font-body text-xs text-ink/55">{unit}</span>}
      </div>
    </div>
  );
}
