// Edge Function: verify-pin
// Dipanggil dari web SEBELUM masuk ke panel non-dashboard (setting/OTA/wifi/kalibrasi/download).
// Body: { "pin": "070101" }
// Response sukses: { "valid": true, "token": "...", "expires_in": 900 }
// Response gagal:  { "valid": false }  (status 401)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";
import { createSessionToken } from "../_shared/pin-session.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PIN_SESSION_SECRET = Deno.env.get("PIN_SESSION_SECRET")!; // set manual, string acak panjang

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: { pin?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Body harus JSON" }, 400);
  }

  const pin = body.pin;
  if (!pin || typeof pin !== "string") {
    return jsonResponse({ error: "Field 'pin' wajib diisi" }, 400);
  }

  // Sengaja pakai service_role key + panggil RPC verify_pin (bukan query app_settings langsung),
  // karena app_settings memang tidak dikasih policy SELECT untuk anon di RLS (lihat schema.sql).
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data, error } = await supabase.rpc("verify_pin", { input_pin: pin });

  if (error) {
    console.error("verify_pin RPC error:", error.message);
    return jsonResponse({ error: "Terjadi kesalahan server" }, 500);
  }

  if (data !== true) {
    // Sengaja tidak dikasih tahu "PIN salah" secara spesifik vs error lain, biar tidak bantu brute-force
    return jsonResponse({ valid: false }, 401);
  }

  const token = await createSessionToken(PIN_SESSION_SECRET, 900); // berlaku 15 menit
  return jsonResponse({ valid: true, token, expires_in: 900 });
});
