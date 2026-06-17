// =============================================================================
// PLN SURVEY APP - Overlay Storage Service
// =============================================================================
// Persists imported overlay layers to AsyncStorage.
// =============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { OverlayFile } from '../types/overlayTypes';

const STORAGE_KEY = '@overlay_files';

/**
 * Get all saved overlay files.
 */
export async function getAllOverlays(): Promise<OverlayFile[]> {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        return JSON.parse(raw) as OverlayFile[];
    } catch (error) {
        const msg = String(error);
        // Android CursorWindow limit exceeded — data too large to read back
        if (msg.includes('CursorWindow') || msg.includes('Row too big')) {
            console.warn('Overlay data too large for AsyncStorage, clearing...');
            try { await AsyncStorage.removeItem(STORAGE_KEY); } catch (_) {}
        } else {
            console.error('Error loading overlays:', error);
        }
        return [];
    }
}

/**
 * Save or update an overlay file.
 */
export async function saveOverlay(overlay: OverlayFile): Promise<void> {
    try {
        const all = await getAllOverlays();
        const idx = all.findIndex(o => o.id === overlay.id);
        if (idx >= 0) {
            all[idx] = overlay;
        } else {
            all.push(overlay);
        }
        const json = JSON.stringify(all);
        // Guard: prevent saving data that exceeds Android CursorWindow (~2MB)
        if (json.length > 1_800_000) {
            console.warn(`Overlay data too large (${(json.length / 1024).toFixed(0)}KB), skipping save`);
            throw new Error('Data overlay terlalu besar untuk disimpan. Coba hapus beberapa overlay lama.');
        }
        await AsyncStorage.setItem(STORAGE_KEY, json);
    } catch (error) {
        console.error('Error saving overlay:', error);
        throw error;
    }
}

/**
 * Delete an overlay by ID.
 */
export async function deleteOverlay(id: string): Promise<void> {
    try {
        const all = await getAllOverlays();
        const filtered = all.filter(o => o.id !== id);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
        console.error('Error deleting overlay:', error);
        throw error;
    }
}

/**
 * Toggle visibility of an overlay.
 */
export async function updateVisibility(id: string, visible: boolean): Promise<void> {
    try {
        const all = await getAllOverlays();
        const overlay = all.find(o => o.id === id);
        if (overlay) {
            overlay.visible = visible;
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
        }
    } catch (error) {
        console.error('Error updating overlay visibility:', error);
    }
}

/**
 * Update opacity of an overlay.
 */
export async function updateOpacity(id: string, opacity: number): Promise<void> {
    try {
        const all = await getAllOverlays();
        const overlay = all.find(o => o.id === id);
        if (overlay) {
            overlay.opacity = Math.max(0, Math.min(1, opacity));
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
        }
    } catch (error) {
        console.error('Error updating overlay opacity:', error);
    }
}

/**
 * Save all overlays at once (bulk update).
 */
export async function saveAllOverlays(overlays: OverlayFile[]): Promise<void> {
    try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(overlays));
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
