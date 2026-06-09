# 🗺️ ASOI (Aplikasi Survey Online)

**ASOI** adalah aplikasi mobile berbasis **React Native (Expo)** yang dirancang untuk mempermudah proses survey lapangan aset PLN (Tiang, Gardu, dan Jalur Kabel). Aplikasi ini bekerja secara **Offline-First**, memungkinkan surveyor bekerja di area tanpa sinyal dan menyinkronkan data ke Cloud (Supabase) saat kembali online.

![App Status](https://img.shields.io/badge/version-v1.9-blue) ![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-green) ![Expo](https://img.shields.io/badge/sdk-Expo%2054-black)

## 🆕 What's New in v1.9

- **Offline-Ready Map Captures**: Library `html2canvas` kini diinjeksi secara lokal ke dalam WebView. Mengambil capture gambar peta untuk ekspor PDF rincian pekerjaan dan Berita Acara (BA) kini dapat dilakukan 100% secara offline tanpa memerlukan koneksi internet.
- **Memory & Deadlock Optimizations**: Peta dicapture pada resolusi optimal (`scale: 1`) untuk mencegah kendala Out-Of-Memory (OOM) di perangkat Android/iOS dengan kepadatan piksel tinggi. Ditambahkan juga safety timeout dan penanganan anti-taint untuk mencegah mesin capture terkunci ketika terjadi gangguan jaringan.

*Previous updates (v1.6):*
- **Multi-Page PDF Export**: Export PDF gambar dengan opsi pemisahan halaman berdasarkan segmentasi (Misal: 8 Tiang TM/Hal, 10 Tiang TR/Hal, atau per 400 meter). Didesain dengan seamless tiling dan boundary marker A/B/C antar halaman agar tidak ada tiang yang ganda pada lembar gambar survei yang panjang.
- **Improved PDF capture**: Capture map optimal dengan boundary otomatis dan performa tinggi secara paralel untuk survey besar.
- **Fitur Undo**: Tombol undo untuk membatalkan aksi terakhir (add/edit/delete tiang, gardu, jalur). Maksimal 20 aksi disimpan.
- **Rekap per Konstruksi**: Rekap tiang menampilkan breakdown per konstruksi (M1, M4, M21, TR-1B, dll) bukan per jenis (beton/besi).
- **Rekap per Ukuran**: Breakdown tiang per ukuran (tinggi / kekuatan), misal: "11m / 200daN".
- **Material Tambahan Travers V**: Section Material Tambahan untuk Travers V muncul di rekap dan PDF jika ada konstruksi M21 (baru + eksisting).

## ✨ Fitur Utama

*   **📍 Pemetaan Aset**: Plotting posisi Tiang (TR/TM), Gardu, dan Jalur (SUTR/SUTM/SKUTM) secara presisi menggunakan GPS.
*   **📡 Offline Mode**: Data tersimpan aman di HP lokal saat tidak ada internet.
*   **☁️ Cloud Sync**: Sinkronisasi dua arah (Upload/Download) dengan database Supabase.
*   **📄 Export Data**:
    *   **KML**: Kompatibel dengan Google Earth.
    *   **CSV**: Kompatibel dengan Excel & Google Maps Import.
    *   **PDF**: Laporan siap cetak dengan rekap material.
*   **🛠️ Tools Lengkap**:
    *   Layer Control (menyembunyikan/menampilkan label & titik aset).
    *   Snap-to-Location (Pasang titik survey di lokasi saat ini).
    *   Standar Konstruksi Lokal Area Banten Selatan (SUTM & SUTR).
    *   Zoom level persists across map updates.
    *   Edit Survey & History Management.
*   **📸 Dokumentasi**: Foto aset langsung dari aplikasi.

## 📱 Screenshots

*(Silakan tambahkan screenshot aplikasi di folder `assets/screenshots` dan link di sini)*

## 🛠️ Tech Stack

*   **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/) (Managed Workflow).
*   **Bahasa**: TypeScript.
*   **Map Engine**: `react-native-maps` (Google Maps API).
*   **Database (Lokal)**: `AsyncStorage`.
*   **Database (Cloud)**: [Supabase](https://supabase.com/).
*   **Build Tool**: EAS (Expo Application Services).

## 🚀 Cara Install & Jalankan

### Prasyarat
*   Node.js (LTS Version).
*   Expo CLI (`npm install -g expo-cli`).

### Langkah-langkah

1.  **Clone Repository**
    ```bash
    git clone https://github.com/Fikrybudi/asoi-by-fikry.git
    cd asoi-by-fikry
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    # atau
    yarn install
    ```

3.  **Setup Supabase**
    *   Buat project baru di Supabase.
    *   Jalankan query SQL di file `supabase_schema.sql` pada SQL Editor Supabase Anda.
    *   Copy `SUPABASE_URL` dan `SUPABASE_ANON_KEY` ke file konfigurasi atau `src/services/supabaseClient.ts`.

4.  **Jalankan Aplikasi**
    ```bash
    npx expo start
    ```
    *   Scan QR Code menggunakan aplikasi **Expo Go** di Android/iOS.
    *   Atau tekan `a` untuk membuka di Android Emulator.

## 📦 Cara Build APK (Android)

Untuk membuat file `.apk` yang bisa diinstal di HP:

1.  **Login ke EAS**
    ```bash
    npx eas-cli login
    ```

2.  **Build Profile Preview**
    ```bash
    npx eas-cli build -p android --profile preview
    ```
3.  Tunggu proses build selesai dan download link APK yang diberikan.

## 📂 Struktur Project

```
pln-survey-app/
├── assets/                 # Icons & Images
├── src/
│   ├── components/         # Reusable UI Components
│   │   ├── Forms/          # Form Input (Tiang, Gardu, Jalur)
│   │   ├── Map/            # Map Logic & Rendering
│   │   └── Toolbar/        # Bottom Action Bar
│   ├── screens/            # Layar Utama (Map, History, Summary)
│   ├── services/           # Logic Database (Local & Supabase)
│   ├── utils/              # Helper Functions (Export, Geo, Logic)
│   └── types/              # TypeScript Definitions
├── App.tsx                 # Entry Point
├── app.json                # Expo Config
└── eas.json                # EAS Build Config
```

## 📝 Lisensi

Copyright © 2025 **Fikry Budi**. All Rights Reserved.
Dibuat khusus untuk keperluan Survey PLN.

---
*Dokumentasi Pengguna lengkap dapat dilihat di [USER_GUIDE.md](./USER_GUIDE.md)*
