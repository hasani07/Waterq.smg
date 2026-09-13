"use client";

import { useEffect, useState } from "react";
import { supabase, DevicePublic } from "@/lib/supabase";
import { callProtectedFunction } from "@/lib/pinSession";

type WifiHistoryRow = { id: number; ssid: string; status: string; attempted_at: string };

export default function WifiPanel({ token }: { token: string }) {
  const [devices, setDevices] = useState<DevicePublic[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [history, setHistory] = useState<WifiHistoryRow[]>([]);

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
        .from("wifi_history")
        .select("*")
        .eq("device_id", selectedId)
        .order("attempted_at", { ascending: false })
        .limit(20);
      setHistory((data ?? []) as WifiHistoryRow[]);
    })();
  }, [selectedId, feedback]);

  async function handleSave() {
    if (!ssid || !password) {
      setFeedback("SSID dan password wajib diisi.");
      return;
    }
    setSaving(true);
    setFeedback("");
    const { error } = await callProtectedFunction(
      "update-wifi-config",
      { device_id: selectedId, ssid, password },
      token,
    );
    setSaving(false);
    setFeedback(
      error
        ? `Gagal: ${error}`
        : "Tersimpan ✓ Device akan mencoba WiFi ini di siklus bangun berikutnya.",
    );
    setSsid("");
    setPassword("");
  }

  if (devices.length === 0) {
    return (
      <div className="glass-card px-6 py-6">
        <p className="font-display text-lg font-bold text-ink">Ganti WiFi</p>
        <p className="mt-2 font-body text-sm text-ink/50">Belum ada device terdaftar.</p>
      </div>
    );
  }

  return (
    <div className="glass-card px-6 py-6">
      <p className="font-display text-lg font-bold text-ink">Ganti WiFi</p>
      <p className="mt-1 font-body text-xs text-ink/50">
        Perubahan tidak instan — device baru mencoba WiFi baru di siklus bangun berikutnya, dan
        otomatis rollback ke WiFi lama kalau gagal connect dalam 10 detik.
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
        <input
          type="text"
          placeholder="SSID WiFi baru"
          value={ssid}
          onChange={(e) => setSsid(e.target.value)}
          className="border border-line px-3 py-2 font-body text-sm"
        />
        <input
          type="password"
          placeholder="Password WiFi baru"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border border-line px-3 py-2 font-body text-sm"
        />
      </div>

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
          <p className="font-body text-xs text-ink/50">Riwayat 20 terakhir:</p>
          <div className="mt-2 max-h-[150px] overflow-y-auto pr-1">
            <div className="flex flex-col gap-1.5">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between font-body text-xs">
                  <span className="text-ink/70">{h.ssid}</span>
                  <span
                    className={
                      h.status === "success"
                        ? "text-teal"
                        : h.status === "rollback"
                          ? "text-sediment"
                          : "text-alert"
                    }
                  >
                    {h.status}
                  </span>
                  <span className="text-ink/40">
                    {new Date(h.attempted_at).toLocaleString("id-ID")}
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
