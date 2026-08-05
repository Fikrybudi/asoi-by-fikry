// =============================================================================
// Rincian Pekerjaan Builder
// =============================================================================
// Auto-generates work detail summary lines from survey data
// Used in PDF Gambar export (top-left legend box)

import { Survey } from '../types';

/**
 * Format tinggi tiang string ('9m', '12m') → standard formatted string
 */
function formatTinggi(tinggi: string): string {
    if (!tinggi) return '';
    const clean = tinggi.replace(/[^0-9]/g, '');
    return clean ? `${clean}m` : tinggi;
}

/**
 * Format kekuatan tiang string ('200 daN', '350 daN') → standard formatted string
 */
function formatKekuatan(kekuatan?: string): string {
    if (!kekuatan) return '';
    const clean = kekuatan.replace(/[^0-9]/g, '');
    return clean ? `${clean} daN` : kekuatan;
}

/**
 * Build "Rincian Pekerjaan" lines from survey data.
 * 
 * Structure:
 * - PEKERJAAN SUTM: tiang TM + jalur TM + konstruksi TM
 * - PEKERJAAN SUTR: tiang TR + jalur TR + konstruksi TR
 * - PEKERJAAN SKUTM: (jika ada)
 * - PEKERJAAN SKTM: (jika ada)
 * - GARDU: terpisah sendiri
 */
export function buildRincianPekerjaan(survey: Survey): string[] {
    const lines: string[] = [];
    const tiangList = survey.tiangList || [];
    const jalurList = survey.jalurList || [];
    const garduList = survey.garduList || [];

    if (tiangList.length === 0 && jalurList.length === 0 && garduList.length === 0) {
        return [];
    }

    lines.push('RINCIAN PEKERJAAN :');
    lines.push('');

    // ─────────────────────────────────────────────
    // 1. PEKERJAAN SUTM (tiang TM + jalur TM + konstruksi TM)
    // ─────────────────────────────────────────────
    const tiangSUTM = tiangList.filter(
        t => t.jenisJaringan === 'SUTM' && t.status !== 'existing' && !t.konstruksi?.startsWith('JOINTING-')
    );
    const jalurSUTM = jalurList.filter(
        j => j.jenisJaringan === 'SUTM' && j.status !== 'existing' && j.status !== 'remove'
    );

    if (tiangSUTM.length > 0 || jalurSUTM.length > 0) {
        lines.push('PEKERJAAN SUTM :');
        let nomor = 1;

        // Tiang TM: group by tinggi/kekuatan
        if (tiangSUTM.length > 0) {
            const tiangGroups: Record<string, number> = {};
            for (const t of tiangSUTM) {
                const h = formatTinggi(t.tinggiTiang);
                const k = formatKekuatan(t.kekuatanTiang);
                const key = k ? `TIANG ${h}/${k}` : `TIANG ${h}`;
                tiangGroups[key] = (tiangGroups[key] || 0) + 1;
            }
            for (const [label, count] of Object.entries(tiangGroups)) {
                lines.push(`${label} : ${count} Btg`);
            }
        }

        // Penarikan kabel TM: group by jenisPenghantar+penampang
        if (jalurSUTM.length > 0) {
            const cableGroups: Record<string, { panjang: number; gawang: number }> = {};
            for (const j of jalurSUTM) {
                const key = `${j.jenisPenghantar} ${j.penampangMM.replace('mm²', '')}`;
                if (!cableGroups[key]) cableGroups[key] = { panjang: 0, gawang: 0 };
                cableGroups[key].panjang += j.panjangMeter;
                const jumlahGawang = Math.max(0, j.koordinat.length - 1);
                cableGroups[key].gawang += jumlahGawang;
            }
            for (const [cable, data] of Object.entries(cableGroups)) {
                lines.push(`${nomor}. Penarikan JTM ${cable} : ${Math.round(data.panjang)} mtr (${data.gawang} Gwg)`);
                nomor++;
            }
        }

        // Konstruksi TM: group by konstruksi
        if (tiangSUTM.length > 0) {
            const konstGroups: Record<string, number> = {};
            for (const t of tiangSUTM) {
                if (t.konstruksi) {
                    konstGroups[t.konstruksi] = (konstGroups[t.konstruksi] || 0) + 1;
                }
            }
            for (const [konst, count] of Object.entries(konstGroups)) {
                lines.push(`${nomor}. Konstruksi ${konst} : ${count} set`);
                nomor++;
            }
        }
        lines.push('');
    }

    // ─────────────────────────────────────────────
    // 2. PEKERJAAN SUTR (tiang TR + jalur TR + konstruksi TR)
    // ─────────────────────────────────────────────
    const tiangSUTR = tiangList.filter(
        t => t.jenisJaringan === 'SUTR' && t.status !== 'existing' && !t.konstruksi?.startsWith('JOINTING-')
    );
    const jalurSUTR = jalurList.filter(
        j => j.jenisJaringan === 'SUTR' && j.status !== 'existing' && j.status !== 'remove'
    );

    if (tiangSUTR.length > 0 || jalurSUTR.length > 0) {
        lines.push('PEKERJAAN SUTR :');
        let nomor = 1;

        // Tiang TR: group by tinggi/kekuatan
        if (tiangSUTR.length > 0) {
            const tiangGroups: Record<string, number> = {};
            for (const t of tiangSUTR) {
                const h = formatTinggi(t.tinggiTiang);
                const k = formatKekuatan(t.kekuatanTiang);
                const key = k ? `TIANG ${h}/${k}` : `TIANG ${h}`;
                tiangGroups[key] = (tiangGroups[key] || 0) + 1;
            }
            for (const [label, count] of Object.entries(tiangGroups)) {
                lines.push(`${label} : ${count} Btg`);
            }
        }

        // Penarikan kabel TR
        if (jalurSUTR.length > 0) {
            const cableGroups: Record<string, { panjang: number; gawang: number }> = {};
            for (const j of jalurSUTR) {
                const key = `${j.jenisPenghantar} ${j.penampangMM.replace('mm²', '')}`;
                if (!cableGroups[key]) cableGroups[key] = { panjang: 0, gawang: 0 };
                cableGroups[key].panjang += j.panjangMeter;
                const jumlahGawang = Math.max(0, j.koordinat.length - 1);
                cableGroups[key].gawang += jumlahGawang;
            }
            for (const [cable, data] of Object.entries(cableGroups)) {
                lines.push(`${nomor}. Penarikan JTR ${cable} : ${Math.round(data.panjang)} mtr (${data.gawang} Gwg)`);
                nomor++;
            }
        }

        // Konstruksi TR
        if (tiangSUTR.length > 0) {
            const konstGroups: Record<string, number> = {};
            for (const t of tiangSUTR) {
                if (t.konstruksi) {
                    konstGroups[t.konstruksi] = (konstGroups[t.konstruksi] || 0) + 1;
                }
            }
            for (const [konst, count] of Object.entries(konstGroups)) {
                lines.push(`${nomor}. Konstruksi ${konst} : ${count} set`);
                nomor++;
            }
        }
        lines.push('');
    }

    // ─────────────────────────────────────────────
    // 3. PEKERJAAN SKUTM (jika ada)
    // ─────────────────────────────────────────────
    const tiangSKUTM = tiangList.filter(
        t => t.jenisJaringan === 'SKUTM' && t.status !== 'existing' && !t.konstruksi?.startsWith('JOINTING-')
    );
    const jalurSKUTM = jalurList.filter(
        j => j.jenisJaringan === 'SKUTM' && j.status !== 'existing' && j.status !== 'remove'
    );

    if (tiangSKUTM.length > 0 || jalurSKUTM.length > 0) {
        lines.push('PEKERJAAN SKUTM :');
        let nomor = 1;

        if (tiangSKUTM.length > 0) {
            const tiangGroups: Record<string, number> = {};
            for (const t of tiangSKUTM) {
                const h = formatTinggi(t.tinggiTiang);
                const k = formatKekuatan(t.kekuatanTiang);
                const key = k ? `TIANG ${h}/${k}` : `TIANG ${h}`;
                tiangGroups[key] = (tiangGroups[key] || 0) + 1;
            }
            for (const [label, count] of Object.entries(tiangGroups)) {
                lines.push(`${label} : ${count} Btg`);
            }
        }

        if (jalurSKUTM.length > 0) {
            const cableGroups: Record<string, { panjang: number; gawang: number }> = {};
            for (const j of jalurSKUTM) {
                const key = `${j.jenisPenghantar} ${j.penampangMM.replace('mm²', '')}`;
                if (!cableGroups[key]) cableGroups[key] = { panjang: 0, gawang: 0 };
                cableGroups[key].panjang += j.panjangMeter;
                const jumlahGawang = Math.max(0, j.koordinat.length - 1);
                cableGroups[key].gawang += jumlahGawang;
            }
            for (const [cable, data] of Object.entries(cableGroups)) {
                lines.push(`${nomor}. Penarikan SKUTM ${cable} : ${Math.round(data.panjang)} mtr (${data.gawang} Gwg)`);
                nomor++;
            }
        }

        if (tiangSKUTM.length > 0) {
            const konstGroups: Record<string, number> = {};
            for (const t of tiangSKUTM) {
                if (t.konstruksi) {
                    konstGroups[t.konstruksi] = (konstGroups[t.konstruksi] || 0) + 1;
                }
            }
            for (const [konst, count] of Object.entries(konstGroups)) {
                lines.push(`${nomor}. Konstruksi ${konst} : ${count} set`);
                nomor++;
            }
        }
        lines.push('');
    }

    // ─────────────────────────────────────────────
    // 4. PEKERJAAN SKTM (kabel tanah TM - jika ada)
    // ─────────────────────────────────────────────
    const tiangSKTM = tiangList.filter(
        t => t.jenisJaringan === 'SKTM' && t.status !== 'existing' && !t.konstruksi?.startsWith('JOINTING-')
    );
    const jalurSKTM = jalurList.filter(
        j => j.jenisJaringan === 'SKTM' && j.status !== 'existing' && j.status !== 'remove'
    );
    const jointingSKTMMarkers = tiangList.filter(
        t => t.jenisJaringan === 'SKTM' && t.konstruksi?.startsWith('JOINTING-')
    );

    if (tiangSKTM.length > 0 || jalurSKTM.length > 0 || jointingSKTMMarkers.length > 0) {
        lines.push('PEKERJAAN SKTM :');
        let nomor = 1;

        if (tiangSKTM.length > 0) {
            const tiangGroups: Record<string, number> = {};
            for (const t of tiangSKTM) {
                const h = formatTinggi(t.tinggiTiang);
                const k = formatKekuatan(t.kekuatanTiang);
                const key = k ? `TIANG ${h}/${k}` : `TIANG ${h}`;
                tiangGroups[key] = (tiangGroups[key] || 0) + 1;
            }
            for (const [label, count] of Object.entries(tiangGroups)) {
                lines.push(`${label} : ${count} Btg`);
            }
        }

        let totalSktmPanjang = 0;
        if (jalurSKTM.length > 0) {
            const cableGroups: Record<string, number> = {};
            for (const j of jalurSKTM) {
                const key = `${j.jenisPenghantar} ${j.penampangMM.replace('mm²', '')}`;
                cableGroups[key] = (cableGroups[key] || 0) + j.panjangMeter;
                totalSktmPanjang += j.panjangMeter;
            }
            for (const [cable, panjang] of Object.entries(cableGroups)) {
                // SKTM does NOT use Gawang, just meters!
                lines.push(`${nomor}. Penarikan SKTM ${cable} : ${Math.round(panjang)} mtr`);
                nomor++;
            }
        }

        // Jointing SKTM: calculate based on 300m Haspel standard or explicit markers
        let jointingCount = jointingSKTMMarkers.length;
        if (jointingCount === 0 && totalSktmPanjang >= 300) {
            jointingCount = Math.floor(totalSktmPanjang / 300);
        }

        if (jointingCount > 0) {
            lines.push(`${nomor}. Pemasangan Jointing SKTM : ${jointingCount} Set`);
            nomor++;
        }

        // Pemasangan Terminasi (always 2 Titik for start and end of SKTM line)
        lines.push(`${nomor}. Pemasangan Terminasi : 2 Titik`);
        nomor++;

        if (tiangSKTM.length > 0) {
            const konstGroups: Record<string, number> = {};
            for (const t of tiangSKTM) {
                if (t.konstruksi) {
                    konstGroups[t.konstruksi] = (konstGroups[t.konstruksi] || 0) + 1;
                }
            }
            for (const [konst, count] of Object.entries(konstGroups)) {
                lines.push(`${nomor}. Konstruksi ${konst} : ${count} set`);
                nomor++;
            }
        }
        lines.push('');
    }

    // ─────────────────────────────────────────────
    // 5. GARDU (section terpisah)
    // ─────────────────────────────────────────────
    if (garduList.length > 0) {
        lines.push('GARDU :');
        let nomor = 1;
        for (const g of garduList) {
            lines.push(`${nomor}. Pembangunan Gardu ${g.jenisGardu} ${g.kapasitasKVA} kVA`);
            nomor++;
        }
        lines.push('');
    }

    // If only the header "RINCIAN PEKERJAAN :" and the empty line were added, return empty array
    if (lines.length <= 2) {
        return [];
    }

    return lines;
}
