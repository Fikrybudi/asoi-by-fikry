# Catatan Rilis Versi 2.2.1 (Release Notes v2.2.1)

**Tanggal Rilis**: 9 Agustus 2026  
**Aplikasi**: PLN Survey App (ASOI)  

---

### 🌟 Fitur Baru & Peningkatan Utama Versi 2.2.1

1. **📐 Segmentasi Adaptif Berbasis Orientasi (Horizontal vs Vertikal)**:
   - Mengatasi masalah penanda batas `A-A` yang sedikit keluar kanvas pada jalur vertikal (Utara-Selatan).
   - **Horizontal (Timur-Barat)**: Menggunakan rasio cakupan **960px** (80% lebar kanvas A4 Landscape).
   - **Vertikal (Utara-Selatan)**: Otomatis disesuaikan ke **660px** (78% tinggi kanvas A4 Landscape), menjamin penanda `A-A` dan segmen vertikal muat presisi di dalam frame kanvas A4.
   - Panjang garis potong tegak lurus (`cutHalfLength`) disesuaikan menjadi `~28m` untuk menjamin badge `A-A` 100% rapi dan aman di dalam bingkai PDF.

2. **📊 Progress Bar Ekspor PDF Real-Time (0% - 100%)**:
   - Menghapus indikator putar statis (*ActivityIndicator*) pada modal splash ekspor PDF.
   - Menampilkan **Animated Progress Bar Visual** berwarna hijau PLN (`#00C853`) lengkap dengan persentase real-time (`0%` -> `100%`) dan teks deskripsi tahapan ekspor per halaman.

3. **🎯 Ukuran Titik Tiang Ekspor Presisi & Sharp**:
   - Ukuran radius `circleMarker` titik tiang disesuaikan menjadi **`radius: 4.5`** (ketebalan stroke `1.8px`).
   - Ukuran titik tiang di peta dan hasil cetak PDF kini **100% presisi dan selaras** dengan ukuran ikon tiang pada Legenda Peta (`r = 4.5`), tampil tajam dan profesional tanpa terlihat kebesaran.

4. **🔒 Penguncian Permanen Lingkaran Badge Label Tiang (Tidak Reset Saat Zoom)**:
   - Memperbaiki penanganan konversi tipe data `labelPosition` (`Number(t.labelPosition)`) sehingga angka maupun string posisi pergeseran label tidak akan ter-reset saat HTML diregenerasi.
   - Menjadwalkan penguncian koordinat Leaflet (`setLatLng` 30ms) setelah *drag cleanup* selesai. Lingkaran badge tiang (berisi nomor tiang, jenis, dan konstruksi) serta garis hubungnya (*leader line*) **100% terikat permanen di lokasi baru** dan tidak akan melompat kembali ke posisi awal saat melakukan *Zoom In* maupun *Zoom Out*.
   - Memastikan `labelPosition` dipertahankan utuh pada Form Edit Tiang (`TiangForm.tsx`) dan disimpan seketika ke database lokal (`AsyncStorage`).

---

*Dikembangkan untuk keandalan survey kelistrikan PLN.*
