import { createClient } from "@supabase/supabase-js";

// Pakai ANON key (aman dipakai di browser/server component) -- RLS di database
// yang mengatur data apa saja yang boleh dibaca publik (lihat waterq-semarang-schema.sql).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type DevicePublic = {
  id: string;
  device_code: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  firmware_version: string | null;
  send_interval_minutes: number;
  created_at: string;
};

export type SensorReading = {
  id: number;
  device_id: string;
  ph: number | null;
  do_mg_l: number | null;
  turbidity_ntu: number | null;
  ec_us_cm: number | null;
  tds_ppm: number | null;
  rainfall_mm: number | null;
  water_level_raw_distance_cm: number | null;
  battery_voltage: number | null;
  battery_percent: number | null;
  recorded_at: string;
};

export type DeviceStatus = {
  device_id: string;
  is_online: boolean;
  last_seen_at: string;
  uptime_seconds: number | null;
};
