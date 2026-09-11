# Edge Functions — WaterQ Semarang

## Struktur folder
```
supabase/functions/
├── _shared/
│   ├── cors.ts           # header CORS + helper response JSON
│   └── pin-session.ts    # bikin & verifikasi token sesi PIN
├── verify-pin/           # cek PIN, kasih token sesi 15 menit
├── ingest-sensor-data/   # nerima data dari ESP32 + balikin config interval
└── update-threshold/     # CONTOH pola function yang dilindungi PIN
```

## Cara deploy (pakai Supabase CLI)
```bash
# 1. Login & link project (sekali saja)
supabase login
supabase link --project-ref <PROJECT_REF_KAMU>

# 2. Set environment variables/secrets (sekali saja, atau update kapan saja)
supabase secrets set PIN_SESSION_SECRET="<string-acak-panjang-minimal-32-karakter>"
supabase secrets set DEVICE_INGEST_SECRET="<string-acak-lain-buat-4-device>"
# SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY biasanya udah otomatis tersedia di runtime Edge Function,
# tapi kalau perlu diset manual, ambil dari Project Settings > API di dashboard Supabase.

# 3. Deploy semua function
supabase functions deploy verify-pin
supabase functions deploy ingest-sensor-data
supabase functions deploy update-threshold
```

## Cara pakai dari sisi ESP32 (ingest-sensor-data)
```
POST https://<PROJECT_REF>.supabase.co/functions/v1/ingest-sensor-data
Header: x-api-key: <DEVICE_INGEST_SECRET>
Body: JSON data sensor (lihat contoh di index.ts)

Response: { "success": true, "send_interval_minutes": 10 }
-> ESP32 pakai nilai ini buat set esp_sleep_enable_timer_wakeup() siklus berikutnya
```

## Cara pakai dari sisi web dashboard (panel yang butuh PIN)
```
1. User buka Panel Setting/Threshold/dst -> muncul modal input PIN
2. Frontend POST ke /functions/v1/verify-pin  { "pin": "070101" }
   -> kalau valid, dapat { token, expires_in: 900 }
   -> simpan token ini di React state (JANGAN di localStorage, ikut hilang kalau tab ditutup — sesuai
      instruksi platform: artifact/app di sini tidak boleh pakai localStorage/sessionStorage)
3. Setiap panggil function yang butuh PIN (update-threshold, dst), sertakan header:
   x-pin-token: <token tadi>
4. Kalau dapat response 401 -> berarti token expired (>15 menit) -> minta user input PIN lagi
```

## Function lain yang masih perlu dibuat (pola sama persis seperti `update-threshold`)
Tinggal copy folder `update-threshold`, ganti nama & logika utamanya:

| Function | Fitur di spek | Logika utama |
|---|---|---|
| `update-wifi-config` | 4.8.c | Insert ke `wifi_history`, kirim perintah ganti WiFi ke device (lewat mekanisme device polling config, mirip pola interval) |
| `update-interval` | 4.8.d | Update `devices.send_interval_minutes` (validasi ulang 1–60 di server, jangan cuma percaya frontend) |
| `upload-ota` | 4.8.b | Upload file ke Supabase Storage, insert row `ota_history` status `pending` |
| `update-calibration` | 4.7 | Insert ke `calibration_log` atau `water_level_calibration` tergantung sensor |
| `update-notification-preferences` | 4.4 | Update tabel `notification_preferences` |
| `request-download` | 4.3 | Generate signed URL Supabase Storage / query & return CSV data sesuai device+rentang waktu dipilih |
| `get-ai-recommendation` | 4.5 | Ambil data sensor rentang waktu dipilih, kirim ke Gemini API, simpan+return hasil ke `ai_recommendations` |

## Function tambahan yang butuh CRON (dijalankan Supabase Scheduled Trigger, bukan dipanggil dari web)
| Function | Kapan jalan | Fungsi |
|---|---|---|
| `check-pulsa-reminder` | Harian (cron `0 8 * * *`) | Cek `devices.pulsa_last_topup_date`, kalau sudah tanggal 25 → insert notifikasi + trigger WA/email |
| `check-offline-devices` | Tiap beberapa menit | Cek `device_status_log.last_seen_at`, kalau sudah melewati 2x `send_interval_minutes` tanpa data masuk → set `is_online = false` + notifikasi offline |
| `check-db-backup` | Harian | Cek ukuran database, kalau ≥50% → trigger backup otomatis, insert `backup_log` |

Semua function ini bisa dibuat belakangan pakai pola yang sama seperti `update-threshold` — cukup ganti bagian "logika utama"-nya saja, struktur cek PIN & response-nya identik.
