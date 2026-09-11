-- =====================================================================
-- WaterQ Semarang — Supabase SQL Schema
-- Referensi: waterq-semarang-dashboard-spec.md (bagian 6, 4.4, 4.6, 4.7, 4.8, 5, 7)
-- Cara pakai: copy-paste seluruh file ini ke Supabase SQL Editor, lalu Run.
-- Aman dijalankan berulang kali (pakai IF NOT EXISTS / DO block cek dulu).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSIONS
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- buat gen_random_uuid() & crypt() hash PIN


-- ---------------------------------------------------------------------
-- 1. ENUM TYPES (biar konsisten, gak typo-typo bebas di banyak tabel)
-- ---------------------------------------------------------------------
do $$ begin
  create type sensor_type_enum as enum (
    'ph', 'do', 'turbidity', 'ec', 'tds', 'rainfall', 'water_level', 'battery'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_type_enum as enum (
    'threshold', 'pulsa', 'wifi', 'ota', 'backup', 'offline'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type ota_status_enum as enum ('pending', 'success', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type wifi_status_enum as enum ('success', 'failed', 'rollback');
exception when duplicate_object then null; end $$;

do $$ begin
  create type backup_status_enum as enum ('in_progress', 'success', 'failed');
exception when duplicate_object then null; end $$;


-- ---------------------------------------------------------------------
-- 2. DEVICES — master data device (spek bagian 6)
-- ---------------------------------------------------------------------
create table if not exists devices (
  id                      uuid primary key default gen_random_uuid(),
  device_code             text unique not null,             -- mis. 'WQ-01'
  name                    text not null,                      -- nama lokasi
  sim_number              text,                                -- nomor SIM
  sim_provider            text,                                -- Telkomsel/XL/dst
  pulsa_last_topup_date   date,                                -- buat hitung reminder tgl 25
  latitude                numeric(9,6),
  longitude               numeric(9,6),
  firmware_version        text,
  send_interval_minutes   integer not null default 5
                          check (send_interval_minutes between 1 and 60),  -- batas aman, lihat 4.8.d
  created_at              timestamptz not null default now()
);

comment on table devices is 'Master data 4 device WaterQ. sim_number dianggap semi-sensitif -> dibatasi lewat RLS/view.';

-- View khusus untuk konsumsi publik (live dashboard), TANPA nomor SIM
-- supaya nomor SIM gak ikut ke-expose lewat anon key di browser.
create or replace view devices_public as
select
  id, device_code, name, latitude, longitude,
  firmware_version, send_interval_minutes, created_at
from devices;


-- ---------------------------------------------------------------------
-- 3. SENSOR_READINGS — data time-series, tabel paling besar (spek bagian 6)
-- ---------------------------------------------------------------------
create table if not exists sensor_readings (
  id                            bigserial primary key,
  device_id                     uuid not null references devices(id) on delete cascade,
  ph                            numeric(4,2),
  do_mg_l                       numeric(5,2),
  turbidity_ntu                 numeric(6,2),
  ec_us_cm                      numeric(8,2),
  tds_ppm                       numeric(8,2),
  rainfall_mm                   numeric(6,2),
  water_level_raw_distance_cm   numeric(6,2),   -- raw dari sonar A01NYUB, lihat 4.7
  battery_voltage               numeric(4,2),
  battery_percent               numeric(5,2),
  recorded_at                   timestamptz not null,
  created_at                    timestamptz not null default now(),

  -- cegah data dobel kalau ESP32 retry kirim data yang sebenarnya sudah masuk (lihat 4.8.d)
  constraint uq_device_recorded_at unique (device_id, recorded_at)
);

-- index buat query grafik historis (per device + rentang waktu) jadi cepat
create index if not exists idx_sensor_readings_device_time
  on sensor_readings (device_id, recorded_at desc);

comment on table sensor_readings is
  'Data mentah dari sensor. water_level_from_normal_cm TIDAK disimpan di sini -- dihitung on-the-fly lewat view di bawah, pakai kalibrasi yang berlaku saat recorded_at (lihat water_level_calibration).';


-- ---------------------------------------------------------------------
-- 4. DEVICE_STATUS_LOG — heartbeat online/offline (spek bagian 6, fitur 4.1)
-- ---------------------------------------------------------------------
create table if not exists device_status_log (
  id               bigserial primary key,
  device_id        uuid not null references devices(id) on delete cascade,
  is_online        boolean not null default true,
  last_seen_at     timestamptz not null default now(),
  uptime_seconds   bigint default 0,
  updated_at       timestamptz not null default now()
);

-- 1 device cukup 1 baris status yang terus di-update (bukan history panjang)
create unique index if not exists uq_device_status_per_device
  on device_status_log (device_id);


-- ---------------------------------------------------------------------
-- 5. OTA_HISTORY — riwayat OTA (spek 4.8.b)
-- ---------------------------------------------------------------------
create table if not exists ota_history (
  id                 bigserial primary key,
  device_id          uuid not null references devices(id) on delete cascade,
  firmware_file_url  text not null,     -- path di Supabase Storage
  version            text,
  status             ota_status_enum not null default 'pending',
  notes              text,
  uploaded_at        timestamptz not null default now()
);

create index if not exists idx_ota_history_device on ota_history (device_id, uploaded_at desc);


-- ---------------------------------------------------------------------
-- 6. WIFI_HISTORY — riwayat ganti wifi, MAKS 3 TERAKHIR per device (spek 4.8.c)
-- ---------------------------------------------------------------------
create table if not exists wifi_history (
  id             bigserial primary key,
  device_id      uuid not null references devices(id) on delete cascade,
  ssid           text not null,
  status         wifi_status_enum not null,
  attempted_at   timestamptz not null default now()
);

create index if not exists idx_wifi_history_device on wifi_history (device_id, attempted_at desc);

-- Trigger: otomatis hapus riwayat wifi lama, sisakan cuma 3 terakhir per device
create or replace function trim_wifi_history() returns trigger as $$
begin
  delete from wifi_history
  where id in (
    select id from wifi_history
    where device_id = new.device_id
    order by attempted_at desc
    offset 3
  );
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_trim_wifi_history on wifi_history;
create trigger trg_trim_wifi_history
  after insert on wifi_history
  for each row execute function trim_wifi_history();


-- ---------------------------------------------------------------------
-- 7. SERIAL_LOGS — serial monitor jarak jauh, MAKS 500 BARIS per device (spek 4.6)
-- (tabel tambahan, belum ada di dokumen spek eksplisit, ditambahkan agar fitur 4.6 jalan)
-- ---------------------------------------------------------------------
create table if not exists serial_logs (
  id           bigserial primary key,
  device_id    uuid not null references devices(id) on delete cascade,
  line_text    text not null,
  logged_at    timestamptz not null default now()
);

create index if not exists idx_serial_logs_device on serial_logs (device_id, logged_at desc);

-- Trigger: otomatis rotasi, sisakan cuma 500 baris terakhir per device
create or replace function trim_serial_logs() returns trigger as $$
begin
  delete from serial_logs
  where id in (
    select id from serial_logs
    where device_id = new.device_id
    order by logged_at desc
    offset 500
  );
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_trim_serial_logs on serial_logs;
create trigger trg_trim_serial_logs
  after insert on serial_logs
  for each row execute function trim_serial_logs();


-- ---------------------------------------------------------------------
-- 8. CALIBRATION_LOG — kalibrasi sensor umum: pH/DO/Turbidity/EC/TDS (spek 4.7)
-- ---------------------------------------------------------------------
create table if not exists calibration_log (
  id                  bigserial primary key,
  device_id           uuid not null references devices(id) on delete cascade,
  sensor_type         sensor_type_enum not null,
  calibration_params  jsonb not null,   -- fleksibel, isi beda-beda tiap jenis sensor
  calibrated_at       timestamptz not null default now(),
  calibrated_by       text              -- opsional, siapa yang kalibrasi
);

create index if not exists idx_calibration_log_device on calibration_log (device_id, sensor_type, calibrated_at desc);


-- ---------------------------------------------------------------------
-- 9. WATER_LEVEL_CALIBRATION — khusus A01NYUB, RIWAYAT (spek 4.7, bagian 6)
-- ---------------------------------------------------------------------
create table if not exists water_level_calibration (
  id                            bigserial primary key,
  device_id                     uuid not null references devices(id) on delete cascade,
  riverbed_to_normal_water_cm   numeric(6,2),   -- info/catatan, tidak dipakai di rumus
  normal_water_to_sensor_cm     numeric(6,2) not null,  -- baseline perhitungan
  effective_from                timestamptz not null default now(),
  updated_by                    text,
  notes                         text
);

create index if not exists idx_water_level_calib_device on water_level_calibration (device_id, effective_from desc);

-- View: hitung water_level_from_normal_cm on-the-fly, otomatis pakai kalibrasi
-- yang berlaku SAAT data direkam (bukan kalibrasi terbaru), sesuai catatan di spek bagian 6.
create or replace view sensor_readings_with_water_level as
select
  sr.*,
  wlc.normal_water_to_sensor_cm,
  (wlc.normal_water_to_sensor_cm - sr.water_level_raw_distance_cm) as water_level_from_normal_cm
from sensor_readings sr
left join lateral (
  select normal_water_to_sensor_cm
  from water_level_calibration wlc
  where wlc.device_id = sr.device_id
    and wlc.effective_from <= sr.recorded_at
  order by wlc.effective_from desc
  limit 1
) wlc on true;


-- ---------------------------------------------------------------------
-- 10. THRESHOLD_SETTINGS — batas aman per sensor (spek 4.4, default di bagian 7)
-- ---------------------------------------------------------------------
create table if not exists threshold_settings (
  id            bigserial primary key,
  device_id     uuid references devices(id) on delete cascade,  -- NULL = default global
  sensor_type   sensor_type_enum not null,
  min_value     numeric,
  max_value     numeric,
  updated_at    timestamptz not null default now(),

  -- 1 baris per kombinasi device+sensor (device_id NULL dianggap 1 slot 'global' per sensor_type)
  constraint uq_threshold_device_sensor unique (device_id, sensor_type)
);

-- Seed default threshold GLOBAL (device_id NULL) berdasarkan usulan di bagian 7 dokumen spek.
-- Angka ini cuma starting point, tetap bisa diubah lewat slider di Panel Threshold.
insert into threshold_settings (device_id, sensor_type, min_value, max_value)
values
  (null, 'ph',          6.5,  8.5),
  (null, 'do',          4,    null),
  (null, 'turbidity',   5,    50),
  (null, 'ec',          100,  1000),
  (null, 'tds',         50,   500),
  (null, 'rainfall',    null, 25),      -- alert kalau di atas 25 mm/jam (contoh titik tengah 20-30)
  (null, 'battery',     20,   null)     -- alert kalau battery_percent < 20
on conflict (device_id, sensor_type) do nothing;
-- catatan: threshold water_level sengaja tidak di-seed karena baseline-nya baru bisa
-- ditentukan setelah water_level_calibration diisi per device (lihat bagian 7 dokumen).


-- ---------------------------------------------------------------------
-- 11. NOTIFICATIONS + NOTIFICATION_PREFERENCES (spek 4.4)
-- ---------------------------------------------------------------------
create table if not exists notifications (
  id             bigserial primary key,
  device_id      uuid references devices(id) on delete cascade,
  type           notification_type_enum not null,
  message        text not null,
  is_read        boolean not null default false,
  created_at     timestamptz not null default now(),
  last_sent_at   timestamptz not null default now()  -- dipakai buat logic cooldown anti-spam
);

create index if not exists idx_notifications_device on notifications (device_id, created_at desc);

create table if not exists notification_preferences (
  id                bigserial primary key,
  notify_threshold  boolean not null default true,
  notify_pulsa      boolean not null default true,
  notify_wifi       boolean not null default true,
  notify_ota        boolean not null default true,
  notify_backup     boolean not null default true,
  notify_offline    boolean not null default true,
  updated_at        timestamptz not null default now()
);

-- seed 1 baris preferensi global default (versi awal belum multi-user)
insert into notification_preferences (id)
select 1
where not exists (select 1 from notification_preferences where id = 1);


-- ---------------------------------------------------------------------
-- 12. BACKUP_LOG (spek 4.3)
-- ---------------------------------------------------------------------
create table if not exists backup_log (
  id                bigserial primary key,
  triggered_at      timestamptz not null default now(),
  db_usage_percent  numeric(5,2),
  file_url          text,
  status            backup_status_enum not null default 'in_progress'
);


-- ---------------------------------------------------------------------
-- 13. AI_RECOMMENDATIONS (spek 4.5)
-- ---------------------------------------------------------------------
create table if not exists ai_recommendations (
  id               bigserial primary key,
  device_id        uuid not null references devices(id) on delete cascade,
  requested_range  text,           -- mis. 'today' / '7d' / '2026-09-01..2026-09-10'
  summary          text,
  risk_level       text,           -- 'normal' / 'waspada' / 'bahaya'
  raw_response     jsonb,
  created_at       timestamptz not null default now()
);

create index if not exists idx_ai_recommendations_device on ai_recommendations (device_id, created_at desc);


-- ---------------------------------------------------------------------
-- 14. APP_SETTINGS — simpan HASH PIN, bukan plaintext (spek bagian 5)
-- (tabel tambahan, belum ada di dokumen spek eksplisit, ditambahkan untuk keamanan PIN)
-- ---------------------------------------------------------------------
create table if not exists app_settings (
  id          int primary key default 1 check (id = 1),  -- dipaksa cuma 1 baris
  pin_hash    text not null,
  updated_at  timestamptz not null default now()
);

-- Cara set/ganti PIN dengan aman (jalankan manual sekali di SQL Editor, GANTI '070101'):
-- insert into app_settings (id, pin_hash) values (1, crypt('070101', gen_salt('bf')))
--   on conflict (id) do update set pin_hash = excluded.pin_hash, updated_at = now();
--
-- Cara verifikasi PIN dari Edge Function (bukan dari client langsung):
-- select (pin_hash = crypt('input_dari_user', pin_hash)) as is_valid from app_settings where id = 1;

-- Fungsi RPC buat dipanggil Edge Function via service_role (anon TIDAK bisa panggil ini).
create or replace function verify_pin(input_pin text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select pin_hash = crypt(input_pin, pin_hash) from app_settings where id = 1;
$$;

revoke all on function verify_pin(text) from public, anon, authenticated;
grant execute on function verify_pin(text) to service_role;


-- ---------------------------------------------------------------------
-- 15. ROW LEVEL SECURITY (RLS)
-- Prinsip: dashboard live (baca data) boleh publik (pakai anon key),
-- tapi SEMUA operasi tulis/insert/update untuk panel non-dashboard
-- (setting, OTA, wifi, kalibrasi, threshold, dsb) HARUS lewat Supabase
-- Edge Function yang pakai service_role key + sudah verifikasi PIN dulu
-- -- BUKAN langsung ditulis dari browser pakai anon key.
-- ---------------------------------------------------------------------

alter table devices enable row level security;
alter table sensor_readings enable row level security;
alter table device_status_log enable row level security;
alter table ota_history enable row level security;
alter table wifi_history enable row level security;
alter table serial_logs enable row level security;
alter table calibration_log enable row level security;
alter table water_level_calibration enable row level security;
alter table threshold_settings enable row level security;
alter table notifications enable row level security;
alter table notification_preferences enable row level security;
alter table backup_log enable row level security;
alter table ai_recommendations enable row level security;
alter table app_settings enable row level security;

-- SELECT publik untuk data yang memang perlu tampil di dashboard live/grafik/riwayat.
-- (devices TIDAK dikasih policy select publik di sini -- pakai view devices_public saja)
drop policy if exists "public read sensor_readings" on sensor_readings;
create policy "public read sensor_readings" on sensor_readings for select using (true);

drop policy if exists "public read device_status_log" on device_status_log;
create policy "public read device_status_log" on device_status_log for select using (true);

drop policy if exists "public read ota_history" on ota_history;
create policy "public read ota_history" on ota_history for select using (true);

drop policy if exists "public read wifi_history" on wifi_history;
create policy "public read wifi_history" on wifi_history for select using (true);

drop policy if exists "public read serial_logs" on serial_logs;
create policy "public read serial_logs" on serial_logs for select using (true);

drop policy if exists "public read threshold_settings" on threshold_settings;
create policy "public read threshold_settings" on threshold_settings for select using (true);

drop policy if exists "public read notifications" on notifications;
create policy "public read notifications" on notifications for select using (true);

drop policy if exists "public read notification_preferences" on notification_preferences;
create policy "public read notification_preferences" on notification_preferences for select using (true);

drop policy if exists "public read backup_log" on backup_log;
create policy "public read backup_log" on backup_log for select using (true);

drop policy if exists "public read ai_recommendations" on ai_recommendations;
create policy "public read ai_recommendations" on ai_recommendations for select using (true);

-- Tabel-tabel di bawah ini SENGAJA TIDAK dikasih policy SELECT untuk anon:
--   devices (pakai devices_public), calibration_log, water_level_calibration, app_settings
-- Artinya default RLS "deny all" berlaku -> hanya bisa diakses lewat service_role key
-- (dipakai di Edge Function / server-side), tidak bisa diakses langsung dari browser.
-- Kalau nanti mau ditampilkan sebagian datanya di web, buatkan view khusus seperti devices_public.

-- Grant SELECT ke view publik
grant select on devices_public to anon, authenticated;
grant select on sensor_readings_with_water_level to anon, authenticated;

-- Tidak ada policy INSERT/UPDATE/DELETE untuk anon di tabel manapun --
-- semua operasi tulis dilakukan lewat Edge Function dengan service_role key,
-- yang otomatis bypass RLS dan sudah verifikasi PIN di kode Edge Function-nya.


-- =====================================================================
-- SELESAI. Ringkasan tabel yang dibuat:
-- devices, sensor_readings, device_status_log, ota_history, wifi_history,
-- serial_logs, calibration_log, water_level_calibration, threshold_settings,
-- notifications, notification_preferences, backup_log, ai_recommendations,
-- app_settings
-- + view: devices_public, sensor_readings_with_water_level
-- =====================================================================
