// =============================================================================
// PLN SURVEY APP - Geo Utilities
// =============================================================================

import { Coordinate } from '../types';

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
