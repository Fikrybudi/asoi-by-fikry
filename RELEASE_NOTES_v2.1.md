# 🚀 ASOI v2.1 Release Notes (Aplikasi Survey Online)

**Tanggal Rilis**: 5 Agustus 2026  
**Versi**: `v2.1.0`  
**Platform**: Android & iOS (Expo SDK 54 / React Native)  
**Status Build EAS**: `SUCCEEDED` (Preview APK Ready)

---

## 🌟 Sorotan Utama (Release Highlights)

### 1. 🛡️ Standar Kop Gambar Teknik Resmi PT PLN (PERSERO)
- **Desain CAD Standardized**: Dilengkapi bingkai ganda (*Double Outer Frame Border*), Logo Vector Resmi PLN, Banner Header Biru PLN, dan Tabel Informasi Segmen Lembar.
- **Kolom Pengesahan Tanda Tangan**: Menyediakan 3 kolom tanda tangan resmi (*Disurvey Oleh*, *Diperiksa Oleh*, dan *Disetujui Oleh Manager PLN*).
- **Integrasi Logo PNG Native**: File `assets/logo_pln.png` di-embed secara 100% offline via native Base64 encoding untuk jaminan logo selalu tampil sempurna pada build APK standalone.

### 2. 📋 Form Modal Metadata Kop PLN (Persistent & Auto-Remember)
- **Input Metadata Lengkap**: Mengakomodasi pengisian Nama UID, UP3, ULP, Surveyor, Jabatan Pemeriksa, Nama Pemeriksa, dan Manager.
- **Tombol Cepat Jabatan (Pills)**: Pilihan jabatan pemeriksa fleksibel (*TL HAR*, *TL RENSIS*, *ASMAN KONS*).
- **Pilihan Nilai Default**: Form otomatis terisi nilai awal (`UID Banten`, `UP3 Banten Selatan`, `ULP Labuan`) namun dapat diedit kapan saja.
- **Persistent Storage**: Semua input tersimpan otomatis di memori lokal HP (*FileSystem Config*), sehingga pengguna tidak perlu mengetik ulang untuk survey berikutnya.

### 3. 📐 Multi-Page Fixed-Scale PDF Export (`📐 Skala Saat Ini`)
- **Skala Mengunci & Seragam**: Mengunci skala peta (misal `1 : 2.500`) 100% konsisten dari lembar pertama hingga akhir.
- **Penanda Sambungan Berurutan (`A-A`, `B-B`, `C-C`)**: Sambungan antar lembar dilengkapi garis potong *red dashed* tegak lurus jalur kabel & badge huruf berpasangan.
- **1-Span Safety Buffer & Padding Margin ~22%**: Posisi penanda ditarik mundur 1 tiang sehingga penanda potong & label huruf dijamin utuh, bebas overlap dengan label tiang, dan pas di dalam kanvas.

### 4. ⚡ Optimasi Kecepatan Export PDF Hingga 5x Lebih Cepat
- **Super-Fast Render Loop**: Memangkas waktu export 4+ halaman dari **~30 detik menjadi hanya ~5 detik**.
- **Stabilization Delay 600ms**: Waktu tunggu layout Leaflet dipangkas secara efisien tanpa mengorbankan kestabilan peta.
- **Jeda Inter-Page 400ms**: Waktu transisi antar lembar dipangkas menjadi super responsif.

### 5. 🔍 Rendering High-Definition Crisp & Anti-Pecah
- **Resolution Scale 2x Ultra HD**: Render kanvas `html2canvas` pada kerapatan piksel **2400×1696px (300+ DPI)**.
- **Ukuran Font Teks Ditingkatkan**: Font label tiang (*nomor urut, 9/200, konstruksi*) diperbesar 40% lebih padat & jelas.
- **Marker & Polyline Stroke**: Ketebalan titik tiang & garis jalur kabel disesuaikan untuk kontras tinggi pada mode peta Satelit & Standard.

---

## 🛠️ Ringkasan Perubahan Teknis (Technical Changelog)

- `src/utils/pdfExport.ts`: Refactored `drawOfficialPlnKop`, updated `SurveyInfo` interface with `uidName`, added `PLN_LOGO_PNG_BASE64` embedding, and updated signature block title to `TL HAR`.
- `src/utils/plnLogoBase64.ts`: Added native Base64 constant for `assets/logo_pln.png`.
- `src/utils/mapHtml.ts`: Updated `cutHalfLength` to `0.00042` (~42m), increased font sizes (`fontSize: 9.5px`), set `scale: 2` in `html2canvas`, and reduced capture timeout to `600ms`.
- `App.tsx`: Added `pdfUidName` state (default `UID Banten`), updated modal layout with 3-column UID/UP3/ULP inputs, updated jabatan pills to `TL HAR`, `TL RENSIS`, `ASMAN KONS`, and reduced inter-page loop delay to `400ms`.
- `README.md` & `USER_GUIDE.md`: Fully updated documentation reflecting ASOI v2.1 features.

---

## 📦 Direct Link Build APK

| Versi | Build Profile | Link Download |
|---|---|---|
| **ASOI v2.1** | `preview` (Android) | [Download APK Asoi v2.1 (Expo EAS)](https://expo.dev/accounts/voltagers/projects/pln-survey-app/builds/c6200eb1-2c86-4e4b-b6b4-353984dc3495) |

---
Copyright © 2026 **Fikry Budi**. All Rights Reserved.  
*PLN-OPTADIS GIS System*
