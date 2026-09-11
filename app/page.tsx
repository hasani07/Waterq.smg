import { supabase, DevicePublic, SensorReading } from "@/lib/supabase";

export const revalidate = 0; // selalu ambil data terbaru, jangan di-cache statis

async function getData() {
  const { data: devices } = await supabase
    .from("devices_public")
    .select("*")
    .order("device_code");

  const { data: readings } = await supabase
    .from("sensor_readings")
    .select("*")
    .order("recorded_at", { ascending: false })
    .limit(500);

  // ambil bacaan terbaru per device dari 500 baris terakhir
  const latestByDevice = new Map<string, SensorReading>();
  (readings ?? []).forEach((r) => {
    if (!latestByDevice.has(r.device_id)) latestByDevice.set(r.device_id, r);
  });

  return { devices: (devices ?? []) as DevicePublic[], latestByDevice };
}

function readout(label: string, value: number | null, unit: string) {
  return (
    <div className="flex items-baseline justify-between border-b border-line py-2 last:border-b-0">
      <span className="font-body text-sm text-ink/60">{label}</span>
      <span className="font-display text-lg text-sediment tabular-nums">
        {value !== null && value !== undefined ? `${value}` : "—"}
        <span className="ml-1 font-body text-xs text-ink/40">{unit}</span>
      </span>
    </div>
  );
}

export default async function Home() {
  const { devices, latestByDevice } = await getData();

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

      {/* Grid device */}
      <section className="px-6 py-10 md:px-12">
        <div className="mx-auto max-w-5xl">
          {devices.length === 0 ? (
            <div className="border border-dashed border-line px-6 py-12 text-center">
              <p className="font-display text-lg text-ink">Belum ada stasiun terdaftar</p>
              <p className="mt-2 font-body text-sm text-ink/60">
                Tambahkan device lewat tabel <code className="text-teal">devices</code> di
                Supabase, atau lewat Panel Setting begitu sudah dibuat.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {devices.map((device) => {
                const reading = latestByDevice.get(device.id);
                return (
                  <div key={device.id} className="border border-line bg-white/60 px-6 py-5">
                    <div className="flex items-start justify-between border-b border-line pb-3">
                      <div>
                        <p className="font-display text-lg font-bold text-ink">{device.name}</p>
                        <p className="font-body text-xs text-ink/50">{device.device_code}</p>
                      </div>
                      <span className="font-body text-xs text-ink/50">
                        {reading
                          ? new Date(reading.recorded_at).toLocaleString("id-ID")
                          : "Belum ada data"}
                      </span>
                    </div>
                    <div className="mt-2">
                      {readout("pH", reading?.ph ?? null, "")}
                      {readout("DO", reading?.do_mg_l ?? null, "mg/L")}
                      {readout("Turbidity", reading?.turbidity_ntu ?? null, "NTU")}
                      {readout("EC", reading?.ec_us_cm ?? null, "µS/cm")}
                      {readout("TDS", reading?.tds_ppm ?? null, "ppm")}
                      {readout("Rainfall", reading?.rainfall_mm ?? null, "mm")}
                      {readout("Baterai", reading?.battery_percent ?? null, "%")}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-line px-6 py-6 text-center font-body text-xs text-ink/40 md:px-12">
        WaterQ Semarang — dibangun di atas Supabase &amp; Vercel
      </footer>
    </main>
  );
}
