"use client";

import { useEffect, useRef, useState } from "react";
import { supabase, DevicePublic } from "@/lib/supabase";
import { callProtectedFunction } from "@/lib/pinSession";

type LogLine = { id: number; line_text: string; logged_at: string };

export default function SerialMonitorPanel({ token }: { token: string }) {
  const [devices, setDevices] = useState<DevicePublic[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [toggling, setToggling] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("devices_public").select("*").order("device_code");
      setDevices((data ?? []) as DevicePublic[]);
      if (data && data.length > 0) setSelectedId(data[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!selectedId) return;

    const device = devices.find((d) => d.id === selectedId);
    setRunning(device?.serial_monitor_enabled ?? false);

    (async () => {
      const { data: initialLogs } = await supabase
        .from("serial_logs")
        .select("*")
        .eq("device_id", selectedId)
        .order("logged_at", { ascending: true })
        .limit(500);
      setLogs((initialLogs ?? []) as LogLine[]);
    })();

    const channel = supabase
      .channel(`serial-logs-${selectedId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "serial_logs", filter: `device_id=eq.${selectedId}` },
        (payload) => {
          setLogs((prev) => [...prev.slice(-499), payload.new as LogLine]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedId, devices]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [logs]);

  async function handleToggle() {
    setToggling(true);
    const nextValue = !running;
    const { error } = await callProtectedFunction(
      "toggle-serial-monitor",
      { device_id: selectedId, enabled: nextValue },
      token,
    );
    setToggling(false);
    if (!error) setRunning(nextValue);
  }

  if (devices.length === 0) {
    return (
      <div className="glass-card px-6 py-6">
        <p className="font-display text-lg font-bold text-ink">Serial Monitor</p>
        <p className="mt-2 font-body text-sm text-ink/50">Belum ada device terdaftar.</p>
      </div>
    );
  }

  return (
    <div className="glass-card px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="font-display text-lg font-bold text-ink">Serial Monitor</p>
        <div className="flex items-center gap-3">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rounded-lg border border-line bg-white px-3 py-2 font-body text-sm text-ink"
          >
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.device_code}
              </option>
            ))}
          </select>
          <button
            onClick={handleToggle}
            disabled={toggling}
            className={`px-4 py-2 font-body text-xs text-white transition-opacity hover:opacity-90 disabled:opacity-50 ${
              running ? "bg-alert" : "bg-teal"
            }`}
          >
            {running ? "Stop" : "Run"}
          </button>
        </div>
      </div>
      <p className="mt-1 font-body text-xs text-ink/50">
        Maks 500 baris terakhir, otomatis rotasi. Device hanya mengirim log kalau statusnya Run.
      </p>

      <div
        ref={scrollRef}
        className="mt-4 h-72 overflow-y-auto bg-ink px-4 py-3 font-mono text-xs text-bg"
      >
        {logs.length === 0 ? (
          <p className="text-bg/40">Belum ada log.</p>
        ) : (
          logs.map((l) => (
            <div key={l.id}>
              <span className="text-bg/40">{new Date(l.logged_at).toLocaleTimeString("id-ID")}</span>{" "}
              {l.line_text}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
