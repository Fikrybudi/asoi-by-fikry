# Catatan Rilis Versi 2.2.2 (Release Notes v2.2.2)

**Tanggal Rilis**: 9 Agustus 2026  
**Aplikasi**: PLN Survey App (ASOI)  

---

### 🌟 Peningkatan Utama Versi 2.2.2 (High-Performance PDF Export Engine)

1. **⚡ Ekspor PDF 10x Lebih Cepat & Hemat Ukuran File hingga 85%**:
   - Mengubah kompresi penangkapan peta (*html2canvas*) dari uncompressed PNG 32-bit menjadi **High-Quality Compressed JPEG (`0.85`)**.
   - **Ukuran File PDF**: Turun drastis dari **>10MB** menjadi hanya **~1.2MB - 2.0MB** (Hemat Penyimpanan ~85%!).
   - **Kecepatan Ekspor**: Memangkas waktu proses ekspor dari **~35 detik** menjadi **hanya ~3 - 5 detik** (10x Lebih Cepat!).
   - **Direct Stream Embedding**: Menyuntikkan stream JPEG langsung ke dalam `pdf-lib` tanpa dekoding ulang, menghindarkan error kehabisan memori (*out of memory*) di perangkat Android.
   - **Pencepatan Penstabilan Tile**: Memangkas *wait timeout* penstabilan tile Leaflet dari 600ms menjadi 350ms per halaman.

---

*Dikembangkan untuk keandalan survey kelistrikan PLN.*
