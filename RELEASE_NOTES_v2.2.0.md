# Catatan Rilis Versi 2.2.0 (Release Notes v2.2.0)

**Tanggal Rilis**: 7 Agustus 2026  
**Aplikasi**: PLN Survey App (ASOI)  

---

### 🌟 Fitur Baru & Peningkatan Utama

1. **📌 Expandable & Minimizable Legenda Peta (App UI & Export PDF)**:
   - Legenda peta di layar utama aplikasi kini interaktif dan dapat dilipat/dibuka (*expand/minimize*) menggunakan header `📌 Legenda Peta ▼/▶`.
   - **Sinkronisasi Bidireksional State**: Status terlipat legenda disimpan ke state utama React Native secara otomatis. Legenda dipastikan **TETAP TERLIPAT** dan tidak akan pernah terbuka otomatis saat melakukan *Zoom In*, *Zoom Out*, *Pan*, maupun perpindahan jenis peta.
   - **Tampilan PDF Ekspor**: Pada dokumen PDF ekspor, legenda otomatis digambar utuh (*full expanded*) pada posisi **Pojok Kanan Bawah** peta PDF.

2. **⚓ Orientasi Geometris Otomatis Skur (Stay Set) & Pembumian (Grounding)**:
   - **Stay Set (Skur `⅄`)**:
     - **Tiang Ujung (*Dead-end*)**: Otomatis mengarah 180° berlawanan arah dari jalur kabel untuk menahan tarikan beban.
     - **Tiang Tengah/Sudut**: Otomatis mengarah 60° relatif terhadap arah jalur kabel utama.
     - Ekor huruf `⅄` menempel presisi di titik lingkaran tiang.
   - **Pembumian (Grounding `⏚`)**:
     - Garis penghubung grounding diperpanjang (11px) dan diposisikan **100% tegak lurus lurus ke bawah**.
     - Penataan titik jangkar (*iconAnchor*) disesuaikan secara matematis di `[18px, 16px]`, sehingga simbol grounding tampil utuh tanpa pernah terpotong pada hasil Export PDF Gambar.

3. **💚 Kontras Warna Hijau TR Super Jelas di Peta Satelit / Hybrid**:
   - Garis kabel **SUTR**, titik tiang TR, serta simbol **Pondasi**, **Grounding**, dan **Skur TR** ditingkatkan ke warna **Emerald / Neon Green High-Contrast (`#00E676`)**.
   - Menghasilkan tingkat keterbacaan yang sangat tinggi dan kontras tajam di atas citra satelit/hybrid (pohon & medan gelap).
   - Warna teks label tiang (nomor & konstruksi) serta angka jarak jalur dipertahankan sesuai warna hijau standar semula (`#2E7D32` / `#4CAF50`).

4. **⚡ Pencegahan Error `Row too big to fit into CursorWindow` (Android)**:
   - Pengambilan foto dokumentasi pada Form Tiang dan Gardu dioptimalkan dengan kompresi `quality: 0.5`.
   - Mengurangi ukuran foto dari 5MB-8MB menjadi ~100KB-200KB per foto, mencegah terjadinya kelebihan batas memori `CursorWindow` Android SQLite.

5. **📏 Segmentasi Halaman & Penanda Batas (`A-A`) Presisi**:
   - Cakupan jarak per halaman PDF (*Scale Span Ratio*) diperluas hingga **80% lebar kanvas A4 (960px)**.
   - Menghilangkan masalah pemecahan 2 halaman palsu pada survey yang sebenarnya muat 100% dalam 1 halaman skala 1:2000.
   - Penanda batas survey (`A-A`, `B-B`) kini diletakkan secara presisi di tiang tepi luar area tampilan (*outer edge*).

---

*Dikembangkan untuk keandalan survey kelistrikan PLN.*
