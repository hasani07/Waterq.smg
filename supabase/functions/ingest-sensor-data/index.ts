// Edge Function: ingest-sensor-data
// Dipanggil oleh ESP32 (via SIM7600G) tiap siklus kirim data.
// 1 request ini dipakai untuk 2 hal sekaligus (piggyback, lihat spek 4.8.d):
//   a) menyimpan data sensor
//   b) mengembalikan config terbaru (send_interval_minutes) ke device
//
// Header wajib: x-api-key: <DEVICE_INGEST_SECRET>
// Body JSON contoh:
// {
//   "device_code": "WQ-01",
//   "ph": 7.2,
//   "do_mg_l": 6.1,
//   "turbidity_ntu": 12.4,
//   "ec_us_cm": 320,
//   "tds_ppm": 210,
//   "rainfall_mm": 0,
//   "water_level_raw_distance_cm": 85.3,
//   "battery_voltage": 12.6,
//   "battery_percent": 92,
//   "recorded_at": "2026-09-11T10:00:00Z"
// }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// Secret bersama untuk 4 device (MVP). Kalau mau lebih aman, ganti jadi per-device
// (tambah kolom ingest_api_key_hash di tabel devices, cek sesuai device_code yang dikirim).
const DEVICE_INGEST_SECRET = Deno.env.get("DEVICE_INGEST_SECRET")!;

// Cooldown notifikasi threshold, biar tidak spam (lihat spek 4.4 & 4.8.d)
const NOTIFICATION_COOLDOWN_MINUTES = 20;

interface SensorPayload {
  device_code: string;
  ph?: number;
  do_mg_l?: number;
  turbidity_ntu?: number;
  ec_us_cm?: number;
  tds_ppm?: number;
  rainfall_mm?: number;
  water_level_raw_distance_cm?: number;
  battery_voltage?: number;
  battery_percent?: number;
  recorded_at?: string;
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // --- 1. Cek API key device ---
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey || apiKey !== DEVICE_INGEST_SECRET) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  // --- 2. Parse body ---
  let payload: SensorPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Body harus JSON" }, 400);
  }

  if (!payload.device_code) {
    return jsonResponse({ error: "Field 'device_code' wajib diisi" }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // --- 3. Cari device berdasarkan device_code ---
  const { data: device, error: deviceError } = await supabase
    .from("devices")
    .select("id, send_interval_minutes")
    .eq("device_code", payload.device_code)
    .single();

  if (deviceError || !device) {
    return jsonResponse({ error: "Device tidak dikenali" }, 404);
  }

  const recordedAt = payload.recorded_at ?? new Date().toISOString();

  // --- 4. Insert data sensor (upsert biar aman kalau device retry kirim data yang sama) ---
  const { error: insertError } = await supabase
    .from("sensor_readings")
    .upsert(
      {
        device_id: device.id,
        ph: payload.ph,
        do_mg_l: payload.do_mg_l,
        turbidity_ntu: payload.turbidity_ntu,
        ec_us_cm: payload.ec_us_cm,
        tds_ppm: payload.tds_ppm,
        rainfall_mm: payload.rainfall_mm,
        water_level_raw_distance_cm: payload.water_level_raw_distance_cm,
        battery_voltage: payload.battery_voltage,
        battery_percent: payload.battery_percent,
        recorded_at: recordedAt,
      },
      { onConflict: "device_id,recorded_at", ignoreDuplicates: true },
    );

  if (insertError) {
    console.error("Insert sensor_readings error:", insertError.message);
    return jsonResponse({ error: "Gagal menyimpan data sensor" }, 500);
  }

  // --- 5. Update status online/uptime device (heartbeat) ---
  await supabase
    .from("device_status_log")
    .upsert(
      { device_id: device.id, is_online: true, last_seen_at: new Date().toISOString() },
      { onConflict: "device_id" },
    );

  // --- 6. Cek threshold & kirim notifikasi kalau perlu (dengan cooldown anti-spam) ---
  await checkThresholdsAndNotify(supabase, device.id, payload);

  // --- 7. Balikin config terbaru ke ESP32 (piggyback, lihat spek 4.8.d) ---
  return jsonResponse({
    success: true,
    send_interval_minutes: device.send_interval_minutes,
  });
});

async function checkThresholdsAndNotify(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  deviceId: string,
  payload: SensorPayload,
) {
  const sensorValues: Record<string, number | undefined> = {
    ph: payload.ph,
    do: payload.do_mg_l,
    turbidity: payload.turbidity_ntu,
    ec: payload.ec_us_cm,
    tds: payload.tds_ppm,
    rainfall: payload.rainfall_mm,
    battery: payload.battery_percent,
  };

  // ambil preferensi notifikasi (global, id=1) sekali saja
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("notify_threshold")
    .eq("id", 1)
    .single();

  if (!prefs?.notify_threshold) return; // user matiin notif threshold, skip semua

  for (const [sensorType, value] of Object.entries(sensorValues)) {
    if (value === undefined || value === null) continue;

    // threshold per-device diutamakan, kalau tidak ada baru pakai global (device_id null)
    const { data: thresholds } = await supabase
      .from("threshold_settings")
      .select("min_value, max_value, device_id")
      .eq("sensor_type", sensorType)
      .or(`device_id.eq.${deviceId},device_id.is.null`)
      .order("device_id", { ascending: true, nullsFirst: false }); // device-specific duluan

    const threshold = thresholds?.[0];
    if (!threshold) continue;

    const isBreach =
      (threshold.min_value !== null && value < threshold.min_value) ||
      (threshold.max_value !== null && value > threshold.max_value);

    if (!isBreach) continue;

    // cek cooldown: sudah pernah kirim notif sensor ini dalam N menit terakhir?
    const cooldownSince = new Date(
      Date.now() - NOTIFICATION_COOLDOWN_MINUTES * 60 * 1000,
    ).toISOString();

    const { data: recentNotif } = await supabase
      .from("notifications")
      .select("id")
      .eq("device_id", deviceId)
      .eq("type", "threshold")
      .ilike("message", `%${sensorType}%`)
      .gte("last_sent_at", cooldownSince)
      .limit(1);

    if (recentNotif && recentNotif.length > 0) continue; // masih dalam cooldown, skip

    await supabase.from("notifications").insert({
      device_id: deviceId,
      type: "threshold",
      message: `Sensor ${sensorType} di luar batas normal (nilai: ${value})`,
    });
  }
}
