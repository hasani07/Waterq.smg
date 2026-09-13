import { supabase } from "@/lib/supabase";
import { AlertTriangle, Wifi, UploadCloud, Database, WifiOff, CreditCard } from "lucide-react";

export const revalidate = 0;

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

async function getNotifications(): Promise<NotificationRow[]> {
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []) as NotificationRow[];
}

export default async function AlertsPage() {
  const notifications = await getNotifications();

  return (
    <main>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-ink">Alerts</h1>
        <p className="mt-2 font-body text-sm text-ink/60">
          Riwayat notifikasi sistem — threshold, WiFi, OTA, backup, pulsa, dan status offline.
        </p>
      </div>

      <div className="glass-card px-6 py-4">
        {notifications.length === 0 ? (
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
                <div key={n.id} className="flex items-start gap-3 py-3">
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/5 ${meta.color}`}>
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
                    <p className="mt-0.5 font-body text-sm text-ink/80">{n.message}</p>
                    <p className="mt-0.5 font-body text-xs text-ink/40">
                      {new Date(n.created_at).toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
