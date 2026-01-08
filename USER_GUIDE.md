# 📖 Panduan Penggunaan ASOI v1.4

**ASOI** (Aplikasi Survey Online) adalah aplikasi mobile untuk survey lapangan aset PLN (Tiang, Gardu, dan Jalur Kabel). Aplikasi ini bekerja secara **Offline-First** dan menggunakan standar konstruksi lokal **Area Banten Selatan**.

---

## 📑 Daftar Isi

1. [Login & Autentikasi](#1-login--autentikasi)
2. [Memulai Survey Baru](#2-memulai-survey-baru)
3. [Menggunakan Peta](#3-menggunakan-peta)
4. [Menambah Tiang](#4-menambah-tiang)
5. [Menambah Gardu](#5-menambah-gardu)
6. [Menarik Jalur Kabel](#6-menarik-jalur-kabel)
7. [Standar Konstruksi](#7-standar-konstruksi)
8. [Layer Control](#8-layer-control)
9. [Edit & Hapus Data](#9-edit--hapus-data)
10. [Riwayat Survey](#10-riwayat-survey)
11. [Sinkronisasi Cloud](#11-sinkronisasi-cloud)
12. [Export Laporan](#12-export-laporan)
13. [Berita Acara Survey](#13-berita-acara-survey-ba)
14. [Tips & Troubleshooting](#14-tips--troubleshooting)

---

## 1. Login & Autentikasi

1. Buka aplikasi ASOI.
2. Masukkan **Email** dan **Password** yang sudah terdaftar.
3. Tekan tombol **"Masuk"**.
4. Jika berhasil, Anda akan diarahkan ke halaman peta utama.

> **Catatan**: Akun dibuat oleh Admin melalui Supabase Dashboard. Hubungi admin jika belum punya akun.

---

## 2. Memulai Survey Baru

1. Dari halaman peta, tekan tombol **"📋"** (menu) di pojok kanan atas.
2. Pilih **"Buat Survey Baru"** atau tekan **"+ Baru"** di halaman Riwayat Survey.
3. Isi data survey:
   - **Nama Survey**: Contoh: "Perluasan JTR Desa Sukamaju"
   - **Jenis Survey**: Pasang Baru, Perluasan JTM, Perluasan JTR, dll.
   - **Lokasi**: Contoh: "Kec. Pandeglang"
   - **Nama Surveyor**: Nama Anda
4. Tekan **"Mulai Survey"**.

---

## 3. Menggunakan Peta

### Navigasi Peta
- **Geser**: Drag dengan satu jari untuk menggeser peta.
- **Zoom**: Pinch dengan dua jari atau double-tap.
- **Lokasi Saya**: Tekan tombol **🎯** untuk zoom ke posisi GPS Anda.

### Mode Peta
Tekan tombol **layer** di pojok kanan atas untuk beralih antara:
- **Standard**: Peta jalan biasa
- **Satellite**: Citra satelit

### Toolbar Bawah
| Ikon | Fungsi |
|------|--------|
| ⚡ | Tambah Tiang |
| 🏠 | Tambah Gardu |
| 〰️ | Tarik Jalur Kabel |
| 🎯 | Pasang di Lokasi Saya |
| ❌ | Batalkan Mode |

---

## 4. Menambah Tiang

1. Tekan ikon **⚡** (Tiang) di toolbar bawah.
2. Tekan lokasi di peta dimana tiang akan diletakkan, ATAU tekan **🎯** untuk pasang di lokasi GPS Anda.
3. Form akan muncul. Isi data:

### Jenis Jaringan
| Jenis | Keterangan |
|-------|------------|
| **SUTR** | Saluran Udara Tegangan Rendah (220/380V) |
| **SUTM** | Saluran Udara Tegangan Menengah (20kV) |
| **SKUTM** | Saluran Kabel Udara Tegangan Menengah |

### Tipe Tiang
- **Beton**: Tiang beton pracetak
- **Besi/Baja**: Tiang besi/baja

### Tinggi Tiang
- SUTR: 9m, 11m
- SUTM: 11m, 12m, 14m

### Kekuatan Tiang
- 200 daN, 350 daN, 500 daN

4. Pilih **Konstruksi** sesuai standar lokal (lihat bagian 7).
5. Tambahkan **Catatan** jika perlu.
6. Tekan **"Simpan"**.

> **Fitur Auto-Connect**: Setelah menambah tiang ke-2 dst, aplikasi akan menawarkan untuk otomatis membuat jalur kabel ke tiang sebelumnya!

---

## 5. Menambah Gardu

1. Tekan ikon **🏠** (Gardu) di toolbar bawah.
2. Tekan lokasi di peta.
3. Isi data gardu:

### Jenis Gardu
| Tipe | Keterangan |
|------|------------|
| **Portal** | Gardu tipe portal (2 tiang) |
| **Cantol** | Gardu tipe cantol (1 tiang) |
| **Beton** | Gardu beton/kios |
| **Ground** | Gardu ground mounted |

### Data yang Diisi
- **Nomor Gardu**: Contoh: "GT-001"
- **Nama Gardu**: Contoh: "Gardu Sukamaju 1"
- **Kapasitas (kVA)**: 25, 50, 100, 160, 200, 250, 400, 630

4. Tekan **"Simpan"**.

---

## 6. Menarik Jalur Kabel

1. Tekan ikon **〰️** (Jalur) di toolbar bawah.
2. **Pilih Titik Awal (A)**: Ketuk marker Tiang/Gardu yang sudah ada.
3. **Pilih Titik Akhir (B)**: Ketuk marker tujuan.
4. Form jalur akan muncul. Isi data:

### Jenis Jaringan
- **SUTR**: Tegangan Rendah
- **SUTM**: Tegangan Menengah (kawat telanjang)
- **SKTM**: Saluran Kabel Tegangan Menengah (kabel twisted)
- **SKUTM**: Saluran Kabel Udara Tegangan Menengah

### Jenis Penghantar
| Jaringan | Penghantar Umum |
|----------|-----------------|
| SUTR | NFA2X, LVTC |
| SUTM | A3C, A3CS, AAAC, ACSR |
| SKTM | XLPE, N2XSEY |

### Penampang
- SUTR: 2x10+1x10mm², 3x70+1x50mm², 4x70+1x50mm²
- SUTM: 70mm², 150mm², 240mm²

5. **Panjang** dihitung otomatis, tapi bisa diedit manual.
6. Tekan **"Simpan"**.

---

## 7. Standar Konstruksi

Aplikasi menggunakan **Standar Konstruksi Lokal Area Banten Selatan**.

### Konstruksi SUTM (JTM)

| Kode | Nama | Keterangan |
|------|------|------------|
| **TM1B** | Tiang Penyangga | Jaringan lurus atau sudut ≤5° |
| **TM2B** | Tiang Sudut Kecil | Sudut 5° - 30°, double cross arm |
| **TM3B** | Tiang Penegang DC | Penegang Double Circuit (4 travers) |
| **TM4B** | Tiang Penegang (Asfan) | Dipasang setiap 10-15 gawang |
| **TM5B** | Tiang Portal | Lokasi gardu/portal trafo |
| **TM7B** | Tiang Sudut 90° | Belokan siku/tegak lurus |
| **TM8B** | Tiang Percabangan | Titik cabang jaringan TM |
| **TM11B** | Tiang Awal | Tiang awal dengan kabel naik outdoor |
| **TM14B** | Tiang Akhir | Tiang akhir tanpa kabel naik |

### Konstruksi SUTR (JTR)

| Kode | Nama | Material Utama |
|------|------|----------------|
| **TR-1B** | Penyangga/Suspension | Stainless Steel 1,5M, Suspension Ass 1SET |
| **TR-2B** | Tumpu Akhir Ganda | Fixed Dead End Ass 2BH, Stainless Steel 1,5M |
| **TR-3B** | Sudut/Penegang | Stainless Steel 1,5M, Turn Buckle 1BH |
| **TR-4B** | Percabangan/Tee-off | CCO 70-70 5BH, Suspension Ass 1SET |
| **TR-5B** | Percabangan + Stey Set | Stey Set TR 1SET, CCO 70-70 5BH |
| **TR-6B** | Penegang Tengah + Stey | Stainless Steel 3M, Stey Set TR 1SET |
| **TR-7B** | Suspension & Dead End | Kombinasi keduanya |
| **TR-8B** | Dead End Ganda | Fixed Dead End Ass 4BH |
| **TR-9B** | Persimpangan/Cross | CCO 70-70 10BH, Suspension Ass 2SET |
| **TR-10B** | Akhir Jaringan & Proteksi | Elektrical Protek 1SET, Fixed Dead End 2BH |
| **TR-11B** | Tiang Awal/Risers | Pipa Air 3" 6M, Link 5BH |

---

## 8. Layer Control

Tekan ikon **⚙️** di pojok kanan untuk mengontrol visibilitas:

### Toggle yang Tersedia
| Layer | Fungsi |
|-------|--------|
| **Label Tiang** | Tampilkan/sembunyikan label "T1, T2, T3..." |
| **Label Gardu** | Tampilkan/sembunyikan label "GT-001" |
| **Titik Tiang** | Tampilkan/sembunyikan marker bulat tiang |
| **Titik Gardu** | Tampilkan/sembunyikan marker bulat gardu |
| **Jalur SUTR** | Tampilkan jalur tegangan rendah |
| **Jalur SUTM** | Tampilkan jalur tegangan menengah |
| **Jalur SKUTM** | Tampilkan jalur kabel udara TM |
| **Jalur SKTM** | Tampilkan jalur kabel tanah TM |

---

## 9. Edit & Hapus Data

### Edit Tiang/Gardu
1. Tekan marker Tiang/Gardu di peta.
2. Popup info akan muncul.
3. Tekan **"Edit"** untuk mengubah data.
4. Tekan **"Simpan"** setelah selesai.

### Hapus Tiang/Gardu
1. Tekan marker di peta.
2. Tekan **"Hapus"** di popup.
3. Konfirmasi penghapusan.

### Edit Jalur
1. Tekan garis jalur di peta.
2. Tekan **"Edit"** di popup.
3. Ubah data yang diperlukan.
4. Tekan **"Simpan"**.

---

## 10. Riwayat Survey

Tekan tombol **"📋"** atau akses dari menu untuk melihat daftar survey.

### Tampilan Riwayat
- Daftar muncul sebagai **popup modal** (slide dari bawah)
- Setiap survey menampilkan:
  - Nama Survey
  - Jenis Survey
  - Jumlah Tiang, Gardu, Jalur
  - Tanggal update terakhir
  - Status sync (📱 = lokal, ☁️ = sudah di-cloud)

### Aksi yang Tersedia
- **Ketuk survey** → Buka dan lanjutkan survey
- **Tekan lama** → Hapus survey
- **Tekan ✏️** → Edit detail survey
- **Tekan 👥** → Share survey ke user lain (jika sudah sync)

---

## 11. Sinkronisasi Cloud

### Upload ke Cloud
1. Buka **Riwayat Survey**.
2. Tekan **"Upload"** di bagian atas.
3. Pilih survey yang ingin di-upload (centang).
4. Tekan **"Upload X Survey"**.
5. Tunggu proses selesai.

### Download dari Cloud
1. Buka **Riwayat Survey**.
2. Tekan **"Ambil Data"**.
3. Semua survey dari cloud akan didownload.

### Status Sinkronisasi
| Ikon | Status |
|------|--------|
| 📱 | Data hanya ada di HP (belum di-upload) |
| ☁️ | Data sudah aman di cloud |

---

## 12. Export Laporan

1. Dari halaman peta, tekan tombol **"📝"** (Selesai) di pojok kanan atas.
2. Halaman **Ringkasan Survey** akan muncul.
3. Review data:
   - Total Tiang per jenis
   - Total Gardu per kapasitas
   - Total Panjang Kabel per jenis
4. Pilih format export:

### Format Export
| Format | Kegunaan |
|--------|----------|
| **📄 PDF** | Laporan resmi untuk cetak/arsip |
| **🌍 KML** | Import ke Google Earth |
| **📊 CSV** | Import ke Excel / Google Maps |

5. File akan otomatis dibuka atau bisa di-share via WhatsApp/Email.

---

## 13. Berita Acara Survey (BA)

Untuk membuat Berita Acara Survey:

1. Buka **Riwayat Survey**.
2. Tekan **✏️** (Edit) pada survey yang ingin dibuat BA.
3. Isi data BA:
   - ID Pelanggan
   - Nama Pelanggan
   - Tarif / Daya
   - Hasil Survey
   - Keterangan Sketsa
4. Isi **Checklist Pekerjaan**:
   - ☑️ Perluasan JTM
   - ☑️ Bangun Gardu
   - ☑️ Perluasan JTR
   - ☑️ Tanam Tiang
   - ☑️ Dikenakan PFK
5. Pilih **APP Dipasang di**: Persil / Gardu
6. Pilih **Konstruksi Bangunan Gardu Oleh**: Pelanggan / PLN
7. Tambahkan **Tanda Tangan**:
   - Tanda tangan Perwakilan Pelanggan
   - Tanda tangan Surveyor PLN
8. Tekan **"Simpan"**.
9. Tekan **"📄 Regenerate PDF BA"** untuk membuat PDF Berita Acara.

---

## 14. Tips & Troubleshooting

### Tips Survey
- ✅ **Aktifkan GPS** sebelum memulai survey untuk akurasi terbaik.
- ✅ **Gunakan mode Satellite** untuk identifikasi lokasi lebih mudah.
- ✅ **Simpan secara berkala** dan upload ke cloud jika ada sinyal.
- ✅ **Gunakan fitur Auto-Connect** untuk mempercepat input jalur.
- ✅ **Screenshot peta** menggunakan fitur Hide UI untuk dokumentasi bersih.

### Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Peta tidak muncul | Periksa koneksi internet dan izin lokasi |
| GPS tidak akurat | Tunggu beberapa saat di area terbuka |
| Data tidak tersimpan | Pastikan storage tidak penuh |
| Upload gagal | Periksa koneksi internet |
| Login gagal | Hubungi admin untuk reset password |

### Keyboard Shortcuts
- **Double-tap peta**: Zoom in
- **Pinch peta**: Zoom in/out
- **Tap & hold marker**: Opsi edit/hapus

---

## 📞 Kontak & Support

Untuk bantuan atau laporan bug, hubungi:
- **Tim Development**: [Sesuaikan contact info] +6287773068968 (Whatsapp Only)
- **GitHub Repository**: https://github.com/Fikrybudi/asoi-by-fikry

---

**Versi Dokumen**: 1.4  
**Terakhir Diperbarui**: Januari 2026
