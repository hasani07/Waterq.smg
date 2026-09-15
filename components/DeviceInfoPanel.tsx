"use client";

import { useEffect, useState } from "react";
import { supabase, DevicePublic } from "@/lib/supabase";
import { callProtectedFunction } from "@/lib/pinSession";

type DeviceDetail = {
  id: string;
  device_code: string;
  name: string;
  sim_number: string | null;
  sim_provider: string | null;
  pulsa_last_topup_date: string | null;
  latitude: number | null;
  longitude: number | null;
};

export default function DeviceInfoPanel({ token }: { token: string }) {
  const [devices, setDevices] = useState<DevicePublic[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState<Partial<DeviceDetail>>({});
  const [loading, setLoading] = useState(false);
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
    (async () => {
      setLoading(true);
      setFeedback("");
      const { data, error } = await callProtectedFunction<{ device: DeviceDetail }>(
        "get-device-details",
        { device_id: selectedId },
        token,
      );
      setLoading(false);
      if (error || !data) {
        setFeedback(`Gagal ambil data: ${error}`);
        return;
      }
      setForm(data.device);
    })();
  }, [selectedId, token]);

  async function handleSave() {
    setSaving(true);
    setFeedback("");
    const { error } = await callProtectedFunction(
      "update-device-info",
      {
        device_id: selectedId,
        name: form.name,
        sim_number: form.sim_number,
        sim_provider: form.sim_provider,
        pulsa_last_topup_date: form.pulsa_last_topup_date,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
      },
      token,
    );
    setSaving(false);
    setFeedback(error ? `Gagal: ${error}` : "Tersimpan ✓");
  }

  if (devices.length === 0) {
    return (
      <div className="glass-card px-6 py-6">
        <p className="font-display text-lg font-bold text-ink">Identitas & Lokasi Device</p>
        <p className="mt-2 font-body text-sm text-ink/50">Belum ada device terdaftar.</p>
      </div>
    );
  }

  return (
    <div className="glass-card px-6 py-6">
      <p className="font-display text-lg font-bold text-ink">Identitas & Lokasi Device</p>
      <p className="mt-1 font-body text-xs text-ink/50">
        Nomor SIM, provider, tanggal isi ulang pulsa terakhir, dan koordinat lokasi.
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

      {loading ? (
        <p className="mt-5 font-body text-sm text-ink/40">Memuat data...</p>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="font-body text-xs text-ink/60">
            Nama Lokasi
            <input
              type="text"
              value={form.name ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="rounded-lg mt-1 w-full border border-line px-3 py-2 font-body text-sm"
            />
          </label>
          <label className="font-body text-xs text-ink/60">
            Provider SIM
            <input
              type="text"
              placeholder="Telkomsel / XL / dst"
              value={form.sim_provider ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, sim_provider: e.target.value }))}
              className="rounded-lg mt-1 w-full border border-line px-3 py-2 font-body text-sm"
            />
          </label>
          <label className="font-body text-xs text-ink/60">
            Nomor SIM
            <input
              type="text"
              value={form.sim_number ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, sim_number: e.target.value }))}
              className="rounded-lg mt-1 w-full border border-line px-3 py-2 font-body text-sm"
            />
          </label>
          <label className="font-body text-xs text-ink/60">
            Tanggal Isi Ulang Pulsa Terakhir
            <input
              type="date"
              value={form.pulsa_last_topup_date ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, pulsa_last_topup_date: e.target.value }))}
              className="rounded-lg mt-1 w-full border border-line px-3 py-2 font-body text-sm"
            />
          </label>
          <label className="font-body text-xs text-ink/60">
            Latitude
            <input
              type="number"
              step="0.000001"
              value={form.latitude ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, latitude: Number(e.target.value) }))}
              className="rounded-lg mt-1 w-full border border-line px-3 py-2 font-body text-sm"
            />
          </label>
          <label className="font-body text-xs text-ink/60">
            Longitude
            <input
              type="number"
              step="0.000001"
              value={form.longitude ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, longitude: Number(e.target.value) }))}
              className="rounded-lg mt-1 w-full border border-line px-3 py-2 font-body text-sm"
            />
          </label>
        </div>
      )}

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="rounded-full border border-teal px-4 py-1.5 font-body text-xs text-teal transition-colors hover:bg-teal hover:text-white disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
        {feedback && <span className="font-body text-xs text-ink/50">{feedback}</span>}
      </div>
    </div>
  );
}
