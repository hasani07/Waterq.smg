import { supabase, DevicePublic } from "@/lib/supabase";
import LiveDashboard from "@/components/LiveDashboard";

export const revalidate = 0; // selalu ambil data terbaru, jangan di-cache statis

async function getDevices(): Promise<DevicePublic[]> {
  const { data } = await supabase.from("devices_public").select("*").order("device_code");
  return (data ?? []) as DevicePublic[];
}

export default async function Home() {
  const devices = await getDevices();

  return (
    <main className="min-h-screen bg-bg">
      {/* Hero */}
      <section className="border-b border-line px-6 py-14 md:px-12">
        <div className="mx-auto max-w-5xl">
          <p className="font-body text-sm text-teal">Daerah Aliran Sungai · Semarang</p>
          <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-ink md:text-5xl">
            WaterQ Semarang
          </h1>
          <p className="mt-4 max-w-xl font-body text-base text-ink/70">
            Pemantauan kualitas air dan ketinggian sungai secara real-time dari{" "}
            {devices.length} stasiun terpasang di sepanjang DAS Semarang.
          </p>
        </div>
      </section>

      {/* Dashboard interaktif: readout + peta + grafik */}
      <section className="px-6 py-10 md:px-12">
        <div className="mx-auto max-w-5xl">
          <LiveDashboard devices={devices} />
        </div>
      </section>

      <footer className="border-t border-line px-6 py-6 text-center font-body text-xs text-ink/40 md:px-12">
        WaterQ Semarang — dibangun di atas Supabase &amp; Vercel
      </footer>
    </main>
  );
}
