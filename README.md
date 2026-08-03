# 🗺️ ASOI (Aplikasi Survey Online)

**ASOI** adalah aplikasi mobile berbasis **React Native (Expo)** yang dirancang untuk mempermudah proses survey lapangan aset PLN (Tiang, Gardu, dan Jalur Kabel). Aplikasi ini bekerja secara **Offline-First**, memungkinkan surveyor bekerja di area tanpa sinyal dan menyinkronkan data ke Cloud (Supabase) saat kembali online.

![App Status](https://img.shields.io/badge/version-v2.1-blue) ![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-green) ![Expo](https://img.shields.io/badge/sdk-Expo%2054-black)

## 🆕 What's New in v2.1 (Asoi v2.1)

- **⚡ Standar Kop Gambar Teknik PT PLN (PERSERO)**: Hasil export PDF Gambar kini dilengkapi Kop Gambar Resmi PLN standar CAD/GIS dengan Logo Vector PLN (Perisai Kuning & Petir Merah), Double Outer Frame Border, Data Teknis Peta, dan **Kolom Pengesahan Tanda Tangan Resmi** (Disurvey Oleh, Diperiksa Oleh, Disetujui Oleh Manager PLN ULP/UP3).
- **📋 Form Modal Metadata Export PLN (Persistent & Auto-Remember)**: Modal pre-export yang interaktif untuk menginput Nama UID, UP3, ULP, Surveyor, Jabatan Pemeriksa (*TL HAR*, *TL RENSIS*, atau *ASMAN KONS*), Nama Pemeriksa, dan Manager. Data tersimpan otomatis di perangkat HP sehingga tidak perlu mengetik ulang untuk survey berikutnya.
- **📐 Fixed-Scale Multi-Page PDF Export (`📐 Skala Saat Ini`)**: Export PDF multi-halaman berbasis **skala mengunci (misal `1 : 2.500`)** yang 100% konsisten & seragam dari halaman 1 hingga akhir.
- **📍 Penanda Sambungan Berurutan (`A-A`, `B-B`, `C-C`)**: Sambungan antar halaman berurutan presisi dengan *1-span safety buffer* & margin ~22% sehingga garis potong merah dan badge huruf dijamin 100% utuh, tebal, dan tidak terpotong tepi kertas.
- **👁️ Peningkatan Kontras & Live Skala Peta**:
  - Indikator Skala Peta Real-time (`1 : xxxx`) di pojok kanan atas peta.
  - Ketebalan garis kabel lebih tipis namun ultra-kontras pada peta satelit.
  - Badge label tiang tanpa background box yang warnanya otomatis menyesuaikan mode peta aktif.

---

## ✨ Fitur Utama

*   **📍 Pemetaan Aset**: Plotting posisi Tiang (TR/TM), Gardu, dan Jalur (SUTR/SUTM/SKUTM) secara presisi menggunakan GPS.
*   **📡 Offline Mode**: Data tersimpan aman di HP lokal saat tidak ada internet.
*   **☁️ Cloud Sync**: Sinkronisasi dua arah (Upload/Download) dengan database Supabase.
*   **📄 Export Data Professional**:
    *   **PDF Resmi PLN**: Laporan gambar peta & rekap material dengan Kop Gambar PLN resmi (Single/Multi-page fixed scale).
    *   **KML**: Kompatibel dengan Google Earth.
    *   **CSV**: Kompatibel dengan Excel & Google Maps Import.
*   **🛠️ Tools Lengkap**:
    *   Layer Control (menyembunyikan/menampilkan label & titik aset).
    *   Snap-to-Location (Pasang titik survey di lokasi saat ini).
    *   Standar Konstruksi Lokal Area Banten Selatan (SUTM & SUTR).
    *   Live Real-time Scale Display & Zoom level persistence.
    *   Edit Survey & History Management.
*   **📸 Dokumentasi**: Foto aset langsung dari aplikasi.

---

## 📱 Screenshots

*(Silakan tambahkan screenshot aplikasi di folder `assets/screenshots` dan link di sini)*

---

## 🛠️ Tech Stack

*   **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/) (Managed Workflow).
*   **Bahasa**: TypeScript.
*   **Map Engine**: WebView Leaflet.js dengan Local Inlined html2canvas (100% Offline capture).
*   **PDF Generator**: `pdf-lib` (Vector graphics rendering & custom title block).
*   **Database (Lokal)**: `AsyncStorage` & FileSystem persistence.
*   **Database (Cloud)**: [Supabase](https://supabase.com/).
*   **Build Tool**: EAS (Expo Application Services).

---

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
    ```

3.  **Setup Supabase**
    *   Buat project baru di Supabase.
    *   Jalankan query SQL di file `supabase_schema.sql` pada SQL Editor Supabase Anda.

4.  **Jalankan Aplikasi**
    ```bash
    npx expo start
    ```

---

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

---

## 📂 Struktur Project

```
pln-survey-app/
├── assets/                 # Icons & Images
├── src/
│   ├── components/         # Reusable UI Components
│   │   ├── Forms/          # Form Input (Tiang, Gardu, Jalur, BA)
│   │   ├── Map/            # Map Logic & Rendering (SurveyMap, mapHtml)
│   │   └── Toolbar/        # Bottom Action Bar
│   ├── screens/            # Layar Utama (Map, History, Summary)
│   ├── services/           # Logic Database (Local & Supabase)
│   ├── utils/              # Helper Functions (pdfExport, geoUtils, rincian)
│   └── types/              # TypeScript Definitions
├── App.tsx                 # Entry Point
├── app.json                # Expo Config
└── eas.json                # EAS Build Config
```

---

## 📝 Lisensi

Copyright © 2026 **Fikry Budi**. All Rights Reserved.
Dibuat khusus untuk keperluan Survey PLN.

---
*Dokumentasi Pengguna lengkap dapat dilihat di [USER_GUIDE.md](./USER_GUIDE.md)*
