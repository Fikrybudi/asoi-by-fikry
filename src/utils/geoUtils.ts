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
