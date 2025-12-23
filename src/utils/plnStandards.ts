// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  PLN SURVEY APP - Standar Konstruksi Nasional (SPLN)                     ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// =============================================================================
// KONSTRUKSI SUTM/JTM - SALURAN UDARA TEGANGAN MENENGAH (20 kV)
// =============================================================================

export interface KonstruksiTM {
    kode: string;
    nama: string;
    keterangan: string;
    isolator: string;
}

export const KONSTRUKSI_TM: Record<string, KonstruksiTM> = {
    'TM-1': {
        kode: 'TM-1',
        nama: 'Tiang Penyangga',
        keterangan: 'Jaringan lurus atau sudut ≤5°',
        isolator: 'Pin Insulator'
    },
    'TM-2': {
        kode: 'TM-2',
        nama: 'Tiang Sudut Kecil',
        keterangan: 'Sudut 5° - 30°, double cross arm',
        isolator: 'Pin Insulator'
    },
    'TM-3': {
        kode: 'TM-3',
        nama: 'Tiang Penegang (Asfan)',
        keterangan: 'Dipasang setiap 10-15 gawang, pakai Asfan',
        isolator: 'Suspension/Asfan Insulator'
    },
    'TM-3D': {
        kode: 'TM-3D',
        nama: 'Tiang Penegang DC',
        keterangan: 'Penegang Double Circuit (4 travers)',
        isolator: 'Suspension + Pin Insulator'
    },
    'TM-4': {
        kode: 'TM-4',
        nama: 'Tiang Awal/Akhir',
        keterangan: 'Di awal/akhir penarikan, dengan schoor',
        isolator: 'Suspension Insulator'
    },
    'TM-5': {
        kode: 'TM-5',
        nama: 'Tiang Penegang Standar',
        keterangan: 'Tiang penegang SUTM standar',
        isolator: 'Suspension Insulator'
    },
    'TM-5D': {
        kode: 'TM-5D',
        nama: 'Tiang Penegang DC Standar',
        keterangan: 'Penegang DC dengan double schoor',
        isolator: 'Suspension Insulator'
    },
    'TM-6': {
        kode: 'TM-6',
        nama: 'Tiang Sudut 30°-60°',
        keterangan: 'Sudut besar, perlu guy wire',
        isolator: 'Suspension Insulator'
    },
    'TM-7': {
        kode: 'TM-7',
        nama: 'Tiang Sudut 90°',
        keterangan: 'Belokan siku/tegak lurus',
        isolator: 'Suspension Insulator'
    },
    'TM-8': {
        kode: 'TM-8',
        nama: 'Tiang Percabangan',
        keterangan: 'Titik cabang jaringan TM',
        isolator: 'Pin + Suspension'
    },
    'TM-9': {
        kode: 'TM-9',
        nama: 'Tiang Under Crossing',
        keterangan: 'Under crossing dengan jaringan lain',
        isolator: 'Pin atau Suspension'
    },
    'TM-10': {
        kode: 'TM-10',
        nama: 'Tiang Over Crossing',
        keterangan: 'Over crossing SUTT/jembatan',
        isolator: 'Suspension Insulator'
    },
    'TM-11': {
        kode: 'TM-11',
        nama: 'Tiang Portal',
        keterangan: 'Lokasi gardu/portal trafo',
        isolator: 'Pin Insulator'
    },
};

// =============================================================================
// KONSTRUKSI JTR/SUTR - SALURAN UDARA TEGANGAN RENDAH (220/380 V)
// =============================================================================

export interface KonstruksiTR {
    kode: string;
    nama: string;
    keterangan: string;
    assembly: string;
}

export const KONSTRUKSI_TR: Record<string, KonstruksiTR> = {
    'TR-1': {
        kode: 'TR-1',
        nama: 'Tiang Penyangga',
        keterangan: 'Jaringan lurus atau sudut ≤15°',
        assembly: 'Suspension Small Angle'
    },
    'TR-2': {
        kode: 'TR-2',
        nama: 'Tiang Sudut',
        keterangan: 'Sudut >15° hingga 90°, perlu guy wire',
        assembly: 'Dead End / Large Angle'
    },
    'TR-3': {
        kode: 'TR-3',
        nama: 'Tiang Awal/Akhir',
        keterangan: 'Di awal/akhir jaringan (di gardu)',
        assembly: 'Dead End'
    },
    'TR-4': {
        kode: 'TR-4',
        nama: 'Tiang Persimpangan',
        keterangan: 'Di persimpangan/silangan jaringan',
        assembly: 'Suspension Small Angle'
    },
    'TR-5': {
        kode: 'TR-5',
        nama: 'Tiang Pencabangan',
        keterangan: 'Titik cabang jaringan TR',
        assembly: 'Suspension + Dead End'
    },
    'TR-6': {
        kode: 'TR-6',
        nama: 'Tiang Penegang',
        keterangan: 'Setiap 200m atau 10 gawang',
        assembly: 'Dead End'
    },
    'TR-7': {
        kode: 'TR-7',
        nama: 'Tiang Under Crossing',
        keterangan: 'Under crossing dengan jaringan lain',
        assembly: 'Dead End'
    },
    'TR-8': {
        kode: 'TR-8',
        nama: 'Tiang APP/SR',
        keterangan: 'Lokasi pemasangan APP/SR',
        assembly: 'Suspension'
    },
};

// =============================================================================
// KONSTRUKSI SKUTM - SALURAN KABEL UDARA TEGANGAN MENENGAH
// =============================================================================

export interface KonstruksiSKUTM {
    kode: string;
    nama: string;
    keterangan: string;
}

export const KONSTRUKSI_SKUTM: Record<string, KonstruksiSKUTM> = {
    'TM-1T': { kode: 'TM-1T', nama: 'SKUTM Lurus', keterangan: 'Kabel udara tarik lurus' },
    'TM-2T': { kode: 'TM-2T', nama: 'SKUTM Sudut Kecil', keterangan: 'Sudut kecil ≤30°' },
    'TM-3T': { kode: 'TM-3T', nama: 'SKUTM Penegang', keterangan: 'Tiang penegang SKUTM' },
    'TM-4T': { kode: 'TM-4T', nama: 'SKUTM Awal/Akhir', keterangan: 'Konstruksi awal atau akhir' },
    'TM-5T': { kode: 'TM-5T', nama: 'SKUTM Sudut Besar', keterangan: 'Sudut >30°' },
    'TM-6T': { kode: 'TM-6T', nama: 'SKUTM 60°', keterangan: 'Sudut 60 derajat' },
    'TM-7T': { kode: 'TM-7T', nama: 'SKUTM 90°', keterangan: 'Sudut 90 derajat' },
    'TM-8T': { kode: 'TM-8T', nama: 'SKUTM Percabangan', keterangan: 'Titik percabangan' },
    'TM-9T': { kode: 'TM-9T', nama: 'SKUTM Persimpangan', keterangan: 'Titik persimpangan' },
    'TM-10T': { kode: 'TM-10T', nama: 'SKUTM Transisi', keterangan: 'Transisi SUTM ke SKUTM' },
    'TM-11T': { kode: 'TM-11T', nama: 'SKUTM Khusus', keterangan: 'Konstruksi khusus' },
};

// =============================================================================
// JENIS PENGHANTAR
// =============================================================================

export const PENGHANTAR = {
    SR: ['2x10mm²'], // Sambungan Rumah

    JTR: ['NFA2X 3x35+1x25mm²', 'NFA2X 3x50+1x35mm²', 'NFA2X 3x70+1x50mm²', 'NFA2X 3x95+1x70mm²'],

    SUTM: {
        jenis: ['A3C', 'A3CS', 'AAAC', 'AAACS', 'ACSR', 'TACSR'],
        penampang: ['35mm²', '50mm²', '70mm²', '95mm²', '120mm²', '150mm²', '240mm²'],
    },

    SKTM: {
        jenis: ['XLPE', 'N2XSY', 'NA2XSEYBY', 'N2XSEY'],
        penampang: ['150mm²', '240mm²', '300mm²'],
    },
};

// =============================================================================
// GARDU DAN PERALATAN
// =============================================================================

export const KAPASITAS_TRAFO = [25, 50, 100, 160, 200, 250, 315, 400, 500, 630] as const;

export type KapasitasTrafo = typeof KAPASITAS_TRAFO[number];

export interface JenisGardu {
    kode: string;
    nama: string;
}

export const JENIS_GARDU: Record<string, JenisGardu> = {
    'Portal': { kode: 'Portal', nama: 'Gardu Portal' },
    'Cantol': { kode: 'Cantol', nama: 'Gardu Cantol' },
    'Beton': { kode: 'Beton', nama: 'Gardu Beton/Kios' },
    'Ground': { kode: 'Ground', nama: 'Gardu Ground Level' },
};

export const PERALATAN_PROTEKSI = [
    'FCO (Fuse Cut Out)',
    'LA (Lightning Arrester)',
    'Arrester Jaring',
    'LBS (Load Break Switch)',
    'Recloser',
    'Sectionalizer',
] as const;

export const PERLENGKAPAN_JARINGAN = [
    'PSK3',
    'PCA',
    'Cross Arm',
    'Jumper',
    'Ground/Pembumian',
    'Skur',
    'Skur Kontraemas',
    'Guy Wire/Topang Tarik',
] as const;

// =============================================================================
// JENIS TIANG
// =============================================================================

export const JENIS_TIANG = {
    bahan: ['Beton', 'Besi/Baja'] as const,
    tinggi: ['9m', '11m', '12m', '13m', '14m'] as const,
    kekuatan: ['200 daN', '350 daN', '500 daN', '800 daN', '1000 daN'] as const,
};

// =============================================================================
// JENIS JARINGAN
// =============================================================================

export type JenisJaringan = 'SUTM' | 'SKTM' | 'SKUTM' | 'SUTR' | 'SKTR';

export const JENIS_JARINGAN: Record<JenisJaringan, string> = {
    'SUTM': 'Saluran Udara Tegangan Menengah',
    'SKTM': 'Saluran Kabel Tegangan Menengah',
    'SKUTM': 'Saluran Kabel Udara Tegangan Menengah',
    'SUTR': 'Saluran Udara Tegangan Rendah',
    'SKTR': 'Saluran Kabel Tegangan Rendah',
};

// =============================================================================
// DEFAULT VALUES PER JENIS JARINGAN
// =============================================================================

export interface TiangDefaults {
    konstruksi: string;
    tinggi: string;
    bahan: 'Beton' | 'Besi/Baja';
    kekuatan: string;
}

export const DEFAULT_TIANG: Record<'SUTM' | 'SUTR' | 'SKUTM', TiangDefaults> = {
    'SUTM': {
        konstruksi: 'TM-1',
        tinggi: '12m',
        bahan: 'Beton',
        kekuatan: '200 daN',
    },
    'SUTR': {
        konstruksi: 'TR-1',
        tinggi: '9m',
        bahan: 'Beton',
        kekuatan: '200 daN',
    },
    'SKUTM': {
        konstruksi: 'TM-1T',
        tinggi: '12m',
        bahan: 'Beton',
        kekuatan: '350 daN',
    },
};
