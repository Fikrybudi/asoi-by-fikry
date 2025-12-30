/**
 * BA Survey PDF Export
 * Generates PDF matching the Berita Acara Survey format
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { BASurveyData } from '../components/Forms/BASurveyForm';

export interface BAPdfOptions {
    baData: BASurveyData;
    unitPLN?: string;
}

/**
 * Generate BA Survey PDF and share/save it
 */
export async function generateBASurveyPdf(options: BAPdfOptions): Promise<string | null> {
    const { baData, unitPLN = 'PLN UP3 Banten Selatan' } = options;

    // Format date
    const tanggal = baData.tanggalSurvey.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    // Format checklist
    const formatCheck = (val: boolean) => val ? 'Iya' : 'Tidak';

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page { size: A4; margin: 20mm 15mm; }
            body { 
                font-family: 'Times New Roman', serif; 
                font-size: 12pt; 
                padding: 0;
                line-height: 1.4;
            }
            h1 { 
                text-align: center; 
                font-size: 16pt; 
                font-weight: bold;
                margin-bottom: 20px;
                text-decoration: underline;
            }
            .header-table { 
                width: 100%; 
                margin-bottom: 20px;
            }
            .header-table td { 
                padding: 3px 0; 
                vertical-align: top;
            }
            .header-table .label { 
                width: 240px; 
                white-space: nowrap;
            }
            .header-table .separator { 
                width: 10px; 
            }
            .checklist-table {
                width: 100%;
                margin-bottom: 20px;
            }
            .checklist-table td {
                padding: 4px 8px;
                vertical-align: top;
            }
            .checklist-table .col-left { width: 50%; }
            .checklist-table .col-right { width: 50%; }
            .checklist-item { margin-bottom: 5px; }
            .sketsa-section {
                margin: 20px 0;
            }
            .sketsa-title {
                font-weight: bold;
                text-decoration: underline;
                margin-bottom: 10px;
            }
            .note-section {
                margin: 20px 0;
                font-size: 10pt;
            }
            .signature-section {
                width: 100%;
                margin-top: 40px;
            }
            .signature-table {
                width: 100%;
            }
            .signature-table td {
                width: 50%;
                text-align: center;
                padding: 10px;
                vertical-align: top;
            }
            .signature-line {
                margin-top: 60px;
                border-bottom: 1px solid black;
                display: inline-block;
                width: 150px;
            }
            .demikian {
                margin: 20px 0;
                font-style: italic;
            }
        </style>
    </head>
    <body>
        <h1>BERITA ACARA SURVEY</h1>

        <table class="header-table">
            <tr>
                <td class="label">Jenis Permohonan / Tarif / Daya</td>
                <td class="separator">:</td>
                <td>${baData.jenisPermohonan} / ${baData.tarifDaya}</td>
            </tr>
            <tr>
                <td class="label">ID Pelanggan / Nama</td>
                <td class="separator">:</td>
                <td>${baData.idPelanggan ? baData.idPelanggan + ' / ' : ''}${baData.namaPelanggan}</td>
            </tr>
            <tr>
                <td class="label">Alamat</td>
                <td class="separator">:</td>
                <td>${baData.alamat}</td>
            </tr>
            <tr>
                <td class="label">Hari / Tanggal</td>
                <td class="separator">:</td>
                <td>${tanggal}</td>
            </tr>
            <tr>
                <td class="label">Hasil Survey Lokasi</td>
                <td class="separator">:</td>
                <td>${baData.hasilSurvey}</td>
            </tr>
        </table>

        <table class="checklist-table">
            <tr>
                <td class="col-left">
                    <div class="checklist-item">1. Perluasan JTM* : <b>${baData.checklist.perluasanJTM ? 'Iya' : 'Tidak'}</b></div>
                    <div class="checklist-item">2. Bangun Gardu* : <b>${baData.checklist.bangunGardu ? 'Iya' : 'Tidak'}</b></div>
                    <div class="checklist-item">3. Perluasan JTR* : <b>${baData.checklist.perluasanJTR ? 'Iya' : 'Tidak'}</b></div>
                    <div class="checklist-item">4. Tanam Tiang* : <b>${baData.checklist.tanamTiang ? 'Iya' : 'Tidak'}</b></div>
                    <div class="checklist-item">5. Dikenakan PFK* : <b>${baData.checklist.dikenakanPFK ? 'Iya' : 'Tidak'}</b></div>
                    <div class="checklist-item">6. Dokumen BATG</div>
                    <div style="padding-left: 20px; font-size: 10pt;">
                        - FC Sertifikat Tanah<br>
                        - FC KTP sesuai dengan sertifikat tanah<br>
                        - FC Akta Pendirian Perusahaan dan atau perubahannya
                    </div>
                </td>
                <td class="col-right">
                    <div class="checklist-item">7. APP dipasang di bagian depan <u><b>${baData.appDipasang}</b></u></div>
                    <div class="checklist-item" style="margin-top: 10px;">8. Konstruksi bangunan gardu distribusi dilakukan oleh <u><b>${baData.konstruksiOleh}</b></u></div>
                    <div style="padding-left: 20px; font-size: 10pt; margin-top: 5px;">
                        - Konstruksi bangunan mengikuti standar konstruksi yang berlaku di PT. PLN (PERSERO) ${unitPLN}<br>
                        - Saat proses konstruksi harus dalam pengawasan PT. PLN (PERSERO) ${unitPLN}
                    </div>
                </td>
            </tr>
        </table>

        <div class="sketsa-section">
            <div class="sketsa-title">Sketsa Perluasan Jaringan :</div>
            <div>- ${baData.keterangan || 'Kebutuhan tiang sesuai lampiran'}</div>
            <div>- gambar <b>TERLAMPIR</b></div>
        </div>

        <div class="note-section">
            <b>note :</b><br>
            <i>*Pilih salah satu / coret yang tidak perlu</i><br>
            Demikian Berita Acara ini dibuat untuk dipergunakan sebagaimana mestinya.
        </div>

        <div class="signature-section">
            <table class="signature-table">
                <tr>
                    <td>
                        <b>Pelanggan / Perwakilan Pelanggan</b>
                        ${baData.signaturePelanggan
            ? `<div style="height: 90px; display: flex; align-items: center; justify-content: center;"><img src="${baData.signaturePelanggan}" style="max-height: 83px; max-width: 270px;" /></div>`
            : '<div class="signature-line"></div>'
        }
                        <div style="margin-top: 5px;"><b>${baData.namaPerwakilan || '_______________'}</b></div>
                    </td>
                    <td>
                        <b>${unitPLN}</b>
                        ${baData.signatureSurveyor
            ? `<div style="height: 90px; display: flex; align-items: center; justify-content: center;"><img src="${baData.signatureSurveyor}" style="max-height: 83px; max-width: 270px;" /></div>`
            : '<div class="signature-line"></div>'
        }
                        <div style="margin-top: 5px;"><b>${baData.namaSurveyor || '_______________'}</b></div>
                    </td>
                </tr>
            </table>
        </div>
    </body>
    </html>
    `;

    try {
        // Generate PDF
        const { uri } = await Print.printToFileAsync({
            html,
            base64: false,
        });

        // Share the PDF directly
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, {
                mimeType: 'application/pdf',
                dialogTitle: 'BA Survey PDF',
            });
        }

        return uri;
    } catch (error) {
        console.error('BA PDF generation error:', error);
        return null;
    }
}
