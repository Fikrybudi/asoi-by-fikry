// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  PLN SURVEY APP - Standar Konstruksi Lokal Area Banten Selatan           ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// =============================================================================
// KONSTRUKSI SUTM/JTM - SALURAN UDARA TEGANGAN MENENGAH (20 kV)
// Standar Lokal Area Banten Selatan
// =============================================================================

export interface KonstruksiTM {
    kode: string;
    nama: string;
    keterangan: string;
    isolator: string;
}

export const KONSTRUKSI_TM: Record<string, KonstruksiTM> = {
    'TM1B': {
        kode: 'TM1B',
        nama: 'Tiang Penyangga',
        keterangan: 'Jaringan lurus atau sudut ≤5°',
        isolator: 'Pin Insulator'
    },
    'TM2B': {
        kode: 'TM2B',
        nama: 'Tiang Sudut Kecil',
        keterangan: 'Sudut 5° - 30°, double cross arm',
        isolator: 'Pin Insulator'
    },
    'TM3B': {
        kode: 'TM3B',
        nama: 'Tiang Penegang DC',
        keterangan: 'Penegang Double Circuit (4 travers)',
        isolator: 'Suspension + Pin Insulator'
    },
    'TM4B': {
        kode: 'TM4B',
        nama: 'Tiang Penegang (Asfan)',
        keterangan: 'Dipasang setiap 10-15 gawang, pakai Asfan',
        isolator: 'Suspension/Asfan Insulator'
    },
    'TM5B': {
        kode: 'TM5B',
        nama: 'Tiang Portal',
        keterangan: 'Lokasi gardu/portal trafo',
        isolator: 'Pin Insulator'
    },
    'TM7B': {
        kode: 'TM7B',
        nama: 'Tiang Sudut 90°',
        keterangan: 'Belokan siku/tegak lurus',
        isolator: 'Suspension Insulator'
    },
    'TM8B': {
        kode: 'TM8B',
        nama: 'Tiang Percabangan',
        keterangan: 'Titik cabang jaringan TM',
        isolator: 'Pin + Suspension'
    },
    'TM11B': {
        kode: 'TM11B',
        nama: 'Tiang Awal',
        keterangan: 'Tiang awal dengan kabel naik outdoor',
        isolator: 'Suspension Insulator'
    },
    'TM14B': {
        kode: 'TM14B',
        nama: 'Tiang Akhir',
        keterangan: 'Tiang akhir tanpa kabel naik',
        isolator: 'Suspension Insulator'
    },
    'M21': {
        kode: 'M21',
        nama: 'Tiang TM dengan Travers V',
        keterangan: 'Konstruksi TM dengan cross arm bentuk V',
        isolator: 'Pin Insulator'
    },
};

// =============================================================================
// KONSTRUKSI JTR/SUTR - SALURAN UDARA TEGANGAN RENDAH (220/380 V)
// Standar Lokal Area Banten Selatan
// =============================================================================

export interface MaterialTR {
    nama: string;
    jumlah: string;  // e.g. "1,5 M", "2 BH", "1 SET"
}

export interface KonstruksiTR {
    kode: string;
    nama: string;
    keterangan: string;
    material: MaterialTR[];
}

export const KONSTRUKSI_TR: Record<string, KonstruksiTR> = {
    'TR-1B': {
        kode: 'TR-1B',
        nama: 'Penyangga/Suspension',
        keterangan: 'Konstruksi penyangga JTR',
        material: [
            { nama: 'Stainless Steel', jumlah: '1,5 M' },
            { nama: 'Stoping Buckle', jumlah: '2 BH' },
            { nama: 'Suspension Ass', jumlah: '1 SET' },
            { nama: 'Pole Bracket', jumlah: '1 BH' },
            { nama: 'Plastic Strip', jumlah: '2 BH' },
        ]
    },
    'TR-2B': {
        kode: 'TR-2B',
        nama: 'Tumpu Akhir Ganda',
        keterangan: 'Konstruksi tumpu akhir ganda JTR',
        material: [
            { nama: 'Stainless Steel', jumlah: '1,5 M' },
            { nama: 'Stoping Buckle', jumlah: '2 BH' },
            { nama: 'Fixed Dead End Ass', jumlah: '2 BH' },
            { nama: 'Pole Bracket', jumlah: '1 BH' },
            { nama: 'Plastic Strip', jumlah: '2 BH' },
        ]
    },
    'TR-3B': {
        kode: 'TR-3B',
        nama: 'Sudut/Penegang',
        keterangan: 'Konstruksi sudut atau penegang JTR',
        material: [
            { nama: 'Stainless Steel', jumlah: '1,5 M' },
            { nama: 'Stoping Buckle', jumlah: '2 BH' },
            { nama: 'Fixed Dead End Ass', jumlah: '2 BH' },
            { nama: 'Pole Bracket', jumlah: '2 BH' },
            { nama: 'Plastic Strip', jumlah: '4 BH' },
            { nama: 'Turn Buckle / Span Scroof', jumlah: '1 BH' },
        ]
    },
    'TR-4B': {
        kode: 'TR-4B',
        nama: 'Percabangan/Tee-off',
        keterangan: 'Konstruksi percabangan/tee-off JTR',
        material: [
            { nama: 'Stainless Steel', jumlah: '3 M' },
            { nama: 'Stoping Buckle', jumlah: '4 BH' },
            { nama: 'Fixed Dead End Ass', jumlah: '1 SET' },
            { nama: 'Pole Bracket', jumlah: '2 BH' },
            { nama: 'Plastic Strip', jumlah: '5 BH' },
            { nama: 'Turn Buckle / Span Scroof', jumlah: '1 BH' },
            { nama: 'Suspension Ass', jumlah: '1 SET' },
            { nama: 'CCO 70-70 / 70-35 mm', jumlah: '5 BH' },
        ]
    },
    'TR-5B': {
        kode: 'TR-5B',
        nama: 'Percabangan dengan Stey Set',
        keterangan: 'Konstruksi percabangan dengan stey set JTR',
        material: [
            { nama: 'Stainless Steel', jumlah: '3 M' },
            { nama: 'Stoping Buckle', jumlah: '4 BH' },
            { nama: 'Fixed Dead End Ass', jumlah: '3 BH' },
            { nama: 'Pole Bracket', jumlah: '2 BH' },
            { nama: 'Plastic Strip', jumlah: '4 BH' },
            { nama: 'CCO 70-70 / 70-35 mm', jumlah: '5 BH' },
            { nama: 'Stey Set TR', jumlah: '1 SET' },
        ]
    },
    'TR-6B': {
        kode: 'TR-6B',
        nama: 'Penegang Tengah dengan Stey Set',
        keterangan: 'Konstruksi penegang tengah dengan stey set JTR',
        material: [
            { nama: 'Stainless Steel', jumlah: '3 M' },
            { nama: 'Stoping Buckle', jumlah: '4 BH' },
            { nama: 'Fixed Dead End Ass', jumlah: '3 BH' },
            { nama: 'Pole Bracket', jumlah: '2 BH' },
            { nama: 'Plastic Strip', jumlah: '4 BH' },
            { nama: 'Turn Buckle / Span Scroof', jumlah: '1 BH' },
            { nama: 'Stey Set TR', jumlah: '1 SET' },
            { nama: 'CCO 70-70 / 70-35 mm', jumlah: '5 BH' },
        ]
    },
    'TR-7B': {
        kode: 'TR-7B',
        nama: 'Kombinasi Suspension & Dead End',
        keterangan: 'Konstruksi kombinasi suspension dan dead end JTR',
        material: [
            { nama: 'Stainless Steel', jumlah: '3 M' },
            { nama: 'Stoping Buckle', jumlah: '4 BH' },
            { nama: 'Fixed Dead End Ass', jumlah: '2 BH' },
            { nama: 'Pole Bracket', jumlah: '2 BH' },
            { nama: 'Plastic Strip', jumlah: '5 BH' },
            { nama: 'Turn Buckle / Span Scroof', jumlah: '1 BH' },
            { nama: 'Suspension Ass', jumlah: '1 BH' },
            { nama: 'CCO 70-70 / 70-35 mm', jumlah: '5 BH' },
        ]
    },
    'TR-8B': {
        kode: 'TR-8B',
        nama: 'Dead End Ganda',
        keterangan: 'Konstruksi dead end ganda JTR',
        material: [
            { nama: 'Stainless Steel', jumlah: '3 M' },
            { nama: 'Stoping Buckle', jumlah: '4 BH' },
            { nama: 'Fixed Dead End Ass', jumlah: '4 BH' },
            { nama: 'Pole Bracket', jumlah: '2 BH' },
            { nama: 'Plastic Strip', jumlah: '4 BH' },
            { nama: 'CCO 70-70 / 70-35 mm', jumlah: '5 BH' },
            { nama: 'Turn Buckle / Span Scroof', jumlah: '1 BH' },
        ]
    },
    'TR-9B': {
        kode: 'TR-9B',
        nama: 'Persimpangan/Cross',
        keterangan: 'Konstruksi persimpangan/cross JTR',
        material: [
            { nama: 'Stainless Steel', jumlah: '1,5 M' },
            { nama: 'Stoping Buckle', jumlah: '2 BH' },
            { nama: 'Fixed Dead End Ass', jumlah: '4 BH' },
            { nama: 'Pole Bracket', jumlah: '4 BH' },
            { nama: 'Plastic Strip', jumlah: '4 BH' },
            { nama: 'Turn Buckle / Span Scroof', jumlah: '2 BH' },
            { nama: 'CCO 70-70 / 70-35 mm', jumlah: '10 BH' },
        ]
    },
    'TR-10B': {
        kode: 'TR-10B',
        nama: 'Akhir Jaringan & Proteksi',
        keterangan: 'Konstruksi akhir jaringan dengan proteksi JTR',
        material: [
            { nama: 'Stainless Steel', jumlah: '3 M' },
            { nama: 'Stoping Buckle', jumlah: '4 BH' },
            { nama: 'Fixed Dead End Ass', jumlah: '1 BH' },
            { nama: 'Pole Bracket', jumlah: '1 BH' },
            { nama: 'Plastic Strip', jumlah: '2 BH' },
            { nama: 'Turn Buckle / Span Scroof', jumlah: '1 BH' },
            { nama: 'Elektrical Protek', jumlah: '1 SET' },
            { nama: 'Stey Set TR', jumlah: '1 SET' },
            { nama: 'Link 25 X 50', jumlah: '2 BH' },
        ]
    },
    'TR-11B': {
        kode: 'TR-11B',
        nama: 'Tiang Awal/Risers',
        keterangan: 'Konstruksi tiang awal/risers JTR',
        material: [
            { nama: 'Stainless Steel', jumlah: '6 M' },
            { nama: 'Stoping Buckle', jumlah: '7 BH' },
            { nama: 'Fixed Dead End Ass', jumlah: '1 BH' },
            { nama: 'Pole Bracket', jumlah: '1 BH' },
            { nama: 'Plastic Strip', jumlah: '2 BH' },
            { nama: 'Pipa Air 3" X 3000 MM', jumlah: '1 BH' },
            { nama: 'Stey Set TR', jumlah: '1 SET' },
            { nama: 'Link 25 X 50', jumlah: '5 BH' },
        ]
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
        konstruksi: 'TM1B',
        tinggi: '12m',
        bahan: 'Beton',
        kekuatan: '200 daN',
    },
    'SUTR': {
        konstruksi: 'TR-1B',
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
