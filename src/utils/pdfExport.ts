// =============================================================================
// PDF Export with Map Screenshot - ASOI
// Dual template support (portrait/landscape) with text overlay
// =============================================================================

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { decode as base64Decode } from 'base64-arraybuffer';
import { Asset } from 'expo-asset';
import { Dimensions } from 'react-native';

// =============================================================================
// TYPES
// =============================================================================

type Orientation = 'portrait' | 'landscape';

interface SurveyInfo {
    name: string;
    location: string;
    /** Optional: rincian pekerjaan lines to draw on the map area */
    rincianLines?: string[];
}

// =============================================================================
// LAYOUT CONSTANTS (in points, 1cm = 28.35 points)
// =============================================================================

// Landscape layout (blangko.pdf)
const LANDSCAPE_PADDING = {
    left: 28.35,    // 1cm
    right: 28.35,   // 1cm
    top: 28.35,     // 1cm
    bottom: 113.4,  // 4cm (kop area)
};

// Portrait layout (blangko_potrait.pdf)
const PORTRAIT_PADDING = {
    left: 28.35,    // 1cm
    right: 28.35,   // 1cm
    top: 28.35,     // 1cm
    bottom: 141.75, // 5cm (kop area - taller for portrait)
};

// Text position offsets from bottom-left corner of page
// Adjusted for bottom-right positioning
const TEXT_POSITIONS = {
    landscape: {
        projectName: { x: 720, y: 38 },   // Bottom-right area, name on top
        location: { x: 720, y: 26 },       // Location below name
    },
    portrait: {
        projectName: { x: 470, y: 38 },   // Bottom-right area for portrait
        location: { x: 470, y: 26 },       // Location below name
    },
};

// Text sizes (smaller for cleaner look)
const TEXT_SIZE = {
    projectName: 8,
    location: 7,
};

// Rincian Pekerjaan box style
const RINCIAN = {
    fontSize: 6,          // small font for the legend
    lineHeight: 8,        // spacing between lines
    paddingX: 6,          // inner padding horizontal
    paddingY: 5,          // inner padding vertical
    headerFontSize: 7,    // slightly bigger for headers
    margin: 8,            // margin from map edge
    bgOpacity: 0.85,      // background transparency
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Determine orientation based on current device screen dimensions
 */
function detectOrientation(): Orientation {
    const { width, height } = Dimensions.get('window');
    console.log(`Device screen: ${width} x ${height}`);

    // If height > width, device is in portrait mode
    return height > width ? 'portrait' : 'landscape';
}

/**
 * Load appropriate template based on orientation
 */
async function loadTemplate(orientation: Orientation): Promise<string | null> {
    try {
        const templateModule = orientation === 'portrait'
            ? require('../../assets/blangko_potrait.pdf')
            : require('../../assets/blangko.pdf');

        const templateAsset = Asset.fromModule(templateModule);
        await templateAsset.downloadAsync();

        if (!templateAsset.localUri) {
            console.error(`Failed to load ${orientation} template`);
            return null;
        }

        return await FileSystem.readAsStringAsync(templateAsset.localUri, {
            encoding: 'base64',
        });
    } catch (error) {
        console.error(`Error loading ${orientation} template:`, error);
        return null;
    }
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

    // Measure the width needed
    let maxWidth = 0;
    for (const line of rincianLines) {
        const isHeader = line.endsWith(':') || line === '';
        const fs = isHeader ? RINCIAN.headerFontSize : RINCIAN.fontSize;
        const f = isHeader ? fontBold : font;
        const w = line === '' ? 0 : f.widthOfTextAtSize(line, fs);
        if (w > maxWidth) maxWidth = w;
    }

    const boxWidth = maxWidth + RINCIAN.paddingX * 2;
    // Filter out trailing empty lines for height calculation
    const visibleLines = rincianLines.filter((l, i) => {
        if (l !== '') return true;
        // keep empty lines that are between content lines
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
        borderColor: rgb(0.6, 0.6, 0.6),
        borderWidth: 0.5,
    });

    // Draw each line of text (top to bottom)
    let textY = boxY + boxHeight - RINCIAN.paddingY - RINCIAN.fontSize;
    for (const line of visibleLines) {
        if (line === '') {
            textY -= RINCIAN.lineHeight * 0.6; // smaller gap for empty lines
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
            color: rgb(0.05, 0.1, 0.6), // dark blue
        });
        textY -= RINCIAN.lineHeight;
    }
}

// =============================================================================
// MAIN EXPORT FUNCTION
// =============================================================================

function drawProjectTitleCallout(
    page: any,
    font: any,
    fontBold: any,
    surveyInfo: SurveyInfo,
    pageWidth: number,
    imageBottomY: number
) {
    if (!surveyInfo.name && !surveyInfo.location) return;

    const nameSize = 10;
    const locSize = 8;

    let nameWidth = 0;
    if (surveyInfo.name) {
        nameWidth = fontBold.widthOfTextAtSize(surveyInfo.name, nameSize);
    }
    let locWidth = 0;
    if (surveyInfo.location) {
        locWidth = font.widthOfTextAtSize(surveyInfo.location, locSize);
    }

    const maxTextWidth = Math.max(nameWidth, locWidth);

    const paddingX = 14;
    const paddingY = 7;
    const numLines = (surveyInfo.name ? 1 : 0) + (surveyInfo.location ? 1 : 0);
    const lineHeight = 12;
    const boxHeight = (numLines * lineHeight) + (paddingY * 2) - 2;
    const boxWidth = maxTextWidth + (paddingX * 2);

    // Center horizontally
    const boxX = (pageWidth - boxWidth) / 2;
    // Center vertically in the kop area (between 0 and imageBottomY)
    const boxY = (imageBottomY - boxHeight) / 2;

    page.drawRectangle({
        x: boxX,
        y: boxY,
        width: boxWidth,
        height: boxHeight,
        color: rgb(1, 1, 1),
        opacity: 1,
        borderColor: rgb(0.6, 0.6, 0.6),
        borderWidth: 0.8,
    });

    let currentY = boxY + boxHeight - paddingY - nameSize + 2;

    if (surveyInfo.name) {
        const textX = boxX + (boxWidth - nameWidth) / 2;
        page.drawText(surveyInfo.name, {
            x: textX,
            y: currentY,
            size: nameSize,
            font: fontBold,
            color: rgb(0.05, 0.1, 0.5),
        });
        currentY -= lineHeight;
    }

    if (surveyInfo.location) {
        const textX = boxX + (boxWidth - locWidth) / 2;
        page.drawText(surveyInfo.location, {
            x: textX,
            y: currentY,
            size: locSize,
            font: font,
            color: rgb(0.2, 0.2, 0.2),
        });
    }
}


/**
 * Generate PDF with map screenshot overlaid on template
 * @param mapBase64 - Base64 encoded PNG of the map screenshot
 * @param surveyInfo - Survey name and location for text overlay
 * @returns Path to the generated PDF file, or null on failure
 */
export async function generatePdfWithMap(
    mapBase64: string,
    surveyInfo: SurveyInfo
): Promise<string | null> {
    try {
        console.log('Starting PDF generation...');

        // Determine orientation from current device screen
        const orientation: Orientation = detectOrientation();
        console.log(`Using ${orientation} template`);

        // Load the appropriate template
        const templateBase64 = await loadTemplate(orientation);
        if (!templateBase64) {
            console.error('Failed to load template');
            return null;
        }

        // Load PDF with pdf-lib
        const pdfBytes = base64Decode(templateBase64);
        const pdfDoc = await PDFDocument.load(pdfBytes);

        // Get first page
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        const { width: pageWidth, height: pageHeight } = firstPage.getSize();

        console.log(`PDF Page size: ${pageWidth} x ${pageHeight}`);

        // Get padding based on orientation
        const padding = orientation === 'portrait' ? PORTRAIT_PADDING : LANDSCAPE_PADDING;

        // Embed the map image (PNG)
        const mapImageBytes = base64Decode(mapBase64);
        const mapImage = await pdfDoc.embedPng(mapImageBytes);

        // Get original image dimensions
        const imgWidth = mapImage.width;
        const imgHeight = mapImage.height;
        const imgAspectRatio = imgWidth / imgHeight;

        // Available area in PDF
        const availableWidth = pageWidth - padding.left - padding.right;
        const availableHeight = pageHeight - padding.top - padding.bottom;
        const areaAspectRatio = availableWidth / availableHeight;

        // Calculate scaled dimensions preserving aspect ratio
        let finalWidth: number;
        let finalHeight: number;

        if (imgAspectRatio > areaAspectRatio) {
            // Image is wider - fit to width
            finalWidth = availableWidth;
            finalHeight = availableWidth / imgAspectRatio;
        } else {
            // Image is taller - fit to height
            finalHeight = availableHeight;
            finalWidth = availableHeight * imgAspectRatio;
        }

        // Center the image in the available area
        const imageX = padding.left + (availableWidth - finalWidth) / 2;
        const imageY = padding.bottom + (availableHeight - finalHeight) / 2;

        console.log(`Original image: ${imgWidth}x${imgHeight}, aspect=${imgAspectRatio.toFixed(2)}`);
        console.log(`Final placement: x=${imageX.toFixed(1)}, y=${imageY.toFixed(1)}, w=${finalWidth.toFixed(1)}, h=${finalHeight.toFixed(1)}`);

        // Draw the map image onto the page
        firstPage.drawImage(mapImage, {
            x: imageX,
            y: imageY,
            width: finalWidth,
            height: finalHeight,
        });

        // Add text overlay for project name and location (Top Center Callout)
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        
        // Judul survey di area kop (di BAWAH gambar peta, tidak menimpa peta)
        drawProjectTitleCallout(firstPage, font, fontBold, surveyInfo, pageWidth, imageY);

        // Draw Rincian Pekerjaan block (bottom-left of map area)
        if (surveyInfo.rincianLines && surveyInfo.rincianLines.length > 0) {
            drawRincianBlock(firstPage, font, fontBold, surveyInfo.rincianLines, imageX, imageY);
        }

        // Save modified PDF
        const modifiedPdfBytes = await pdfDoc.save();
        const modifiedPdfBase64 = uint8ArrayToBase64(modifiedPdfBytes);

        // Write to file system
        const filename = `Survey_${surveyInfo.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
        const outputPath = `${FileSystem.cacheDirectory}${filename}`;

        await FileSystem.writeAsStringAsync(outputPath, modifiedPdfBase64, {
            encoding: 'base64',
        });

        console.log(`PDF saved to: ${outputPath}`);
        return outputPath;
    } catch (error) {
        console.error('PDF generation failed:', error);
        return null;
    }
}

// =============================================================================
// MULTI-PAGE PDF EXPORT
// =============================================================================

export interface PageMeta {
    pageNumber: number;
    totalPages: number;
    firstNomor: number;
    lastNomor: number;
    panjangMeter: number;
}

/**
 * Generate multi-page PDF: setiap elemen mapBase64s menjadi satu halaman.
 * @param mapBase64s - Array screenshot base64, satu per segmen
 * @param surveyInfo - Nama & lokasi survey
 * @param pageMetas - Metadata per halaman (nomor tiang, panjang segmen, dll)
 * @returns Path ke file PDF multi-halaman, atau null jika gagal
 */
export async function generateMultiPagePdf(
    mapBase64s: string[],
    surveyInfo: SurveyInfo,
    pageMetas: PageMeta[]
): Promise<string | null> {
    try {
        console.log(`Starting multi-page PDF: ${mapBase64s.length} pages`);

        const orientation: Orientation = detectOrientation();
        const templateBase64 = await loadTemplate(orientation);
        if (!templateBase64) {
            console.error('Failed to load template for multi-page PDF');
            return null;
        }

        const font = await (async () => {
            // We'll embed fonts once we have the doc
            return null;
        })();

        // Load template to get page size
        const templateBytes = base64Decode(templateBase64);
        const templateDoc = await PDFDocument.load(templateBytes);
        const templatePage = templateDoc.getPages()[0];
        const { width: pageWidth, height: pageHeight } = templatePage.getSize();

        // Create a fresh PDFDocument for the output
        const outputDoc = await PDFDocument.create();
        const embeddedFont = await outputDoc.embedFont(StandardFonts.Helvetica);
        const embeddedFontBold = await outputDoc.embedFont(StandardFonts.HelveticaBold);

        const padding = orientation === 'portrait' ? PORTRAIT_PADDING : LANDSCAPE_PADDING;
        const textPositions = TEXT_POSITIONS[orientation];

        for (let i = 0; i < mapBase64s.length; i++) {
            const mapBase64 = mapBase64s[i];
            const meta = pageMetas[i];

            // Copy a fresh template page into output doc
            const [copiedPage] = await outputDoc.copyPages(
                await PDFDocument.load(templateBytes),
                [0]
            );
            const page = outputDoc.addPage(copiedPage);

            // Embed map image
            const mapImageBytes = base64Decode(mapBase64);
            const mapImage = await outputDoc.embedPng(mapImageBytes);

            const imgAspectRatio = mapImage.width / mapImage.height;
            const availableWidth = pageWidth - padding.left - padding.right;
            const availableHeight = pageHeight - padding.top - padding.bottom;
            const areaAspectRatio = availableWidth / availableHeight;

            let finalWidth: number;
            let finalHeight: number;
            if (imgAspectRatio > areaAspectRatio) {
                finalWidth = availableWidth;
                finalHeight = availableWidth / imgAspectRatio;
            } else {
                finalHeight = availableHeight;
                finalWidth = availableHeight * imgAspectRatio;
            }

            const imageX = padding.left + (availableWidth - finalWidth) / 2;
            const imageY = padding.bottom + (availableHeight - finalHeight) / 2;

            page.drawImage(mapImage, {
                x: imageX,
                y: imageY,
                width: finalWidth,
                height: finalHeight,
            });

            // --- Judul survey di area kop (di BAWAH gambar peta, tidak menimpa peta) ---
            drawProjectTitleCallout(page, embeddedFont, embeddedFontBold, surveyInfo, pageWidth, imageY);

            // --- Segment info: "Hal. 1/3 | T.1 - T.8 | 320m" ---
            const panjangLabel = meta.panjangMeter >= 1000
                ? (meta.panjangMeter / 1000).toFixed(2) + ' km'
                : Math.round(meta.panjangMeter) + 'm';
            const segInfo = `Hal. ${meta.pageNumber}/${meta.totalPages}  |  T.${meta.firstNomor} - T.${meta.lastNomor}  |  ${panjangLabel}`;

            // Draw segment info bottom-left of kop area
            page.drawText(segInfo, {
                x: padding.left,
                y: textPositions.location.y,   // same Y as location text
                size: 7,
                font: embeddedFont,
                color: rgb(0.3, 0.3, 0.3),
            });

            // Draw Rincian Pekerjaan block on FIRST PAGE ONLY
            if (i === 0 && surveyInfo.rincianLines && surveyInfo.rincianLines.length > 0) {
                drawRincianBlock(page, embeddedFont, embeddedFontBold, surveyInfo.rincianLines, imageX, imageY);
            }
        }

        const pdfBytes = await outputDoc.save();
        const pdfBase64 = uint8ArrayToBase64(pdfBytes);

        const filename = `Survey_${surveyInfo.name.replace(/[^a-zA-Z0-9]/g, '_')}_${pageMetas.length}hal_${Date.now()}.pdf`;
        const outputPath = `${FileSystem.cacheDirectory}${filename}`;

        await FileSystem.writeAsStringAsync(outputPath, pdfBase64, { encoding: 'base64' });

        console.log(`Multi-page PDF saved: ${outputPath} (${pageMetas.length} pages)`);
        return outputPath;
    } catch (error) {
        console.error('Multi-page PDF generation failed:', error);
        return null;
    }
}

// =============================================================================
// LEGACY FUNCTION (for backward compatibility)
// =============================================================================

/**
 * @deprecated Use generatePdfWithMap with SurveyInfo instead
 */
export async function generatePdfWithMapLegacy(
    mapBase64: string,
    surveyName: string
): Promise<string | null> {
    return generatePdfWithMap(mapBase64, { name: surveyName, location: '' });
}

// =============================================================================
// SHARE FUNCTION
// =============================================================================

/**
 * Share the generated PDF file
 * @param filePath - Path to the PDF file
 */
export async function sharePdf(filePath: string): Promise<void> {
    try {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
            await Sharing.shareAsync(filePath, {
                mimeType: 'application/pdf',
                dialogTitle: 'Bagikan PDF Survey',
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

/**
 * Convert Uint8Array to Base64 string
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    // Use btoa if available (browser), otherwise use a simple polyfill
    if (typeof btoa !== 'undefined') {
        return btoa(binary);
    }
    // Fallback for React Native
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
