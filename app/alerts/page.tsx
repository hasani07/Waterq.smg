"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Wifi, UploadCloud, Database, WifiOff, CreditCard, CheckCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

type NotificationRow = {
  id: number;
  device_id: string | null;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

const TYPE_META: Record<string, { icon: typeof AlertTriangle; label: string; color: string }> = {
  threshold: { icon: AlertTriangle, label: "Threshold", color: "text-alert" },
  pulsa: { icon: CreditCard, label: "Pulsa", color: "text-sediment" },
  wifi: { icon: Wifi, label: "WiFi", color: "text-teal" },
  ota: { icon: UploadCloud, label: "OTA", color: "text-teal" },
  backup: { icon: Database, label: "Backup", color: "text-teal" },
  offline: { icon: WifiOff, label: "Offline", color: "text-alert" },
};

export default function AlertsPage() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadNotifications() {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setNotifications((data ?? []) as NotificationRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  async function handleMarkOne(id: number) {
    // Update optimis di UI dulu biar kerasa instan, baru simpan ke database
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  }

  async function handleMarkAll() {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <main>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Alerts</h1>
          <p className="mt-2 font-body text-sm text-ink/60">
            Riwayat notifikasi sistem — klik notifikasi buat tandai dibaca, atau tandai semua sekaligus.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            className="glass-pill flex items-center gap-2 px-4 py-2 font-body text-xs text-teal hover:opacity-80"
          >
            <CheckCheck size={14} />
            Tandai Semua Dibaca ({unreadCount})
          </button>
        )}
      </div>

      <div className="glass-card px-6 py-4">
        {loading ? (
          <p className="py-10 text-center font-body text-sm text-ink/40">Memuat...</p>
        ) : notifications.length === 0 ? (
          <p className="py-10 text-center font-body text-sm text-ink/40">
            Belum ada notifikasi.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-white/40">
            {notifications.map((n) => {
              const meta = TYPE_META[n.type] ?? {
                icon: AlertTriangle,
                label: n.type,
                color: "text-ink/60",
              };
              const Icon = meta.icon;
              return (
                <button
                  key={n.id}
                  onClick={() => !n.is_read && handleMarkOne(n.id)}
                  className={`flex w-full items-start gap-3 py-3 text-left transition-colors ${
                    n.is_read ? "" : "hover:bg-teal/5"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/5 ${meta.color}`}
                  >
                    <Icon size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-body text-xs font-medium uppercase tracking-wide text-ink/40">
                        {meta.label}
                      </span>
                      {!n.is_read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-alert" title="Belum dibaca" />
                      )}
                    </div>
                    <p
                      className={`mt-0.5 font-body text-sm ${
                        n.is_read ? "text-ink/60" : "font-medium text-ink"
                      }`}
                    >
                      {n.message}
                    </p>
                    <p className="mt-0.5 font-body text-xs text-ink/40">
                      {new Date(n.created_at).toLocaleString("id-ID")}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
