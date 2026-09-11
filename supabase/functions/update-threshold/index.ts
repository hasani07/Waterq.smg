// Edge Function: update-threshold
// CONTOH POLA untuk semua function yang butuh PIN (ganti wifi, upload OTA,
// kalibrasi, ubah interval, download database, dll) — tinggal copy pola ini,
// ganti bagian "logika utama"-nya sesuai kebutuhan masing-masing.
//
// Alur wajib di SEMUA function panel non-dashboard:
//   1. Cek header x-pin-token (didapat dari hasil sukses panggil verify-pin sebelumnya)
//   2. Kalau tidak valid/expired -> 401, suruh input PIN lagi di frontend
//   3. Kalau valid -> baru jalankan logika utamanya pakai service_role key
//
// Body contoh:
// {
//   "device_id": "uuid-device-atau-null-untuk-global",
//   "sensor_type": "ph",
//   "min_value": 6.5,
//   "max_value": 8.5
// }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";
import { requirePinSession } from "../_shared/pin-session.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PIN_SESSION_SECRET = Deno.env.get("PIN_SESSION_SECRET")!;

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // --- 1 & 2. Wajib ada token PIN yang valid ---
  const pinOk = await requirePinSession(req, PIN_SESSION_SECRET);
  if (!pinOk) {
    return jsonResponse({ error: "PIN tidak valid atau sesi habis, silakan input PIN lagi" }, 401);
  }

  // --- 3. Logika utama (khusus function ini: update threshold) ---
  let body: {
    device_id?: string | null;
    sensor_type?: string;
    min_value?: number | null;
    max_value?: number | null;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Body harus JSON" }, 400);
  }

  if (!body.sensor_type) {
    return jsonResponse({ error: "Field 'sensor_type' wajib diisi" }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { error } = await supabase
    .from("threshold_settings")
    .upsert(
      {
        device_id: body.device_id ?? null,
        sensor_type: body.sensor_type,
        min_value: body.min_value ?? null,
        max_value: body.max_value ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "device_id,sensor_type" },
    );

  if (error) {
    console.error("Update threshold error:", error.message);
    return jsonResponse({ error: "Gagal update threshold" }, 500);
  }

  return jsonResponse({ success: true });
});
