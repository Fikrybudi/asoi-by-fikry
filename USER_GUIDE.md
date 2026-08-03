# 📖 Panduan Penggunaan ASOI v2.1

**ASOI** (Aplikasi Survey Online v2.1) adalah aplikasi mobile untuk survey lapangan aset PLN (Tiang, Gardu, dan Jalur Kabel) dengan dukungan **Export PDF Gambar Kop Resmi PT PLN (PERSERO)**. Aplikasi ini bekerja secara **Offline-First** dan mendukung standar pemetaan CAD/GIS PLN.

---

## 📑 Daftar Isi

1. [Login & Autentikasi](#1-login--autentikasi)
2. [Memulai Survey Baru](#2-memulai-survey-baru)
3. [Menggunakan Peta & Indikator Skala](#3-menggunakan-peta--indikator-skala)
4. [Menambah Tiang](#4-menambah-tiang)
5. [Menambah Gardu](#5-menambah-gardu)
6. [Menarik Jalur Kabel](#6-menarik-jalur-kabel)
7. [Standar Konstruksi](#7-standar-konstruksi)
8. [Layer Control](#8-layer-control)
9. [Edit & Hapus Data](#9-edit--hapus-data)
10. [Riwayat Survey](#10-riwayat-survey)
11. [Sinkronisasi Cloud](#11-sinkronisasi-cloud)
12. [Export Laporan PDF Kop Resmi PLN](#12-export-laporan-pdf-kop-resmi-pln)
13. [Form Metadata Pengesahan Kop PLN](#13-form-metadata-pengesahan-kop-pln)
14. [Berita Acara Survey (BA)](#14-berita-acara-survey-ba)
15. [Fitur Undo](#15-fitur-undo)
16. [Tips & Troubleshooting](#16-tips--troubleshooting)

---

## 1. Login & Autentikasi

1. Buka aplikasi ASOI.
2. Masukkan **Email** dan **Password** yang sudah terdaftar.
3. Tekan tombol **"Masuk"**.
4. Jika berhasil, Anda akan diarahkan ke halaman peta utama.

---

## 2. Memulai Survey Baru

1. Dari halaman peta, tekan tombol **"📋"** (menu) di pojok kanan atas.
2. Pilih **"Buat Survey Baru"** atau tekan **"+ Baru"** di halaman Riwayat Survey.
3. Isi data survey (Nama Survey, Jenis Survey, Lokasi, Nama Surveyor).
4. Tekan **"Mulai Survey"**.

---

## 3. Menggunakan Peta & Indikator Skala

### Navigasi Peta & Skala Live
- **Geser**: Drag dengan satu jari untuk menggeser peta.
- **Zoom**: Pinch dengan dua jari atau double-tap.
- **Indikator Skala Real-time**: Di sudut kanan atas peta terdapat indikator skala live (misal `1 : 2.500` / `1 : 1.500`) yang otomatis diperbarui saat Anda melakukan pinch-in/out.
- **Lokasi Saya**: Tekan tombol **🎯** untuk zoom ke posisi GPS Anda.

### Mode Peta
Tekan tombol **layer** di pojok kanan atas untuk beralih antara:
- **Standard**: Peta jalan biasa
- **Satellite**: Citra satelit (garis kabel disesuaikan lebih kontras & label tiang tanpa background box agar tetap jernih dibaca).

---

## 4. Menambah Tiang

1. Tekan ikon **⚡** (Tiang) di toolbar bawah.
2. Ketuk lokasi di peta atau tekan **🎯** (Lokasi Saya).
3. Isi data Tiang (SUTR, SUTM, SKUTM), Tipe (Beton/Besi), Tinggi (9m, 11m, 12m, 14m), Kekuatan (200daN, 350daN, 500daN), dan Kode Konstruksi.
4. Tekan **"Simpan"**.

> **Fitur Auto-Connect**: Setelah menambah tiang ke-2 dst, aplikasi otomatis menawarkan pembuatan jalur kabel dari tiang sebelumnya!

---

## 5. Menambah Gardu

1. Tekan ikon **🏠** (Gardu) di toolbar bawah.
2. Ketuk lokasi di peta.
3. Isi data Gardu (Portal, Cantol, Beton, Ground), Nomor Gardu, Nama Gardu, dan Kapasitas (kVA).
4. Tekan **"Simpan"**.

---

## 6. Menarik Jalur Kabel

1. Tekan ikon **〰️** (Jalur) di toolbar bawah.
2. Ketuk **Titik Awal (A)** ➔ Ketuk **Titik Akhir (B)**.
3. Isi jenis jaringan (SUTR, SUTM, SKTM, SKUTM) dan jenis penghantar (A3CS, AAAC, XLPE, NFA2X).
4. Tekan **"Simpan"**.

---

## 7. Standar Konstruksi

Mendukung standar konstruksi lengkap PLN:
- **SUTM**: TM1B, TM2B, TM3B, TM4B, TM5B, TM7B, TM8B, TM11B, TM14B.
- **SUTR**: TR-1B s/d TR-11B.

---

## 8. Layer Control

Tekan ikon **⚙️** di pojok kanan atas untuk mengontrol visibilitas label tiang, label gardu, titik tiang, titik gardu, dan jenis jalur (SUTR, SUTM, SKTM, SKUTM).

---

## 9. Edit & Hapus Data

- **Edit/Hapus Tiang/Gardu**: Ketuk marker di peta ➔ pilih Edit / Hapus di popup info.
- **Edit/Hapus Jalur**: Ketuk garis jalur di peta ➔ pilih Edit / Hapus.

---

## 10. Riwayat Survey

Akses dari menu **📋** untuk melihat daftar survey lokal & cloud. Setiap survey menampilkan status sinkronisasi (📱 = lokal, ☁️ = cloud).

---

## 11. Sinkronisasi Cloud

Gunakan tombol **Upload** atau **Ambil Data** pada layar Riwayat Survey untuk menyinkronkan data dengan Supabase Cloud.

---

## 12. Export Laporan PDF Kop Resmi PLN

ASOI v2.1 menghadirkan **Format Kop Gambar Teknik Resmi PT PLN (PERSERO)** yang memenuhi standar pengajuan dokumen teknik:

### Keunggulan Layout PDF:
1. **🛡️ Logo Vector PLN & Double CAD Frame**: Dilengkapi Logo Resmi PLN, Garis Bingkai Ganda CAD, dan Banner Header Biru PLN.
2. **📐 Fixed-Scale Multi-Page PDF (`📐 Skala Saat Ini`)**: Mengunci skala peta (misal `1 : 2.500`) secara 100% konsisten dari halaman pertama hingga akhir.
3. **📍 Sambungan Berurutan (`A-A`, `B-B`, `C-C`)**: Penanda potong merah & badge huruf diletakkan dengan *1-span safety buffer* dan margin ~22% sehingga dijamin utuh 100% dan nyaman dibaca.

---

## 13. Form Metadata Pengesahan Kop PLN

Saat Anda menekan tombol **`📄 Export PDF Gambar`**, akan muncul Form Modal Isian Metadata Kop PLN:

### Data Yang Diisi (Auto-Remember / Tersimpan Otomatis):
- 🏢 **Nama UP3**: Contoh `UP3 Banten Selatan`
- 📍 **Nama ULP**: Contoh `ULP Labuan`
- 👷 **Disurvey Oleh**: Nama Surveyor / Tim Field
- 🔍 **Diperiksa Oleh & Jabatan**: Tombol Cepat (`TL HAR`, `TL RENSIS`, `ASMAN KONS`) + Nama Spv/Pemeriksa.
- 👔 **Disetujui Oleh**: Nama Manager PLN ULP / UP3.

> **Auto-Remember**: Semua data pengesahan di atas tersimpan otomatis di HP. Untuk export selanjutnya di survey lain, form sudah terisi otomatis dan Anda cukup 1-klik `🚀 EXPORT PDF RESMI`.

---

## 14. Berita Acara Survey (BA)

Isi Berita Acara Survey melalui menu Edit Survey pada Riwayat Survey. Lengkapi Checklist Pekerjaan, APP Dipasang, dan Tanda Tangan Digital Pelanggan & Surveyor untuk men-generate PDF BA Resmi.

---

## 15. Fitur Undo

Tombol **🔙 Undo** di pojok kiri bawah menyimpan hingga 20 histori aksi terakhir untuk membatalkan penambahan, pengeditan, atau penghapusan aset secara instan.

---

## 16. Tips & Troubleshooting

- ✅ **Gunakan Mode Skala Saat Ini** saat mengekspor jalur survey yang panjang agar skala cetak di setiap lembar PDF 100% konsisten.
- ✅ **Isi Data Pengesahan PLN** di form export agar dokumen PDF siap di-print dan ditandatangani oleh Spv & Manager.

---

**Versi Dokumen**: 2.1  
**Terakhir Diperbarui**: Agustus 2026
