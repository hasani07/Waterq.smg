// Session token sederhana setelah PIN benar, supaya user tidak perlu input PIN
// ULANG di SETIAP klik dalam 1 sesi kerja di Panel Setting (mis. selama 15 menit).
// Token ini di-sign pakai HMAC-SHA256 dengan secret yang HANYA ada di server
// (env var PIN_SESSION_SECRET), jadi tidak bisa dipalsukan dari browser.

async function hmacSign(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sigBuffer)));
}

export async function createSessionToken(secret: string, ttlSeconds = 900): Promise<string> {
  // ttlSeconds default 900 = 15 menit
  const payload = JSON.stringify({ exp: Date.now() + ttlSeconds * 1000 });
  const payloadB64 = btoa(payload);
  const signature = await hmacSign(secret, payloadB64);
  return `${payloadB64}.${signature}`;
}

export async function verifySessionToken(token: string | null, secret: string): Promise<boolean> {
  if (!token) return false;
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return false;

  const expectedSignature = await hmacSign(secret, payloadB64);
  if (expectedSignature !== signature) return false; // token dipalsukan/rusak

  try {
    const payload = JSON.parse(atob(payloadB64));
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

// Dipakai di SEMUA Edge Function yang butuh PIN (update threshold, ganti wifi, OTA, kalibrasi, dll).
// Kembalikan Response 401 kalau token tidak valid/expired, kalau valid return null (lanjut proses).
export async function requirePinSession(req: Request, secret: string): Promise<boolean> {
  const token = req.headers.get("x-pin-token");
  return verifySessionToken(token, secret);
}
