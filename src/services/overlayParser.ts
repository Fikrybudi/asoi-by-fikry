// =============================================================================
// PLN SURVEY APP - Overlay File Parser
// =============================================================================
// Parses CSV, KML, and KMZ files into OverlayGeoData.
// =============================================================================

import * as FileSystem from 'expo-file-system/legacy';
import {
    OverlayGeoData,
    OverlayPoint,
    OverlayPolyline,
    OverlayDataType,
} from '../types/overlayTypes';

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse a file (CSV / KML / KMZ) into OverlayGeoData.
 * @param fileUri  Local file URI (from expo-document-picker)
 * @param fileName Original file name (for extension detection)
 */
export async function parseOverlayFile(
    fileUri: string,
    fileName: string,
): Promise<OverlayGeoData> {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    if (ext === 'csv' || ext === 'txt') {
        const content = await FileSystem.readAsStringAsync(fileUri);
        return parseCSV(content);
    }

    if (ext === 'kml') {
        const content = await FileSystem.readAsStringAsync(fileUri);
        return parseKML(content);
    }

    if (ext === 'kmz') {
        return parseKMZ(fileUri);
    }

    throw new Error(`Format file tidak didukung: .${ext}`);
}

/**
 * Auto-detect the type of overlay data based on parsed content and column names.
 */
export function detectOverlayType(
    data: OverlayGeoData,
    rawCsvHeader?: string[],
): OverlayDataType {
    // If there are polylines → most likely JTM
    if (data.polylines.length > 0) return 'jtm';

    // Check point properties for known column patterns
    if (data.points.length > 0) {
        const props = data.points[0].properties;
        const keys = Object.keys(props).map(k => k.toUpperCase());

        // Gardu indicators
        if (
            keys.includes('CLASSIFICATION') ||
            keys.includes('JENIS_PEL') ||
            keys.includes('TYPE_BAN')
        ) {
            return 'gardu';
        }

        // Proteksi indicators
        if (keys.includes('JENIS') || keys.includes('PNL1') || keys.includes('TRAFO')) {
            return 'proteksi';
        }

        // Check raw CSV header if provided
        if (rawCsvHeader) {
            const upperHeader = rawCsvHeader.map(h => h.toUpperCase());
            if (upperHeader.includes('CLASSIFICATION') || upperHeader.includes('JENIS_PEL')) return 'gardu';
            if (upperHeader.includes('JENIS') || upperHeader.includes('PNL1')) return 'proteksi';
        }
    }

    return 'custom';
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV PARSER
// ─────────────────────────────────────────────────────────────────────────────

function parseCSV(content: string): OverlayGeoData {
    const lines = content
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .filter(l => l.trim().length > 0);

    if (lines.length < 2) {
        throw new Error('File CSV terlalu pendek (butuh minimal header + 1 baris data)');
    }

    // Parse header
    const header = parseCSVLine(lines[0]);
    const upperHeader = header.map(h => h.trim().toUpperCase());

    // Find coordinate columns
    const xIdx = findColIndex(upperHeader, ['X', 'LON', 'LONG', 'LONGITUDE']);
    const yIdx = findColIndex(upperHeader, ['Y', 'LAT', 'LATITUDE']);
    const nameIdx = findColIndex(upperHeader, ['NAME', 'NAMA', 'DESCRIPTION']);

    if (xIdx === -1 || yIdx === -1) {
        throw new Error('Kolom koordinat (X/Y atau LAT/LON) tidak ditemukan di header CSV');
    }

    // Parse rows
    const rows: { lat: number; lng: number; name: string; props: Record<string, string> }[] = [];

    for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        if (cols.length < Math.max(xIdx, yIdx) + 1) continue;

        const lng = parseFloat(cols[xIdx]);
        const lat = parseFloat(cols[yIdx]);
        if (isNaN(lat) || isNaN(lng)) continue;

        const name = nameIdx >= 0 && cols[nameIdx] ? cols[nameIdx].trim() : '';

        // Collect all other properties
        const props: Record<string, string> = {};
        header.forEach((h, idx) => {
            if (idx !== xIdx && idx !== yIdx && cols[idx] !== undefined) {
                props[h.trim()] = cols[idx].trim();
            }
        });

        rows.push({ lat, lng, name, props });
    }

    if (rows.length === 0) {
        throw new Error('Tidak ada data valid ditemukan di file CSV');
    }

    // ── Decide: points or polylines? ──────────────────────────────────
    // Step 1: Check header columns for gardu/proteksi indicators
    //         If found → always treat as individual POINTS
    const isGarduByHeader =
        upperHeader.includes('CLASSIFICATION') ||
        upperHeader.includes('JENIS_PEL') ||
        upperHeader.includes('TYPE_BAN') ||
        upperHeader.includes('ALAMAT') ||
        upperHeader.includes('KAPASITAS');

    const isProteksiByHeader =
        upperHeader.includes('PNL1') ||
        upperHeader.includes('TRAFO') ||
        (upperHeader.includes('JENIS') && !upperHeader.includes('JENIS_JARINGAN'));

    const forcePoints = isGarduByHeader || isProteksiByHeader;

    // Step 2: Only check polyline heuristic if headers don't indicate point data
    let isPolylineData = false;
    if (!forcePoints) {
        const nameCount: Record<string, number> = {};
        rows.forEach(r => {
            if (r.name) {
                nameCount[r.name] = (nameCount[r.name] || 0) + 1;
            }
        });

        const maxShared = Math.max(...Object.values(nameCount), 0);
        const uniqueNames = Object.keys(nameCount).length;
        // True JTM pattern: few unique names, each with many points
        // e.g., 12 feeders × 50 points each
        isPolylineData = maxShared >= 3 && uniqueNames < rows.length * 0.3;
    }

    if (isPolylineData) {
        // Group by name → polylines
        const groups: Record<string, typeof rows> = {};
        rows.forEach(r => {
            const key = r.name || 'Unknown';
            if (!groups[key]) groups[key] = [];
            groups[key].push(r);
        });

        const polylines: OverlayPolyline[] = Object.entries(groups).map(([name, pts]) => {
            // Sort points by nearest-neighbor to avoid zigzag polylines
            const sorted = sortByNearestNeighbor(pts);
            return {
                name,
                coords: sorted.map(p => ({ lat: p.lat, lng: p.lng })),
                properties: pts[0]?.props || {},
            };
        });

        return { points: [], polylines };
    } else {
        // Individual points
        const points: OverlayPoint[] = rows.map(r => ({
            lat: r.lat,
            lng: r.lng,
            name: r.name || `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`,
            properties: r.props,
        }));

        return { points, polylines: [] };
    }
}

/**
 * Parse a single CSV line, handling quoted fields.
 */
function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
        } else if ((ch === ',' || ch === ';' || ch === '\t') && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += ch;
        }
    }
    result.push(current.trim());
    return result;
}

function findColIndex(header: string[], candidates: string[]): number {
    for (const c of candidates) {
        const idx = header.indexOf(c);
        if (idx >= 0) return idx;
    }
    return -1;
}

/**
 * Sort points using nearest-neighbor algorithm to create sensible polylines.
 * Prevents zigzag when CSV rows are not in geographic order.
 */
function sortByNearestNeighbor<T extends { lat: number; lng: number }>(points: T[]): T[] {
    if (points.length <= 2) return points;

    const remaining = [...points];
    const sorted: T[] = [remaining.shift()!];

    while (remaining.length > 0) {
        const last = sorted[sorted.length - 1];
        let nearestIdx = 0;
        let nearestDist = Infinity;

        for (let i = 0; i < remaining.length; i++) {
            const dx = remaining[i].lng - last.lng;
            const dy = remaining[i].lat - last.lat;
            const dist = dx * dx + dy * dy; // squared distance (faster, no sqrt needed)
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestIdx = i;
            }
        }

        sorted.push(remaining.splice(nearestIdx, 1)[0]);
    }

    return sorted;
}

// ─────────────────────────────────────────────────────────────────────────────
// KML PARSER
// ─────────────────────────────────────────────────────────────────────────────

function parseKML(kmlString: string): OverlayGeoData {
    // Use @tmcw/togeojson — dynamic import pattern for compatibility
    // Since togeojson needs a DOM Document, we use a simple XML regex parser
    // as React Native doesn't have DOMParser.
    // Fallback: parse KML manually with regex.
    return parseKMLManual(kmlString);
}

/**
 * Lightweight KML parser that doesn't require DOMParser.
 * Handles <Placemark> with <Point>, <LineString>, and <Polygon> geometries.
 */
function parseKMLManual(kml: string): OverlayGeoData {
    const points: OverlayPoint[] = [];
    const polylines: OverlayPolyline[] = [];

    // Extract all Placemarks
    const placemarkRegex = /<Placemark\b[^>]*>([\s\S]*?)<\/Placemark>/gi;
    let match;

    while ((match = placemarkRegex.exec(kml)) !== null) {
        const content = match[1];

        // Get name
        const nameMatch = content.match(/<name\b[^>]*>([\s\S]*?)<\/name>/i);
        const name = nameMatch ? nameMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';

        // Get description for properties
        const descMatch = content.match(/<description\b[^>]*>([\s\S]*?)<\/description>/i);
        const description = descMatch ? descMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';

        const properties: Record<string, string> = {};
        if (description) properties['description'] = description;

        // Extract ExtendedData / SimpleData
        const simpleDataRegex = /<SimpleData\s+name="([^"]+)">([\s\S]*?)<\/SimpleData>/gi;
        let sdMatch;
        while ((sdMatch = simpleDataRegex.exec(content)) !== null) {
            properties[sdMatch[1]] = sdMatch[2].trim();
        }

        // Check for Point
        const pointMatch = content.match(/<Point\b[^>]*>[\s\S]*?<coordinates\b[^>]*>([\s\S]*?)<\/coordinates>/i);
        if (pointMatch) {
            const coords = parseKMLCoordinates(pointMatch[1]);
            if (coords.length > 0) {
                points.push({
                    lat: coords[0].lat,
                    lng: coords[0].lng,
                    name,
                    properties,
                });
            }
            continue;
        }

        // Check for LineString
        const lineMatch = content.match(/<LineString\b[^>]*>[\s\S]*?<coordinates\b[^>]*>([\s\S]*?)<\/coordinates>/i);
        if (lineMatch) {
            const coords = parseKMLCoordinates(lineMatch[1]);
            if (coords.length >= 2) {
                polylines.push({ name, coords, properties });
            }
            continue;
        }

        // Check for Polygon (outer boundary only)
        const polygonMatch = content.match(/<Polygon\b[^>]*>[\s\S]*?<outerBoundaryIs>[\s\S]*?<coordinates\b[^>]*>([\s\S]*?)<\/coordinates>/i);
        if (polygonMatch) {
            const coords = parseKMLCoordinates(polygonMatch[1]);
            if (coords.length >= 3) {
                polylines.push({ name, coords, properties });
            }
        }
    }

    // ── Post-processing: detect Point-based polylines ────────────────
    // Some KML files (especially JTM exports) use individual Point
    // placemarks per vertex instead of LineString. If many points share
    // the same name → group them into polylines.
    // Also handles mixed files (gardu points + JTM point-vertices).
    if (points.length > 0) {
        const nameCount: Record<string, number> = {};
        points.forEach(p => {
            if (p.name) nameCount[p.name] = (nameCount[p.name] || 0) + 1;
        });

        const maxShared = Math.max(...Object.values(nameCount), 0);
        const uniqueNames = Object.keys(nameCount).length;

        // If few unique names with many points each → polyline data
        if (maxShared >= 3 && uniqueNames < points.length * 0.5) {
            const groups: Record<string, OverlayPoint[]> = {};
            const singlePoints: OverlayPoint[] = [];

            points.forEach(p => {
                if (p.name && nameCount[p.name] >= 3) {
                    if (!groups[p.name]) groups[p.name] = [];
                    groups[p.name].push(p);
                } else {
                    singlePoints.push(p);
                }
            });

            const groupedPolylines: OverlayPolyline[] = Object.entries(groups).map(([name, pts]) => {
                const sorted = sortByNearestNeighbor(pts);
                return {
                    name,
                    coords: sorted.map(p => ({ lat: p.lat, lng: p.lng })),
                    properties: pts[0]?.properties || {},
                };
            });

            return { points: singlePoints, polylines: [...polylines, ...groupedPolylines] };
        }
    }

    return { points, polylines };
}

/**
 * Parse KML coordinate string "lng,lat,alt lng,lat,alt ..."
 */
function parseKMLCoordinates(raw: string): { lat: number; lng: number }[] {
    return raw
        .trim()
        .split(/\s+/)
        .map(part => {
            const [lngStr, latStr] = part.split(',');
            const lng = parseFloat(lngStr);
            const lat = parseFloat(latStr);
            if (isNaN(lat) || isNaN(lng)) return null;
            return { lat, lng };
        })
        .filter((c): c is { lat: number; lng: number } => c !== null);
}

// ─────────────────────────────────────────────────────────────────────────────
// KMZ PARSER
// ─────────────────────────────────────────────────────────────────────────────

async function parseKMZ(fileUri: string): Promise<OverlayGeoData> {
    const JSZip = (await import('jszip')).default;

    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: 'base64' as any,
    });

    const zip = await JSZip.loadAsync(base64, { base64: true });

    // Find .kml file inside the ZIP
    let kmlContent: string | null = null;
    for (const filename of Object.keys(zip.files)) {
        if (filename.toLowerCase().endsWith('.kml')) {
            kmlContent = await zip.files[filename].async('string');
            break;
        }
    }

    if (!kmlContent) {
        throw new Error('File KMZ tidak berisi file KML');
    }

    return parseKML(kmlContent);
}
