# WaterQ Semarang

Dashboard pemantauan kualitas air sungai (pH, DO, Turbidity, EC, TDS, Rainfall, Water Level, Battery) untuk 4 stasiun di Semarang — ESP32 + SIM7600G, backend Supabase, frontend Next.js di Vercel.

## Struktur repo
```
├── app/                     # Frontend Next.js (App Router) -> auto-deploy ke Vercel
├── lib/                     # Helper Supabase client
├── supabase/
│   ├── schema.sql           # Jalankan sekali di Supabase SQL Editor
│   └── functions/           # Edge Functions -> deploy manual/terpisah pakai Supabase CLI
├── docs-spec.md             # Dokumen spesifikasi lengkap project
└── .env.local.example       # Contoh env var yang dibutuhkan
```

## Setup lengkap dari nol

### 1. Push ke GitHub
```bash
cd waterq-semarang        # folder hasil download/extract ini
git init
git add .
git commit -m "Initial commit: schema, edge functions, dan frontend dasar"
git branch -M main
git remote add origin https://github.com/<username>/<nama-repo>.git
git push -u origin main
```

### 2. Setup database (sekali saja)
- Buka Supabase Dashboard → **SQL Editor** → paste isi `supabase/schema.sql` → **Run**.

### 3. Deploy Edge Functions (lewat Supabase CLI, BUKAN lewat Vercel)
```bash
supabase login
supabase link --project-ref <PROJECT_REF>
supabase secrets set PIN_SESSION_SECRET="<string-acak-panjang>"
supabase secrets set DEVICE_INGEST_SECRET="<string-acak-lain>"
supabase functions deploy verify-pin
supabase functions deploy ingest-sensor-data
supabase functions deploy update-threshold
```
(Detail lengkap ada di `supabase/functions/README.md`)

### 4. Connect ke Vercel (biar frontend keliatan hasilnya)
1. Buka [vercel.com](https://vercel.com) → **Add New Project** → pilih repo GitHub yang barusan di-push.
2. Vercel otomatis mendeteksi ini project Next.js — biarkan default (Root Directory tetap `.`, Build Command `next build`).
3. Sebelum klik Deploy, buka bagian **Environment Variables**, isi:
   - `NEXT_PUBLIC_SUPABASE_URL` → dari Supabase Project Settings > API
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → dari Supabase Project Settings > API (pakai **anon public key**, BUKAN service_role key — service_role tidak boleh pernah ada di frontend)
4. Klik **Deploy**. Setelah selesai, Vercel kasih URL (mis. `waterq-semarang.vercel.app`) — itu dashboard-nya sudah live.

### 5. Isi 1 device dulu buat tes (opsional, biar keliatan datanya)
Jalankan di Supabase SQL Editor:
```sql
insert into devices (device_code, name, latitude, longitude)
values ('WQ-01', 'Kali Garang - Titik 1', -6.9932, 110.4203);
```
Refresh halaman Vercel-nya — device tadi bakal muncul di kartu (walau datanya masih kosong sampai ESP32 mulai kirim data beneran via `ingest-sensor-data`).

### Alur update selanjutnya
- Ubah kode frontend (`app/`, `lib/`) → `git push` → **Vercel otomatis re-deploy**, gak perlu langkah manual.
- Ubah kode Edge Function (`supabase/functions/`) → tetap harus `supabase functions deploy <nama>` manual (atau setup GitHub Actions nanti kalau mau otomatis juga).
