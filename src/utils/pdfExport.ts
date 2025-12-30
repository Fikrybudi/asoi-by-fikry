// =============================================================================
// PDF Export with Map Screenshot - ASOI
// Uses pdf-lib to overlay map image onto blangkogambar.pdf template
// =============================================================================

// Use legacy API for readAsStringAsync, writeAsStringAsync, cacheDirectory
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { PDFDocument } from 'pdf-lib';
import { decode as base64Decode } from 'base64-arraybuffer';
import { Asset } from 'expo-asset';

// A4 Landscape dimensions in points (1 point = 1/72 inch)
const A4_WIDTH = 842; // ~297mm
const A4_HEIGHT = 595; // ~210mm

// Padding in points (1cm = 28.35 points)
const PADDING_LEFT = 28.35;   // 1cm
const PADDING_RIGHT = 28.35;  // 1cm
const PADDING_TOP = 28.35;    // 1cm
const PADDING_BOTTOM = 113.4; // 4cm

/**
 * Generate PDF with map screenshot overlaid on template
 * @param mapBase64 - Base64 encoded PNG of the map screenshot
 * @param surveyName - Name of the survey for filename
 * @returns Path to the generated PDF file, or null on failure
 */
export async function generatePdfWithMap(
    mapBase64: string,
    surveyName: string
): Promise<string | null> {
    try {
        console.log('Starting PDF generation...');

        // Load the template PDF from assets
        const templateAsset = Asset.fromModule(require('../../assets/blangkogambar.pdf'));
        await templateAsset.downloadAsync();

        if (!templateAsset.localUri) {
            console.error('Failed to load PDF template');
            return null;
        }

        // Read template PDF as base64
        const templateBase64 = await FileSystem.readAsStringAsync(templateAsset.localUri, {
            encoding: 'base64',
        });

        // Load PDF with pdf-lib
        const pdfBytes = base64Decode(templateBase64);
        const pdfDoc = await PDFDocument.load(pdfBytes);

        // Get first page
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        const { width: pageWidth, height: pageHeight } = firstPage.getSize();

        console.log(`PDF Page size: ${pageWidth} x ${pageHeight}`);

        // Embed the map image (PNG)
        const mapImageBytes = base64Decode(mapBase64);
        const mapImage = await pdfDoc.embedPng(mapImageBytes);

        // Get original image dimensions
        const imgWidth = mapImage.width;
        const imgHeight = mapImage.height;
        const imgAspectRatio = imgWidth / imgHeight;

        // Available area in PDF
        const availableWidth = pageWidth - PADDING_LEFT - PADDING_RIGHT;
        const availableHeight = pageHeight - PADDING_TOP - PADDING_BOTTOM;
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
        const imageX = PADDING_LEFT + (availableWidth - finalWidth) / 2;
        const imageY = PADDING_BOTTOM + (availableHeight - finalHeight) / 2;

        console.log(`Original image: ${imgWidth}x${imgHeight}, aspect=${imgAspectRatio.toFixed(2)}`);
        console.log(`Final placement: x=${imageX.toFixed(1)}, y=${imageY.toFixed(1)}, w=${finalWidth.toFixed(1)}, h=${finalHeight.toFixed(1)}`);

        // Draw the map image onto the page
        firstPage.drawImage(mapImage, {
            x: imageX,
            y: imageY,
            width: finalWidth,
            height: finalHeight,
        });

        // Save modified PDF
        const modifiedPdfBytes = await pdfDoc.save();
        const modifiedPdfBase64 = uint8ArrayToBase64(modifiedPdfBytes);

        // Write to file system
        const filename = `Survey_${surveyName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
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

