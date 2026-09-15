"use client";

import { useEffect, useRef, useState } from "react";
import { supabase, DevicePublic } from "@/lib/supabase";
import { callProtectedFunction } from "@/lib/pinSession";

type OtaHistoryRow = {
  id: number;
  version: string | null;
  status: string;
  uploaded_at: string;
};

export default function OtaPanel({ token }: { token: string }) {
  const [devices, setDevices] = useState<DevicePublic[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [version, setVersion] = useState("");
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [history, setHistory] = useState<OtaHistoryRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const { data } = await supabase
        .from("ota_history")
        .select("id, version, status, uploaded_at")
        .eq("device_id", selectedId)
        .order("uploaded_at", { ascending: false })
        .limit(20);
      setHistory((data ?? []) as OtaHistoryRow[]);
    })();
  }, [selectedId, feedback]);

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !version) {
      setFeedback("Pilih file .bin dan isi versi dulu.");
      return;
    }

    setUploading(true);
    setFeedback("Menyiapkan upload...");

    // 1. Minta signed upload URL dari Edge Function (PIN protected)
    const { data: prep, error: prepError } = await callProtectedFunction<{
      signedUrl: string;
      token: string;
      path: string;
    }>("prepare-ota-upload", { device_id: selectedId, filename: file.name, version }, token);

    if (prepError || !prep) {
      setUploading(false);
      setFeedback(`Gagal: ${prepError}`);
      return;
    }

    // 2. Upload file LANGSUNG ke Storage pakai signed URL (bypass RLS, gak lewat Edge Function)
    setFeedback("Mengunggah file...");
    const { error: uploadError } = await supabase.storage
      .from("firmware")
      .uploadToSignedUrl(prep.path, prep.token, file);

    setUploading(false);

    if (uploadError) {
      setFeedback(`Gagal upload: ${uploadError.message}`);
      return;
    }

    setFeedback("Berhasil ✓ Menunggu device mengambil firmware di siklus berikutnya.");
    setVersion("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (devices.length === 0) {
    return (
      <div className="glass-card px-6 py-6">
        <p className="font-display text-lg font-bold text-ink">Upload OTA</p>
        <p className="mt-2 font-body text-sm text-ink/50">Belum ada device terdaftar.</p>
      </div>
    );
  }

  return (
    <div className="glass-card px-6 py-6">
      <p className="font-display text-lg font-bold text-ink">Upload OTA</p>
      <p className="mt-1 font-body text-xs text-ink/50">
        File firmware (.bin) diunggah ke Supabase Storage, device mengambilnya di siklus bangun
        berikutnya.
      </p>

      <div className="mt-5 flex flex-col gap-3">
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
        <input
          type="text"
          placeholder="Versi firmware (mis. 1.2.0)"
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          className="rounded-lg border border-line px-3 py-2 font-body text-sm"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".bin"
          className="rounded-lg border border-line px-3 py-2 font-body text-sm"
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="rounded-full border border-teal px-4 py-1.5 font-body text-xs text-teal transition-colors hover:bg-teal hover:text-white disabled:opacity-50"
        >
          {uploading ? "Mengunggah..." : "Upload"}
        </button>
        {feedback && <span className="font-body text-xs text-ink/50">{feedback}</span>}
      </div>

      {history.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <p className="font-body text-xs text-ink/50">Riwayat 20 terakhir:</p>
          <div className="mt-2 max-h-[150px] overflow-y-auto pr-1">
            <div className="flex flex-col gap-1.5">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between font-body text-xs">
                  <span className="text-ink/70">v{h.version}</span>
                  <span
                    className={
                      h.status === "success"
                        ? "text-teal"
                        : h.status === "pending"
                          ? "text-sediment"
                          : "text-alert"
                    }
                  >
                    {h.status}
                  </span>
                  <span className="text-ink/40">
                    {new Date(h.uploaded_at).toLocaleString("id-ID")}
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
