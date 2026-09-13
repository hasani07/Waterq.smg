"use client";

import { useEffect, useState } from "react";
import { supabase, DevicePublic } from "@/lib/supabase";
import AIRecommendationPanel from "@/components/AIRecommendationPanel";

type AiRow = {
  id: number;
  device_id: string;
  requested_range: string;
  summary: string;
  risk_level: string;
  created_at: string;
};

const BADGE_COLOR: Record<string, string> = {
  normal: "bg-teal text-white",
  waspada: "bg-sediment text-white",
  bahaya: "bg-alert text-white",
};

export default function AIInsightPage() {
  const [devices, setDevices] = useState<DevicePublic[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<AiRow[]>([]);

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
        .from("ai_recommendations")
        .select("*")
        .eq("device_id", selectedId)
        .order("created_at", { ascending: false })
        .limit(20);
      setHistory((data ?? []) as AiRow[]);
    })();
  }, [selectedId]);

  return (
    <main>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">AI Insight</h1>
          <p className="mt-2 font-body text-sm text-ink/60">
            Analisis kondisi air berbasis AI, plus riwayat rekomendasi sebelumnya.
          </p>
        </div>
        <select
          value={selectedId ?? ""}
          onChange={(e) => setSelectedId(e.target.value)}
          className="glass-pill bg-ink/5 px-4 py-2 font-body text-sm text-ink outline-none"
        >
          {devices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.device_code} — {d.name}
            </option>
          ))}
        </select>
      </div>

      <AIRecommendationPanel deviceId={selectedId} />

      <div className="glass-card mt-6 px-6 py-6">
        <p className="font-display text-lg font-bold text-ink">Riwayat Rekomendasi</p>
        {history.length === 0 ? (
          <p className="mt-4 py-6 text-center font-body text-sm text-ink/40">
            Belum ada riwayat untuk device ini.
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {history.map((h) => (
              <div key={h.id} className="glass-card-sm px-4 py-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full px-3 py-1 font-body text-xs uppercase ${
                      BADGE_COLOR[h.risk_level] ?? "bg-ink/10 text-ink/60"
                    }`}
                  >
                    {h.risk_level}
                  </span>
                  <span className="font-body text-xs text-ink/40">
                    {new Date(h.created_at).toLocaleString("id-ID")}
                  </span>
                </div>
                <p className="mt-2 font-body text-sm text-ink/80">{h.summary}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
