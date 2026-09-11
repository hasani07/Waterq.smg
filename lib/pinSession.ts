"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

const STORAGE_KEY = "waterq_pin_token";

type StoredToken = { token: string; expiresAt: number };

function readStoredToken(): StoredToken | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredToken;
    if (parsed.expiresAt > Date.now()) return parsed;
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  } catch {
    return null;
  }
}

// Token disimpan di sessionStorage (bukan localStorage): otomatis hilang begitu tab ditutup,
// dan tetap ada kalau cuma reload halaman -- cocok buat sesi kerja 15 menit di Panel Setting.
export function usePinSession() {
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = readStoredToken();
    if (stored) setTokenState(stored.token);
  }, []);

  const submitPin = useCallback(async (pin: string) => {
    setLoading(true);
    setError(null);
    const { data, error: fnError } = await supabase.functions.invoke("verify-pin", {
      body: { pin },
    });
    setLoading(false);

    if (fnError || !data?.valid) {
      setError("PIN salah, coba lagi.");
      return false;
    }

    const expiresAt = Date.now() + (data.expires_in ?? 900) * 1000;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ token: data.token, expiresAt }));
    setTokenState(data.token);
    return true;
  }, []);

  const clearSession = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setTokenState(null);
  }, []);

  return { token, submitPin, clearSession, loading, error };
}

// Helper panggil Edge Function yang butuh PIN. Kalau dapat 401 (token expired),
// otomatis bersihkan sesi biar PinGate nampilin form PIN lagi.
export async function callProtectedFunction<T = unknown>(
  name: string,
  body: Record<string, unknown>,
  token: string,
): Promise<{ data: T | null; error: string | null; expired?: boolean }> {
  const { data, error } = await supabase.functions.invoke(name, {
    body,
    headers: { "x-pin-token": token },
  });

  if (error) {
    // supabase-js melempar error generik kalau status bukan 2xx; kita anggap 401 = token expired
    const message = error.message ?? "Terjadi kesalahan";
    const expired = message.includes("401") || message.toLowerCase().includes("unauthorized");
    if (expired) sessionStorage.removeItem(STORAGE_KEY);
    return { data: null, error: message, expired };
  }

  return { data: data as T, error: null };
}
