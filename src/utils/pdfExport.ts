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
// MAIN EXPORT FUNCTION
// =============================================================================

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

        // Add text overlay for project name and location
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const textPositions = TEXT_POSITIONS[orientation];

        // Draw project name (top)
        if (surveyInfo.name) {
            firstPage.drawText(surveyInfo.name, {
                x: textPositions.projectName.x,
                y: textPositions.projectName.y,
                size: TEXT_SIZE.projectName,
                font: fontBold,
                color: rgb(0, 0, 0),
            });
        }

        // Draw location (below name)
        if (surveyInfo.location) {
            firstPage.drawText(surveyInfo.location, {
                x: textPositions.location.x,
                y: textPositions.location.y,
                size: TEXT_SIZE.location,
                font: font,
                color: rgb(0, 0, 0),
            });
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
