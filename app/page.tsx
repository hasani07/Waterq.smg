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
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-body text-sm text-teal">Data Hari Ini, Air Lebih Baik Esok</p>
            <h1 className="mt-2 max-w-lg font-display text-3xl font-bold leading-tight text-ink md:text-4xl">
              AtmosX
              <br />
              Sistem Realtime Monitoring Lingkungan
            </h1>
            <p className="mt-3 max-w-md font-body text-sm text-ink/60">
              Pantau kondisi sungai di seluruh DAS Semarang secara real-time. Data dari sensor IoT
              untuk lingkungan yang lebih sehat dan berkelanjutan.
            </p>
          </div>

          {/* Ikon 3D-style: globe dengan shading & highlight, cincin orbit sensor */}
          <svg
            className="h-32 w-32 shrink-0 md:h-40 md:w-40"
            viewBox="0 0 200 200"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <radialGradient id="atmosx-sphere" cx="35%" cy="30%" r="75%">
                <stop offset="0%" stopColor="#6FD1D8" />
                <stop offset="45%" stopColor="rgb(var(--color-teal-light))" />
                <stop offset="100%" stopColor="rgb(var(--color-teal-dark))" />
              </radialGradient>
              <radialGradient id="atmosx-highlight" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
              </radialGradient>
              <filter id="atmosx-shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="rgb(var(--color-teal))" floodOpacity="0.35" />
              </filter>
            </defs>

            {/* Cincin orbit miring, kesan "atmosfer" */}
            <ellipse
              cx="100"
              cy="100"
              rx="88"
              ry="30"
              fill="none"
              stroke="rgb(var(--color-sediment))"
              strokeWidth="3"
              opacity="0.55"
              transform="rotate(-18 100 100)"
            />
            <circle
              cx="178"
              cy="88"
              r="5"
              fill="rgb(var(--color-sediment))"
              transform="rotate(-18 100 100)"
            />

            {/* Bola utama dengan shading 3D */}
            <g filter="url(#atmosx-shadow)">
              <circle cx="100" cy="100" r="62" fill="url(#atmosx-sphere)" />
              <circle cx="82" cy="78" r="34" fill="url(#atmosx-highlight)" />
            </g>

            {/* Garis "gelombang sensor" melintasi bola, senada logo utama */}
            <path
              d="M45 108 Q 70 96 100 108 T 155 108"
              stroke="#F3F6F4"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              opacity="0.85"
            />
          </svg>
        </div>
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
