// =============================================================================
// PLN SURVEY APP - Geo Utilities
// =============================================================================

import { Coordinate, Tiang } from '../types';

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in meters
 */
export function calculateDistance(coord1: Coordinate, coord2: Coordinate): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = toRad(coord2.latitude - coord1.latitude);
    const dLon = toRad(coord2.longitude - coord1.longitude);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(coord1.latitude)) * Math.cos(toRad(coord2.latitude)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Calculate total length of a polyline
 * @returns Total distance in meters
 */
export function calculatePolylineLength(coordinates: Coordinate[]): number {
    if (coordinates.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
        totalDistance += calculateDistance(coordinates[i], coordinates[i + 1]);
    }

    return totalDistance;
}

/**
 * Convert degrees to radians
 */
function toRad(deg: number): number {
    return deg * (Math.PI / 180);
}

/**
 * Interpolate a point along a line segment at a given fraction (0-1)
 */
function interpolatePoint(start: Coordinate, end: Coordinate, fraction: number): Coordinate {
    return {
        latitude: start.latitude + (end.latitude - start.latitude) * fraction,
        longitude: start.longitude + (end.longitude - start.longitude) * fraction,
    };
}

/**
 * Generate points along a polyline at specified interval
 * @param coordinates - The polyline coordinates
 * @param intervalMeters - Distance between points (e.g., 240m for SKTM jointing)
 * @returns Array of coordinates at the specified intervals with distance from start
 */
export function generatePointsAlongPolyline(
    coordinates: Coordinate[],
    intervalMeters: number
): { coordinate: Coordinate; distanceFromStart: number }[] {
    if (coordinates.length < 2 || intervalMeters <= 0) return [];

    const result: { coordinate: Coordinate; distanceFromStart: number }[] = [];
    let accumulatedDistance = 0;
    let nextPointDistance = intervalMeters; // First point at interval distance

    for (let i = 0; i < coordinates.length - 1; i++) {
        const segmentStart = coordinates[i];
        const segmentEnd = coordinates[i + 1];
        const segmentLength = calculateDistance(segmentStart, segmentEnd);

        // Check if we need to place points within this segment
        while (accumulatedDistance + segmentLength >= nextPointDistance) {
            // Calculate how far along this segment the point should be
            const distanceIntoSegment = nextPointDistance - accumulatedDistance;
            const fraction = distanceIntoSegment / segmentLength;

            // Interpolate the point
            const point = interpolatePoint(segmentStart, segmentEnd, fraction);
            result.push({
                coordinate: point,
                distanceFromStart: nextPointDistance,
            });

            nextPointDistance += intervalMeters;
        }

        accumulatedDistance += segmentLength;
    }

    return result;
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
    if (meters < 1000) {
        return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(2)} km`;
}

/**
 * Calculate the center point of multiple coordinates
 */
export function calculateCenter(coordinates: Coordinate[]): Coordinate {
    if (coordinates.length === 0) {
        return { latitude: -6.2088, longitude: 106.8456 }; // Default: Jakarta
    }

    if (coordinates.length === 1) {
        return coordinates[0];
    }

    const sum = coordinates.reduce(
        (acc, coord) => ({
            latitude: acc.latitude + coord.latitude,
            longitude: acc.longitude + coord.longitude,
        }),
        { latitude: 0, longitude: 0 }
    );

    return {
        latitude: sum.latitude / coordinates.length,
        longitude: sum.longitude / coordinates.length,
    };
}

/**
 * Calculate appropriate zoom level based on coordinates spread
 */
export function calculateDelta(coordinates: Coordinate[]): { latitudeDelta: number; longitudeDelta: number } {
    if (coordinates.length < 2) {
        return { latitudeDelta: 0.01, longitudeDelta: 0.01 };
    }

    const lats = coordinates.map(c => c.latitude);
    const lons = coordinates.map(c => c.longitude);

    const latDiff = Math.max(...lats) - Math.min(...lats);
    const lonDiff = Math.max(...lons) - Math.min(...lons);

    // Add some padding
    const padding = 1.5;

    return {
        latitudeDelta: Math.max(latDiff * padding, 0.01),
        longitudeDelta: Math.max(lonDiff * padding, 0.01),
    };
}

/**
 * Format coordinate for display
 */
export function formatCoordinate(coord: Coordinate): string {
    const latDir = coord.latitude >= 0 ? 'N' : 'S';
    const lonDir = coord.longitude >= 0 ? 'E' : 'W';

    return `${Math.abs(coord.latitude).toFixed(6)}°${latDir}, ${Math.abs(coord.longitude).toFixed(6)}°${lonDir}`;
}

// =============================================================================
// MULTI-PAGE PDF SEGMENTATION HELPERS
// =============================================================================

export type SegmentMode = 'tm8' | 'tr10' | 'dist400' | 'scale' | 'full';

export interface TiangSegment {
    tiangList: Tiang[];
    /** Index urut pertama tiang (nomorUrut) */
    firstNomor: number;
    /** Index urut terakhir tiang (nomorUrut) */
    lastNomor: number;
    /** Total jarak dalam segmen (meter) */
    panjangMeter: number;
    /** Nomor halaman (1-based) */
    pageNumber: number;
    /** Total halaman */
    totalPages: number;
}

export function getNumericScaleString(zoomLevel = 18, centerLat = -6.8): string {
    const latRad = centerLat * Math.PI / 180;
    const scaleRatio = (591657550.5 * Math.cos(latRad)) / Math.pow(2, zoomLevel);
    let roundedRatio: number;
    if (scaleRatio >= 15000) {
        roundedRatio = Math.round(scaleRatio / 5000) * 5000;
    } else if (scaleRatio >= 10000) {
        roundedRatio = Math.round(scaleRatio / 2500) * 2500;
    } else if (scaleRatio >= 750) {
        // High-precision 500-step scale increments (1:500, 1:1.000, 1:1.500, 1:2.000, 1:2.500, 1:3.000, ...)
        roundedRatio = Math.round(scaleRatio / 500) * 500;
    } else if (scaleRatio >= 350) {
        roundedRatio = Math.round(scaleRatio / 250) * 250;
    } else {
        roundedRatio = Math.round(scaleRatio / 100) * 100;
    }
    return '1 : ' + roundedRatio.toLocaleString('id-ID');
}

export function calculateScaleSpanMeters(
    zoomLevel = 18,
    centerLat = -6.8,
    isVertical = false
): number {
    const latRad = centerLat * Math.PI / 180;
    const metersPerPx = (156543.03392 * Math.cos(latRad)) / Math.pow(2, zoomLevel);
    // A4 landscape canvas: 1200px width vs 848px height.
    // Usable span (80% of canvas axis):
    // Horizontal (East-West): 1200px * 0.80 = 960px
    // Vertical (North-South): 848px * 0.78 = 660px (ensures top/bottom boundary markers stay safely inside canvas frame!)
    const targetPx = isVertical ? 660 : 960;
    const spanMeters = metersPerPx * targetPx;
    return Math.max(Math.round(spanMeters), 100);
}

/**
 * Kelompokkan tiang menjadi segmen-segmen untuk multi-page PDF.
 * Setiap tiang hanya masuk ke SATU segmen (tidak overlap data).
 * Untuk seamless tiling, gunakan calculateBoundsForGroup dengan anchor parameter.
 */
export function groupTiangBySegment(
    tiangList: Tiang[],
    mode: SegmentMode,
    zoomLevel = 18,
    centerLat = -6.8
): TiangSegment[] {
    if (tiangList.length === 0) return [];

    if (mode === 'full') {
        const panjang = tiangList.length >= 2
            ? tiangList.slice(0, -1).reduce((acc, t, i) => acc + calculateDistance(t.koordinat, tiangList[i + 1].koordinat), 0)
            : 0;
        return [{
            tiangList,
            firstNomor: tiangList[0].nomorUrut,
            lastNomor: tiangList[tiangList.length - 1].nomorUrut,
            panjangMeter: panjang,
            pageNumber: 1,
            totalPages: 1,
        }];
    }

    const maxPoles = mode === 'tm8' ? 9 : mode === 'tr10' ? 11 : Infinity;

    const segments: Omit<TiangSegment, 'totalPages'>[] = [];
    let startIdx = 0;

    while (startIdx < tiangList.length) {
        let currPanjang = 0;
        let endIdx = startIdx;

        // Check local orientation for the current segment
        const segTiangs = tiangList.slice(startIdx);
        const segLats = segTiangs.map(t => t.koordinat.latitude);
        const segLngs = segTiangs.map(t => t.koordinat.longitude);
        const dLat = (Math.max(...segLats) - Math.min(...segLats)) * 111000;
        const dLng = (Math.max(...segLngs) - Math.min(...segLngs)) * 111000 * Math.cos(centerLat * Math.PI / 180);
        const isSegVertical = dLat > dLng * 1.1;

        let maxMeters = mode === 'dist400' ? 400 : Infinity;
        if (mode === 'scale') {
            maxMeters = calculateScaleSpanMeters(zoomLevel, centerLat, isSegVertical);
        }

        // Accumulate tiang from startIdx up to maxMeters or maxPoles
        while (endIdx < tiangList.length - 1) {
            const nextTiang = tiangList[endIdx + 1];
            const dist = calculateDistance(tiangList[endIdx].koordinat, nextTiang.koordinat);
            const countSoFar = (endIdx + 1) - startIdx + 1;

            if (countSoFar > maxPoles || (currPanjang + dist > maxMeters && countSoFar >= 3)) {
                break;
            }
            currPanjang += dist;
            endIdx++;
        }

        // Boundary tiang placement: position marker near outer edge (endIdx) without pulling back into the middle
        let boundaryIdx = endIdx;
        if (endIdx < tiangList.length - 1 && (endIdx - startIdx) >= 3) {
            boundaryIdx = endIdx;
        }

        const segList = tiangList.slice(startIdx, boundaryIdx + 1);
        const segPanjang = segList.length >= 2
            ? segList.slice(0, -1).reduce((acc, t, idx) => acc + calculateDistance(t.koordinat, segList[idx + 1].koordinat), 0)
            : 0;

        segments.push({
            tiangList: segList,
            firstNomor: segList[0].nomorUrut,
            lastNomor: segList[segList.length - 1].nomorUrut,
            panjangMeter: segPanjang,
            pageNumber: segments.length + 1,
        });

        // Next page starts at boundaryIdx (shared boundary tiang)
        if (boundaryIdx === startIdx || boundaryIdx >= tiangList.length - 1) {
            break;
        }
        startIdx = boundaryIdx;
    }

    const totalPages = segments.length;
    return segments.map(s => ({ ...s, totalPages }));
}

/**
 * Hitung bounding box Leaflet [[minLat, minLng], [maxLat, maxLng]] untuk satu segmen.
 *
 * Untuk seamless tiling antar halaman:
 * - prevAnchor: koordinat tiang terakhir dari segmen SEBELUMNYA
 *   → digunakan sebagai batas kiri/atas tanpa padding tambahan
 * - nextAnchor: koordinat tiang pertama dari segmen BERIKUTNYA
 *   → digunakan sebagai batas kanan/bawah tanpa padding tambahan
 *
 * Hasilnya: batas kanan halaman N = batas kiri halaman N+1 (seamless).
 */
export function calculateBoundsForGroup(
    tiangList: Tiang[],
    prevAnchor?: Coordinate,   // last coord of prev segment → left boundary
    nextAnchor?: Coordinate,   // first coord of next segment → right boundary
    paddingFactor = 0.05       // 5% padding by default (not 20%)
): [[number, number], [number, number]] {
    if (tiangList.length === 0) {
        return [[-6.22, 106.83], [-6.20, 106.85]];
    }

    // Garis besar: ambil semua koordinat tiang di segmen ini
    const allCoords: Coordinate[] = tiangList.map(t => t.koordinat);

    // Tambahkan anchor coords ke dalam pool agar bounds mencakup tiang boundary
    if (prevAnchor) allCoords.push(prevAnchor);
    if (nextAnchor) allCoords.push(nextAnchor);

    const lats = allCoords.map(c => c.latitude);
    const lngs = allCoords.map(c => c.longitude);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // General 5% padding (minimum 0.0003 ~ 30m)
    const latPad = Math.max((maxLat - minLat) * paddingFactor, 0.0003);
    const lngPad = Math.max((maxLng - minLng) * paddingFactor, 0.0003);

    // Anchor padding: EXACTLY 0.0004 (~40m) so it always zooms tightly to the boundary without clipping the marker
    const anchorPad = 0.0004;

    // We don't know geometrically which side (Min/Max, Lat/Lng) corresponds to prevAnchor or nextAnchor.
    // So if an anchor exists, we just apply the anchorPad to all sides to be safe,
    // OR we can just check if the anchor is at the edge.
    // Simpler: if there is an anchor, the corresponding bounds side gets anchorPad.
    
    // For MinLat: if prevAnchor or nextAnchor is at minLat, use anchorPad
    const padMinLat = (prevAnchor && prevAnchor.latitude === minLat) || (nextAnchor && nextAnchor.latitude === minLat) ? anchorPad : latPad;
    const padMaxLat = (prevAnchor && prevAnchor.latitude === maxLat) || (nextAnchor && nextAnchor.latitude === maxLat) ? anchorPad : latPad;
    const padMinLng = (prevAnchor && prevAnchor.longitude === minLng) || (nextAnchor && nextAnchor.longitude === minLng) ? anchorPad : lngPad;
    const padMaxLng = (prevAnchor && prevAnchor.longitude === maxLng) || (nextAnchor && nextAnchor.longitude === maxLng) ? anchorPad : lngPad;

    return [
        [minLat - padMinLat, minLng - padMinLng],
        [maxLat + padMaxLat, maxLng + padMaxLng],
    ];
}

