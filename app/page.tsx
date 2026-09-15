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
            <a
              href="/kiosk"
              target="_blank"
              rel="noopener noreferrer"
              className="glass-pill mt-4 inline-flex items-center gap-2 px-4 py-2 font-body text-xs text-teal hover:opacity-80"
            >
              📺 Buka Monitoring Room (buat TV/layar besar)
            </a>
          </div>

          {/* Logo 3D AtmosX -- versi vector, terinspirasi referensi (bola belah metalik+kaca,
              simbol atom/tetesan di dalam, cincin orbit) */}
          <svg
            className="h-32 w-32 shrink-0 md:h-40 md:w-40"
            viewBox="0 0 200 200"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="atmosx-metal" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E7ECEC" />
                <stop offset="45%" stopColor="#AFC0C2" />
                <stop offset="100%" stopColor="#5C7275" />
              </linearGradient>
              <radialGradient id="atmosx-glass" cx="40%" cy="35%" r="75%">
                <stop offset="0%" stopColor="#8FEDE0" />
                <stop offset="50%" stopColor="rgb(var(--color-teal-light))" />
                <stop offset="100%" stopColor="rgb(var(--color-teal-dark))" />
              </radialGradient>
              <linearGradient id="atmosx-inner" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#B9FFF1" />
                <stop offset="100%" stopColor="#1FA88E" />
              </linearGradient>
              <radialGradient id="atmosx-highlight" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
              </radialGradient>
              <filter id="atmosx-shadow" x="-60%" y="-60%" width="220%" height="220%">
                <feDropShadow dx="0" dy="10" stdDeviation="9" floodColor="rgb(var(--color-teal))" floodOpacity="0.35" />
              </filter>
              <clipPath id="atmosx-clip-left">
                <path d="M100 30 A70 70 0 0 0 100 170 Z" />
              </clipPath>
              <clipPath id="atmosx-clip-right">
                <path d="M100 30 A70 70 0 0 1 100 170 Z" />
              </clipPath>
            </defs>

            {/* Cincin orbit belakang */}
            <ellipse
              cx="100" cy="100" rx="92" ry="28"
              fill="none" stroke="#8FEDE0" strokeWidth="3.5" opacity="0.55"
              transform="rotate(-16 100 100)"
            />

            <g filter="url(#atmosx-shadow)">
              {/* Belahan kiri: metalik */}
              <g clipPath="url(#atmosx-clip-left)">
                <circle cx="100" cy="100" r="70" fill="url(#atmosx-metal)" />
              </g>
              {/* Belahan kanan: kaca teal */}
              <g clipPath="url(#atmosx-clip-right)">
                <circle cx="100" cy="100" r="70" fill="url(#atmosx-glass)" />
              </g>
              {/* Garis pemisah belahan */}
              <path d="M100 30 A70 70 0 0 0 100 170" fill="none" stroke="#FFFFFF" strokeOpacity="0.4" strokeWidth="1.5" />

              {/* Simbol dalam: tetesan + lingkaran melingkar, kesan atom/air */}
              <g transform="translate(100 102)">
                <path
                  d="M0 -34 C 14 -14 20 2 20 14 C20 30 8 40 -6 34 C -18 29 -22 14 -14 0 C -10 -8 -5 -22 0 -34 Z"
                  fill="url(#atmosx-inner)"
                  opacity="0.95"
                />
                <ellipse cx="0" cy="8" rx="26" ry="15" fill="none" stroke="#EAFFFA" strokeWidth="4" opacity="0.85" />
              </g>

              <circle cx="78" cy="72" r="26" fill="url(#atmosx-highlight)" />
            </g>
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
