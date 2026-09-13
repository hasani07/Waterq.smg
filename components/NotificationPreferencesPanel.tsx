"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { callProtectedFunction } from "@/lib/pinSession";

const NOTIF_TYPES = [
  { key: "notify_threshold", label: "Threshold sensor terlewati" },
  { key: "notify_pulsa", label: "Reminder isi ulang pulsa" },
  { key: "notify_wifi", label: "Perubahan WiFi" },
  { key: "notify_ota", label: "Riwayat OTA" },
  { key: "notify_backup", label: "Backup database otomatis" },
  { key: "notify_offline", label: "Device offline" },
] as const;

export default function NotificationPreferencesPanel({ token }: { token: string }) {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (data) setPrefs(data);
    })();
  }, []);

  async function handleSave() {
    setSaving(true);
    setFeedback("");
    const { error } = await callProtectedFunction(
      "update-notification-preferences",
      prefs,
      token,
    );
    setSaving(false);
    setFeedback(error ? `Gagal: ${error}` : "Tersimpan ✓");
  }

  return (
    <div className="glass-card px-6 py-6">
      <p className="font-display text-lg font-bold text-ink">Preferensi Notifikasi</p>
      <p className="mt-1 font-body text-xs text-ink/50">
        Pilih tipe notifikasi mana saja yang mau ditampilkan.
      </p>

      <div className="mt-5 flex flex-col gap-3">
        {NOTIF_TYPES.map((t) => (
          <label key={t.key} className="flex items-center justify-between border-b border-line pb-3 last:border-b-0">
            <span className="font-body text-sm text-ink/80">{t.label}</span>
            <input
              type="checkbox"
              checked={prefs[t.key] ?? true}
              onChange={(e) => setPrefs((p) => ({ ...p, [t.key]: e.target.checked }))}
              className="h-4 w-4 accent-teal"
            />
          </label>
        ))}
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
