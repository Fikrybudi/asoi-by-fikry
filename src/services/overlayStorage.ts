// =============================================================================
// PLN SURVEY APP - Overlay Storage Service (File System Based)
// =============================================================================
// Persists imported overlay layers metadata to AsyncStorage and large
// GeoJSON payloads to physical files via expo-file-system to avoid 2MB limits.
// =============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { OverlayFile } from '../types/overlayTypes';

const STORAGE_KEY = '@overlay_files';
const OVERLAYS_DIR = FileSystem.documentDirectory + 'overlays/';

/**
 * Ensure the overlays directory exists in the file system.
 */
async function ensureDirExists() {
    const dirInfo = await FileSystem.getInfoAsync(OVERLAYS_DIR);
    if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(OVERLAYS_DIR, { intermediates: true });
    }
}

/**
 * Get file path for a specific overlay ID.
 */
function getOverlayFilePath(id: string): string {
    return `${OVERLAYS_DIR}${id}.json`;
}

/**
 * Get all saved overlay files, loading their GeoJSON payloads from disk.
 */
export async function getAllOverlays(): Promise<OverlayFile[]> {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        
        let overlays = JSON.parse(raw) as OverlayFile[];
        
        // Load GeoJSON payloads from file system
        await ensureDirExists();
        
        const populatedOverlays = await Promise.all(overlays.map(async (overlay) => {
            // Backward compatibility: If geojson already exists (legacy small file), keep it
            if (overlay.geojson && Object.keys(overlay.geojson).length > 0) {
                return overlay;
            }
            
            try {
                const path = getOverlayFilePath(overlay.id);
                const fileInfo = await FileSystem.getInfoAsync(path);
                if (fileInfo.exists) {
                    const content = await FileSystem.readAsStringAsync(path);
                    return { ...overlay, geojson: JSON.parse(content) };
                }
            } catch (err) {
                console.warn(`Failed to load geojson for overlay ${overlay.id}:`, err);
            }
            // Return empty geojson if file read fails to prevent app crash
            return { ...overlay, geojson: {} };
        }));
        
        return populatedOverlays;
    } catch (error) {
        console.error('Error loading overlays:', error);
        return [];
    }
}

/**
 * Save or update an overlay file. Saves GeoJSON to file system, metadata to AsyncStorage.
 */
export async function saveOverlay(overlay: OverlayFile): Promise<void> {
    try {
        await ensureDirExists();
        
        // 1. Write the massive geojson to a physical file
        const path = getOverlayFilePath(overlay.id);
        const geojsonString = JSON.stringify(overlay.geojson || {});
        await FileSystem.writeAsStringAsync(path, geojsonString, { encoding: FileSystem.EncodingType.UTF8 });
        
        // 2. Prepare metadata-only object for AsyncStorage (strip geojson)
        const metadataOnly: OverlayFile = { ...overlay, geojson: undefined };
        
        // 3. Update AsyncStorage list
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        let all: OverlayFile[] = raw ? JSON.parse(raw) : [];
        
        const idx = all.findIndex(o => o.id === overlay.id);
        if (idx >= 0) {
            all[idx] = metadataOnly;
        } else {
            all.push(metadataOnly);
        }
        
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (error) {
        console.error('Error saving overlay:', error);
        throw error;
    }
}

/**
 * Delete an overlay by ID (from both AsyncStorage and FileSystem).
 */
export async function deleteOverlay(id: string): Promise<void> {
    try {
        // Delete from FileSystem
        const path = getOverlayFilePath(id);
        const fileInfo = await FileSystem.getInfoAsync(path);
        if (fileInfo.exists) {
            await FileSystem.deleteAsync(path, { idempotent: true });
        }
        
        // Delete from AsyncStorage
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
            const all = JSON.parse(raw) as OverlayFile[];
            const filtered = all.filter(o => o.id !== id);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        }
    } catch (error) {
        console.error('Error deleting overlay:', error);
        throw error;
    }
}

/**
 * Toggle visibility of an overlay (metadata only update).
 */
export async function updateVisibility(id: string, visible: boolean): Promise<void> {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        
        const all = JSON.parse(raw) as OverlayFile[];
        const overlay = all.find(o => o.id === id);
        if (overlay) {
            overlay.visible = visible;
            // Ensure we don't accidentally write legacy geojson back
            if (overlay.geojson) overlay.geojson = undefined;
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
        }
    } catch (error) {
        console.error('Error updating overlay visibility:', error);
    }
}

/**
 * Update opacity of an overlay (metadata only update).
 */
export async function updateOpacity(id: string, opacity: number): Promise<void> {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        
        const all = JSON.parse(raw) as OverlayFile[];
        const overlay = all.find(o => o.id === id);
        if (overlay) {
            overlay.opacity = Math.max(0, Math.min(1, opacity));
            // Ensure we don't accidentally write legacy geojson back
            if (overlay.geojson) overlay.geojson = undefined;
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
        }
    } catch (error) {
        console.error('Error updating overlay opacity:', error);
    }
}

/**
 * Save all overlays at once (bulk update for metadata / ordering).
 */
export async function saveAllOverlays(overlays: OverlayFile[]): Promise<void> {
    try {
        // Strip geojson payload before bulk saving metadata
        const metadataOnlyOverlays = overlays.map(o => ({ ...o, geojson: undefined }));
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(metadataOnlyOverlays));
    } catch (error) {
        console.error('Error saving all overlays:', error);
        throw error;
    }
}

export const overlayStorage = {
    getAllOverlays,
    saveOverlay,
    deleteOverlay,
    updateVisibility,
    updateOpacity,
    saveAllOverlays,
};
