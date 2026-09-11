"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { callProtectedFunction } from "@/lib/pinSession";

const SENSOR_CONFIG = [
  { key: "ph", label: "pH", min: 0, max: 14, step: 0.1, unit: "" },
  { key: "do", label: "DO", min: 0, max: 15, step: 0.1, unit: "mg/L" },
  { key: "turbidity", label: "Turbidity", min: 0, max: 200, step: 1, unit: "NTU" },
  { key: "ec", label: "EC", min: 0, max: 2000, step: 10, unit: "µS/cm" },
  { key: "tds", label: "TDS", min: 0, max: 1500, step: 10, unit: "ppm" },
  { key: "rainfall", label: "Rainfall", min: 0, max: 100, step: 1, unit: "mm" },
  { key: "water_level", label: "Water Level (relatif normal)", min: -200, max: 200, step: 1, unit: "cm" },
  { key: "battery", label: "Baterai", min: 0, max: 100, step: 1, unit: "%" },
] as const;

type ThresholdRow = { min_value: number | null; max_value: number | null };

export default function ThresholdPanel({ token }: { token: string }) {
  const [values, setValues] = useState<Record<string, ThresholdRow>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("threshold_settings")
        .select("sensor_type, min_value, max_value")
        .is("device_id", null);

      const map: Record<string, ThresholdRow> = {};
      SENSOR_CONFIG.forEach((s) => {
        const row = data?.find((r) => r.sensor_type === s.key);
        map[s.key] = { min_value: row?.min_value ?? s.min, max_value: row?.max_value ?? s.max };
      });
      setValues(map);
    })();
  }, []);

  async function handleSave(sensorKey: string) {
    setSavingKey(sensorKey);
    setFeedback((f) => ({ ...f, [sensorKey]: "" }));
    const row = values[sensorKey];

    const { error } = await callProtectedFunction(
      "update-threshold",
      {
        device_id: null,
        sensor_type: sensorKey,
        min_value: row.min_value,
        max_value: row.max_value,
      },
      token,
    );

    setSavingKey(null);
    setFeedback((f) => ({ ...f, [sensorKey]: error ? `Gagal: ${error}` : "Tersimpan ✓" }));
  }

  return (
    <div className="border border-line bg-white/60 px-6 py-6">
      <p className="font-display text-lg font-bold text-ink">Threshold Sensor</p>
      <p className="mt-1 font-body text-xs text-ink/50">
        Batas aman global (berlaku semua device). Geser slider, lalu klik Simpan.
      </p>

      <div className="mt-6 flex flex-col gap-6">
        {SENSOR_CONFIG.map((s) => {
          const row = values[s.key];
          if (!row) return null;
          return (
            <div key={s.key} className="border-b border-line pb-5 last:border-b-0">
              <div className="flex items-center justify-between">
                <p className="font-body text-sm font-medium text-ink">{s.label}</p>
                <p className="font-display text-sm text-sediment tabular-nums">
                  {row.min_value ?? "—"} – {row.max_value ?? "—"}{" "}
                  <span className="font-body text-xs text-ink/40">{s.unit}</span>
                </p>
              </div>

              <div className="mt-3 flex flex-col gap-2">
                <label className="flex items-center gap-3 font-body text-xs text-ink/50">
                  Min
                  <input
                    type="range"
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    value={row.min_value ?? s.min}
                    onChange={(e) =>
                      setValues((v) => ({
                        ...v,
                        [s.key]: { ...v[s.key], min_value: Number(e.target.value) },
                      }))
                    }
                    className="flex-1 accent-teal"
                  />
                </label>
                <label className="flex items-center gap-3 font-body text-xs text-ink/50">
                  Max
                  <input
                    type="range"
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    value={row.max_value ?? s.max}
                    onChange={(e) =>
                      setValues((v) => ({
                        ...v,
                        [s.key]: { ...v[s.key], max_value: Number(e.target.value) },
                      }))
                    }
                    className="flex-1 accent-sediment"
                  />
                </label>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={() => handleSave(s.key)}
                  disabled={savingKey === s.key}
                  className="border border-teal px-4 py-1.5 font-body text-xs text-teal transition-colors hover:bg-teal hover:text-white disabled:opacity-50"
                >
                  {savingKey === s.key ? "Menyimpan..." : "Simpan"}
                </button>
                {feedback[s.key] && (
                  <span className="font-body text-xs text-ink/50">{feedback[s.key]}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
