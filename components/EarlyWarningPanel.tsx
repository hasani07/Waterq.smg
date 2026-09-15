"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { callProtectedFunction } from "@/lib/pinSession";

export default function EarlyWarningPanel({ token }: { token: string }) {
  const [rapidRise, setRapidRise] = useState(5);
  const [waspada, setWaspada] = useState(5);
  const [bahaya, setBahaya] = useState(15);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("early_warning_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (data) {
        setRapidRise(data.rapid_rise_cm);
        setWaspada(data.rainfall_waspada_mm);
        setBahaya(data.rainfall_bahaya_mm);
      }
    })();
  }, []);

  async function handleSave() {
    setSaving(true);
    setFeedback("");
    const { error } = await callProtectedFunction(
      "update-early-warning-settings",
      {
        rapid_rise_cm: rapidRise,
        rainfall_waspada_mm: waspada,
        rainfall_bahaya_mm: bahaya,
      },
      token,
    );
    setSaving(false);
    setFeedback(error ? `Gagal: ${error}` : "Tersimpan ✓ — langsung kepakai di Kiosk Mode");
  }

  return (
    <div className="glass-card px-6 py-6">
      <p className="font-display text-lg font-bold text-ink">Pengaturan Peringatan Dini Banjir</p>
      <p className="mt-1 font-body text-xs text-ink/50">
        Batas ini dipakai buat nge-flag banner peringatan di Kiosk Mode. Sesuaikan setelah ada data
        lapangan beberapa minggu.
      </p>

      <div className="mt-6 flex flex-col gap-6">
        <div>
          <div className="flex items-center justify-between">
            <span className="font-body text-sm text-ink/70">
              Batas kenaikan air cepat (dibanding update sebelumnya)
            </span>
            <span className="font-display text-sm text-sediment tabular-nums">{rapidRise} cm</span>
          </div>
          <input
            type="range"
            min={1}
            max={50}
            step={1}
            value={rapidRise}
            onChange={(e) => setRapidRise(Number(e.target.value))}
            className="mt-2 w-full accent-teal"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className="font-body text-sm text-ink/70">Curah hujan level Waspada</span>
            <span className="font-display text-sm text-sediment tabular-nums">{waspada} mm</span>
          </div>
          <input
            type="range"
            min={1}
            max={50}
            step={1}
            value={waspada}
            onChange={(e) => setWaspada(Number(e.target.value))}
            className="mt-2 w-full accent-sediment"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className="font-body text-sm text-ink/70">Curah hujan level Bahaya</span>
            <span className="font-display text-sm text-alert tabular-nums">{bahaya} mm</span>
          </div>
          <input
            type="range"
            min={5}
            max={100}
            step={1}
            value={bahaya}
            onChange={(e) => setBahaya(Number(e.target.value))}
            className="mt-2 w-full accent-alert"
          />
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
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
