# Spesifikasi Dashboard — WaterQ Semarang

## 1. Overview Proyek

Dashboard monitoring kualitas air untuk **4 device** IoT yang tersebar di lokasi berbeda di Semarang. Setiap device membaca beberapa parameter kualitas air secara berkala dan mengirim data ke server melalui jaringan seluler. Dashboard menampilkan data live, riwayat historis, status kesehatan device, hingga rekomendasi berbasis AI.

**Stack:**
- Frontend + hosting: **Vercel**
- Backend / database / realtime / storage: **Supabase**
- Firmware: **ESP32**
- Konektivitas data: **SIM7600G** (modul 4G)
- Catu daya: Panel surya + **MPPT** + baterai **18 Ah**, dengan sensor pembacaan tegangan/kapasitas baterai

---

## 2. Hardware per Device

### 2.1 Sensor
| Sensor | Parameter |
|---|---|
| pH | Tingkat keasaman air |
| DO (Dissolved Oxygen) | Kadar oksigen terlarut |
| Turbidity | Kekeruhan air |
| EC (Electrical Conductivity) | Konduktivitas listrik |
| TDS (Total Dissolved Solids) | Total padatan terlarut |
| Rainfall (Tipping Bucket) | Curah hujan |
| Water Level (A01NYUB Sonar) | Ketinggian air (ultrasonic, non-contact) |
| Battery Sensor | Tegangan/kapasitas baterai (monitoring supply) |

### 2.2 Identitas Device
- Setiap device punya **ID/nomor unik**.
- Setiap device punya **nomor SIM (provider)** — diisi lewat Panel Setting.
- Setiap device punya **koordinat lokasi (latitude, longitude)** — diisi lewat Panel Setting.
- **Reminder isi ulang pulsa**: sistem mengingatkan setiap **tanggal 25** per device (berdasarkan nomor SIM yang terdaftar).
  - **Channel notifikasi**: muncul sebagai **badge/notifikasi di dashboard** (gratis, real-time, tidak perlu API berbayar).
  - **WhatsApp**: bisa, tapi perlu diketahui dulu — WhatsApp API resmi (**WhatsApp Business Cloud API** dari Meta) **berbayar per pesan** (walau ada kuota gratis terbatas per bulan/nomor). Alternatif tidak resmi (mis. library seperti `whatsapp-web.js`/Baileys) **gratis** tapi berisiko diblokir Meta karena melanggar ToS WhatsApp, jadi kurang disarankan untuk sistem produksi.
  - **Keputusan**: dipakai **WhatsApp (whatsapp-web.js / Baileys — versi tidak resmi)** + **email** sebagai jaga-jaga/backup.
  - ⚠️ Catatan risiko yang perlu diingat saat implementasi: karena Baileys/whatsapp-web.js tidak resmi, nomor WA yang dipakai untuk bot **berisiko kena banned oleh Meta** sewaktu-waktu (terutama kalau kirim pesan otomatis/berulang). Mitigasi yang disarankan:
    - Pakai **nomor WA khusus untuk bot** (bukan nomor pribadi/bisnis utama), supaya kalau kena banned tidak mengganggu komunikasi lain.
    - Karena volumenya sangat kecil (≈4 pesan/bulan untuk reminder pulsa, ditambah notifikasi threshold kalau ada), risiko banned relatif rendah dibanding bot dengan traffic tinggi.
    - **Email tetap jalan sebagai jalur notifikasi cadangan** kalau WA session putus/banned — jadi reminder tidak pernah hilang sama sekali.

---

## 3. Arsitektur Data & Update Realtime

- Data sensor **masuk (push) via Supabase Realtime**, sehingga panel pembacaan sensor & peta ter-update otomatis tanpa reload.
- Data status device (online/offline, uptime, last update) memakai kombinasi Realtime + **fallback heartbeat/polling** (misal cek tiap beberapa detik) untuk mendeteksi device yang berhenti mengirim data (mati/putus koneksi), karena Realtime saja tidak bisa mendeteksi "tidak ada data masuk".
- Serial monitor jarak jauh & log OTA/WiFi memakai Realtime channel terpisah agar tidak membebani channel data sensor.

---

## 4. Fitur Dashboard

### 4.1 Halaman Utama (Live)
- **Bagian atas**: pembacaan seluruh sensor (pH, DO, Turbidity, EC, TDS, Rainfall, Water Level, Battery) untuk device yang sedang dipilih — real-time.
- **Bagian bawah**: peta interaktif menampilkan titik ke-4 device sesuai lat/long.
  - Klik titik di peta → seluruh panel pembacaan sensor otomatis ganti ke device tersebut.
  - Tersedia juga **dropdown** untuk memilih device langsung tanpa klik peta.
- **Info tambahan per device terpilih**:
  - Last update data (timestamp data terakhir masuk)
  - Status **Online/Offline**
  - **Uptime** perangkat

### 4.2 Grafik Historis per Sensor
- Grafik terpisah untuk tiap parameter sensor.
- Filter rentang waktu: **Kemarin, 7 hari terakhir, 1 bulan terakhir, 1 tahun terakhir**, serta **custom date range**.
- Bisa **membandingkan grafik antar device** (multi-line/overlay) pada sensor yang sama.

### 4.3 Panel Database
- Download data: pilih **device** + pilih **rentang waktu**.
- Indikator **kapasitas database terpakai (%)**.
- **Auto-backup otomatis saat kapasitas mencapai 50%**.
- Riwayat backup (kapan, ukuran, status).

### 4.4 Panel Threshold & Notifikasi
- Setting rentang aman (min–max) untuk masing-masing sensor, menggunakan **slider** (bukan input angka manual) agar mudah dan cepat disesuaikan.
- Jika pembacaan melewati threshold → sistem mengirim **notifikasi**.
- **Filter tipe notifikasi**: user bisa pilih (centang/toggle) tipe notifikasi mana saja yang mau ditampilkan/dikirim, supaya panel notifikasi tidak penuh dengan tipe yang tidak relevan. Tipe yang bisa di-toggle on/off:
  - Threshold sensor terlewati
  - Reminder isi ulang pulsa
  - Perubahan WiFi (sukses/gagal/rollback)
  - Riwayat OTA (sukses/gagal)
  - Backup database otomatis
  - Device offline / tidak ada data masuk
- Preferensi ini disimpan per-user (kalau nanti multi-user) atau global dulu untuk versi awal, tersimpan di database (bukan hardcode), jadi bisa diubah kapan saja.

### 4.5 Rekomendasi AI
- Tombol **"Get Data"** → mengambil data terkini lalu memberi rekomendasi/insight dari AI.
- Bisa juga pilih **waktu referensi data**: hari ini, 1 hari lalu, 7 hari lalu, atau custom tanggal → lalu **Get Data** untuk mendapat rekomendasi AI berdasarkan data pada rentang tersebut.

**Penting soal "deteksi senyawa di air":** sensor yang dipakai (pH, DO, Turbidity, EC, TDS) adalah sensor **fisik/proxy**, bukan sensor kimia spesifik — jadi sensor ini **tidak bisa mengidentifikasi senyawa/zat pencemar tertentu** (misal logam berat, pestisida, dsb) secara langsung. EC/TDS tinggi hanya menandakan "ada padatan/ion terlarut lebih banyak dari normal", tapi tidak tahu itu apa. Yang bisa dilakukan AI di sini adalah:
1. Mendeteksi **anomali/pola tidak wajar** dari kombinasi ke-5 parameter (mis. pH turun drastis + EC naik + turbidity naik bersamaan → indikasi kuat ada pencemaran, walau jenisnya tidak diketahui pasti).
2. Memberi **level kewaspadaan** (normal/waspada/bahaya) berdasarkan threshold & tren, bukan menyebut nama senyawa.
3. Untuk **deteksi banjir**: karena sudah ada **sensor ketinggian air (A01NYUB sonar)**, deteksi dini banjir bisa jauh lebih akurat lewat kombinasi **kenaikan level air (cm) + rainfall (mm/jam) + turbidity** secara bersamaan — mis. level air naik cepat dalam waktu singkat + hujan deras + air makin keruh = indikasi kuat risiko banjir, bukan cuma dugaan dari curah hujan saja.

**Rekomendasi provider AI (gratis):** pakai **Google Gemini (Gemini 1.5/2.0 Flash) lewat Google AI Studio API**. Alasannya cocok untuk project ini:
- Punya **free tier yang genuinely gratis** untuk pemakaian rendah (bukan sekadar trial credit yang habis), dengan batas rate per menit — cocok karena fitur "Get Data" di project ini dipakai on-demand (klik tombol), bukan dipanggil terus-menerus tiap detik. Untuk 4 device dengan pemakaian sewajarnya, kemungkinan besar tetap masuk kuota gratis.
- Mendukung input **JSON terstruktur** dan bisa diminta output terstruktur juga (JSON mode) — pas untuk kirim data sensor + terima balik `risk_level`, `summary`, dll sesuai skema `ai_recommendations` di bagian 6.
- Integrasi via **Supabase Edge Function** (fetch ke Gemini API) sama mudahnya dengan provider lain.

*(Catatan: Claude API dan OpenAI API saat ini tidak punya free tier permanen untuk pemakaian production — hanya kredit trial awal yang habis — jadi kurang cocok kalau tujuannya "gratis" dalam jangka panjang. Gemini yang paling pas untuk kebutuhan ini.)*

Alurnya tetap sama seperti sebelumnya:
- Supabase Edge Function mengambil data sensor sesuai rentang waktu yang dipilih user.
- Data dikirim sebagai JSON terstruktur ke Gemini API dengan prompt berisi: konteks lokasi (DAS Semarang), nilai threshold yang berlaku, dan histori singkat.
- Gemini mengembalikan insight dalam format terstruktur (level kewaspadaan, ringkasan kondisi per parameter, potensi risiko banjir/pencemaran, saran tindakan) yang lalu ditampilkan di panel.

### 4.6 Serial Monitor Jarak Jauh
- Menampilkan log serial device dari jarak jauh melalui web.
- Menyimpan maksimal **500 baris terakhir** (baris lama otomatis terhapus/rotasi jika lebih).
- Kontrol **Run** dan **Stop**.

### 4.7 Panel Kalibrasi Sensor
- Kalibrasi tiap sensor (pH, DO, Turbidity, EC, TDS, Water Level A01NYUB, dll) langsung dari web.
- **Khusus Water Level (A01NYUB)** — semua nilai kalibrasi diinput lewat web (tersimpan di database), **bukan hardcode di firmware**, sehingga bisa diubah kapan saja tanpa update firmware/OTA:
  - **Tinggi dasar sungai ke muka air normal** (`riverbed_to_normal_water_cm`) — kedalaman air normal di titik itu, untuk referensi/catatan kondisi normal.
  - **Tinggi muka air normal ke sensor** (`normal_water_to_sensor_cm`) — jarak sensor terpasang di atas muka air normal saat instalasi. Ini yang jadi **baseline perhitungan**.
  - Device hanya mengirim **raw distance** (jarak sensor ke permukaan air saat ini, hasil baca sonar A01NYUB) ke server.
  - **Perhitungan ketinggian air dilakukan di sisi web/backend** (bukan di ESP32), pakai rumus:
    ```
    water_level_from_normal_cm = normal_water_to_sensor_cm − raw_distance_cm
    ```
    (positif = air lagi naik di atas kondisi normal → makin mendekati siaga banjir; negatif = air surut di bawah normal)
  - Kalau suatu saat sensor dipindah/instalasi berubah, tinggal update kedua angka ini lewat Panel Kalibrasi — tidak perlu sentuh kode firmware sama sekali.
- *(Detail parameter kalibrasi sensor lain menyusul — akan dikonfirmasi terpisah per jenis sensor.)*

### 4.8 Panel Setting

**a. Identitas & Lokasi Device**
- Input nomor SIM/provider per device.
- Input latitude & longitude per device.

**b. OTA (Over-The-Air) Update**
- Upload firmware baru langsung dari web (disimpan di Supabase Storage).
- Riwayat OTA terakhir yang berhasil diupload/ter-flash ke device.

**c. Ganti WiFi**
- Device pertama kali connect ke WiFi default/awal.
- User bisa input SSID & password WiFi baru untuk pindah jaringan.
- **Auto-rollback**: jika dalam **10 detik** gagal connect ke WiFi baru, device otomatis kembali ke WiFi sebelumnya.
- Riwayat WiFi: simpan **3 riwayat terakhir saja** (baik sukses maupun gagal) — riwayat ke-4 dst dihapus otomatis dari database.

**d. Interval Pengiriman Data**
- User bisa set **berapa menit sekali** device mengirim data, langsung dari web (disimpan di kolom `send_interval_minutes` pada tabel `devices`) — **tidak perlu OTA/flash ulang** untuk mengubahnya.
- **Cara kerja teknis**: ESP32 tetap yang menentukan siklusnya sendiri (deep sleep untuk hemat baterai), bukan koneksi always-on. Di **setiap siklus bangun untuk kirim data**, device juga sekalian **request nilai interval terbaru** dari server (nebeng di request yang sama, tidak nambah koneksi terpisah) sebelum masuk deep sleep ke siklus berikutnya.
  - **Penting**: perubahan interval dari web **tidak langsung instan** ke device yang sedang tidur. Kalau interval diubah saat device lagi deep sleep, device tetap menyelesaikan siklus sleep yang sedang berjalan pakai nilai lama, dan baru memakai nilai baru mulai **siklus bangun berikutnya**. Ini wajar untuk device hemat daya berbasis deep sleep — beda dengan sistem always-on yang bisa langsung push perintah.
  - Nilai ini **tersimpan sebagai data di database** (bukan ditulis ulang ke kode firmware/hardcode), jadi tetap tidak perlu OTA untuk mengubahnya — hanya butuh menunggu 1 siklus sleep berjalan dulu.
- **Detail implementasi firmware (supaya jelas bedanya dengan hardcode biasa)**:
  - Firmware tetap punya 1 variabel default (mis. 5 menit) untuk **pertama kali device nyala** sebelum pernah connect ke server — ini fallback aman, bukan "nilai final".
  - Variabel interval yang dipakai berjalan **disimpan di RTC memory** (`RTC_DATA_ATTR` di ESP32), bukan RAM biasa — karena RTC memory tetap hidup selama deep sleep, sementara RAM biasa hilang isinya. Ini juga menghindari **tulis-berulang ke flash NVS** yang lama-lama bisa membuat flash aus.
  - Setiap siklus kirim data, **response dari server (setelah insert data sensor) sekalian membawa nilai interval terbaru** (piggyback di 1 request yang sama, bukan request terpisah — hemat koneksi & kuota data).
  - Kalau device gagal connect ke server di satu siklus (sinyal jelek/dll), device **tetap pakai nilai interval terakhir yang tersimpan di RTC memory** (bukan reset ke default) — dan coba lagi ambil update di siklus berikutnya.
  - Ilustrasi kasar:
    ```cpp
    RTC_DATA_ATTR int sendIntervalMinutes = 5; // default awal saja

    void loop() {
      bacaSensor();
      String response = kirimDataKeSupabase(); // 1 request: kirim data + minta config terbaru
      sendIntervalMinutes = parseIntervalDariResponse(response); // update variabel runtime

      esp_sleep_enable_timer_wakeup(sendIntervalMinutes * 60 * 1000000ULL); // pakai variabel, bukan angka tetap
      esp_deep_sleep_start();
    }
    ```
- **Risiko & Mitigasi Kegagalan Pengiriman** *(penting untuk sistem solar + baterai yang bisa mengalami mati total)*:

  | Risiko | Penjelasan | Mitigasi |
  |---|---|---|
  | **Baterai habis total → reboot penuh** | RTC memory cuma bertahan selama *deep sleep*, bukan mati total. Kalau aki benar-benar habis (mendung berhari-hari) lalu device restart dari nol, RTC memory ke-reset → interval balik ke default hardcode, bukan nilai terakhir yang di-set user | Simpan juga ke **NVS (flash)**, tapi **hanya ditulis kalau nilainya berubah** dari sebelumnya (bukan tiap siklus) — supaya flash tidak cepat aus, tapi tetap ada nilai terakhir yang bisa dibaca saat reboot total |
  | **Request ke server gagal** (sinyal jelek/server down) | Device tidak dapat update config terbaru | Device pakai nilai lama (aman), dengan **retry terbatas** (mis. maks 2–3x) supaya tidak boros baterai mencoba terus-menerus |
  | **Data sensor hilang saat gagal kirim** | Kalau 1 siklus gagal total connect, bacaan sensor saat itu bisa hilang kalau tidak dibuffer | Simpan sementara ke **SPIFFS/flash lokal** saat gagal kirim, lalu upload data tertunda di siklus berikutnya begitu online kembali — supaya histori tidak bolong |
  | **Data terkirim dobel/duplikat** | Data sudah masuk ke server tapi response gagal diterima device → device kirim ulang data yang sama | Beri **unique constraint** di `sensor_readings` (kombinasi `device_id` + `recorded_at`) atau pakai `upsert`, supaya data tetap bersih walau device kirim dobel |
  | **Nilai interval dari server korup/tidak valid** | Kalau response rusak/aneh (mis. kebaca 0 atau angka ekstrem) | Firmware tetap **validasi & clamp** nilai ke batas 1–60 menit di sisi device (bukan cuma percaya validasi server) — pertahanan berlapis |
- **Batas aman (dibatasi di UI + divalidasi di server, bukan cuma di frontend)**, supaya tidak menimbulkan masalah:

  | Batas | Nilai usulan | Alasan |
  |---|---|---|
  | Minimum | **1 menit** | Di bawah ini terlalu boros baterai (SIM7600G paling banyak makan arus saat transmit) & kuota data |
  | Maksimum | **60 menit** | Di atas ini terlalu lambat untuk fungsi early-warning banjir (rainfall & water level) |
  | Default awal | **5–10 menit** | Titik tengah yang wajar untuk mulai — bisa disesuaikan setelah lihat kondisi baterai & pulsa di lapangan |

- **Saran tambahan (opsional, bisa untuk versi lanjutan)**: pisahkan interval per grup sensor — grup "cepat" (Rainfall + Water Level, untuk deteksi banjir) bisa dibuat lebih sering daripada grup "lambat" (pH/DO/Turbidity/EC/TDS, yang perubahannya biasanya lebih pelan) — supaya hemat daya tapi tetap responsif untuk banjir. Ini bisa jadi pengembangan tahap 2 kalau interval tunggal dirasa kurang fleksibel.
- **Anti-spam notifikasi**: terlepas dari interval berapa pun, sebaiknya notifikasi threshold diberi **cooldown** (mis. tidak kirim notifikasi baru untuk sensor yang sama dalam 15–30 menit terakhir) supaya tidak spam kalau nilai sensor naik-turun di sekitar batas threshold.

---

## 5. Keamanan — PIN Akses

- **Dashboard utama (live view)**: bebas diakses, tanpa PIN (karena sifatnya live monitoring publik).
- **Semua panel lain** (Setting, OTA, Ganti WiFi, Download Database, Kalibrasi, dll) **wajib input PIN** sebelum bisa masuk/melakukan aksi.
- **Model PIN**: satu PIN global untuk semua panel (tidak dibedakan per jenis aksi).
- ⚠️ **Catatan keamanan**: PIN sebaiknya **jangan disimpan sebagai teks biasa** di database maupun di kode frontend. Simpan versi **hash**-nya di Supabase (mis. pakai `bcrypt`/`pgcrypto`), lalu verifikasi input PIN via Supabase Edge Function — bukan dicocokkan langsung di sisi client. Nilai PIN aktual tidak dicantumkan di dokumen ini karena ini adalah dokumen spesifikasi yang bisa dibagikan; simpan PIN aslinya hanya di environment variable/secret.

---

## 6. Struktur Database Supabase (Usulan)

> Ini usulan skema awal — nama kolom/tipe data bisa disesuaikan saat implementasi.

**`devices`** — master data device
| Kolom | Tipe | Ket |
|---|---|---|
| id | uuid/serial (PK) | |
| device_code | text (unique) | mis. `WQ-01` |
| name | text | nama lokasi |
| sim_number | text | nomor SIM |
| sim_provider | text | Telkomsel/XL/dst |
| pulsa_last_topup_date | date | untuk hitung reminder tgl 25 |
| latitude | numeric | |
| longitude | numeric | |
| firmware_version | text | versi terakhir ter-OTA |
| send_interval_minutes | integer | default 5–10, dibatasi 1–60 (lihat 4.8.d) |
| created_at | timestamptz | |

**`sensor_readings`** — data time-series (tabel terbesar)
| Kolom | Tipe | Ket |
|---|---|---|
| id | bigint (PK) | |
| device_id | uuid (FK → devices) | |
| ph | numeric | |
| do_mg_l | numeric | |
| turbidity_ntu | numeric | |
| ec_us_cm | numeric | |
| tds_ppm | numeric | |
| rainfall_mm | numeric | |
| water_level_raw_distance_cm | numeric | raw hasil baca sonar A01NYUB (jarak sensor↔permukaan air saat ini) |
| battery_voltage | numeric | |
| battery_percent | numeric | |
| recorded_at | timestamptz | waktu baca sensor |

> **Unique constraint** disarankan pada kombinasi (`device_id`, `recorded_at`) untuk mencegah data dobel kalau device retry kirim data yang sebenarnya sudah masuk (lihat tabel Risiko & Mitigasi di bagian 4.8.d).

*(Pertimbangkan pakai **TimescaleDB extension** di Supabase/Postgres kalau volume data time-series besar, untuk query historis lebih cepat + retention policy otomatis.)*

**`device_status_log`** — heartbeat/online-offline
| device_id | is_online (bool) | last_seen_at | uptime_seconds |

**`ota_history`**
| device_id | firmware_file_url | version | uploaded_at | status (success/failed) | notes |

**`wifi_history`** *(hanya simpan 3 terakhir per device, trigger auto-hapus yang lama)*
| device_id | ssid | status (success/failed/rollback) | attempted_at |

**`calibration_log`**
| device_id | sensor_type | calibration_params (jsonb) | calibrated_at | calibrated_by |

**`water_level_calibration`** *(khusus A01NYUB — riwayat kalibrasi per device, diinput lewat Panel Kalibrasi)*
| device_id | riverbed_to_normal_water_cm | normal_water_to_sensor_cm | effective_from | updated_by | notes |

> Dibuat **riwayat (bukan cuma 1 baris aktif)** dengan kolom `effective_from`, supaya kalau kalibrasi diubah di kemudian hari, perhitungan `water_level_from_normal_cm` untuk data historis tetap pakai kalibrasi yang berlaku **saat data itu direkam** (bukan ketimpa kalibrasi terbaru) — jadi grafik histori tetap akurat walau sensor pernah dipindah/dikalibrasi ulang. Query ambil baris kalibrasi dengan `effective_from` terdekat ≤ `recorded_at` dari `sensor_readings`.

**`threshold_settings`**
| device_id (nullable = default global) | sensor_type | min_value | max_value | updated_at |

**`notifications`**
| device_id | type (threshold/pulsa/wifi/ota/backup/offline) | message | is_read | created_at | last_sent_at *(untuk logic cooldown anti-spam)* |

**`notification_preferences`** *(toggle on/off per tipe notifikasi, lihat 4.4)*
| id | notify_threshold (bool) | notify_pulsa (bool) | notify_wifi (bool) | notify_ota (bool) | notify_backup (bool) | notify_offline (bool) | updated_at |

**`backup_log`**
| triggered_at | db_usage_percent | file_url | status |

**`ai_recommendations`**
| device_id | requested_range | summary | risk_level | raw_response (jsonb) | created_at |

---

## 7. Default Threshold Sensor (Usulan)

Karena sungai di Semarang (DAS Kali Garang, Banjir Kanal, dll) umumnya masuk kategori **badan air kelas II–III** (baku mutu air permukaan, acuan PP No. 22 Tahun 2021), berikut usulan rentang default — **sebaiknya tetap dikalibrasi ulang dengan data lapangan** setelah device berjalan beberapa minggu:

| Sensor | Satuan | Rentang Normal (usulan) | Keterangan |
|---|---|---|---|
| pH | – | 6.5 – 8.5 | Baku mutu air kelas II umumnya 6–9 |
| DO | mg/L | ≥ 4 – 5 | Semakin tinggi semakin baik; < 3 mg/L indikasi tercemar berat |
| Turbidity | NTU | 5 – 50 | Air sungai bening ~5–25 NTU; > 50 NTU sudah keruh signifikan |
| EC | µS/cm | 100 – 1000 | Di atas ini indikasi salinitas/pencemaran ion tinggi |
| TDS | ppm | 50 – 500 | WHO: air minum < 500 ppm; sungai bisa lebih tinggi tapi > 1000 ppm patut diwaspadai |
| Rainfall | mm/jam | Alert jika > 20–30 mm/jam | Threshold ini untuk trigger **early warning banjir**, bukan "normal range" |
| Water Level | cm (relatif thd normal) | Alert jika `water_level_from_normal_cm` naik > X cm, atau naik cepat dalam Y menit | Dihitung otomatis dari kalibrasi di Panel Kalibrasi (bagian 4.7) — tidak hardcode, X/Y ditentukan setelah data lapangan cukup |
| Battery | % / V | Alert jika < 20% atau < 11.5V (aki 12V) | Supaya sempat ditindaklanjuti sebelum device mati |

> Nilai-nilai di atas hanya **starting point**, dipakai sebagai acuan awal. Sesuai keputusan: threshold ini tetap bisa **diubah-ubah lewat slider di Panel Threshold** (fitur 4.4), jadi user bisa fine-tune berdasarkan kondisi nyata tiap titik sungai kapan pun tanpa perlu ubah kode.

---

## 8. Ringkasan Device

| Item | Detail |
|---|---|
| Jumlah device | 4 unit |
| Mikrokontroler | ESP32 |
| Modul komunikasi | SIM7600G (4G) |
| Catu daya | Panel surya + MPPT + baterai 18 Ah |
| Backend | Supabase |
| Frontend/Hosting | Vercel |
| Update data | Realtime (push) + fallback heartbeat untuk status online/offline |
| Reminder pulsa | Setiap tanggal 25 per nomor SIM |

---

## 9. Hal yang Masih Perlu Dikonfirmasi/Dilengkapi

- [ ] Detail parameter & prosedur kalibrasi tiap sensor (pH, DO, Turbidity, EC, TDS) — akan diinfokan menyusul (sudah disiapkan tempatnya di bagian 6, tabel `calibration_log`).
- [ ] Nomor WA khusus untuk bot Baileys/whatsapp-web.js — *sedang disiapkan user*.
- [ ] Setup Google AI Studio API key untuk Gemini — *akan dikerjakan sambil jalan implementasi*.
