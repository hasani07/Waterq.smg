"use client";

import { useEffect, useState } from "react";
import { supabase, DevicePublic } from "@/lib/supabase";
import { callProtectedFunction } from "@/lib/pinSession";

export default function IntervalPanel({ token }: { token: string }) {
  const [devices, setDevices] = useState<DevicePublic[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [interval, setIntervalValue] = useState(5);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("devices_public").select("*").order("device_code");
      setDevices((data ?? []) as DevicePublic[]);
      if (data && data.length > 0) {
        setSelectedId(data[0].id);
        setIntervalValue(data[0].send_interval_minutes);
      }
    })();
  }, []);

  function handleSelectDevice(id: string) {
    setSelectedId(id);
    const d = devices.find((dev) => dev.id === id);
    if (d) setIntervalValue(d.send_interval_minutes);
    setFeedback("");
  }

  async function handleSave() {
    setSaving(true);
    setFeedback("");
    const { error } = await callProtectedFunction(
      "update-interval",
      { device_id: selectedId, send_interval_minutes: interval },
      token,
    );
    setSaving(false);
    setFeedback(
      error
        ? `Gagal: ${error}`
        : "Tersimpan ✓ (berlaku mulai siklus bangun ESP32 berikutnya, bukan instan)",
    );
  }

  if (devices.length === 0) {
    return (
      <div className="glass-card px-6 py-6">
        <p className="font-display text-lg font-bold text-ink">Interval Pengiriman Data</p>
        <p className="mt-2 font-body text-sm text-ink/50">Belum ada device terdaftar.</p>
      </div>
    );
  }

  return (
    <div className="glass-card px-6 py-6">
      <p className="font-display text-lg font-bold text-ink">Interval Pengiriman Data</p>
      <p className="mt-1 font-body text-xs text-ink/50">
        Batas 1–60 menit. Perubahan dipakai mulai siklus bangun ESP32 berikutnya (lihat catatan di
        dokumen spek soal deep sleep).
      </p>

      <div className="mt-5">
        <select
          value={selectedId}
          onChange={(e) => handleSelectDevice(e.target.value)}
          className="w-full border border-line bg-white px-3 py-2 font-body text-sm text-ink"
        >
          {devices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.device_code} — {d.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between">
          <span className="font-body text-sm text-ink/70">Kirim tiap</span>
          <span className="font-display text-lg text-sediment tabular-nums">
            {interval} <span className="font-body text-xs text-ink/40">menit</span>
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={60}
          step={1}
          value={interval}
          onChange={(e) => setIntervalValue(Number(e.target.value))}
          className="mt-2 w-full accent-teal"
        />
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="border border-teal px-4 py-1.5 font-body text-xs text-teal transition-colors hover:bg-teal hover:text-white disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
        {feedback && <span className="font-body text-xs text-ink/50">{feedback}</span>}
      </div>
    </div>
  );
}
