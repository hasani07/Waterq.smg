"use client";

import { useEffect, useState } from "react";
import { supabase, DevicePublic } from "@/lib/supabase";
import { callProtectedFunction } from "@/lib/pinSession";

type CalibRow = { normal_water_to_sensor_cm: number; effective_from: string };

export default function SiagaLevelsPanel({ token }: { token: string }) {
  const [devices, setDevices] = useState<DevicePublic[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [siaga3, setSiaga3] = useState("");
  const [siaga2, setSiaga2] = useState("");
  const [siaga1, setSiaga1] = useState("");
  const [currentLevel, setCurrentLevel] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("devices_public").select("*").order("device_code");
      setDevices((data ?? []) as DevicePublic[]);
      if (data && data.length > 0) setSelectedId(data[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!selectedId) return;

    async function loadSiagaData() {
      const { data: siagaData } = await supabase
        .from("siaga_levels")
        .select("*")
        .eq("device_id", selectedId)
        .maybeSingle();
      setSiaga3(siagaData?.siaga3_cm?.toString() ?? "");
      setSiaga2(siagaData?.siaga2_cm?.toString() ?? "");
      setSiaga1(siagaData?.siaga1_cm?.toString() ?? "");

      const { data: reading } = await supabase
        .from("sensor_readings")
        .select("water_level_raw_distance_cm, recorded_at")
        .eq("device_id", selectedId)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: calib } = await supabase
        .from("water_level_calibration")
        .select("normal_water_to_sensor_cm, effective_from")
        .eq("device_id", selectedId)
        .order("effective_from", { ascending: false })
        .limit(1)
        .maybeSingle<CalibRow>();

      if (reading?.water_level_raw_distance_cm != null && calib?.normal_water_to_sensor_cm != null) {
        setCurrentLevel(calib.normal_water_to_sensor_cm - reading.water_level_raw_distance_cm);
      } else {
        setCurrentLevel(null);
      }
    }

    loadSiagaData();

    // Dengerin kalibrasi baru ATAU bacaan sensor baru buat device ini -- begitu ada
    // perubahan (misal abis Simpan di panel Kalibrasi), "Tinggi air sekarang" auto-update
    // tanpa perlu refresh halaman.
    const channel = supabase
      .channel(`siaga-levels-${selectedId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "water_level_calibration",
          filter: `device_id=eq.${selectedId}`,
        },
        () => loadSiagaData(),
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sensor_readings",
          filter: `device_id=eq.${selectedId}`,
        },
        () => loadSiagaData(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedId]);

  async function handleSave() {
    setSaving(true);
    setFeedback("");
    const { error } = await callProtectedFunction(
      "update-siaga-levels",
      {
        device_id: selectedId,
        siaga3_cm: siaga3 ? Number(siaga3) : null,
        siaga2_cm: siaga2 ? Number(siaga2) : null,
        siaga1_cm: siaga1 ? Number(siaga1) : null,
      },
      token,
    );
    setSaving(false);
    setFeedback(error ? `Gagal: ${error}` : "Tersimpan ✓ — langsung kepakai di Kiosk Mode");
  }

  if (devices.length === 0) {
    return (
      <div className="glass-card px-6 py-6">
        <p className="font-display text-lg font-bold text-ink">Level Siaga Banjir (per Stasiun)</p>
        <p className="mt-2 font-body text-sm text-ink/50">Belum ada device terdaftar.</p>
      </div>
    );
  }

  return (
    <div className="glass-card px-6 py-6">
      <p className="font-display text-lg font-bold text-ink">Level Siaga Banjir (per Stasiun)</p>
      <p className="mt-1 font-body text-xs text-ink/50">
        Metode resmi BBWS/BMKG — batas TINGGI MUKA AIR (bukan kecepatan naik), diukur dalam cm{" "}
        <b>di atas muka air normal</b>. Angka ini beda-beda tiap lokasi, tentukan berdasarkan
        riwayat banjir/survei lapangan di titik itu.
      </p>

      <div className="mt-5">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="rounded-lg w-full border border-line bg-white px-3 py-2 font-body text-sm text-ink"
        >
          {devices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.device_code} — {d.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 rounded-xl bg-teal/10 px-4 py-3">
        <p className="font-body text-xs text-ink/60">
          Tinggi air sekarang (dari normal):{" "}
          <span className="font-display font-bold text-teal">
            {currentLevel !== null ? `${currentLevel.toFixed(1)} cm` : "belum ada data/kalibrasi"}
          </span>
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="font-body text-xs text-ink/60">
          Siaga 3 (Waspada)
          <input
            type="number"
            placeholder="cm dari normal"
            value={siaga3}
            onChange={(e) => setSiaga3(e.target.value)}
            className="rounded-lg mt-1 w-full border border-line px-3 py-2 font-body text-sm"
          />
        </label>
        <label className="font-body text-xs text-ink/60">
          Siaga 2
          <input
            type="number"
            placeholder="cm dari normal"
            value={siaga2}
            onChange={(e) => setSiaga2(e.target.value)}
            className="rounded-lg mt-1 w-full border border-line px-3 py-2 font-body text-sm"
          />
        </label>
        <label className="font-body text-xs text-ink/60">
          Siaga 1 (Awas)
          <input
            type="number"
            placeholder="cm dari normal"
            value={siaga1}
            onChange={(e) => setSiaga1(e.target.value)}
            className="rounded-lg mt-1 w-full border border-line px-3 py-2 font-body text-sm"
          />
        </label>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-full border border-teal px-4 py-1.5 font-body text-xs text-teal transition-colors hover:bg-teal hover:text-white disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
        {feedback && <span className="font-body text-xs text-ink/50">{feedback}</span>}
      </div>
    </div>
  );
}
