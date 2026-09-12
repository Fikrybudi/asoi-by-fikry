# Catatan Rilis Versi 2.2.6 (Release Notes v2.2.6)

**Aplikasi**: MASIV (Mobile Asset Surveying, Information and Verification system)  
**Platform**: Android & Web  
**Versi**: `v2.2.6` (Channel: `preview`)  
**Tanggal Rilis**: 12 September 2026  

---

### 🌟 Fitur Baru & Peningkatan Utama Versi 2.2.6

#### 1. 🔔 Sistem Push Notifikasi Khusus Superadmin (Realtime & Offline Catch-Up)
- **Deteksi Otomatis Cloud**: Akun dengan role `superadmin` (seperti `buddy@renbts.com`) akan otomatis menerima notifikasi setiap kali ada survey baru diunggah (`INSERT`) atau diperbarui (`UPDATE`) oleh surveyor lapangan ke Supabase.
- **Floating Toast Alert**: Notifikasi melayang interaktif muncul langsung di layar dengan detail nama survey dan pengunggah.
- **Buka Langsung di Peta**: Mengetuk notifikasi langsung mengunduh dan membuka survey terkait ke tampilan peta GIS.
- **Haptic Vibration & Audio Feedback**: Dilengkapi getaran lembut di mobile dan audio chime di web saat notifikasi masuk.
- **Offline Catch-Up Sync**: Jika aplikasi baru dibuka setelah offline, sistem mendeteksi survey-survey baru yang masuk selama periode offline.

#### 2. 🎯 Optimalisasi UI/UX Header & Auto-Hiding Notification Bell
- **Header Bersih & Lega**: Melepas tombol mata dari header utama agar tampilan bar atas di smartphone tidak padat (*cramped*).
- **Auto-Hide Penuh**: Ikon lonceng notifikasi 🔔 **hanya muncul** jika ada survey baru yang belum dibaca (`unread > 0`). Begitu ditandai sudah dibaca atau dihapus, ikon lonceng **otomatis hilang total (hide)** dari layar.
- **Menu Samping Lebih Rapi**:
  - Menambahkan menu **"Mode Screenshot (Sembunyikan UI)"** ke dalam Menu samping (`☰`).
  - Menambahkan menu **"Pemberitahuan Survey"** di dalam Menu samping untuk mengakses kembali riwayat survey lama.

---

### 🛠️ Detail Perubahan Teknis
- **Supabase Realtime**: Integrasi tabel `surveys` ke dalam publikasi `supabase_realtime` dengan `REPLICA IDENTITY FULL`.
- **Offline Storage**: Manajemen status unread dan cache notifikasi menggunakan `@react-native-async-storage/async-storage` (mobile) dan `localStorage` (web).
- **Direct Save Utility**: Menambahkan fungsi `saveDirect` di `database.ts` untuk memfasilitasi sinkronisasi langsung dari cloud ke SQLite lokal perangkat.
- **Type Safety**: Lolos verifikasi penuh TypeScript (`tsc --noEmit` & Vite build) dengan 0 error.
