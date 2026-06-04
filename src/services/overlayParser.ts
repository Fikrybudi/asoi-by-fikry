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
 * Haversine distance formula to calculate distance between two coordinates in meters.
 */
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const degToRad = Math.PI / 180;
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * degToRad;
    const dLon = (lon2 - lon1) * degToRad;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * degToRad) * Math.cos(lat2 * degToRad) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
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
        if (description) {
            properties['description'] = description;
            
            // 1. Parse from HTML table rows if present: <td>Key</td><td>Value</td>
            const trRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
            let trMatch;
            let hasTableData = false;
            while ((trMatch = trRegex.exec(description)) !== null) {
                const rowContent = trMatch[1];
                const cellRegex = /<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
                const cells: string[] = [];
                let cellMatch;
                while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
                    cells.push(
                        cellMatch[1]
                            .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
                            .replace(/<[^>]*>/g, '')
                            .trim()
                    );
                }
                if (cells.length >= 2) {
                    const key = cells[0].trim();
                    const value = cells[1].trim();
                    if (key) {
                        properties[key] = value;
                        properties[key.toUpperCase()] = value;
                        hasTableData = true;
                    }
                }
            }
            
            // 2. Parse from key-value pairs text if table rows weren't found
            if (!hasTableData) {
                const cleanText = description.replace(/<[^>]*>/g, '\n');
                const lines = cleanText.split('\n');
                for (const line of lines) {
                    const parts = line.split(/[:=]/);
                    if (parts.length >= 2) {
                        const key = parts[0].trim();
                        const value = parts.slice(1).join(':').trim();
                        if (key && value) {
                            properties[key] = value;
                            properties[key.toUpperCase()] = value;
                        }
                    }
                }
            }
        }

        // Extract ExtendedData / SimpleData
        const simpleDataRegex = /<SimpleData\s+name="([^"]+)">([\s\S]*?)<\/SimpleData>/gi;
        let sdMatch;
        while ((sdMatch = simpleDataRegex.exec(content)) !== null) {
            const key = sdMatch[1].trim();
            const val = sdMatch[2].trim();
            properties[key] = val;
            properties[key.toUpperCase()] = val;
        }

        // Extract ExtendedData / Data
        const dataRegex = /<Data\s+name="([^"]+)">\s*<value>([\s\S]*?)<\/value>\s*<\/Data>/gi;
        let dMatch;
        while ((dMatch = dataRegex.exec(content)) !== null) {
            const key = dMatch[1].trim();
            const val = dMatch[2].trim();
            properties[key] = val;
            properties[key.toUpperCase()] = val;
        }

        // Determine final name for point assets (Gardu, Proteksi)
        // Their code is often in DESCRIPTION or ex_description while the <name> tag is the feeder/penyulang
        // Scan properties for any value matching a Gardu code pattern: e.g. KUK240, SBJM240
        let garduCodeFromProps = '';
        const garduPattern = /^[A-Za-z]{2,4}\d{3}[A-Za-z]?$/;
        
        // Search in keys that are likely to contain the code first
        const likelyKeys = ['DESCRIPTION', 'EX_DESCRIPTION', 'KODE', 'KODE_GARDU', 'NAMA_GARDU', 'NOMOR_GARDU', 'NO_GARDU', 'GARDU'];
        for (const key of likelyKeys) {
            const val = (properties[key] || '').trim().replace(/<[^>]*>/g, '').trim();
            if (val && garduPattern.test(val)) {
                garduCodeFromProps = val;
                break;
            }
        }
        
        // If not found in likely keys, check all properties
        if (!garduCodeFromProps) {
            for (const [key, val] of Object.entries(properties)) {
                if (typeof val === 'string') {
                    const cleanVal = val.trim().replace(/<[^>]*>/g, '').trim();
                    if (garduPattern.test(cleanVal)) {
                        garduCodeFromProps = cleanVal;
                        break;
                    }
                }
            }
        }

        let finalName = name;
        if (garduCodeFromProps) {
            finalName = garduCodeFromProps;
            properties['feeder'] = name;
        } else {
            const descVal = (properties['DESCRIPTION'] || properties['ex_description'] || properties['description'] || '').trim();
            const cleanDesc = descVal.replace(/<[^>]*>/g, '').trim();
            if (cleanDesc && cleanDesc.length < 50 && !cleanDesc.includes(':') && cleanDesc.length > 0) {
                finalName = cleanDesc;
                properties['feeder'] = name;
            }
        }

        // Check for LineString elements (using /gi to extract multiple segments in MultiGeometry)
        const lineStringRegex = /<LineString\b[^>]*>[\s\S]*?<coordinates\b[^>]*>([\s\S]*?)<\/coordinates>/gi;
        let lsMatch;
        while ((lsMatch = lineStringRegex.exec(content)) !== null) {
            const coords = parseKMLCoordinates(lsMatch[1]);
            if (coords.length >= 2) {
                polylines.push({ name, coords, properties });
            }
        }

        // Check for Polygon elements (using /gi to extract multiple)
        const polygonRegex = /<Polygon\b[^>]*>[\s\S]*?<outerBoundaryIs>[\s\S]*?<coordinates\b[^>]*>([\s\S]*?)<\/coordinates>/gi;
        let polyMatch;
        while ((polyMatch = polygonRegex.exec(content)) !== null) {
            const coords = parseKMLCoordinates(polyMatch[1]);
            if (coords.length >= 3) {
                polylines.push({ name, coords, properties });
            }
        }

        // Check for Point elements (using /gi to extract multiple)
        const pointRegex = /<Point\b[^>]*>[\s\S]*?<coordinates\b[^>]*>([\s\S]*?)<\/coordinates>/gi;
        let ptMatch;
        while ((ptMatch = pointRegex.exec(content)) !== null) {
            const coords = parseKMLCoordinates(ptMatch[1]);
            if (coords.length > 0) {
                points.push({
                    lat: coords[0].lat,
                    lng: coords[0].lng,
                    name: finalName,
                    properties,
                });
            }
        }
    }

    // ── Post-processing: detect Point-based polylines ────────────────
    // Some KML files (especially JTM exports) use individual Point
    // placemarks per vertex instead of LineString. If points share
    // the same name (count >= 3) → group them into polylines.
    // We ONLY do this if there are no existing LineStrings parsed, to avoid
    // grouping tree observations or Gardus into zigzag/straight lines.
    if (polylines.length === 0 && points.length > 0) {
        // Function to check if a point should be excluded from point-to-polyline grouping
        const isExcludeFromGrouping = (name: string, props: Record<string, string>): boolean => {
            const lowerName = name.toLowerCase();
            const isObservation = 
                lowerName.includes('pohon') || 
                lowerName.includes('mangga') || 
                lowerName.includes('bambu') ||
                lowerName.includes('kelapa') ||
                lowerName.includes('tebang') ||
                lowerName.includes('row') ||
                lowerName.includes('areuy') ||
                lowerName.includes('pepohonan') ||
                lowerName.includes('rambat') ||
                lowerName.includes('jambu') ||
                lowerName.includes('pisang') ||
                lowerName.includes('nangka') ||
                lowerName.includes('petai') ||
                lowerName.includes('pete') ||
                lowerName.includes('mahoni') ||
                lowerName.includes('albasia') ||
                lowerName.includes('aren');

            const isGardu = 
                props['CLASSIFICATION']?.includes('GD') || 
                props['TYPE_GARDU'] === 'GD' || 
                name.match(/^[A-Za-z]{2,4}\d{3}[A-Za-z]?$/);

            const isProteksi =
                props['JENIS'] !== undefined ||
                props['PNL1'] !== undefined ||
                name.startsWith('GH ') ||
                name.startsWith('LBS ') ||
                name.startsWith('PMR ') ||
                name.startsWith('SSO ');

            return !!(isObservation || isGardu || isProteksi);
        };

        const nameCount: Record<string, number> = {};
        points.forEach(p => {
            if (p.name) nameCount[p.name] = (nameCount[p.name] || 0) + 1;
        });

        const groups: Record<string, OverlayPoint[]> = {};
        const singlePoints: OverlayPoint[] = [];

        points.forEach(p => {
            // Only group if name count >= 3 and is not excluded
            if (p.name && nameCount[p.name] >= 3 && !isExcludeFromGrouping(p.name, p.properties)) {
                if (!groups[p.name]) groups[p.name] = [];
                groups[p.name].push(p);
            } else {
                singlePoints.push(p);
            }
        });

        const groupedPolylines: OverlayPolyline[] = [];
        const fallbackSinglePoints: OverlayPoint[] = [];

        Object.entries(groups).forEach(([name, pts]) => {
            const remaining = [...pts];
            
            while (remaining.length > 0) {
                let currentSegment: OverlayPoint[] = [remaining.shift()!];
                
                while (remaining.length > 0) {
                    const last = currentSegment[currentSegment.length - 1];
                    let nearestIdx = -1;
                    let nearestDist = Infinity;

                    for (let i = 0; i < remaining.length; i++) {
                        const dist = getDistanceMeters(last.lat, last.lng, remaining[i].lat, remaining[i].lng);
                        if (dist < nearestDist) {
                            nearestDist = dist;
                            nearestIdx = i;
                        }
                    }

                    // Only connect if distance is <= 150m
                    if (nearestIdx !== -1 && nearestDist <= 150) {
                        currentSegment.push(remaining[nearestIdx]);
                        remaining.splice(nearestIdx, 1);
                    } else {
                        // Nearest point is too far, start a new segment
                        break;
                    }
                }

                if (currentSegment.length >= 2) {
                    groupedPolylines.push({
                        name,
                        coords: currentSegment.map(p => ({ lat: p.lat, lng: p.lng })),
                        properties: currentSegment[0].properties,
                    });
                } else {
                    fallbackSinglePoints.push(currentSegment[0]);
                }
            }
        });

        return { 
            points: [...singlePoints, ...fallbackSinglePoints], 
            polylines: [...polylines, ...groupedPolylines] 
        };
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
