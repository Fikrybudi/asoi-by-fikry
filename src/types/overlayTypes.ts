// =============================================================================
// PLN SURVEY APP - Overlay Layer Types
// =============================================================================
// Types for imported KML/KMZ/CSV data shown as static reference layers on map.
// =============================================================================

/**
 * A single imported overlay file / layer
 */
export interface OverlayFile {
    id: string;
    name: string;                   // User-given or filename-based label
    type: OverlayDataType;
    visible: boolean;
    opacity: number;                // 0.0 – 1.0
    color?: string;                 // Optional colour override (polylines)
    data: OverlayGeoData;
    importedAt: string;             // ISO date string (serialisable)
    hiddenFeeders?: string[];       // Polyline / feeder names toggled OFF
    hiddenTypes?: string[];         // 'gardu' | 'proteksi' | 'custom' toggled OFF
}

export type OverlayDataType = 'jtm' | 'gardu' | 'proteksi' | 'custom';

/**
 * Parsed geographic data from a file
 */
export interface OverlayGeoData {
    points: OverlayPoint[];
    polylines: OverlayPolyline[];
}

/**
 * A single point feature (gardu / proteksi / generic)
 */
export interface OverlayPoint {
    lat: number;
    lng: number;
    name: string;
    properties: Record<string, string>;
}

/**
 * A polyline feature (JTM feeder / generic line)
 */
export interface OverlayPolyline {
    name: string;                           // Feeder name or label
    coords: { lat: number; lng: number }[];
    properties: Record<string, string>;
}
