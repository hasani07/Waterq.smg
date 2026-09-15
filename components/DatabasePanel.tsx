"use client";

import { useEffect, useState } from "react";
import { supabase, DevicePublic } from "@/lib/supabase";
import { callProtectedFunction } from "@/lib/pinSession";

type UsageInfo = { used_bytes: number; quota_bytes: number; used_percent: number };
type BackupRow = {
  id: number;
  triggered_at: string;
  db_usage_percent: number | null;
  status: string;
  file_url: string | null;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => JSON.stringify(row[h] ?? "")).join(","));
  }
  return lines.join("\n");
}

export default function DatabasePanel({ token }: { token: string }) {
  const [devices, setDevices] = useState<DevicePublic[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadFeedback, setDownloadFeedback] = useState("");

  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [backups, setBackups] = useState<BackupRow[]>([]);
  const [backingUp, setBackingUp] = useState(false);
  const [backupFeedback, setBackupFeedback] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("devices_public").select("*").order("device_code");
      setDevices((data ?? []) as DevicePublic[]);
      if (data && data.length > 0) setSelectedId(data[0].id);
    })();
    loadUsage();
    loadBackups();
  }, []);

  async function loadUsage() {
    const { data } = await supabase.rpc("get_database_usage");
    if (data) setUsage(data as UsageInfo);
  }

  async function loadBackups() {
    const { data } = await supabase
      .from("backup_log")
      .select("*")
      .order("triggered_at", { ascending: false })
      .limit(10);
    setBackups((data ?? []) as BackupRow[]);
  }

  async function handleDownload() {
    if (!selectedId) return;
    setDownloading(true);
    setDownloadFeedback("");

    let query = supabase
      .from("sensor_readings")
      .select("*")
      .eq("device_id", selectedId)
      .order("recorded_at", { ascending: true })
      .limit(50000);

    if (from) query = query.gte("recorded_at", new Date(from).toISOString());
    if (to) query = query.lte("recorded_at", new Date(to).toISOString());

    const { data, error } = await query;
    setDownloading(false);

    if (error || !data || data.length === 0) {
      setDownloadFeedback(error ? `Gagal: ${error.message}` : "Tidak ada data pada rentang ini.");
      return;
    }

    const csv = toCsv(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const deviceCode = devices.find((d) => d.id === selectedId)?.device_code ?? "device";
    link.href = url;
    link.download = `${deviceCode}-sensor-data-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setDownloadFeedback(`Terunduh ✓ (${data.length} baris)`);
  }

  async function handleBackupNow() {
    setBackingUp(true);
    setBackupFeedback("");
    const { error } = await callProtectedFunction<{ backed_up: boolean; message?: string }>(
      "check-and-backup",
      { force: true },
      token,
    );
    setBackingUp(false);
    setBackupFeedback(error ? `Gagal: ${error}` : "Backup berhasil dijalankan ✓");
    loadBackups();
    loadUsage();
  }

  async function handleDownloadBackup(fileName: string | null) {
    if (!fileName) return;
    const { data, error } = await callProtectedFunction<{ url: string }>(
      "get-backup-download-url",
      { file_name: fileName },
      token,
    );
    if (error || !data) {
      setBackupFeedback(`Gagal ambil link download: ${error}`);
      return;
    }
    // Signed URL cuma berlaku 60 detik, jadi langsung dipakai begitu didapat
    const link = document.createElement("a");
    link.href = data.url;
    link.download = fileName;
    link.click();
  }

  const usedPercent = usage?.used_percent ?? 0;
  const barColor = usedPercent >= 50 ? "bg-alert" : usedPercent >= 30 ? "bg-sediment" : "bg-teal";

  return (
    <div className="glass-card px-6 py-6">
      <p className="font-display text-lg font-bold text-ink">Panel Database</p>

      <div className="mt-5">
        <div className="flex items-center justify-between">
          <span className="font-body text-sm text-ink/70">Kapasitas Terpakai</span>
          <span className="font-display text-sm text-sediment tabular-nums">
            {usedPercent}%{" "}
            {usage && (
              <span className="font-body text-xs text-ink/40">
                ({formatBytes(usage.used_bytes)} / {formatBytes(usage.quota_bytes)})
              </span>
            )}
          </span>
        </div>
        <div className="mt-2 h-2 w-full bg-line">
          <div className={`h-2 ${barColor}`} style={{ width: `${Math.min(usedPercent, 100)}%` }} />
        </div>
        <p className="mt-1 font-body text-xs text-ink/40">
          Auto-backup otomatis jalan kalau kapasitas mencapai 50%.
        </p>
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <div className="flex items-center justify-between">
          <p className="font-body text-sm font-medium text-ink">Backup Database</p>
          <button
            onClick={handleBackupNow}
            disabled={backingUp}
            className="rounded-full border border-teal px-4 py-1.5 font-body text-xs text-teal transition-colors hover:bg-teal hover:text-white disabled:opacity-50"
          >
            {backingUp ? "Memproses..." : "Backup Sekarang"}
          </button>
        </div>
        {backupFeedback && <p className="mt-2 font-body text-xs text-ink/50">{backupFeedback}</p>}

        {backups.length > 0 && (
          <div className="mt-3 max-h-[100px] overflow-y-auto pr-1">
            <div className="flex flex-col gap-1.5">
              {backups.map((b) => (
                <div key={b.id} className="flex items-center justify-between font-body text-xs">
                  <span className="text-ink/70">{new Date(b.triggered_at).toLocaleString("id-ID")}</span>
                  <span className="text-ink/40">{b.db_usage_percent ?? "—"}%</span>
                  <span
                    className={
                      b.status === "success"
                        ? "text-teal"
                        : b.status === "in_progress"
                          ? "text-sediment"
                          : "text-alert"
                    }
                  >
                    {b.status}
                  </span>
                  {b.file_url ? (
                    <button
                      onClick={() => handleDownloadBackup(b.file_url)}
                      className="text-teal underline hover:opacity-70"
                    >
                      Download
                    </button>
                  ) : (
                    <span className="text-ink/20">—</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <p className="font-body text-sm font-medium text-ink">Download Data Sensor</p>
        <div className="mt-3 flex flex-col gap-3">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rounded-lg border border-line bg-white px-3 py-2 font-body text-sm text-ink"
          >
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.device_code} — {d.name}
              </option>
            ))}
          </select>
          <div className="flex gap-3">
            <label className="flex-1 font-body text-xs text-ink/60">
              Dari
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-lg mt-1 w-full border border-line px-3 py-2 font-body text-sm"
              />
            </label>
            <label className="flex-1 font-body text-xs text-ink/60">
              Sampai
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-lg mt-1 w-full border border-line px-3 py-2 font-body text-sm"
              />
            </label>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleDownload}
            disabled={downloading || devices.length === 0}
            className="rounded-full bg-teal px-4 py-2 font-body text-xs text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {downloading ? "Menyiapkan..." : "Download CSV"}
          </button>
          {downloadFeedback && <span className="font-body text-xs text-ink/50">{downloadFeedback}</span>}
        </div>
      </div>
    </div>
  );
}
