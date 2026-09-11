// Header CORS dipakai semua Edge Function biar bisa dipanggil dari web dashboard (Vercel).
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // ganti ke domain Vercel kamu spesifik kalau mau lebih ketat
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-pin-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return null;
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
