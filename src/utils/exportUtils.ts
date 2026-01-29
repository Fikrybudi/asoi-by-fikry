// =============================================================================
// PLN SURVEY APP - Export Utilities
// =============================================================================

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Survey } from '../types';

// =============================================================================
// HELPER
// =============================================================================

const shareFile = async (fileUri: string, mimeType: string, dialogTitle: string): Promise<boolean> => {
    try {
        // Always try to share, ignoring isAvailableAsync for debugging purposes
        // In some Expo Go versions, isAvailableAsync can be flaky
        await Sharing.shareAsync(fileUri, {
            mimeType: mimeType,
            dialogTitle: dialogTitle,
            UTI: mimeType === 'text/csv' ? 'public.comma-separated-values-text' : undefined
        });
        return true;
    } catch (error) {
        console.warn('Share failed initial attempt:', error);

        // Retry logic if needed, or just return false
        try {
            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
                // Should have succeeded above, but let's try strict check path
                await Sharing.shareAsync(fileUri, { mimeType, dialogTitle });
                return true;
            }
        } catch (retryError) {
            console.error('Retry share failed:', retryError);
        }

        return false;
    }
};

// =============================================================================
// PDF EXPORT
// =============================================================================

/**
 * Generate HTML for PDF export
 */
const generatePDFHtml = (survey: Survey): string => {
    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    // Calculate totals
    const totalJalurLength = survey.jalurList.reduce((sum, j) => sum + j.panjangMeter, 0);
    const tiangBaru = survey.tiangList.filter(t => t.status !== 'existing').length;
    const tiangEksisting = survey.tiangList.filter(t => t.status === 'existing').length;

    // Generate tiang rows with status indicator
    const tiangRows = survey.tiangList.map((t) => {
        const statusLabel = t.status === 'existing' ? 'EKSISTING' : 'BARU';
        const statusColor = t.status === 'existing' ? '#757575' : '#4CAF50';
        return `
        <tr>
            <td>${t.nomorUrut}</td>
            <td>${t.konstruksi}</td>
            <td>${t.jenisTiang}</td>
            <td>${t.tinggiTiang}</td>
            <td>${t.kekuatanTiang || '-'}</td>
            <td style="color: ${statusColor}; font-weight: bold;">${statusLabel}</td>
            <td>${t.koordinat.latitude.toFixed(6)}, ${t.koordinat.longitude.toFixed(6)}</td>
        </tr>
    `;
    }).join('');

    // Generate gardu rows
    const garduRows = survey.garduList.map((g, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${g.nomorGardu}</td>
            <td>${g.jenisGardu}</td>
            <td>${g.kapasitasKVA} kVA</td>
            <td>${g.merekTrafo || '-'}</td>
            <td>${g.koordinat.latitude.toFixed(6)}, ${g.koordinat.longitude.toFixed(6)}</td>
        </tr>
    `).join('');

    // Generate jalur rows
    const jalurRows = survey.jalurList.map((j, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${j.jenisJaringan}</td>
            <td>${j.jenisPenghantar}</td>
            <td>${j.penampangMM}</td>
            <td>${j.panjangMeter.toFixed(0)} m</td>
            <td>${j.status}</td>
        </tr>
    `).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
            h1 { color: #1976D2; font-size: 18px; margin-bottom: 5px; }
            h2 { color: #333; font-size: 14px; margin-top: 20px; border-bottom: 2px solid #1976D2; padding-bottom: 5px; }
            .header { border-bottom: 3px solid #1976D2; padding-bottom: 10px; margin-bottom: 15px; }
            .meta { color: #666; font-size: 11px; }
            .summary { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            .summary-grid { display: flex; gap: 20px; }
            .summary-item { flex: 1; }
            .summary-label { color: #666; font-size: 10px; }
            .summary-value { font-size: 18px; font-weight: bold; color: #333; }
            .summary-sub { font-size: 10px; color: #666; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #1976D2; color: white; padding: 8px; text-align: left; font-size: 11px; }
            td { padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 10px; }
            tr:nth-child(even) { background: #f9f9f9; }
            .footer { margin-top: 30px; text-align: center; color: #999; font-size: 10px; }
            .status-baru { color: #4CAF50; font-weight: bold; }
            .status-eksisting { color: #757575; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>${survey.namaSurvey}</h1>
            <div class="meta">
                <strong>Jenis:</strong> ${survey.jenisSurvey} | 
                <strong>Lokasi:</strong> ${survey.lokasi} | 
                <strong>Surveyor:</strong> ${survey.surveyor} | 
                <strong>Tanggal:</strong> ${formatDate(survey.tanggalSurvey)}
            </div>
        </div>

        <div class="summary">
            <div class="summary-grid">
                <div class="summary-item">
                    <div class="summary-label">TIANG BARU</div>
                    <div class="summary-value" style="color: #4CAF50;">${tiangBaru}</div>
                    ${tiangEksisting > 0 ? `<div class="summary-sub">+ ${tiangEksisting} eksisting</div>` : ''}
                </div>
                <div class="summary-item">
                    <div class="summary-label">GARDU</div>
                    <div class="summary-value">${survey.garduList.length}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">JALUR</div>
                    <div class="summary-value">${survey.jalurList.length}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">TOTAL PANJANG</div>
                    <div class="summary-value">${totalJalurLength.toFixed(0)} m</div>
                </div>
            </div>
        </div>

        ${survey.tiangList.length > 0 ? `
        <h2>Data Tiang (${tiangBaru} Baru${tiangEksisting > 0 ? ` + ${tiangEksisting} Eksisting` : ''})</h2>
        <table>
            <tr>
                <th>No</th>
                <th>Konstruksi</th>
                <th>Jenis</th>
                <th>Tinggi</th>
                <th>Kekuatan</th>
                <th>Status</th>
                <th>Koordinat</th>
            </tr>
            ${tiangRows}
        </table>
        ` : ''}

        ${(() => {
            const m21Count = survey.tiangList.filter(t => t.konstruksi === 'M21').length;
            return m21Count > 0 ? `
        <h2 style="color: #FF9800;">Material Tambahan</h2>
        <table>
            <tr>
                <th>Material</th>
                <th>Jumlah</th>
                <th>Keterangan</th>
            </tr>
            <tr>
                <td>Travers V</td>
                <td style="font-weight: bold;">${m21Count} SET</td>
                <td>Untuk konstruksi M21</td>
            </tr>
        </table>
        ` : '';
        })()}

        ${survey.garduList.length > 0 ? `
        <h2>Data Gardu (${survey.garduList.length})</h2>
        <table>
            <tr>
                <th>No</th>
                <th>Nomor Gardu</th>
                <th>Jenis</th>
                <th>Kapasitas</th>
                <th>Merek</th>
                <th>Koordinat</th>
            </tr>
            ${garduRows}
        </table>
        ` : ''}

        ${survey.jalurList.length > 0 ? `
        <h2>Data Jalur (${survey.jalurList.length})</h2>
        <table>
            <tr>
                <th>No</th>
                <th>Jaringan</th>
                <th>Penghantar</th>
                <th>Penampang</th>
                <th>Panjang</th>
                <th>Status</th>
            </tr>
            ${jalurRows}
        </table>
        ` : ''}

        <div class="footer">
            Dokumen ini digenerate oleh PLN Survey App pada ${new Date().toLocaleString('id-ID')}
        </div>
    </body>
    </html>
    `;
};

/**
 * Export survey to PDF and share
 */
export const exportToPDF = async (survey: Survey): Promise<boolean> => {
    try {
        const html = generatePDFHtml(survey);

        // Generate PDF
        const { uri } = await Print.printToFileAsync({ html });

        // Share PDF using common helper
        return await shareFile(uri, 'application/pdf', 'Bagikan Laporan Survey');
    } catch (error) {
        console.error('PDF export error:', error);
        return false;
    }
};

// =============================================================================
// KML EXPORT
// =============================================================================

/**
 * Generate KML content for survey
 */
const generateKML = (survey: Survey): string => {
    // Helper to escape XML
    const escapeXml = (str: string) => {
        if (!str) return '';
        return str.replace(/[<>&'"]/g, (c) => {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case "'": return '&apos;';
                case '"': return '&quot;';
                default: return c;
            }
        });
    };

    // Generate tiang placemarks with status
    const tiangPlacemarks = survey.tiangList.map(t => {
        const statusLabel = t.status === 'existing' ? 'EKSISTING' : 'BARU';
        return `
        <Placemark>
            <name>Tiang ${t.nomorUrut} (${statusLabel})</name>
            <description><![CDATA[
                <b>Status:</b> ${statusLabel}<br/>
                <b>Konstruksi:</b> ${t.konstruksi}<br/>
                <b>Jenis:</b> ${t.jenisTiang}<br/>
                <b>Tinggi:</b> ${t.tinggiTiang}<br/>
                <b>Kekuatan:</b> ${t.kekuatanTiang || '-'}<br/>
                <b>Jaringan:</b> ${t.jenisJaringan}
            ]]></description>
            <styleUrl>#tiang-${t.status === 'existing' ? 'eksisting' : 'baru'}-style</styleUrl>
            <Point>
                <coordinates>${t.koordinat.longitude},${t.koordinat.latitude},0</coordinates>
            </Point>
        </Placemark>`;
    }).join('\n');

    // Generate gardu placemarks
    const garduPlacemarks = survey.garduList.map(g => `
        <Placemark>
            <name>${escapeXml(g.nomorGardu)}</name>
            <description><![CDATA[
                <b>Jenis:</b> ${g.jenisGardu}<br/>
                <b>Kapasitas:</b> ${g.kapasitasKVA} kVA<br/>
                <b>Merek:</b> ${g.merekTrafo || '-'}<br/>
                <b>Tahun:</b> ${g.tahunPasang || '-'}
            ]]></description>
            <styleUrl>#gardu-style</styleUrl>
            <Point>
                <coordinates>${g.koordinat.longitude},${g.koordinat.latitude},0</coordinates>
            </Point>
        </Placemark>`).join('\n');

    // Generate jalur lines
    const jalurLines = survey.jalurList.map((j, i) => {
        const coords = j.koordinat.map(c => `${c.longitude},${c.latitude},0`).join(' ');
        const styleUrl = j.jenisJaringan.includes('TM') ? '#jalur-tm-style' : '#jalur-tr-style';
        return `
        <Placemark>
            <name>Jalur ${i + 1} - ${j.jenisJaringan}</name>
            <description><![CDATA[
                <b>Jaringan:</b> ${j.jenisJaringan}<br/>
                <b>Penghantar:</b> ${j.jenisPenghantar}<br/>
                <b>Penampang:</b> ${j.penampangMM}<br/>
                <b>Panjang:</b> ${j.panjangMeter.toFixed(0)} m<br/>
                <b>Status:</b> ${j.status}
            ]]></description>
            <styleUrl>${styleUrl}</styleUrl>
            <LineString>
                <tessellate>1</tessellate>
                <coordinates>${coords}</coordinates>
            </LineString>
        </Placemark>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
    <name>${escapeXml(survey.namaSurvey)}</name>
    <description>Survey: ${escapeXml(survey.jenisSurvey)} - Lokasi: ${escapeXml(survey.lokasi)} - Surveyor: ${escapeXml(survey.surveyor)}</description>
    
    <Style id="tiang-baru-style">
        <IconStyle>
            <color>ff00aa00</color>
            <scale>0.9</scale>
            <Icon><href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href></Icon>
        </IconStyle>
        <LabelStyle><scale>0.7</scale></LabelStyle>
    </Style>
    
    <Style id="tiang-eksisting-style">
        <IconStyle>
            <color>ff757575</color>
            <scale>0.7</scale>
            <Icon><href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href></Icon>
        </IconStyle>
        <LabelStyle><scale>0.6</scale></LabelStyle>
    </Style>
    
    <Style id="gardu-style">
        <IconStyle>
            <color>ff00ff00</color>
            <scale>1.0</scale>
            <Icon><href>http://maps.google.com/mapfiles/kml/shapes/square.png</href></Icon>
        </IconStyle>
        <LabelStyle><scale>0.8</scale></LabelStyle>
    </Style>
    
    <Style id="jalur-tm-style">
        <LineStyle>
            <color>ff0000ff</color>
            <width>3</width>
        </LineStyle>
    </Style>
    
    <Style id="jalur-tr-style">
        <LineStyle>
            <color>ff00ff00</color>
            <width>2</width>
        </LineStyle>
    </Style>
    
    <Folder>
        <name>Tiang (${survey.tiangList.length})</name>
        ${tiangPlacemarks}
    </Folder>
    
    <Folder>
        <name>Gardu (${survey.garduList.length})</name>
        ${garduPlacemarks}
    </Folder>
    
    <Folder>
        <name>Jalur (${survey.jalurList.length})</name>
        ${jalurLines}
    </Folder>
    
</Document>
</kml>`;
};

/**
 * Export survey to KML and share
 */
export const exportToKML = async (survey: Survey): Promise<boolean> => {
    try {
        const kml = generateKML(survey);

        // Create filename
        const safeName = survey.namaSurvey.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${safeName}_${Date.now()}.kml`;

        // Use standard FileSystem with type casting to bypass TS issues
        const fs = FileSystem as any;

        // Try to access directories
        let dir = fs.documentDirectory || fs.cacheDirectory;

        // Fallback for Android Expo Go if standard dirs are null
        if (!dir) {
            console.warn('Standard directories null, using Android fallback path');
            dir = 'file:///data/user/0/host.exp.exponent/cache/';
        }

        const fileUri = dir + fileName;
        console.log('Exporting KML to:', fileUri);

        // Write KML to file
        await fs.writeAsStringAsync(fileUri, kml, {
            encoding: 'utf8',
        });

        // Share using helper
        return await shareFile(fileUri, 'application/vnd.google-earth.kml+xml', 'Bagikan Data KML');

    } catch (error) {
        console.error('KML export error:', error);
        throw error;
    }
};

// =============================================================================
// CSV EXPORT
// =============================================================================

export const exportToCSV = async (survey: Survey): Promise<boolean> => {
    try {
        // Create CSV Header with Status column
        let csvContent = "Nama,Tipe,Status,Latitude,Longitude,Deskripsi,Detail\n";

        // Add Tiang Data with status
        survey.tiangList.forEach(t => {
            const statusLabel = t.status === 'existing' ? 'EKSISTING' : 'BARU';
            const desc = `Konstruksi: ${t.konstruksi} | Tinggi: ${t.tinggiTiang} | Jaringan: ${t.jenisJaringan}`;
            // Escape quotes in description if needed
            const cleanDesc = desc.replace(/"/g, '""');
            csvContent += `Tiang ${t.nomorUrut},Tiang,${statusLabel},${t.koordinat.latitude},${t.koordinat.longitude},"${cleanDesc}",${t.jenisTiang}\n`;
        });

        // Add Gardu Data (no status for gardu)
        survey.garduList.forEach(g => {
            const desc = `Kapasitas: ${g.kapasitasKVA}kVA | Merek: ${g.merekTrafo || '-'}`;
            const cleanDesc = desc.replace(/"/g, '""');
            csvContent += `${g.nomorGardu},Gardu,-,${g.koordinat.latitude},${g.koordinat.longitude},"${cleanDesc}",${g.jenisGardu}\n`;
        });

        const safeName = survey.namaSurvey.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${safeName}_${Date.now()}.csv`;

        // Use standard FileSystem with casting
        const fs = FileSystem as any;
        let dir = fs.documentDirectory || fs.cacheDirectory;

        if (!dir) {
            // Android Fallback
            dir = 'file:///data/user/0/host.exp.exponent/cache/';
        }

        const fileUri = dir + fileName;

        await fs.writeAsStringAsync(fileUri, csvContent, {
            encoding: 'utf8',
        });

        // Share using helper
        return await shareFile(fileUri, 'text/csv', 'Bagikan Data CSV');

    } catch (error) {
        console.error("CSV Export Error:", error);
        return false;
    }
}
