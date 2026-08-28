# Catatan Rilis Versi 2.2.5 (Release Notes v2.2.5)

**Tanggal Rilis**: 28 Agustus 2026  
**Aplikasi**: PLN Survey App (MASIV)  
**Versi**: `v2.2.5` (versionCode: 10)  

---

### 🌟 Peningkatan Utama Versi 2.2.5 (Branch Distance Fix & OTA Updates Ready)

1. **🌿 Presisi Garis Bantu & Indikator Jarak Percabangan**:
   - Memperbaiki kalkulasi `effectiveLastTiang` untuk garis bantu putus-putus peta (`lastTiangCoord`) dan penunjuk jarak (*distance pill*) saat mode percabangan (*Branching Mode*) aktif.
   - **Cabang Pertama (T2R1)**: Garis bantu dan penunjuk jarak mengacu presisi ke tiang titik induk percabangan yang ditunjuk (T2).
   - **Cabang Selanjutnya (T2R2, dst)**: Garis bantu dan penunjuk jarak otomatis tersambung berurutan ke tiang cabangan terakhir yang baru saja dibuat (T2R1).

2. **🚀 Pemasangan Fitur OTA Updates (`expo-updates`)**:
   - Meng-install dan mengonfigurasi modul native `expo-updates` pada project `app.json`.
   - Menyiapkan infrastruktur pembaruan otomatis *Over-The-Air* (OTA). Pembaruan bug fix dan UI di versi-versi mendatang dapat dirilis dalam hitungan detik tanpa memotong kuota build APK.

3. **🏢 Migrasi Project EAS ke Organization (`masiv-dev`)**:
   - Menghubungkan project ke Organization Expo **`masiv-dev`** (Project ID: `a36e1f53-9910-4c53-92c2-2512187a8ff2`) untuk memanfaatkan kuota 30 build gratis per bulan.

---

*Dikembangkan untuk keandalan survey kelistrikan PLN.*
