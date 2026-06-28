# TeleCode Medical

<div align="center">

![TeleCode Medical Banner](https://img.shields.io/badge/TeleCode-Medical-0891B2?style=for-the-badge&logo=activity&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite)
![TailwindCSS](https://img.shields.io/badge/Tailwind-4-38BDF8?style=flat-square&logo=tailwindcss)
![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat-square&logo=pwa)
![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?style=flat-square&logo=vercel)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

**Sistem transmisi data medis aman berbasis web menggunakan steganografi LSB, codec audio/video, dan analisis AI klinis untuk telemedicine.**

[🌐 Live Demo](https://tele-code-medical.vercel.app) · [📋 Dokumentasi](#arsitektur-sistem) · [🚀 Cara Menjalankan](#cara-menjalankan)

</div>

---

## Latar Belakang Masalah

Sistem layanan kesehatan modern menghadapi tantangan kritis dalam transmisi data pasien secara digital:

1. **Kerahasiaan data** — Rekam medis elektronik yang dikirim melalui jaringan publik rentan terhadap penyadapan dan kebocoran data. Regulasi seperti HIPAA (AS) dan UU PDP (Indonesia) mewajibkan perlindungan data pasien yang ketat.

2. **Keterbatasan infrastruktur telemedicine** — Di daerah terpencil, koneksi internet tidak stabil dan bandwidth terbatas. Sistem konvensional yang mengirim file medis berukuran besar (DICOM, video konsultasi) sering kali tidak praktis.

3. **Fragmentasi data klinis** — Data pasien (identitas, tanda vital, diagnosis, foto rontgen, rekaman suara dokter, video konsultasi) tersimpan di sistem berbeda, menyulitkan dokter spesialis penerima untuk mendapatkan gambaran klinis lengkap.

4. **Tidak ada verifikasi keaslian** — File medis yang dikirim via email atau pesan instan mudah dimanipulasi tanpa meninggalkan jejak, menimbulkan risiko keselamatan pasien.

5. **Ketiadaan dukungan keputusan klinis** — Dokter umum di fasilitas primer sering kali tidak memiliki akses cepat ke panduan klinis berbasis bukti untuk kasus kompleks sebelum merujuk.

---

## Solusi

**TeleCode Medical** menggabungkan tiga teknologi utama menjadi satu platform terintegrasi:

| Masalah | Solusi TeleCode |
|---|---|
| Kerahasiaan data pasien | Steganografi LSB — data disembunyikan *di dalam* piksel gambar/sampel audio/frame video, tidak terlihat mata |
| File berukuran besar | Algoritma kompresi (DEFLATE ZIP, µ-law G.711, Keyframe+Delta) mengurangi ukuran secara signifikan |
| Fragmentasi data klinis | Satu file ZIP berisi gambar medis + seluruh rekam medis terenkode + metadata steganografik |
| Ketiadaan dukungan klinis | AI rule-based engine mendeteksi 8 kondisi penyakit, mem-parsing tanda vital, dan memberikan rekomendasi Evidence-Based Medicine |
| Aksesibilitas offline | PWA (Progressive Web App) — dapat diinstal di perangkat dan berjalan tanpa koneksi internet |

---

## Fitur Utama

### 🔐 Image Codec + Steganografi
- **Encode**: Embed seluruh rekam medis pasien (JSON) ke dalam piksel gambar X-Ray/MRI/CT Scan menggunakan **LSB (Least Significant Bit) steganografi** pada channel R, G, B — 3 bit per piksel
- **Decode**: Ekstrak data tersembunyi dari gambar stego, re-run analisis AI otomatis
- **Kompresi**: DEFLATE ZIP level 9 via `fflate` sebagai container akhir
- **Magic header** `TCMD` (32-bit) untuk validasi integritas file
- **Payload header** 32-bit uint32 untuk panjang data

### 🎙️ Audio Codec (G.711 µ-law)
- **Kompresi**: PCM 16-bit → µ-law 8-bit (rasio **2:1**, hemat 50% ukuran) sesuai standar G.711 telekomunikasi
- **Dekompresi**: µ-law 8-bit → PCM 16-bit, kualitas suara terjaga
- **Parser WAV**: Parsing penuh header RIFF/WAVE/fmt/data chunk, support mono & stereo
- **Steganografi audio**: Metadata pasien di-embed di LSB setiap sampel WAV (magic header `TCMA`)
- **Output**: ZIP berisi WAV terenkode

### 🎬 Video Codec (Keyframe + Delta)
- **Ekstraksi frame**: HTMLVideoElement + Canvas API, sampling 5 FPS, resolusi max 640px
- **Kompresi Keyframe**: Frame ke-0 dan setiap ke-30 disimpan sebagai JPEG base64
- **Kompresi Delta**: Frame sisanya hanya menyimpan piksel yang berubah > threshold 15 (sparse array) — efisiensi tinggi untuk video statis seperti konsultasi
- **Steganografi video**: Metadata di-embed di pixel LSB keyframe (PNG lossless, magic header `TCMV`)
- **Playback preview**: Render frame hasil dekode di canvas HTML

### 🧠 AI Clinical Analysis Engine
- Knowledge base **8 penyakit** dengan ICD-10 code: Hipertensi (I10), Diabetes T2 (E11), Pneumonia (J18.9), Anemia (D50), Asma (J45), CKD (N18), ISK (N39.0), PPOK (J44)
- **Vital sign parser** otomatis: parsing teks bebas → nilai BP, suhu, SpO₂, glukosa, hemoglobin, kreatinin, eGFR
- **Scoring engine**: keyword matching + symptom matching + vital flags = confidence score
- **Urgent flags**: deteksi kondisi darurat (krisis hipertensi, hipoksemia kritis, DKA, anemia berat, hiperpirexia)
- **Rekomendasi klinis** berbasis bukti (EBM) + farmakoterapi per kondisi

### 📊 Fitur Tambahan
- **QR Code** — transfer data pasien cepat antar perangkat
- **Export PDF** — cetak rekam medis lengkap
- **Riwayat Medis** — penyimpanan lokal di `localStorage` (100% privat, tidak ada server)
- **Vital Signs Validator** — peringatan real-time untuk tanda vital abnormal saat input
- **Statistik kompresi** — visualisasi rasio, ukuran asli vs terkompresi
- **Tutorial overlay** — panduan penggunaan interaktif per halaman
- **PWA** — installable, service worker, offline banner
- **Bilingual** — Bahasa Indonesia + English (i18n)

---

## Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────────┐
│                        TeleCode Medical                          │
│                      (React 19 + Vite 8)                        │
├───────────────┬───────────────┬───────────────┬─────────────────┤
│  Image Codec  │  Audio Codec  │  Video Codec  │   AI Engine     │
│               │               │               │                 │
│  steganography│  audioCodec   │  videoCodec   │  aiAnalysis     │
│  .js          │  .js          │  .js          │  .js            │
│               │               │               │                 │
│  ┌──────────┐ │  ┌──────────┐ │  ┌──────────┐ │  ┌───────────┐ │
│  │ LSB      │ │  │ µ-law    │ │  │Keyframe  │ │  │ Disease   │ │
│  │ Embed    │ │  │ G.711    │ │  │+ Delta   │ │  │ KB (8)    │ │
│  │ Extract  │ │  │ Codec    │ │  │Compress  │ │  │           │ │
│  └────┬─────┘ │  └────┬─────┘ │  └────┬─────┘ │  │ Vital     │ │
│       │       │       │       │       │       │  │ Parser    │ │
│  ┌────▼─────┐ │  ┌────▼─────┐ │  ┌────▼─────┐ │  │           │ │
│  │ DEFLATE  │ │  │ WAV      │ │  │ LSB on   │ │  │ Scoring   │ │
│  │ ZIP      │ │  │ Parser + │ │  │ Keyframe │ │  │ Engine    │ │
│  │ (fflate) │ │  │ Builder  │ │  │          │ │  └───────────┘ │
│  └──────────┘ │  └──────────┘ │  └──────────┘ │                │
├───────────────┴───────────────┴───────────────┴─────────────────┤
│                    compression.js (shared ZIP layer)             │
├─────────────────────────────────────────────────────────────────┤
│  Pages: Dashboard · Encode · Decode · AudioCodec · VideoCodec   │
│         SymptomChecker · MedicalHistory                          │
├─────────────────────────────────────────────────────────────────┤
│  Components: AIAnalysisPanel · QRCodeCard · CompressionStats    │
│              VitalsWarningBox · TutorialOverlay · PWAPrompt     │
├─────────────────────────────────────────────────────────────────┤
│  i18n: LangContext · en.js · id.js                              │
└─────────────────────────────────────────────────────────────────┘
```

### Alur Enkode (Encode Flow)

```
Input Pasien → AI Analysis → Embed LSB ke Image
     │               │               │
     ▼               ▼               ▼
  JSON payload   Kondisi +       stegoBlob (PNG)
  (rekam medis)  rekomendasi          │
                                      ▼
                               DEFLATE ZIP (level 9)
                                      │
                                      ▼
                               Output: medical_ID_date.zip
```

### Alur Dekode (Decode Flow)

```
Upload ZIP → Ekstrak fflate → Load PNG → Ekstrak LSB
                  │                           │
                  ▼                           ▼
           compressionInfo              JSON string
                                             │
                                             ▼
                                       Parse JSON → Re-run AI
                                             │
                                             ▼
                                    Tampilkan rekam medis lengkap
```

---

## Implementasi Algoritma

### 1. Steganografi LSB (Image)

Data disembunyikan dengan mengubah bit paling tidak signifikan (bit-0) dari setiap channel R, G, B pada setiap piksel:

```
Layout bit di piksel (MSB first):
[32 bit — magic "TCMD"]
[32 bit — panjang payload (uint32)]
[N×8 bit — payload UTF-8 bytes]

Kapasitas = ⌊(lebar × tinggi × 3) / 8⌋ bytes
```

Perubahan ±1 pada nilai 0–255 tidak terlihat oleh mata manusia, menjadikan gambar tampak identik secara visual.

### 2. µ-law G.711 (Audio)

Standar codec telekomunikasi ITU-T G.711:

```
Encode (16-bit PCM → 8-bit µ-law):
  µ(x) = sgn(x) × ln(1 + µ|x|/xmax) / ln(1 + µ)
  µ = 255, implementasi dengan segment lookup

Decode (8-bit → 16-bit):
  x(µ) = sgn(µ) × xmax × ((1 + µ)^|µ| − 1) / µ
```

Hasil: ukuran file berkurang 50% dengan kualitas suara yang masih dapat diterima (MOS ≈ 4.1).

### 3. Keyframe + Delta (Video)

```
Frame ke-i:
  if i % 30 == 0 atau i == 0:
    → Keyframe: JPEG base64 (full frame)
  else:
    → Delta: [{idx, r, g, b}] untuk piksel dengan |diff| > 15
    
Rasio kompresi tinggi untuk video konsultasi (background statis):
  rawBytes = width × height × 4 × totalFrames
  deltaFrames menyimpan <5% piksel pada frame statis
```

### 4. AI Scoring Engine

```javascript
score(disease, patientData) =
  Σ keyword_match × 10 +
  Σ symptom_match × 3 +
  vital_flags_triggered × 15

confidence = min(score / 35 × 100, 97)%
```

---

## Stack Teknologi

| Kategori | Teknologi |
|---|---|
| Frontend Framework | React 19 + Vite 8 |
| Routing | React Router DOM 7 |
| Styling | Tailwind CSS 4 (via Vite plugin) |
| Animasi | Framer Motion 12 |
| Kompresi | fflate 0.8 (DEFLATE/ZIP, pure JS, no WASM) |
| QR Code | qrcode 1.5 |
| Icons | Lucide React |
| PWA | Custom Service Worker + Web App Manifest |
| i18n | Custom LangContext (React Context API) |
| Deployment | Vercel |
| Linter | oxlint |

> Seluruh pemrosesan berjalan **100% di browser** (client-side). Tidak ada server backend, tidak ada data yang dikirim ke internet.

---

## Struktur Direktori

```
src/
├── pages/
│   ├── Dashboard.jsx        # Halaman utama + overview fitur
│   ├── Encode.jsx           # Steganografi gambar — encode
│   ├── Decode.jsx           # Steganografi gambar — decode
│   ├── AudioCodec.jsx       # Codec audio µ-law + stego WAV
│   ├── VideoCodec.jsx       # Codec video keyframe+delta + stego
│   ├── SymptomChecker.jsx   # Pemeriksa gejala berbasis AI
│   └── MedicalHistory.jsx   # Riwayat rekam medis lokal
│
├── utils/
│   ├── steganography.js     # LSB embed/extract untuk image
│   ├── compression.js       # DEFLATE ZIP via fflate
│   ├── audioCodec.js        # µ-law G.711 + WAV parser + audio LSB
│   ├── videoCodec.js        # Frame extraction + keyframe+delta + video LSB
│   ├── aiAnalysis.js        # Rule-based AI engine + disease knowledge base
│   ├── vitalsValidator.js   # Validasi tanda vital real-time
│   ├── medicalHistory.js    # CRUD localStorage
│   ├── pdfExport.js         # Generate & download PDF rekam medis
│   └── qrCode.js            # Generate QR code dari data pasien
│
├── components/
│   ├── AIAnalysisPanel.jsx  # Panel hasil analisis AI
│   ├── CompressionStats.jsx # Visualisasi statistik kompresi
│   ├── VitalsWarningBox.jsx # Peringatan tanda vital abnormal
│   ├── QRCodeCard.jsx       # Kartu QR code
│   ├── TutorialOverlay.jsx  # Tutorial interaktif per halaman
│   ├── PWAPrompt.jsx        # Prompt install PWA + offline banner
│   ├── LangSwitcher.jsx     # Toggle bahasa ID/EN
│   └── Skeleton.jsx         # Loading skeleton UI
│
├── i18n/
│   ├── LangContext.jsx      # React Context provider bahasa
│   ├── en.js                # Terjemahan Bahasa Inggris
│   └── id.js                # Terjemahan Bahasa Indonesia
│
├── App.jsx                  # Router + layout utama + navigasi
├── main.jsx                 # Entry point React
├── index.css                # Global styles + CSS variables
└── App.css                  # Tailwind @theme configuration
```

---

## Cara Menjalankan

### Prasyarat
- Node.js ≥ 18
- npm ≥ 9

### Development

```bash
# Clone repository
git clone https://github.com/yazidzky/TeleCodeMedical.git
cd TeleCodeMedical

# Install dependencies
npm install

# Jalankan dev server
npm run dev
```

Buka `http://localhost:5173`

### Build Production

```bash
npm run build
# Output tersedia di folder dist/
```

### Preview Build

```bash
npm run preview
```

---

## Deploy ke Vercel

Project ini sudah dikonfigurasi untuk deploy ke Vercel via `vercel.json`:

```bash
# Via Vercel CLI
npm i -g vercel
vercel --prod
```

Atau import langsung dari GitHub di [vercel.com/new](https://vercel.com/new). Vercel akan otomatis mendeteksi Vite dan menggunakan konfigurasi yang ada.

Konfigurasi `vercel.json` mencakup:
- SPA rewrite — semua route diarahkan ke `index.html`
- Cache header untuk assets statik (immutable, 1 tahun)
- Security headers: `X-Frame-Options`, `X-Content-Type-Options`, CSP

---

## Cara Penggunaan

### Dokter — Mengirim Rekam Medis

1. Buka halaman **Encode**
2. Isi data pasien (nama, ID, diagnosis, gejala, tanda vital)
3. Klik **Run AI Analysis** — lihat rekomendasi klinis
4. Upload foto rontgen/MRI/CT sebagai gambar carrier
5. Klik **Encode & Compress** → unduh file `.zip`
6. Kirim file ZIP ke dokter spesialis via email/messenger

### Dokter Spesialis — Menerima Rekam Medis

1. Buka halaman **Decode**
2. Upload file `.zip` yang diterima
3. Klik **Decompress & Decode**
4. Data pasien + AI analisis + gambar medis tampil lengkap
5. Export PDF atau scan QR code untuk transfer ke perangkat lain

### Pasien — Cek Gejala Mandiri

1. Buka halaman **Cek Gejala**
2. Pilih gejala yang dialami
3. (Opsional) Isi tanda vital
4. Lihat hasil analisis AI + rekomendasi
5. Rekam otomatis tersimpan di Riwayat

---

## Kontribusi

Pull request dan issue sangat terbuka. Untuk perubahan besar, buka issue terlebih dahulu.

```bash
git checkout -b feature/nama-fitur
git commit -m "feat: deskripsi singkat"
git push origin feature/nama-fitur
```

---

## Disclaimer

> Output AI pada platform ini **bukan pengganti diagnosis dokter**. Seluruh rekomendasi klinis bersifat pendukung keputusan (*clinical decision support*) dan harus divalidasi oleh tenaga medis berlisensi sebelum diterapkan pada pasien.

---

## Lisensi

MIT License © 2025 [yazidzky](https://github.com/yazidzky)

---

<div align="center">
  <sub>Dibuat sebagai proyek UAS Sistem Multimedia — Teknik Informatika</sub>
</div>
