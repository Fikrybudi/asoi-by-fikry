# Catatan Rilis Versi 2.2.3 (Release Notes v2.2.3)

**Tanggal Rilis**: 11 Agustus 2026  
**Aplikasi**: PLN Survey App (ASOI)  

---

### 🌟 Peningkatan Utama Versi 2.2.3 (Flexibility & Persistence Label Tiang)

1. **📍 Zoom Persistence Label Tiang**:
   - Memperbaiki masalah label tiang yang kembali ke posisi semula (*reset*) saat peta di-zoom.
   - Memoisasi `mapSource` pada komponen WebView peta untuk mencegah reload WebView saat level zoom peta berubah.
   - Menyimpan `labelPosition` secara langsung di state React (`currentSurvey`) sehingga posisi pergeseran label tetap konsisten di semua re-render.

2. **↔️ Jarak Geser Label Dinamis (*Custom Drag Distance*)**:
   - Menghapus batas kaku offset 28m pada saat melepaskan *drag* label.
   - Pengguna kini dapat menarik *badge* label tiang sependek atau sejauh yang dibutuhkan (*custom distance*) untuk menghindari *overlap* informasi di peta.
   - Menghapus penguncian *touch handler* (`dragging.disable()`) sehingga gerakan *drag* label menjadi sangat responsif dan tidak kaku.

---

*Dikembangkan untuk keandalan survey kelistrikan PLN.*
