"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { callProtectedFunction } from "@/lib/pinSession";

type Timing = {
  notify_threshold: boolean;
  threshold_cooldown_minutes: number;
  notify_battery: boolean;
  battery_reminder_minutes: number;
  notify_flood_waspada: boolean;
  flood_waspada_reminder_minutes: number;
  notify_flood_bahaya: boolean;
  flood_bahaya_reminder_minutes: number;
};

const MAX_MINUTES = 300;

function formatMinutes(min: number) {
  if (min < 60) return `${min} menit`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} jam` : `${h} jam ${m} menit`;
}

export default function NotificationTimingPanel({ token }: { token: string }) {
  const [timing, setTiming] = useState<Timing>({
    notify_threshold: true,
    threshold_cooldown_minutes: 20,
    notify_battery: true,
    battery_reminder_minutes: 180,
    notify_flood_waspada: true,
    flood_waspada_reminder_minutes: 60,
    notify_flood_bahaya: true,
    flood_bahaya_reminder_minutes: 30,
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (data) setTiming((prev) => ({ ...prev, ...data }));
    })();
  }, []);

  async function handleSave() {
    setSaving(true);
    setFeedback("");
    const { error } = await callProtectedFunction("update-notification-timing", timing, token);
    setSaving(false);
    setFeedback(error ? `Gagal: ${error}` : "Tersimpan ✓");
  }

  const groups: {
    key: string;
    title: string;
    desc: string;
    enabledKey: keyof Timing;
    minutesKey: keyof Timing;
    color: string;
  }[] = [
    {
      key: "threshold",
      title: "Threshold Sensor Umum",
      desc: "pH, DO, Turbidity, EC, TDS, Rainfall — cuma masuk Alerts, gak ke Telegram/Email.",
      enabledKey: "notify_threshold",
      minutesKey: "threshold_cooldown_minutes",
      color: "text-ink/70",
    },
    {
      key: "battery",
      title: "Baterai Rendah",
      desc: "Alerts + Telegram.",
      enabledKey: "notify_battery",
      minutesKey: "battery_reminder_minutes",
      color: "text-teal",
    },
    {
      key: "flood_waspada",
      title: "Banjir — Waspada",
      desc: "Alerts + Telegram.",
      enabledKey: "notify_flood_waspada",
      minutesKey: "flood_waspada_reminder_minutes",
      color: "text-sediment",
    },
    {
      key: "flood_bahaya",
      title: "Banjir — Bahaya",
      desc: "Alerts + Telegram + Email.",
      enabledKey: "notify_flood_bahaya",
      minutesKey: "flood_bahaya_reminder_minutes",
      color: "text-alert",
    },
  ];

  return (
    <div className="glass-card px-6 py-6">
      <p className="font-display text-lg font-bold text-ink">Pengaturan Waktu & Toggle Notifikasi</p>
      <p className="mt-1 font-body text-xs text-ink/50">
        Atur seberapa sering tiap tipe notifikasi boleh diulang (reminder), atau matikan total.
      </p>

      <div className="mt-6 flex flex-col gap-6">
        {groups.map((g) => {
          const enabled = timing[g.enabledKey] as boolean;
          const minutes = timing[g.minutesKey] as number;
          return (
            <div key={g.key} className={`rounded-xl bg-ink/5 px-4 py-4 ${!enabled ? "opacity-50" : ""}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-body text-sm font-semibold ${g.color}`}>{g.title}</p>
                  <p className="font-body text-xs text-ink/50">{g.desc}</p>
                </div>
                <button
                  onClick={() =>
                    setTiming((prev) => ({ ...prev, [g.enabledKey]: !prev[g.enabledKey] }))
                  }
                  className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
                    enabled ? "bg-teal" : "bg-ink/20"
                  }`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      enabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {enabled && (
                <div className="mt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-body text-xs text-ink/60">Reminder tiap</span>
                    <span className="font-display text-sm font-bold text-ink tabular-nums">
                      {formatMinutes(minutes)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={MAX_MINUTES}
                    step={5}
                    value={minutes}
                    onChange={(e) =>
                      setTiming((prev) => ({ ...prev, [g.minutesKey]: Number(e.target.value) }))
                    }
                    className="mt-2 w-full accent-teal"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-3">
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
