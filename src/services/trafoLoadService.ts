// =============================================================================
// PLN SURVEY APP - Service Beban Trafo Web Database
// Fetches live transformer load measurements from https://fikrybudi.github.io/dashboard-beban-trafo/
// =============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { BebanTrafoItem, Gardu } from '../types';

const CSV_URL = 'https://fikrybudi.github.io/dashboard-beban-trafo/pengukuran_beban.csv';
const CACHE_KEY = '@pln_beban_trafo_cache';
const CACHE_TIME_KEY = '@pln_beban_trafo_cache_time';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour TTL

/**
 * Parse CSV line handling quoted strings safely
 */
function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result.map(s => s.replace(/^"|"$/g, '').trim());
}

/**
 * Normalize Gardu identifier for flexible matching (e.g., "LBAN-001" -> "LBAN001", "GARDU MDCA240" -> "MDCA240")
 */
export function normalizeGarduCode(str?: string): string {
    if (!str) return '';
    return str
        .toUpperCase()
        .replace(/GARDU\s*/g, '')
        .replace(/[^A-Z0-9]/g, '');
}

export class TrafoLoadService {
    private inMemoryCache: BebanTrafoItem[] | null = null;

    /**
     * Fetch all Beban Trafo items from Web CSV with AsyncStorage & in-memory caching
     */
    async fetchBebanTrafoData(forceRefresh = false): Promise<BebanTrafoItem[]> {
        if (!forceRefresh && this.inMemoryCache && this.inMemoryCache.length > 0) {
            return this.inMemoryCache;
        }

        try {
            // Check AsyncStorage cache if not forcing refresh
            if (!forceRefresh) {
                const cachedTime = await AsyncStorage.getItem(CACHE_TIME_KEY);
                const cachedData = await AsyncStorage.getItem(CACHE_KEY);

                if (cachedTime && cachedData) {
                    const age = Date.now() - parseInt(cachedTime, 10);
                    if (age < CACHE_TTL_MS) {
                        const parsed: BebanTrafoItem[] = JSON.parse(cachedData);
                        this.inMemoryCache = parsed;
                        return parsed;
                    }
                }
            }

            // Fetch live CSV from GitHub Pages
            console.log('Fetching live Beban Trafo CSV from web...');
            const response = await fetch(CSV_URL, {
                headers: { 'Cache-Control': 'no-cache' },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Failed to fetch ${CSV_URL}`);
            }

            const csvText = await response.text();
            const items = this.parseCsvData(csvText);

            if (items.length > 0) {
                this.inMemoryCache = items;
                await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(items));
                await AsyncStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
                console.log(`Successfully parsed & cached ${items.length} Beban Trafo records`);
            }

            return items;
        } catch (error) {
            console.warn('Failed to fetch live Beban Trafo data, trying stale cache:', error);

            // Fallback to stale AsyncStorage cache if offline
            try {
                const cachedData = await AsyncStorage.getItem(CACHE_KEY);
                if (cachedData) {
                    const parsed: BebanTrafoItem[] = JSON.parse(cachedData);
                    this.inMemoryCache = parsed;
                    return parsed;
                }
            } catch (e) {
                console.error('Error reading stale cache:', e);
            }

            return [];
        }
    }

    /**
     * Parse raw CSV text into BebanTrafoItem array
     */
    private parseCsvData(csvText: string): BebanTrafoItem[] {
        const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length <= 1) return [];

        const items: BebanTrafoItem[] = [];

        // Skip header line
        for (let i = 1; i < lines.length; i++) {
            const cols = parseCsvLine(lines[i]);
            if (cols.length < 13) continue;

            const unitLayanan = cols[0];
            const penyulang = cols[1];
            const gardu = cols[2];
            const kapasitasKVA = parseFloat(cols[3]) || 0;
            const tanggalUkur = cols[4];
            const waktuUkur = cols[5];
            const bebanR = parseFloat(cols[6]) || 0;
            const bebanS = parseFloat(cols[7]) || 0;
            const bebanT = parseFloat(cols[8]) || 0;
            const arusRata2 = parseFloat(cols[9]) || 0;
            const unbalancePercent = parseFloat(cols[10]) || 0;
            const persenDayaTrafo = parseFloat(cols[13]) || 0;
            const statusBeban = cols[14] || (persenDayaTrafo > 80 ? 'Overload' : persenDayaTrafo < 30 ? 'Underload' : 'Normal');
            const kondisiFasaMax = cols[12] || 'Normal';

            if (!gardu) continue;

            items.push({
                unitLayanan,
                penyulang,
                gardu,
                kapasitasKVA,
                tanggalUkur,
                waktuUkur,
                bebanR,
                bebanS,
                bebanT,
                arusRata2,
                unbalancePercent,
                persenDayaTrafo,
                statusBeban,
                kondisiFasaMax,
            });
        }

        return items;
    }

    /**
     * Find Beban Trafo for a specific Gardu object
     */
    findBebanTrafoForGardu(gardu: Gardu, allTrafoData: BebanTrafoItem[]): BebanTrafoItem | null {
        if (!allTrafoData || allTrafoData.length === 0) return null;

        const normNomor = normalizeGarduCode(gardu.nomorGardu);
        const normNama = normalizeGarduCode(gardu.namaGardu);

        // 1. Try matching by normalized nomorGardu
        if (normNomor) {
            const match = allTrafoData.find(t => normalizeGarduCode(t.gardu) === normNomor);
            if (match) return match;
        }

        // 2. Try matching by normalized namaGardu
        if (normNama) {
            const match = allTrafoData.find(t => normalizeGarduCode(t.gardu) === normNama);
            if (match) return match;
        }

        // 3. Try partial substring matching (e.g. "LBAN001" in "GARDU LBAN001")
        if (normNomor) {
            const match = allTrafoData.find(t => {
                const normDb = normalizeGarduCode(t.gardu);
                return normDb.includes(normNomor) || normNomor.includes(normDb);
            });
            if (match) return match;
        }

        return null;
    }
}

export const trafoLoadService = new TrafoLoadService();
