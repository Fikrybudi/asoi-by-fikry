// =============================================================================
// PLN SURVEY APP - Shared Survey Options Constants
// =============================================================================
// Single source of truth for dropdown options used in both BASurveyForm
// and SurveyHistoryScreen edit form.
// =============================================================================

/**
 * Jenis Permohonan - Pilihan untuk form BA Survey
 */
export const JENIS_PERMOHONAN_OPTIONS = [
    'Pasang Baru',
    'Perluasan Jaringan',
    'Tambah Daya',
    'Penurunan Daya',
    'Perubahan Tarif',
    'Penyambungan Sementara',
    'P2TL',
    'Survey Perencanaan',
];

/**
 * Tarif / Daya - Lengkap sesuai tangga daya PLN
 * Termasuk pilihan "Ketik Manual..." untuk daya yang tidak ada dalam daftar
 */
export const TARIF_DAYA_OPTIONS = [
    // === Rumah Tangga R1 (Subsidi & Non-subsidi) ===
    'R1 / 450VA',
    'R1 / 900VA',
    'R1 / 900VA (RTM)',
    'R1 / 1300VA',
    'R1 / 2200VA',
    // === Rumah Tangga R1M (Menengah) ===
    'R1M / 3500VA',
    'R1M / 4400VA',
    'R1M / 5500VA',
    'R1M / 6600VA',
    'R1M / 7700VA',
    'R1M / 10600VA',
    'R1M / 11000VA',
    'R1M / 13200VA',
    // === Rumah Tangga R2 (Besar) ===
    'R2 / 14000VA',
    'R2 / 16500VA',
    'R2 / 22000VA',
    'R2 / 33000VA',
    'R2 / 41500VA',
    'R2 / 53000VA',
    // === Rumah Tangga R3 (Besar > 66kVA) ===
    'R3 / 66000VA',
    'R3 / 82500VA',
    'R3 / 105000VA',
    'R3 / 131000VA',
    'R3 / 147000VA',
    'R3 / 197000VA',
    // === Bisnis B1 (Kecil) ===
    'B1 / 450VA',
    'B1 / 900VA',
    'B1 / 1300VA',
    'B1 / 2200VA',
    'B1 / 3500VA',
    'B1 / 4400VA',
    'B1 / 5500VA',
    // === Bisnis B2 (Menengah) ===
    'B2 / 6600VA',
    'B2 / 7700VA',
    'B2 / 10600VA',
    'B2 / 11000VA',
    'B2 / 13200VA',
    'B2 / 16500VA',
    'B2 / 22000VA',
    'B2 / 33000VA',
    'B2 / 41500VA',
    'B2 / 53000VA',
    'B2 / 66000VA',
    'B2 / 82500VA',
    'B2 / 105000VA',
    'B2 / 131000VA',
    'B2 / 147000VA',
    'B2 / 197000VA',
    'B2 / 200000VA',
    // === Bisnis B3 (Besar > 200kVA) ===
    'B3 / >200kVA',
    // === Publik/Pemerintah P1 (Kecil) ===
    'P1 / 450VA',
    'P1 / 900VA',
    'P1 / 1300VA',
    'P1 / 2200VA',
    'P1 / 3500VA',
    'P1 / 4400VA',
    'P1 / 5500VA',
    // === Publik/Pemerintah P2 (Menengah) ===
    'P2 / 6600VA',
    'P2 / 7700VA',
    'P2 / 10600VA',
    'P2 / 11000VA',
    'P2 / 13200VA',
    'P2 / 16500VA',
    'P2 / 22000VA',
    'P2 / 33000VA',
    'P2 / 41500VA',
    'P2 / 53000VA',
    'P2 / 66000VA',
    'P2 / 82500VA',
    'P2 / 105000VA',
    'P2 / 131000VA',
    'P2 / 147000VA',
    'P2 / 197000VA',
    'P2 / 200000VA',
    // === Publik/Pemerintah P3 (Besar > 200kVA) ===
    'P3 / >200kVA',
    // === Industri I1 ===
    'I1 / 450VA',
    'I1 / 900VA',
    'I1 / 1300VA',
    'I1 / 2200VA',
    'I1 / 3500VA',
    'I1 / 4400VA',
    'I1 / 5500VA',
    // === Industri I2 ===
    'I2 / 6600VA',
    'I2 / 7700VA',
    'I2 / 10600VA',
    'I2 / 11000VA',
    'I2 / 13200VA',
    'I2 / 14000VA',
    // === Industri I3 ===
    'I3 / 16500VA',
    'I3 / 22000VA',
    'I3 / 33000VA',
    'I3 / 41500VA',
    'I3 / 53000VA',
    'I3 / 66000VA',
    'I3 / 82500VA',
    'I3 / 105000VA',
    'I3 / 131000VA',
    'I3 / 147000VA',
    'I3 / 197000VA',
    'I3 / 200000VA',
    // === Industri I4 (Besar > 200kVA TM) ===
    'I4 / >200kVA',
    // === Sosial S1 ===
    'S1 / 220VA',
    'S1 / 450VA',
    'S1 / 900VA',
    'S1 / 1300VA',
    'S1 / 2200VA',
    // === Sosial S2 ===
    'S2 / 3500VA',
    'S2 / 4400VA',
    'S2 / 5500VA',
    'S2 / 6600VA',
    'S2 / 7700VA',
    'S2 / 10600VA',
    'S2 / 11000VA',
    'S2 / 13200VA',
    'S2 / 16500VA',
    'S2 / 22000VA',
    'S2 / 33000VA',
    'S2 / 41500VA',
    'S2 / 53000VA',
    'S2 / 66000VA',
    'S2 / 82500VA',
    'S2 / 105000VA',
    'S2 / 200000VA',
    // === Sosial S3 (Besar > 200kVA) ===
    'S3 / >200kVA',
    // === Penerangan Jalan Umum ===
    'PJU',
    // === Manual ===
    'Ketik Manual...',
];

/**
 * Hasil Survey Lokasi
 */
export const HASIL_SURVEY_OPTIONS = [
    'Survei Perencanaan',
    'Layak Pasang',
    'Tidak Layak',
    'Perlu Perluasan',
    'Pending Dokumen',
];

/**
 * Default checklist BA Survey
 */
export const DEFAULT_BA_CHECKLIST = {
    perluasanJTM: false,
    bangunGardu: false,
    perluasanJTR: false,
    tanamTiang: false,
    dikenakanPFK: false,
};

/**
 * Label checklist items
 */
export const CHECKLIST_ITEMS = [
    { key: 'perluasanJTM', label: 'Perluasan JTM' },
    { key: 'bangunGardu', label: 'Bangun Gardu' },
    { key: 'perluasanJTR', label: 'Perluasan JTR' },
    { key: 'tanamTiang', label: 'Tanam Tiang' },
    { key: 'dikenakanPFK', label: 'Dikenakan PFK' },
];

/**
 * Cek apakah nilai tarif/daya termasuk opsi bawaan (bukan custom)
 */
export function isPresetTarifDaya(value: string): boolean {
    return TARIF_DAYA_OPTIONS.includes(value) && value !== 'Ketik Manual...';
}
