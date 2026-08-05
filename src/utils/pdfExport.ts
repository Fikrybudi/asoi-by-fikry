// =============================================================================
// PDF Export with Map Screenshot - Official PT PLN (Persero) Kop Format
// Standar Gambar Teknik & Survey Peta Jaringan PLN (OPTADIS GIS System)
// =============================================================================

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { decode as base64Decode } from 'base64-arraybuffer';

// =============================================================================
// TYPES
// =============================================================================

export interface SurveyInfo {
    name: string;
    location: string;
    uidName?: string;         // e.g. "UID Banten"
    up3Name?: string;         // e.g. "UP3 Banten Selatan"
    ulpName?: string;         // e.g. "ULP Labuan"
    surveyorName?: string;    // e.g. "Fikry"
    pemeriksaTitle?: string;  // e.g. "SPV PEMELIHARAAN" or "SPV PERENCANAAN"
    pemeriksaName?: string;   // e.g. "Budi Santoso"
    managerName?: string;     // e.g. "Ahmad Hidayat"
    rincianLines?: string[];
}

export interface PageMeta {
    pageNumber: number;
    totalPages: number;
    firstNomor: number;
    lastNomor: number;
    panjangMeter: number;
}

// Rincian Pekerjaan box style
const RINCIAN = {
    fontSize: 6,          // small font for the legend
    lineHeight: 8,        // spacing between lines
    paddingX: 6,          // inner padding horizontal
    paddingY: 5,          // inner padding vertical
    headerFontSize: 7,    // slightly bigger for headers
    margin: 8,            // margin from map edge
    bgOpacity: 0.88,      // background transparency
};

import { PLN_LOGO_PNG_BASE64 } from './plnLogoBase64';

/**
 * Helper to embed PNG logo into pdfDoc (100% offline & reliable in all builds)
 */
async function getPlnLogoImage(pdfDoc: PDFDocument) {
    try {
        const logoBytes = base64Decode(PLN_LOGO_PNG_BASE64);
        return await pdfDoc.embedPng(logoBytes);
    } catch (e) {
        console.warn('Failed to embed PLN logo:', e);
    }
    return null;
}

// =============================================================================
// OFFICIAL PLN KOP & FRAME DRAWING
// =============================================================================

/**
 * Draw Official PT PLN (Persero) Kop Gambar Teknik & Double Frame Border
 */
function drawOfficialPlnKop(
    page: any,
    font: any,
    fontBold: any,
    surveyInfo: SurveyInfo,
    meta?: PageMeta,
    pageWidth: number = 841.89,
    pageHeight: number = 595.28,
    plnLogoImage?: any
) {
    // 1. Double CAD Page Frame
    page.drawRectangle({
        x: 12,
        y: 12,
        width: pageWidth - 24,
        height: pageHeight - 24,
        borderColor: rgb(0.0, 0.22, 0.45),
        borderWidth: 1.5,
    });
    page.drawRectangle({
        x: 15,
        y: 15,
        width: pageWidth - 30,
        height: pageHeight - 30,
        borderColor: rgb(0.0, 0.22, 0.45),
        borderWidth: 0.5,
    });

    // 2. Kop Box Outer Box (Height: 88pt, Bottom Y: 18pt)
    const kopX = 18;
    const kopY = 18;
    const kopWidth = pageWidth - 36;
    const kopHeight = 88;

    page.drawRectangle({
        x: kopX,
        y: kopY,
        width: kopWidth,
        height: kopHeight,
        color: rgb(0.98, 0.99, 1.0),
        borderColor: rgb(0.0, 0.22, 0.45),
        borderWidth: 1.2,
    });

    // Header Blue Banner Bar (Top Row: y = kopY + kopHeight - 26 = 80pt)
    const headerY = kopY + kopHeight - 26;
    page.drawRectangle({
        x: kopX,
        y: headerY,
        width: kopWidth,
        height: 26,
        color: rgb(0.02, 0.22, 0.45), // PLN Dark Blue
    });

    // --- PLN LOGO (PNG from assets/logo_pln.png or Vector Fallback) ---
    const logoX = kopX + 8;
    const logoY = headerY + 3;
    const logoW = 15;
    const logoH = 20;

    if (plnLogoImage) {
        page.drawImage(plnLogoImage, {
            x: logoX,
            y: logoY,
            width: logoW,
            height: logoH,
        });
    } else {
        // Fallback vector shield & lightning bolt
        page.drawRectangle({
            x: logoX,
            y: logoY + 1,
            width: 14,
            height: 18,
            color: rgb(1.0, 0.88, 0.05),
            borderColor: rgb(1, 1, 1),
            borderWidth: 0.6,
        });
        page.drawLine({
            start: { x: logoX + 10, y: logoY + 16 },
            end: { x: logoX + 4, y: logoY + 10 },
            thickness: 2.2,
            color: rgb(0.9, 0.1, 0.1),
        });
        page.drawLine({
            start: { x: logoX + 4, y: logoY + 10 },
            end: { x: logoX + 8, y: logoY + 10 },
            thickness: 2.2,
            color: rgb(0.9, 0.1, 0.1),
        });
        page.drawLine({
            start: { x: logoX + 8, y: logoY + 10 },
            end: { x: logoX + 2, y: logoY + 4 },
            thickness: 2.2,
            color: rgb(0.9, 0.1, 0.1),
        });
    }

    // Left Header Text: PT PLN (PERSERO)
    page.drawText('PT PLN (PERSERO)', {
        x: logoX + logoW + 8,
        y: headerY + 14,
        size: 8.5,
        font: fontBold,
        color: rgb(1, 1, 1),
    });

    const rawUid = (surveyInfo.uidName || 'UID Banten').trim().toUpperCase();
    const uidStr = rawUid.startsWith('UID') ? rawUid : `UID ${rawUid}`;

    const rawUp3 = (surveyInfo.up3Name || 'UP3 Banten Selatan').trim().toUpperCase();
    const up3Str = rawUp3.startsWith('UP3') ? rawUp3 : `UP3 ${rawUp3}`;

    const rawUlp = (surveyInfo.ulpName || 'ULP Labuan').trim().toUpperCase();
    const ulpStr = rawUlp.startsWith('ULP') ? rawUlp : `ULP ${rawUlp}`;

    const subHeaderUnit = `${uidStr} / ${up3Str} / ${ulpStr}`;
    page.drawText(subHeaderUnit, {
        x: logoX + logoW + 8,
        y: headerY + 5,
        size: 6.5,
        font: font,
        color: rgb(0.85, 0.92, 1.0),
    });

    // Center Title Banner Text
    const centerTitle = 'SURVEY PETA JALUR JARINGAN TENAGA LISTRIK';
    const titleW = fontBold.widthOfTextAtSize(centerTitle, 9.5);
    page.drawText(centerTitle, {
        x: (pageWidth - titleW) / 2 + 35,
        y: headerY + 9,
        size: 9.5,
        font: fontBold,
        color: rgb(1.0, 0.9, 0.2), // Gold
    });

    // Right System Badge
    const rightBadge = 'PLN-OPTADIS GIS SYSTEM';
    const badgeW = fontBold.widthOfTextAtSize(rightBadge, 7);
    page.drawText(rightBadge, {
        x: kopX + kopWidth - badgeW - 8,
        y: headerY + 9,
        size: 7,
        font: fontBold,
        color: rgb(1, 1, 1),
    });

    // --- Grid Lines for Middle & Bottom Rows ---
    const midY = kopY + 30; // Horizontal divider between data row and signature row

    page.drawLine({
        start: { x: kopX, y: midY },
        end: { x: kopX + kopWidth, y: midY },
        thickness: 0.8,
        color: rgb(0.0, 0.22, 0.45),
    });

    // 3 Column Grid Widths
    const col1W = 320;
    const col2W = 240;

    const col1X = kopX;
    const col2X = kopX + col1W;
    const col3X = col2X + col2W;

    // Vertical Divider lines
    page.drawLine({
        start: { x: col2X, y: kopY },
        end: { x: col2X, y: headerY },
        thickness: 0.8,
        color: rgb(0.0, 0.22, 0.45),
    });
    page.drawLine({
        start: { x: col3X, y: kopY },
        end: { x: col3X, y: headerY },
        thickness: 0.8,
        color: rgb(0.0, 0.22, 0.45),
    });

    // --- MIDDLE ROW: DATA PEKERJAAN, PETA, SEGMEN ---
    // Column 1: Judul Pekerjaan & Lokasi
    page.drawText('JUDUL PEKERJAAN / SURVEY:', {
        x: col1X + 8,
        y: midY + 19,
        size: 6,
        font: fontBold,
        color: rgb(0.0, 0.22, 0.45),
    });
    let titleFontSize = 8.5;
    let fullTitleStr = surveyInfo.name ? surveyInfo.name.trim() : '-';
    let titleWidth = fontBold.widthOfTextAtSize(fullTitleStr, titleFontSize);

    // Auto-scale font size down to 5.5pt if title is long so full text fits completely
    while (titleWidth > 300 && titleFontSize > 5.5) {
        titleFontSize -= 0.5;
        titleWidth = fontBold.widthOfTextAtSize(fullTitleStr, titleFontSize);
    }

    // If still exceeds 300pt even at 5.5pt font, fit with ellipsis cleanly based on width
    if (titleWidth > 300) {
        let trimmed = fullTitleStr;
        while (trimmed.length > 0 && fontBold.widthOfTextAtSize(trimmed + '...', 5.5) > 300) {
            trimmed = trimmed.slice(0, -1);
        }
        fullTitleStr = trimmed + '...';
    }

    page.drawText(fullTitleStr, {
        x: col1X + 8,
        y: midY + 8,
        size: titleFontSize,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
    });

    // Column 2: Data Teknis Peta
    const dateToday = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    page.drawText('DATA TEKNIS PETA:', {
        x: col2X + 8,
        y: midY + 19,
        size: 6,
        font: fontBold,
        color: rgb(0.0, 0.22, 0.45),
    });
    page.drawText(`Skala  : 1 : 2.500 (Fixed Scale)  |  Tgl: ${dateToday}`, {
        x: col2X + 8,
        y: midY + 8,
        size: 7.5,
        font: font,
        color: rgb(0.2, 0.2, 0.2),
    });

    // Column 3: Informasi Segmen Lembar
    page.drawText('INFORMASI SEGMEN LEMBAR:', {
        x: col3X + 8,
        y: midY + 19,
        size: 6,
        font: fontBold,
        color: rgb(0.0, 0.22, 0.45),
    });
    if (meta) {
        const panjangLabel = meta.panjangMeter >= 1000
            ? (meta.panjangMeter / 1000).toFixed(2) + ' km'
            : Math.round(meta.panjangMeter) + 'm';
        page.drawText(`Halaman ${meta.pageNumber} dari ${meta.totalPages}  |  Tiang T.${meta.firstNomor} s/d T.${meta.lastNomor} (${panjangLabel})`, {
            x: col3X + 8,
            y: midY + 8,
            size: 7.5,
            font: fontBold,
            color: rgb(0.85, 0.1, 0.1), // Red accent
        });
    } else {
        page.drawText(`Halaman 1 dari 1 (Single Full Map)`, {
            x: col3X + 8,
            y: midY + 8,
            size: 7.5,
            font: fontBold,
            color: rgb(0.1, 0.5, 0.1),
        });
    }

    // --- BOTTOM ROW: LEMBAR PENGESAHAN / SIGNATURE BLOCK ---
    const colSig1 = col1X + 8;
    const colSig2 = col2X + 8;
    const colSig3 = col3X + 8;

    const survNameText = surveyInfo.surveyorName ? `( ${surveyInfo.surveyorName} )` : '( ..................................................... )';
    const spvTitleText = surveyInfo.pemeriksaTitle ? surveyInfo.pemeriksaTitle.toUpperCase() : 'TL HAR';
    const spvNameText = surveyInfo.pemeriksaName ? `( ${surveyInfo.pemeriksaName} )` : '( ..................................................... )';
    const mgrTitleText = `DISETUJUI (MANAGER ${ulpStr}):`;
    const mgrNameText = surveyInfo.managerName ? `( ${surveyInfo.managerName} )` : '( ..................................................... )';

    page.drawText('DISURVEY OLEH:', { x: colSig1, y: kopY + 18, size: 5.8, font: fontBold, color: rgb(0.4, 0.4, 0.4) });
    page.drawText(survNameText, { x: colSig1, y: kopY + 7, size: 7.5, font: fontBold, color: rgb(0.1, 0.1, 0.1) });

    page.drawText(`DIPERIKSA (${spvTitleText}):`, { x: colSig2, y: kopY + 18, size: 5.8, font: fontBold, color: rgb(0.4, 0.4, 0.4) });
    page.drawText(spvNameText, { x: colSig2, y: kopY + 7, size: 7.5, font: fontBold, color: rgb(0.1, 0.1, 0.1) });

    page.drawText(mgrTitleText, { x: colSig3, y: kopY + 18, size: 5.8, font: fontBold, color: rgb(0.4, 0.4, 0.4) });
    page.drawText(mgrNameText, { x: colSig3, y: kopY + 7, size: 7.5, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
}

// =============================================================================
// HELPER: Draw Rincian Pekerjaan block 
// =============================================================================

function drawRincianBlock(
    page: any,
    font: any,
    fontBold: any,
    rincianLines: string[],
    mapAreaX: number,
    mapAreaBottomY: number,
) {
    if (!rincianLines || rincianLines.length === 0) return;

    let maxWidth = 0;
    for (const line of rincianLines) {
        const isHeader = line.endsWith(':') || line === '';
        const fs = isHeader ? RINCIAN.headerFontSize : RINCIAN.fontSize;
        const f = isHeader ? fontBold : font;
        const w = line === '' ? 0 : f.widthOfTextAtSize(line, fs);
        if (w > maxWidth) maxWidth = w;
    }

    const boxWidth = maxWidth + RINCIAN.paddingX * 2;
    const visibleLines = rincianLines.filter((l, i) => {
        if (l !== '') return true;
        return i < rincianLines.length - 1 && rincianLines.slice(i + 1).some(r => r !== '');
    });
    const boxHeight = visibleLines.length * RINCIAN.lineHeight + RINCIAN.paddingY * 2;

    const boxX = mapAreaX + RINCIAN.margin;
    const boxY = mapAreaBottomY + RINCIAN.margin;

    // Draw white semi-transparent background
    page.drawRectangle({
        x: boxX,
        y: boxY,
        width: boxWidth,
        height: boxHeight,
        color: rgb(1, 1, 1),
        opacity: RINCIAN.bgOpacity,
        borderColor: rgb(0.0, 0.22, 0.45),
        borderWidth: 0.8,
    });

    let textY = boxY + boxHeight - RINCIAN.paddingY - RINCIAN.fontSize;
    for (const line of visibleLines) {
        if (line === '') {
            textY -= RINCIAN.lineHeight * 0.6;
            continue;
        }
        const isHeader = line.endsWith(':');
        const fs = isHeader ? RINCIAN.headerFontSize : RINCIAN.fontSize;
        const f = isHeader ? fontBold : font;

        page.drawText(line, {
            x: boxX + RINCIAN.paddingX,
            y: textY,
            size: fs,
            font: f,
            color: rgb(0.02, 0.22, 0.45),
        });
        textY -= RINCIAN.lineHeight;
    }
}

// =============================================================================
// HELPER: Draw Official Legenda Peta block (Page 1 Only - Bottom Right Corner)
// =============================================================================

function drawPdfLegendBlock(
    page: any,
    font: any,
    fontBold: any,
    mapX: number,
    mapY: number,
    mapWidth: number,
    hasJtmOverlay = true,
    hasGarduOverlay = true
) {
    const margin = 8;
    const paddingX = 6;
    const paddingY = 5;
    const boxWidth = 122;

    const items = [
        { label: 'SUTM', color: rgb(0.91, 0.12, 0.39), dash: [6, 2, 1.5, 2] },
        { label: 'SKTM', color: rgb(0.61, 0.15, 0.69), dash: [1.5, 2.5] },
        { label: 'SKUTM', color: rgb(0.0, 0.74, 0.83), dash: [5, 3] },
        { label: 'SUTR', color: rgb(0.30, 0.69, 0.31), dash: undefined },
    ];

    if (hasJtmOverlay) {
        items.push({ label: 'JTM Eksisting', color: rgb(1, 0.4, 0), dash: undefined, isRainbow: true } as any);
    }
    if (hasGarduOverlay) {
        items.push({ label: 'Gardu Eksisting', color: rgb(1, 0.6, 0), dash: undefined, isGardu: true } as any);
    }

    const lineHeight = 8.5;
    const headerHeight = 10;
    const boxHeight = headerHeight + (items.length * lineHeight) + paddingY * 2;

    const boxX = mapX + mapWidth - margin - boxWidth;
    const boxY = mapY + margin; // Aligned horizontally with Rincian Pekerjaan bottom Y

    // Draw white semi-transparent background
    page.drawRectangle({
        x: boxX,
        y: boxY,
        width: boxWidth,
        height: boxHeight,
        color: rgb(1, 1, 1),
        opacity: 0.88,
        borderColor: rgb(0.0, 0.22, 0.45),
        borderWidth: 0.8,
    });

    // Header: LEGENDA PETA:
    let currY = boxY + boxHeight - paddingY - 7;
    page.drawText('LEGENDA PETA:', {
        x: boxX + paddingX,
        y: currY,
        size: 6.8,
        font: fontBold,
        color: rgb(0.0, 0.22, 0.45),
    });

    currY -= 10;

    // Draw Legend Items
    for (const item of items) {
        const lineXStart = boxX + paddingX;
        const lineXEnd = lineXStart + 18;
        const lineY = currY + 2.2;

        if ((item as any).isRainbow) {
            // Draw 4 color segments (Red, Yellow, Green, Blue) to represent Rainbow 🌈
            const segW = 4.5;
            const colors = [rgb(0.9, 0.1, 0.1), rgb(1, 0.8, 0), rgb(0.2, 0.8, 0.2), rgb(0.1, 0.5, 0.9)];
            for (let cIdx = 0; cIdx < 4; cIdx++) {
                page.drawLine({
                    start: { x: lineXStart + cIdx * segW, y: lineY },
                    end: { x: lineXStart + (cIdx + 1) * segW, y: lineY },
                    thickness: 2.2,
                    color: colors[cIdx],
                });
            }
        } else if ((item as any).isGardu) {
            // Draw Gardu Orange Dot
            page.drawCircle({
                x: lineXStart + 9,
                y: lineY,
                size: 2.5,
                color: rgb(1.0, 0.6, 0.0),
                borderColor: rgb(0.9, 0.3, 0.0),
                borderWidth: 0.6,
            });
        } else {
            // Standard Cable Line with matching dash pattern
            page.drawLine({
                start: { x: lineXStart, y: lineY },
                end: { x: lineXEnd, y: lineY },
                thickness: 2.0,
                color: item.color,
                dashArray: item.dash,
            });
        }

        page.drawText(item.label, {
            x: lineXStart + 24,
            y: currY,
            size: 6.2,
            font: font,
            color: rgb(0.15, 0.15, 0.15),
        });

        currY -= lineHeight;
    }
}

// =============================================================================
// MAIN EXPORT FUNCTION (SINGLE PAGE)
// =============================================================================

export async function generatePdfWithMap(
    mapBase64: string,
    surveyInfo: SurveyInfo
): Promise<string | null> {
    try {
        console.log('Starting official PLN PDF generation...');

        // Fixed A4 Landscape (841.89 x 595.28 pt)
        const pdfDoc = await PDFDocument.create();
        const pageWidth = 841.89;
        const pageHeight = 595.28;
        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        const embeddedFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const embeddedFontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        // Map Canvas Box
        const mapX = 18;
        const mapY = 110;
        const mapWidth = pageWidth - 36;
        const mapHeight = pageHeight - 126;

        // Embed the map image
        const mapImageBytes = base64Decode(mapBase64);
        const mapImage = await pdfDoc.embedPng(mapImageBytes);

        page.drawImage(mapImage, {
            x: mapX,
            y: mapY,
            width: mapWidth,
            height: mapHeight,
        });

        // Draw solid border line around map canvas
        page.drawRectangle({
            x: mapX,
            y: mapY,
            width: mapWidth,
            height: mapHeight,
            borderColor: rgb(0.0, 0.22, 0.45),
            borderWidth: 1.2,
        });

        // Draw Official Kop PLN
        const plnLogoImage = await getPlnLogoImage(pdfDoc);
        drawOfficialPlnKop(page, embeddedFont, embeddedFontBold, surveyInfo, undefined, pageWidth, pageHeight, plnLogoImage);

        // Draw Rincian Pekerjaan block (bottom-left of map area)
        if (surveyInfo.rincianLines && surveyInfo.rincianLines.length > 0) {
            drawRincianBlock(page, embeddedFont, embeddedFontBold, surveyInfo.rincianLines, mapX, mapY);
        }

        // Draw Official Legenda Peta block on Page 1 (bottom-right of map area)
        drawPdfLegendBlock(page, embeddedFont, embeddedFontBold, mapX, mapY, mapWidth);

        const modifiedPdfBytes = await pdfDoc.save();
        const modifiedPdfBase64 = uint8ArrayToBase64(modifiedPdfBytes);

        const filename = `Survey_PLN_${surveyInfo.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
        const outputPath = `${FileSystem.cacheDirectory}${filename}`;

        await FileSystem.writeAsStringAsync(outputPath, modifiedPdfBase64, { encoding: 'base64' });

        console.log(`Official PLN PDF saved to: ${outputPath}`);
        return outputPath;
    } catch (error) {
        console.error('PDF generation failed:', error);
        return null;
    }
}

// =============================================================================
// MULTI-PAGE PDF EXPORT (OFFICIAL PLN KOP FORMAT)
// =============================================================================

export async function generateMultiPagePdf(
    mapBase64s: string[],
    surveyInfo: SurveyInfo,
    pageMetas: PageMeta[]
): Promise<string | null> {
    try {
        console.log(`Starting official PLN multi-page PDF: ${mapBase64s.length} pages`);

        const outputDoc = await PDFDocument.create();
        const embeddedFont = await outputDoc.embedFont(StandardFonts.Helvetica);
        const embeddedFontBold = await outputDoc.embedFont(StandardFonts.HelveticaBold);

        const pageWidth = 841.89;
        const pageHeight = 595.28;

        const mapX = 18;
        const mapY = 110;
        const mapWidth = pageWidth - 36;
        const mapHeight = pageHeight - 126;

        const plnLogoImage = await getPlnLogoImage(outputDoc);

        for (let i = 0; i < mapBase64s.length; i++) {
            const mapBase64 = mapBase64s[i];
            const meta = pageMetas[i];

            const page = outputDoc.addPage([pageWidth, pageHeight]);

            // Embed map image
            const mapImageBytes = base64Decode(mapBase64);
            const mapImage = await outputDoc.embedPng(mapImageBytes);

            page.drawImage(mapImage, {
                x: mapX,
                y: mapY,
                width: mapWidth,
                height: mapHeight,
            });

            // Draw solid border line around map canvas
            page.drawRectangle({
                x: mapX,
                y: mapY,
                width: mapWidth,
                height: mapHeight,
                borderColor: rgb(0.0, 0.22, 0.45),
                borderWidth: 1.2,
            });

            // Draw Official Kop PLN
            drawOfficialPlnKop(page, embeddedFont, embeddedFontBold, surveyInfo, meta, pageWidth, pageHeight, plnLogoImage);

            // Draw Rincian Pekerjaan block on FIRST PAGE ONLY
            if (i === 0 && surveyInfo.rincianLines && surveyInfo.rincianLines.length > 0) {
                drawRincianBlock(page, embeddedFont, embeddedFontBold, surveyInfo.rincianLines, mapX, mapY);
            }

            // Draw Official Legenda Peta block on FIRST PAGE ONLY (bottom-right of map area)
            if (i === 0) {
                drawPdfLegendBlock(page, embeddedFont, embeddedFontBold, mapX, mapY, mapWidth);
            }
        }

        const pdfBytes = await outputDoc.save();
        const pdfBase64 = uint8ArrayToBase64(pdfBytes);

        const filename = `Survey_PLN_${surveyInfo.name.replace(/[^a-zA-Z0-9]/g, '_')}_${pageMetas.length}hal_${Date.now()}.pdf`;
        const outputPath = `${FileSystem.cacheDirectory}${filename}`;

        await FileSystem.writeAsStringAsync(outputPath, pdfBase64, { encoding: 'base64' });

        console.log(`Official PLN Multi-page PDF saved: ${outputPath} (${pageMetas.length} pages)`);
        return outputPath;
    } catch (error) {
        console.error('Multi-page PDF generation failed:', error);
        return null;
    }
}

// =============================================================================
// LEGACY FUNCTION
// =============================================================================

export async function generatePdfWithMapLegacy(
    mapBase64: string,
    surveyName: string
): Promise<string | null> {
    return generatePdfWithMap(mapBase64, { name: surveyName, location: '' });
}

// =============================================================================
// SHARE FUNCTION
// =============================================================================

export async function sharePdf(filePath: string): Promise<void> {
    try {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
            await Sharing.shareAsync(filePath, {
                mimeType: 'application/pdf',
                dialogTitle: 'Bagikan PDF Survey Resmi PLN',
            });
        } else {
            console.warn('Sharing not available on this platform');
        }
    } catch (error) {
        console.error('Share failed:', error);
    }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    if (typeof btoa !== 'undefined') {
        return btoa(binary);
    }
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;
    while (i < binary.length) {
        const a = binary.charCodeAt(i++);
        const b = binary.charCodeAt(i++);
        const c = binary.charCodeAt(i++);
        result += chars[a >> 2];
        result += chars[((a & 3) << 4) | (b >> 4)];
        result += chars[((b & 15) << 2) | (c >> 6)];
        result += chars[c & 63];
    }
    const mod = binary.length % 3;
    if (mod === 1) {
        result = result.slice(0, -2) + '==';
    } else if (mod === 2) {
        result = result.slice(0, -1) + '=';
    }
    return result;
}
