import { supabase, DevicePublic } from "@/lib/supabase";
import LiveDashboard from "@/components/LiveDashboard";
import Logo from "@/components/Logo";
import Link from "next/link";

export const revalidate = 0; // selalu ambil data terbaru, jangan di-cache statis

async function getDevices(): Promise<DevicePublic[]> {
  const { data } = await supabase.from("devices_public").select("*").order("device_code");
  return (data ?? []) as DevicePublic[];
}

export default async function Home() {
  const devices = await getDevices();

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="px-6 py-10 md:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="glass-card flex flex-wrap items-center justify-between gap-6 px-6 py-6 md:px-8">
            <Logo size={44} />
            <Link
              href="/settings"
              className="glass-pill px-5 py-2.5 font-body text-xs font-medium text-ink/70 transition-colors hover:text-teal"
            >
              Panel Setting →
            </Link>
          </div>

          <div className="mt-6">
            <p className="font-body text-sm text-teal">Daerah Aliran Sungai · Semarang</p>
            <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-ink md:text-5xl">
              Pemantauan Kualitas Air Real-time
            </h1>
            <p className="mt-4 max-w-xl font-body text-base text-ink/70">
              Data langsung dari {devices.length} stasiun sensor yang terpasang di sepanjang DAS
              Semarang — pH, oksigen terlarut, kekeruhan, ketinggian air, dan curah hujan.
            </p>
          </div>
        </div>
      </section>

      {/* Dashboard interaktif: readout + peta + grafik */}
      <section className="px-6 pb-10 md:px-12">
        <div className="mx-auto max-w-5xl">
          <LiveDashboard devices={devices} />
        </div>
      </section>

      <footer className="px-6 pb-10 text-center font-body text-xs text-ink/40 md:px-12">
        WaterQ Semarang — dibangun di atas Supabase &amp; Vercel
      </footer>
    </main>
  );
}
