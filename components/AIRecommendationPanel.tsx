"use client";

import { useState } from "react";
import PinGate from "./PinGate";
import { callProtectedFunction } from "@/lib/pinSession";

type RangeKey = "today" | "yesterday" | "7d" | "custom";

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Hari ini" },
  { key: "yesterday", label: "1 Hari Lalu" },
  { key: "7d", label: "7 Hari Lalu" },
  { key: "custom", label: "Pilih Tanggal" },
];

type AIResult = {
  risk_level: "normal" | "waspada" | "bahaya";
  summary: string;
  recommendations: string[];
};

function RiskBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    normal: "bg-teal text-white",
    waspada: "bg-sediment text-white",
    bahaya: "bg-alert text-white",
  };
  return (
    <span className={`px-3 py-1 font-body text-xs uppercase tracking-wide ${styles[level] ?? "bg-ink/20"}`}>
      {level}
    </span>
  );
}

function AIRecommendationContent({ token, deviceId }: { token: string; deviceId: string | null }) {
  const [range, setRange] = useState<RangeKey>("today");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AIResult | null>(null);

  async function handleGetData() {
    if (!deviceId) return;
    setLoading(true);
    setError("");
    setResult(null);

    const { data, error: fnError } = await callProtectedFunction<AIResult>(
      "get-ai-recommendation",
      { device_id: deviceId, range, from: from || undefined, to: to || undefined },
      token,
    );

    setLoading(false);
    if (fnError || !data) {
      setError(fnError ?? "Gagal mendapatkan rekomendasi.");
      return;
    }
    setResult(data);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setRange(opt.key)}
            className={`rounded-full border px-3 py-1.5 font-body text-xs transition-colors ${
              range === opt.key
                ? "border-teal bg-teal text-white"
                : "border-line bg-white text-ink/70 hover:border-teal"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {range === "custom" && (
        <div className="mt-3 flex flex-wrap gap-3">
          <label className="font-body text-xs text-ink/60">
            Dari{" "}
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg ml-1 border border-line px-2 py-1 font-body text-xs"
            />
          </label>
          <label className="font-body text-xs text-ink/60">
            Sampai{" "}
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg ml-1 border border-line px-2 py-1 font-body text-xs"
            />
          </label>
        </div>
      )}

      <button
        onClick={handleGetData}
        disabled={loading || !deviceId}
        className="rounded-full mt-4 bg-teal px-5 py-2 font-body text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Menganalisis..." : "Get Data"}
      </button>

      {error && <p className="mt-3 font-body text-xs text-alert">{error}</p>}

      {result && (
        <div className="mt-6 border-t border-line pt-5">
          <div className="flex items-center gap-3">
            <RiskBadge level={result.risk_level} />
          </div>
          <p className="mt-3 font-body text-sm text-ink/80">{result.summary}</p>
          {result.recommendations?.length > 0 && (
            <ul className="mt-3 list-inside list-disc font-body text-sm text-ink/70">
              {result.recommendations.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function AIRecommendationPanel({ deviceId }: { deviceId: string | null }) {
  return (
    <div className="glass-card px-6 py-6">
      <p className="font-display text-lg font-bold text-ink">Rekomendasi AI</p>
      <p className="mt-1 font-body text-xs text-ink/50">
        Analisis kondisi air dari data sensor stasiun terpilih menggunakan AI. Butuh PIN karena
        memanggil layanan eksternal.
      </p>
      <div className="mt-5">
        <PinGate>{(token) => <AIRecommendationContent token={token} deviceId={deviceId} />}</PinGate>
      </div>
    </div>
  );
}
