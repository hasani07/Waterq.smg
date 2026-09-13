import { supabase, DevicePublic } from "@/lib/supabase";
import LiveDashboard from "@/components/LiveDashboard";
import { Radio, Wifi, WifiOff, RefreshCw } from "lucide-react";

export const revalidate = 0;

async function getDevices(): Promise<DevicePublic[]> {
  const { data } = await supabase.from("devices_public").select("*").order("device_code");
  return (data ?? []) as DevicePublic[];
}

async function getStats() {
  const { data: statuses } = await supabase
    .from("device_status_log")
    .select("is_online, last_seen_at");

  const online = (statuses ?? []).filter((s) => s.is_online).length;
  const offline = (statuses ?? []).length - online;
  const lastSync = (statuses ?? [])
    .map((s) => s.last_seen_at)
    .sort()
    .reverse()[0];

  return { online, offline, lastSync };
}

const QUICK_LINKS = [
  { label: "Threshold Sensor", desc: "Atur batas aman tiap parameter", href: "/settings" },
  { label: "Preferensi Notifikasi", desc: "Email, push, dan pengingat", href: "/settings" },
  { label: "Interval Pengiriman", desc: "1-60 menit (default 5 menit)", href: "/settings" },
  { label: "Ganti WiFi", desc: "Hubungkan ke jaringan baru", href: "/settings" },
  { label: "Upload OTA", desc: "Upload firmware (.bin)", href: "/firmware" },
  { label: "Kalibrasi Sensor", desc: "Kalibrasi pH, water level, dll", href: "/settings" },
  { label: "Serial Monitor", desc: "Lihat log device real-time", href: "/system" },
  { label: "Panel Database", desc: "Backup & download CSV", href: "/system" },
];

export default async function Home({
  searchParams,
}: {
  searchParams: { device?: string };
}) {
  const devices = await getDevices();
  const stats = await getStats();

  return (
    <main>
      {/* Hero */}
      <section className="glass-card relative overflow-hidden px-8 py-10">
        <svg
          className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-20"
          viewBox="0 0 400 300"
          preserveAspectRatio="xMaxYMid slice"
        >
          <path
            d="M0 220 Q 60 190 120 220 T 240 220 T 360 220 T 480 220"
            fill="none"
            stroke="rgb(var(--color-teal))"
            strokeWidth="3"
          />
          <path
            d="M0 250 Q 60 230 120 250 T 240 250 T 360 250 T 480 250"
            fill="none"
            stroke="rgb(var(--color-sediment))"
            strokeWidth="3"
          />
          <rect x="180" y="60" width="10" height="140" fill="rgb(var(--color-teal))" />
          <circle cx="185" cy="50" r="12" fill="rgb(var(--color-sediment))" />
        </svg>
        <p className="font-body text-sm text-teal">Data Hari Ini, Air Lebih Baik Esok</p>
        <h1 className="mt-2 max-w-lg font-display text-3xl font-bold leading-tight text-ink md:text-4xl">
          Pemantauan Kualitas Air Real-time
        </h1>
        <p className="mt-3 max-w-md font-body text-sm text-ink/60">
          Pantau kondisi sungai di seluruh DAS Semarang secara real-time. Data dari sensor IoT
          untuk lingkungan yang lebih sehat dan berkelanjutan.
        </p>
      </section>

      {/* Stat cards */}
      <section className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="glass-card-sm flex items-center gap-3 px-5 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal/10">
            <Radio size={18} className="text-teal" />
          </span>
          <div>
            <p className="font-body text-xs text-ink/50">Total Stasiun</p>
            <p className="font-display text-xl font-bold text-ink">{devices.length}</p>
          </div>
        </div>
        <div className="glass-card-sm flex items-center gap-3 px-5 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal/10">
            <Wifi size={18} className="text-teal" />
          </span>
          <div>
            <p className="font-body text-xs text-ink/50">Online</p>
            <p className="font-display text-xl font-bold text-ink">{stats.online}</p>
          </div>
        </div>
        <div className="glass-card-sm flex items-center gap-3 px-5 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-alert/10">
            <WifiOff size={18} className="text-alert" />
          </span>
          <div>
            <p className="font-body text-xs text-ink/50">Offline</p>
            <p className="font-display text-xl font-bold text-ink">{stats.offline}</p>
          </div>
        </div>
        <div className="glass-card-sm flex items-center gap-3 px-5 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal/10">
            <RefreshCw size={18} className="text-teal" />
          </span>
          <div>
            <p className="font-body text-xs text-ink/50">Sinkronisasi Terakhir</p>
            <p className="font-display text-sm font-bold text-ink">
              {stats.lastSync ? new Date(stats.lastSync).toLocaleString("id-ID") : "—"}
            </p>
          </div>
        </div>
      </section>

      {/* Dashboard interaktif: readout + peta + grafik */}
      <section className="mt-6">
        <LiveDashboard devices={devices} initialDeviceId={searchParams.device ?? null} />
      </section>

      {/* Quick links ke Panel Setting */}
      <section className="glass-card mt-6 px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-lg font-bold text-ink">Pengaturan & Operasional</p>
            <p className="font-body text-xs text-ink/50">
              Kelola perangkat, notifikasi, dan sistem monitoring
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {QUICK_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="glass-card-sm flex flex-col gap-1 px-4 py-4 transition-transform hover:-translate-y-0.5"
            >
              <p className="font-body text-sm font-medium text-ink">{link.label}</p>
              <p className="font-body text-xs text-ink/50">{link.desc}</p>
            </a>
          ))}
        </div>
      </section>

      <footer className="mt-6 px-2 py-6 text-center font-body text-xs text-ink/40">
        WaterQ Semarang — dibangun di atas Supabase &amp; Vercel
      </footer>
    </main>
  );
}
