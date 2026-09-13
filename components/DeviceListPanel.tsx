"use client";

import { useEffect, useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { supabase, DevicePublic } from "@/lib/supabase";
import { callProtectedFunction } from "@/lib/pinSession";

export default function DeviceListPanel({ token }: { token: string }) {
  const [devices, setDevices] = useState<DevicePublic[]>([]);
  const [form, setForm] = useState({ device_code: "", name: "", latitude: "", longitude: "" });
  const [creating, setCreating] = useState(false);
  const [createFeedback, setCreateFeedback] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  function toCsv(rows: Record<string, unknown>[]): string {
    if (rows.length === 0) return "";
    const headers = Object.keys(rows[0]);
    const lines = [headers.join(",")];
    for (const row of rows) {
      lines.push(headers.map((h) => JSON.stringify(row[h] ?? "")).join(","));
    }
    return lines.join("\n");
  }

  async function handleDownloadBeforeDelete(device: DevicePublic) {
    setDownloadingId(device.id);
    const { data, error } = await supabase
      .from("sensor_readings")
      .select("*")
      .eq("device_id", device.id)
      .order("recorded_at", { ascending: true })
      .limit(100000);
    setDownloadingId(null);

    if (error || !data || data.length === 0) {
      alert("Tidak ada data sensor untuk device ini, atau gagal mengambil data.");
      return;
    }

    const csv = toCsv(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${device.device_code}-backup-sebelum-hapus-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function loadDevices() {
    const { data } = await supabase.from("devices_public").select("*").order("device_code");
    setDevices((data ?? []) as DevicePublic[]);
  }

  useEffect(() => {
    loadDevices();
  }, []);

  async function handleCreate() {
    if (!form.device_code || !form.name) {
      setCreateFeedback("Kode device dan nama wajib diisi.");
      return;
    }
    setCreating(true);
    setCreateFeedback("");
    const { error } = await callProtectedFunction(
      "create-device",
      {
        device_code: form.device_code,
        name: form.name,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
      },
      token,
    );
    setCreating(false);
    if (error) {
      setCreateFeedback(`Gagal: ${error}`);
      return;
    }
    setCreateFeedback("Device baru berhasil ditambahkan ✓");
    setForm({ device_code: "", name: "", latitude: "", longitude: "" });
    loadDevices();
  }

  async function handleDelete(deviceId: string) {
    setDeletingId(deviceId);
    const { error } = await callProtectedFunction("delete-device", { device_id: deviceId }, token);
    setDeletingId(null);
    setConfirmDeleteId(null);
    if (!error) loadDevices();
  }

  return (
    <div className="glass-card px-6 py-6">
      <p className="font-display text-lg font-bold text-ink">Daftar Device</p>
      <p className="mt-1 font-body text-xs text-ink/50">
        Tambah device baru saat deploy stasiun baru, atau hapus device yang sudah tidak dipakai.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-3 border-b border-white/50 pb-5 md:grid-cols-2">
        <input
          type="text"
          placeholder="Kode device (mis. WQ-05)"
          value={form.device_code}
          onChange={(e) => setForm((f) => ({ ...f, device_code: e.target.value }))}
          className="border border-line px-3 py-2 font-body text-sm text-ink"
        />
        <input
          type="text"
          placeholder="Nama lokasi"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="border border-line px-3 py-2 font-body text-sm text-ink"
        />
        <input
          type="number"
          step="0.000001"
          placeholder="Latitude (opsional)"
          value={form.latitude}
          onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
          className="border border-line px-3 py-2 font-body text-sm text-ink"
        />
        <input
          type="number"
          step="0.000001"
          placeholder="Longitude (opsional)"
          value={form.longitude}
          onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
          className="border border-line px-3 py-2 font-body text-sm text-ink"
        />
        <div className="flex items-center gap-3 md:col-span-2">
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 bg-teal px-4 py-2 font-body text-xs text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Plus size={14} /> {creating ? "Menambahkan..." : "Tambah Device Baru"}
          </button>
          {createFeedback && (
            <span className="font-body text-xs text-ink/50">{createFeedback}</span>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        {devices.map((d) => (
          <div
            key={d.id}
            className="flex items-center justify-between rounded-xl bg-ink/5 px-4 py-3"
          >
            <div>
              <p className="font-body text-sm font-medium text-ink">
                {d.device_code} — {d.name}
              </p>
              <p className="font-body text-xs text-ink/40">
                {d.latitude ?? "—"}, {d.longitude ?? "—"}
              </p>
            </div>

            {confirmDeleteId === d.id ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-body text-xs text-alert">Yakin hapus? Data ikut hilang.</span>
                <button
                  onClick={() => handleDownloadBeforeDelete(d)}
                  disabled={downloadingId === d.id}
                  className="glass-pill px-3 py-1.5 font-body text-xs text-teal hover:opacity-80 disabled:opacity-50"
                >
                  {downloadingId === d.id ? "Menyiapkan..." : "Download Backup Dulu"}
                </button>
                <button
                  onClick={() => handleDelete(d.id)}
                  disabled={deletingId === d.id}
                  className="bg-alert px-3 py-1.5 font-body text-xs text-white hover:opacity-90"
                >
                  {deletingId === d.id ? "Menghapus..." : "Ya, Hapus"}
                </button>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="glass-pill px-3 py-1.5 font-body text-xs text-ink/60"
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDeleteId(d.id)}
                className="flex items-center gap-1.5 font-body text-xs text-alert hover:opacity-70"
              >
                <Trash2 size={14} /> Hapus
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
