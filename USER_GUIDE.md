# 📖 Panduan Penggunaan ASOI (Aplikasi Survey Online)

Dokumen ini berisi panduan lengkap cara menggunakan aplikasi ASOI untuk keperluan survey lapangan.

## 1. Memulai Survey Baru
1.  Buka Aplikasi.
2.  Pilih **"Buat Survey Baru"**.
3.  Masukkan detail survey:
    *   **Nama Survey**: (Contoh: Feeder Manggis)
    *   **Lokasi**: (Contoh: Kec. Medan Barat)
    *   **Nama Surveyor**: (Nama Anda)
4.  Pilih **"Mulai Survey"**. Anda akan diarahkan ke tampilan Peta.

## 2. Menggunakan Peta & Menambah Data

### Menambah Tiang (TR/TM)
1.  Geser peta ke lokasi tiang, atau tekan tombol **🎯** (lokasi saya) untuk zoom ke posisi Anda.
2.  Tekan tombol ikon **Tiang (⚡)** di menu bawah.
3.  Pilih Jenis Jaringan:
    *   **SUTR** (Tegangan Rendah): Tiang Besi/Beton 9m, 11m.
    *   **SUTM** (Tegangan Menengah): Tiang Beton 11m, 12m, 14m.
4.  Pilih **Konstruksi** berdasarkan standar lokal Area Banten Selatan:
    *   **SUTM**: TM1B, TM2B, TM3B, TM4B, TM5B, TM7B, TM8B, TM11B, TM14B.
    *   **SUTR**: TR-1B s/d TR-11B (lengkap dengan detail material).
5.  Isi data konstruksi dan keterangan.
6.  Tekan **"Simpan"**. Marker tiang akan muncul di peta.

### Menambah Gardu
1.  Tekan tombol ikon **Gardu (🏠)**.
2.  Pilih tipe (Portal/Cantol).
3.  Isi Kapasitas (kVA) dan Nama Gardu.
4.  Tekan **"Simpan"**.

### Menarik Jalur Kabel (SUTM/SUTR)
1.  Tekan tombol ikon **Jalur (〰️)**.
2.  **Pilih Titik Awal**: Klik pada marker Tiang/Gardu yang sudah ada di peta (Titik A akan terisi).
3.  **Pilih Titik Akhir**: Klik pada marker tujuan (Titik B akan terisi).
4.  Pilih jenis kabel dan panjang (otomatis terhitung, tapi bisa diedit manual).
5.  Tekan **"Simpan"**. Garis jalur akan tergambar di peta.

## 3. Fitur Tools Lainnya

*   **Ganti Mode Peta**: Klik ikon Layer di kanan atas untuk ganti Satellite/Standard.
*   **Pasang Disini**: Tombol cepat untuk memasang marker tepat di koordinat GPS Anda berdiri saat ini.
*   **Layer Control**: Klik ikon ⚙️ untuk mengatur visibilitas:
    *   **Label Tiang/Gardu**: Tampilkan/sembunyi nama label.
    *   **Titik Tiang/Gardu**: Tampilkan/sembunyi marker bulat.
    *   **Jalur Kabel**: Toggle per jenis (SUTR/SUTM/SKUTM).
*   **Zoom Persisten**: Level zoom peta tetap tersimpan saat menambah data.

## 4. Menyimpan & Sinkronisasi Data

Data otomatis tersimpan di HP setiap kali Anda menekan tombol "Simpan". Namun untuk backup ke server (Cloud), ikuti langkah ini:

### Upload Data (Ke Cloud)
1.  Masuk ke menu **Riwayat Survey**.
2.  Cek status survey:
    *   📱 (Ikon HP) = Belum di-upload.
    *   ☁️ (Awan Biru) = Sudah aman di Cloud.
3.  Tekan tombol **"Upload (☁️⬆️)"** di bagian atas.
4.  Tunggu hingga muncul pesan "Berhasil".

### Download Data (Dari Cloud)
Jika Anda ganti HP atau data terhapus:
1.  Di menu Riwayat, tekan tombol **"Ambil Data (☁️⬇️)"**.
2.  Data dari database pusat akan ditarik kembali ke HP Anda.

## 5. Export Laporan

Setelah survey selesai:
1.  Tekan tombol **"Selesai" (📝)** di pojok kanan atas peta.
2.  Anda akan melihat **Ringkasan Material** (Total Tiang, Total Panjang Kabel).
3.  Pilih format export:
    *   **📄 PDF**: Untuk laporan resmi/cetak.
    *   **🌍 KML**: Untuk dibuka di Google Earth (File `.kml`).
    *   **📊 CSV**: Untuk dibuka di Microsoft Excel.
4.  File akan otomatis terbuka/bisa dishare via WhatsApp/Email.

---
**Tips**: Pastikan GPS selalu aktif saat survey untuk akurasi terbaik!
