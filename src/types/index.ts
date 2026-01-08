// =============================================================================
// PLN SURVEY APP - Data Types
// =============================================================================

export interface Coordinate {
    latitude: number;
    longitude: number;
}

// =============================================================================
// TIANG (POLE)
// =============================================================================

export interface Tiang {
    id: string;
    nomorUrut: number;
    koordinat: Coordinate;

    // Jenis tiang
    jenisTiang: 'Beton' | 'Besi/Baja' | 'Kayu';
    tinggiTiang: string; // '9m', '11m', '12m', '14m'
    kekuatanTiang?: string; // '200 daN', '350 daN', etc.

    // Konstruksi
    jenisJaringan: 'SUTM' | 'SUTR' | 'SKUTM';
    konstruksi: string; // 'TM1B', 'TM2B', 'TR-1B', etc. (Standar Lokal Banten Selatan)

    // Status (for existing vs new poles)
    status?: 'existing' | 'planned';

    // Perlengkapan
    perlengkapan: string[];

    // Dokumentasi
    foto?: string[];
    catatan?: string;

    // Metadata
    createdAt: Date;
    updatedAt: Date;
    isSynced: boolean;
}

// =============================================================================
// GARDU (SUBSTATION)
// =============================================================================

export interface Gardu {
    id: string;
    nomorGardu: string;
    namaGardu?: string;
    koordinat: Coordinate;

    // Jenis gardu
    jenisGardu: 'Portal' | 'Cantol' | 'Beton' | 'Ground';
    kapasitasKVA: number;

    // Trafo
    merekTrafo?: string;
    tahunPasang?: number;

    // Proteksi
    peralatanProteksi: string[];

    // Dokumentasi
    foto?: string[];
    catatan?: string;

    // Metadata
    createdAt: Date;
    updatedAt: Date;
    isSynced: boolean;
}

// =============================================================================
// JALUR KABEL (CABLE ROUTE)
// =============================================================================

export interface JalurKabel {
    id: string;
    namaJalur?: string;

    // Koordinat jalur (polyline)
    koordinat: Coordinate[];

    // Jenis jaringan
    jenisJaringan: 'SUTM' | 'SKTM' | 'SKUTM' | 'SUTR' | 'SKTR';

    // Penghantar
    jenisPenghantar: string; // 'A3C', 'AAAC', 'XLPE', etc.
    penampangMM: string; // '150mm²', '240mm²', etc.

    // Panjang (meter) - dihitung otomatis dari koordinat
    panjangMeter: number;

    // Tiang yang terhubung
    tiangIds: string[];

    // Status
    status: 'existing' | 'planned' | 'remove';

    // Dokumentasi
    catatan?: string;

    // Metadata
    createdAt: Date;
    updatedAt: Date;
    isSynced: boolean;
}

// =============================================================================
// SURVEY PROJECT
// =============================================================================

export type JenisSurvey =
    | 'Pasang Baru'
    | 'Perluasan Jaringan'
    | 'Perluasan JTM'
    | 'Perluasan JTR'
    | 'Pasang Gardu Baru'
    | 'Uprating JTM'
    | 'Uprating JTR'
    | 'Tarik Feeder Baru'
    | 'Tarik Link Manuver'
    | 'Rehabilitasi Jaringan'
    | 'PRK Uprating'
    | 'PRK Manuver'
    | 'PRK Feeder Baru'
    | 'Pemeliharaan'
    | 'Survey Umum'
    | string;

export interface Survey {
    id: string;
    namaSurvey: string;
    jenisSurvey: JenisSurvey;

    // Lokasi
    lokasi: string;
    kecamatan?: string;
    kelurahan?: string;

    // Feeder
    namaFeeder?: string;
    namaGarduInduk?: string;

    // BA Survey fields
    idPelanggan?: string;
    namaPelanggan?: string;
    alamatPelanggan?: string;
    tarifDaya?: string;
    hasilSurvey?: string;
    namaPerwakilan?: string;
    keterangan?: string;
    appDipasang?: 'Persil' | 'Gardu';
    konstruksiOleh?: 'Pelanggan' | 'PLN';
    // URL tanda tangan
    signaturePelanggan?: string;
    signatureSurveyor?: string;

    // BA Checklist
    baChecklist?: {
        perluasanJTM: boolean;
        bangunGardu: boolean;
        perluasanJTR: boolean;
        tanamTiang: boolean;
        dikenakanPFK: boolean;
    };

    // Data survey
    tiangList: Tiang[];
    garduList: Gardu[];
    jalurList: JalurKabel[];



    // Rencana teknik summary
    rencanaTeknik?: RencanaTeknik;

    // Surveyor info
    surveyor: string;
    tanggalSurvey: Date;

    // Metadata
    createdAt: Date;
    updatedAt: Date;
    isSynced: boolean;
}

// =============================================================================
// RENCANA TEKNIK (TECHNICAL PLAN SUMMARY)
// =============================================================================

export interface RencanaTeknik {
    // Penghantar
    pasangPenghantar: { jenis: string; panjangKMS: number }[];
    bongkarPenghantar: { jenis: string; panjangKMS: number }[];

    // Tiang
    pasangTiang: { jenis: string; jumlah: number }[];
    bongkarTiang: { jenis: string; jumlah: number }[];

    // Gardu
    pasangGardu: { kapasitas: number; jumlah: number }[];
    bongkarGardu: { kapasitas: number; jumlah: number }[];

    // Peralatan lain
    pasangPeralatan: { nama: string; jumlah: number }[];
}

// =============================================================================
// OFFLINE SYNC QUEUE
// =============================================================================

export interface SyncQueueItem {
    id: string;
    entityType: 'survey' | 'tiang' | 'gardu' | 'jalur';
    entityId: string;
    action: 'create' | 'update' | 'delete';
    data: any;
    createdAt: Date;
    retryCount: number;
}

// =============================================================================
// SHARE SURVEY (COLLABORATION)
// =============================================================================

export interface SurveyShare {
    id: string;
    surveyId: string;
    sharedByUserId: string;
    sharedWithEmail: string;
    createdAt: Date;
}
