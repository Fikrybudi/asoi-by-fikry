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

export type SegmentMode = 'tm8' | 'tr10' | 'dist400' | 'full';

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

/**
 * Kelompokkan tiang menjadi segmen-segmen untuk multi-page PDF.
 * Setiap tiang hanya masuk ke SATU segmen (tidak overlap data).
 * Untuk seamless tiling, gunakan calculateBoundsForGroup dengan anchor parameter.
 */
export function groupTiangBySegment(tiangList: Tiang[], mode: SegmentMode): TiangSegment[] {
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

    const maxPoles = mode === 'tm8' ? 8 : mode === 'tr10' ? 10 : Infinity;
    const maxMeters = mode === 'dist400' ? 400 : Infinity;

    const segments: Omit<TiangSegment, 'totalPages'>[] = [];
    let currentGroup: Tiang[] = [];
    let currentPanjang = 0;

    for (let i = 0; i < tiangList.length; i++) {
        const tiang = tiangList[i];

        if (currentGroup.length === 0) {
            currentGroup.push(tiang);
            continue;
        }

        const dist = calculateDistance(currentGroup[currentGroup.length - 1].koordinat, tiang.koordinat);
        const newPanjang = currentPanjang + dist;

        const wouldExceedPoles = currentGroup.length >= maxPoles;
        const wouldExceedMeters = newPanjang > maxMeters;

        if (wouldExceedPoles || wouldExceedMeters) {
            segments.push({
                tiangList: [...currentGroup],
                firstNomor: currentGroup[0].nomorUrut,
                lastNomor: currentGroup[currentGroup.length - 1].nomorUrut,
                panjangMeter: currentPanjang,
                pageNumber: segments.length + 1,
            });
            // No overlap in data — each tiang belongs to one segment only
            currentGroup = [tiang];
            currentPanjang = 0;
        } else {
            currentGroup.push(tiang);
            currentPanjang = newPanjang;
        }
    }

    if (currentGroup.length > 0) {
        segments.push({
            tiangList: [...currentGroup],
            firstNomor: currentGroup[0].nomorUrut,
            lastNomor: currentGroup[currentGroup.length - 1].nomorUrut,
            panjangMeter: currentPanjang,
            pageNumber: segments.length + 1,
        });
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
    paddingFactor = 0.2
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

    // Padding untuk semua sisi
    const latPad = (maxLat - minLat) * paddingFactor || 0.001;
    const lngPad = (maxLng - minLng) * paddingFactor || 0.001;

    // Sisi yang ada anchor → padding diperkecil (agar tepi halaman sejajar)
    const padMinLat = prevAnchor ? latPad * 0.05 : latPad;
    const padMaxLat = nextAnchor ? latPad * 0.05 : latPad;
    const padMinLng = prevAnchor ? lngPad * 0.05 : lngPad;
    const padMaxLng = nextAnchor ? lngPad * 0.05 : lngPad;

    return [
        [minLat - padMinLat, minLng - padMinLng],
        [maxLat + padMaxLat, maxLng + padMaxLng],
    ];
}

