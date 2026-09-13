"use client";

import { useEffect, useState } from "react";
import { supabase, DevicePublic } from "@/lib/supabase";
import { callProtectedFunction } from "@/lib/pinSession";

const SENSOR_TYPES = [
  { key: "ph", label: "pH" },
  { key: "do", label: "DO" },
  { key: "turbidity", label: "Turbidity" },
  { key: "ec", label: "EC" },
  { key: "tds", label: "TDS" },
  { key: "water_level", label: "Water Level (A01NYUB)" },
] as const;

export default function CalibrationPanel({ token }: { token: string }) {
  const [devices, setDevices] = useState<DevicePublic[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [sensorType, setSensorType] = useState<(typeof SENSOR_TYPES)[number]["key"]>("ph");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  // form generik 2-titik
  const [point1Raw, setPoint1Raw] = useState("");
  const [point1Actual, setPoint1Actual] = useState("");
  const [point2Raw, setPoint2Raw] = useState("");
  const [point2Actual, setPoint2Actual] = useState("");

  // form khusus water level
  const [riverbedToNormal, setRiverbedToNormal] = useState("");
  const [normalToSensor, setNormalToSensor] = useState("");

  type CalibHistoryRow = {
    id: number;
    calibrated_at?: string;
    effective_from?: string;
    calibration_params?: { point1?: { raw: number | null; actual: number | null }; point2?: { raw: number | null; actual: number | null } };
    riverbed_to_normal_water_cm?: number | null;
    normal_water_to_sensor_cm?: number | null;
  };
  const [history, setHistory] = useState<CalibHistoryRow[]>([]);

  async function loadHistory(devId: string, sType: string) {
    if (!devId) return;
    if (sType === "water_level") {
      const { data } = await supabase
        .from("water_level_calibration")
        .select("*")
        .eq("device_id", devId)
        .order("effective_from", { ascending: false })
        .limit(20);
      setHistory((data ?? []) as CalibHistoryRow[]);
    } else {
      const { data } = await supabase
        .from("calibration_log")
        .select("*")
        .eq("device_id", devId)
        .eq("sensor_type", sType)
        .order("calibrated_at", { ascending: false })
        .limit(20);
      setHistory((data ?? []) as CalibHistoryRow[]);
    }
  }

  useEffect(() => {
    loadHistory(selectedId, sensorType);
  }, [selectedId, sensorType]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("devices_public").select("*").order("device_code");
      setDevices((data ?? []) as DevicePublic[]);
      if (data && data.length > 0) setSelectedId(data[0].id);
    })();
  }, []);

  async function handleSave() {
    setSaving(true);
    setFeedback("");

    const body: Record<string, unknown> = { device_id: selectedId, sensor_type: sensorType };

    if (sensorType === "water_level") {
      if (!normalToSensor) {
        setSaving(false);
        setFeedback("Isi minimal 'Tinggi muka air normal ke sensor'.");
        return;
      }
      body.riverbed_to_normal_water_cm = riverbedToNormal ? Number(riverbedToNormal) : null;
      body.normal_water_to_sensor_cm = Number(normalToSensor);
    } else {
      body.point1_raw = point1Raw ? Number(point1Raw) : null;
      body.point1_actual = point1Actual ? Number(point1Actual) : null;
      body.point2_raw = point2Raw ? Number(point2Raw) : null;
      body.point2_actual = point2Actual ? Number(point2Actual) : null;
    }

    const { error } = await callProtectedFunction("update-calibration", body, token);
    setSaving(false);
    setFeedback(error ? `Gagal: ${error}` : "Kalibrasi tersimpan ✓");
    if (!error) loadHistory(selectedId, sensorType);
  }

  if (devices.length === 0) {
    return (
      <div className="glass-card px-6 py-6">
        <p className="font-display text-lg font-bold text-ink">Kalibrasi Sensor</p>
        <p className="mt-2 font-body text-sm text-ink/50">Belum ada device terdaftar.</p>
      </div>
    );
  }

  return (
    <div className="glass-card px-6 py-6">
      <p className="font-display text-lg font-bold text-ink">Kalibrasi Sensor</p>
      <p className="mt-1 font-body text-xs text-ink/50">
        Water Level pakai 2 angka jarak (bukan hardcode di firmware). Sensor lain pakai kalibrasi
        2 titik (raw dari alat vs nilai larutan standar/acuan).
      </p>

      <div className="mt-5 flex flex-col gap-3">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="border border-line bg-white px-3 py-2 font-body text-sm text-ink"
        >
          {devices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.device_code} — {d.name}
            </option>
          ))}
        </select>

        <select
          value={sensorType}
          onChange={(e) => setSensorType(e.target.value as typeof sensorType)}
          className="border border-line bg-white px-3 py-2 font-body text-sm text-ink"
        >
          {SENSOR_TYPES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {sensorType === "water_level" ? (
        <div className="mt-4 flex flex-col gap-3">
          <label className="font-body text-xs text-ink/60">
            Tinggi dasar sungai ke muka air normal (cm, opsional/catatan)
            <input
              type="number"
              value={riverbedToNormal}
              onChange={(e) => setRiverbedToNormal(e.target.value)}
              className="mt-1 w-full border border-line px-3 py-2 font-body text-sm"
            />
          </label>
          <label className="font-body text-xs text-ink/60">
            Tinggi muka air normal ke sensor (cm) — wajib, ini baseline perhitungan
            <input
              type="number"
              value={normalToSensor}
              onChange={(e) => setNormalToSensor(e.target.value)}
              className="mt-1 w-full border border-line px-3 py-2 font-body text-sm"
            />
          </label>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="font-body text-xs text-ink/60">
            Titik 1 - nilai raw
            <input
              type="number"
              value={point1Raw}
              onChange={(e) => setPoint1Raw(e.target.value)}
              className="mt-1 w-full border border-line px-3 py-2 font-body text-sm"
            />
          </label>
          <label className="font-body text-xs text-ink/60">
            Titik 1 - nilai sebenarnya
            <input
              type="number"
              value={point1Actual}
              onChange={(e) => setPoint1Actual(e.target.value)}
              className="mt-1 w-full border border-line px-3 py-2 font-body text-sm"
            />
          </label>
          <label className="font-body text-xs text-ink/60">
            Titik 2 - nilai raw
            <input
              type="number"
              value={point2Raw}
              onChange={(e) => setPoint2Raw(e.target.value)}
              className="mt-1 w-full border border-line px-3 py-2 font-body text-sm"
            />
          </label>
          <label className="font-body text-xs text-ink/60">
            Titik 2 - nilai sebenarnya
            <input
              type="number"
              value={point2Actual}
              onChange={(e) => setPoint2Actual(e.target.value)}
              className="mt-1 w-full border border-line px-3 py-2 font-body text-sm"
            />
          </label>
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="border border-teal px-4 py-1.5 font-body text-xs text-teal transition-colors hover:bg-teal hover:text-white disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
        {feedback && <span className="font-body text-xs text-ink/50">{feedback}</span>}
      </div>

      {history.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <p className="font-body text-xs text-ink/50">Riwayat 20 kalibrasi terakhir ({sensorType}):</p>
          <div className="mt-2 max-h-[150px] overflow-y-auto pr-1">
            <div className="flex flex-col gap-1.5">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between font-body text-xs">
                  {sensorType === "water_level" ? (
                    <span className="text-sediment tabular-nums">
                      normal→sensor: {h.normal_water_to_sensor_cm ?? "—"} cm
                      {h.riverbed_to_normal_water_cm != null && ` · dasar→normal: ${h.riverbed_to_normal_water_cm} cm`}
                    </span>
                  ) : (
                    <span className="text-sediment tabular-nums">
                      P1: {h.calibration_params?.point1?.raw ?? "—"}→{h.calibration_params?.point1?.actual ?? "—"}
                      {" · "}
                      P2: {h.calibration_params?.point2?.raw ?? "—"}→{h.calibration_params?.point2?.actual ?? "—"}
                    </span>
                  )}
                  <span className="text-ink/40">
                    {new Date(h.calibrated_at ?? h.effective_from ?? "").toLocaleString("id-ID")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
