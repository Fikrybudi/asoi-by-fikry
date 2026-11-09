// =============================================================================
// PLN SURVEY APP - Cloud GIS Service
// =============================================================================
// Service for fetching on-demand PLN existing network GIS data
// (JTM per Penyulang, JTR per Gardu, Gardu per ULP, Proteksi)
// from Cloudflare CDN / aaPanel static hosting.
// =============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { OverlayFile, OverlayGeoData, OverlayPoint, OverlayPolyline, OverlayDataType } from '../types/overlayTypes';
import allGarduIndex from '../data/allGarduIndex.json';

export const DEFAULT_CLOUD_GIS_URL = 'https://masiv.yantekpintar.my.id/data-existing';
const STORAGE_URL_KEY = '@cloud_gis_base_url';

export interface CloudPenyulang {
  id: string;
  nama: string;
  ulp: string;
  file?: string;
  jtm?: string | null;
  gardu?: string | null;
  proteksi?: string | null;
  n_jtm?: number;
  kb_jtm?: number;
  n_gardu?: number;
  kb_gardu?: number;
  n_proteksi?: number;
  kb_proteksi?: number;
  express?: boolean;
  bbox?: [number, number, number, number];
}

export interface CloudGardu {
  id: string;
  nama: string;
  penyulang: string;
  lat: number;
  lng: number;
  kode_gis?: string;
  ulp: string;
  ada_jtr?: boolean;
  distance?: number;
}

export interface CloudGisCatalog {
  penyulang: CloudPenyulang[];
  gardu?: CloudGardu[];
  ulp: string[];
  layer?: {
    jtm?: string;
    jtr?: string;
    gardu?: string;
    proteksi?: string;
  };
  statistik?: {
    n_penyulang: number;
    n_segmen_jtm?: number;
    n_gardu: number;
    n_proteksi?: number;
    n_garis_jtr?: number;
    n_tiang_tr?: number;
  };
  penyulang_per_ulp?: Record<string, string[]>;
  sumber?: string;
}

let cachedCatalog: CloudGisCatalog | null = null;
let catalogFetchPromise: Promise<CloudGisCatalog> | null = null;
let memoryBaseUrl: string = DEFAULT_CLOUD_GIS_URL;

export const cloudGisService = {
  /**
   * Initialize or retrieve Base URL from AsyncStorage
   */
  async getBaseUrl(): Promise<string> {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_URL_KEY);
      if (saved && saved.trim()) {
        memoryBaseUrl = saved.trim().replace(/\/+$/, '');
        return memoryBaseUrl;
      }
    } catch (e) {
      console.warn('Failed to read cloud GIS URL from storage:', e);
    }
    return DEFAULT_CLOUD_GIS_URL;
  },

  /**
   * Synchronously get current memory Base URL
   */
  getCachedBaseUrl(): string {
    return memoryBaseUrl;
  },

  /**
   * Update Base URL in storage and memory
   */
  async setBaseUrl(url: string): Promise<void> {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    memoryBaseUrl = cleanUrl;
    cachedCatalog = null;
    catalogFetchPromise = null;
    try {
      await AsyncStorage.setItem(STORAGE_URL_KEY, cleanUrl);
    } catch (e) {
      console.warn('Failed to save cloud GIS URL to storage:', e);
    }
  },

  /**
   * Reset Base URL to default
   */
  async resetBaseUrl(): Promise<void> {
    memoryBaseUrl = DEFAULT_CLOUD_GIS_URL;
    cachedCatalog = null;
    catalogFetchPromise = null;
    try {
      await AsyncStorage.removeItem(STORAGE_URL_KEY);
    } catch (e) {
      console.warn('Failed to remove cloud GIS URL from storage:', e);
    }
  },

  /**
   * Fetch Master Catalog (catalog_index.json)
   */
  async getCatalog(forceRefresh = false): Promise<CloudGisCatalog> {
    if (!forceRefresh && cachedCatalog) {
      return cachedCatalog;
    }

    if (catalogFetchPromise && !forceRefresh) {
      return catalogFetchPromise;
    }

    const baseUrl = await this.getBaseUrl();
    catalogFetchPromise = (async () => {
      const res = await fetch(`${baseUrl}/catalog_index.json?_t=${Date.now()}`);
      if (!res.ok) {
        throw new Error(`Gagal memuat katalog Cloud GIS (HTTP ${res.status})`);
      }
      const data: CloudGisCatalog = await res.json();
      if (!Array.isArray(data.gardu) || data.gardu.length === 0) {
        data.gardu = allGarduIndex as CloudGardu[];
      }
      cachedCatalog = data;
      return data;
    })();

    try {
      return await catalogFetchPromise;
    } finally {
      catalogFetchPromise = null;
    }
  },

  /**
   * Convert GeoJSON FeatureCollection to OverlayFile
   */
  parseGeoJsonToOverlay(
    geoJson: any,
    id: string,
    name: string,
    type: OverlayDataType,
    color?: string
  ): OverlayFile {
    const points: OverlayPoint[] = [];
    const polylines: OverlayPolyline[] = [];

    const features = geoJson?.features || [];

    for (const feat of features) {
      const geom = feat?.geometry;
      if (!geom) continue;

      const rawProps = feat.properties || {};
      const properties: Record<string, string> = {};
      for (const [k, v] of Object.entries(rawProps)) {
        properties[k] = v === null || v === undefined ? '' : String(v);
      }

      if (geom.type === 'Point' && Array.isArray(geom.coordinates) && geom.coordinates.length >= 2) {
        const [lng, lat] = geom.coordinates;
        if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
          const ptName =
            properties['name'] ||
            properties['nama'] ||
            properties['nama_tiang'] ||
            properties['nama_asli'] ||
            properties['tipe'] ||
            `Titik ${points.length + 1}`;

          points.push({
            lat,
            lng,
            name: ptName,
            properties,
          });
        }
      } else if (geom.type === 'LineString' && Array.isArray(geom.coordinates)) {
        const coords: { lat: number; lng: number }[] = [];
        for (const coord of geom.coordinates) {
          if (Array.isArray(coord) && coord.length >= 2) {
            const [lng, lat] = coord;
            if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
              coords.push({ lat, lng });
            }
          }
        }

        if (coords.length >= 2) {
          const lineName =
            properties['name'] ||
            properties['description'] ||
            properties['penyulang'] ||
            properties['gardu'] ||
            `Segmen ${polylines.length + 1}`;

          polylines.push({
            name: lineName,
            coords,
            properties,
          });
        }
      } else if (geom.type === 'MultiLineString' && Array.isArray(geom.coordinates)) {
        for (const line of geom.coordinates) {
          const coords: { lat: number; lng: number }[] = [];
          for (const coord of line) {
            if (Array.isArray(coord) && coord.length >= 2) {
              const [lng, lat] = coord;
              if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
                coords.push({ lat, lng });
              }
            }
          }
          if (coords.length >= 2) {
            polylines.push({
              name: properties['name'] || properties['description'] || `Segmen ${polylines.length + 1}`,
              coords,
              properties,
            });
          }
        }
      }
    }

    const data: OverlayGeoData = { points, polylines };

    return {
      id,
      name,
      type,
      visible: true,
      opacity: 0.85,
      color,
      data,
      importedAt: new Date().toISOString(),
    };
  },

  /**
   * Fetch JTR GeoJSON for a specific Gardu
   */
  async fetchJtr(garduId: string, garduNama?: string): Promise<OverlayFile> {
    const baseUrl = await this.getBaseUrl();
    const cleanId = garduId.trim();
    const url = `${baseUrl}/jtr/${encodeURIComponent(cleanId)}.geojson`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Data JTR untuk gardu ${cleanId} tidak ditemukan di Cloud (HTTP ${res.status}).`);
    }

    const geoJson = await res.json();
    const id = `cloud_jtr_${cleanId.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const name = `JTR ${cleanId}${garduNama ? ` - ${garduNama}` : ''}`;

    // Glowing Orange for JTR lines
    return this.parseGeoJsonToOverlay(geoJson, id, name, 'jtr', '#FF6600');
  },

  /**
   * Helper to resolve relative file path for Cloud GIS
   */
  resolveFileName(raw: string, fallbackFolder: string): string {
    let s = (raw || '').trim().replace(/^\/+/, '');
    if (s.startsWith(`${fallbackFolder}/`)) {
      s = s.substring(fallbackFolder.length + 1);
    }
    if (!s.endsWith('.geojson')) {
      s = `${s}.geojson`;
    }
    return s;
  },

  /**
   * Fetch JTM GeoJSON for a specific Penyulang
   */
  async fetchJtm(penyulangFileOrId: string, penyulangNama: string): Promise<OverlayFile> {
    const baseUrl = await this.getBaseUrl();
    const fileName = this.resolveFileName(penyulangFileOrId, 'jtm');
    const url = `${baseUrl}/jtm/${encodeURIComponent(fileName)}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Data JTM ${penyulangNama} tidak ditemukan di Cloud (HTTP ${res.status}).`);
    }

    const geoJson = await res.json();
    const cleanId = fileName.replace('.geojson', '').toLowerCase().replace(/[^a-z0-9]/g, '_');
    const id = `cloud_jtm_${cleanId}`;
    const name = `JTM ${penyulangNama}`;

    return this.parseGeoJsonToOverlay(geoJson, id, name, 'jtm');
  },

  /**
   * Fetch Gardu distribution points for a specific Penyulang
   */
  async fetchGarduPenyulang(garduFileOrId: string, penyulangNama: string): Promise<OverlayFile> {
    const baseUrl = await this.getBaseUrl();
    const fileName = this.resolveFileName(garduFileOrId, 'gardu');
    const url = `${baseUrl}/gardu/${encodeURIComponent(fileName)}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Data Gardu ${penyulangNama} tidak ditemukan di Cloud (HTTP ${res.status}).`);
    }

    const geoJson = await res.json();
    const cleanId = fileName.replace('.geojson', '').toLowerCase().replace(/[^a-z0-9]/g, '_');
    const id = `cloud_gardu_${cleanId}`;
    const name = `Gardu ${penyulangNama}`;

    return this.parseGeoJsonToOverlay(geoJson, id, name, 'gardu');
  },

  /**
   * Fetch Proteksi / GH / Posko points for a specific Penyulang
   */
  async fetchProteksiPenyulang(proteksiFileOrId: string, penyulangNama: string): Promise<OverlayFile> {
    const baseUrl = await this.getBaseUrl();
    const fileName = this.resolveFileName(proteksiFileOrId, 'proteksi');
    const url = `${baseUrl}/proteksi/${encodeURIComponent(fileName)}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Data Proteksi ${penyulangNama} tidak ditemukan di Cloud (HTTP ${res.status}).`);
    }

    const geoJson = await res.json();
    const cleanId = fileName.replace('.geojson', '').toLowerCase().replace(/[^a-z0-9]/g, '_');
    const id = `cloud_pro_${cleanId}`;
    const name = `Proteksi ${penyulangNama}`;

    return this.parseGeoJsonToOverlay(geoJson, id, name, 'proteksi');
  },

  /**
   * Fetch Gardu distribution points for a specific ULP
   */
  async fetchGardu(ulpName: string, catalog?: CloudGisCatalog | null): Promise<OverlayFile> {
    const baseUrl = await this.getBaseUrl();
    const cleanUlp = ulpName.trim().toUpperCase();
    const url = `${baseUrl}/gardu/${encodeURIComponent(cleanUlp)}.geojson`;

    try {
      const res = await fetch(url);
      if (res.ok) {
        const geoJson = await res.json();
        const id = `cloud_gardu_${cleanUlp.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        const name = `Gardu Distribusi ULP ${cleanUlp}`;
        return this.parseGeoJsonToOverlay(geoJson, id, name, 'gardu');
      }
    } catch (e) {}

    // Fallback: Aggregate per-penyulang gardu in this ULP
    if (catalog && catalog.penyulang) {
      const targetPenyulang = catalog.penyulang.filter(
        (p) => p.ulp.toUpperCase() === cleanUlp && p.gardu
      );

      if (targetPenyulang.length > 0) {
        const allFeatures: any[] = [];
        await Promise.all(
          targetPenyulang.map(async (p) => {
            try {
              const fileName = this.resolveFileName(p.gardu || p.id, 'gardu');
              const res = await fetch(`${baseUrl}/gardu/${encodeURIComponent(fileName)}`);
              if (res.ok) {
                const gj = await res.json();
                if (Array.isArray(gj?.features)) {
                  allFeatures.push(...gj.features);
                }
              }
            } catch (err) {
              console.warn(`Failed loading gardu for penyulang ${p.nama}:`, err);
            }
          })
        );

        if (allFeatures.length > 0) {
          const combinedGeoJson = {
            type: 'FeatureCollection',
            name: `Gardu Distribusi ULP ${cleanUlp}`,
            features: allFeatures,
          };
          const id = `cloud_gardu_${cleanUlp.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
          const name = `Gardu Distribusi ULP ${cleanUlp}`;
          return this.parseGeoJsonToOverlay(combinedGeoJson, id, name, 'gardu');
        }
      }
    }

    throw new Error(`Data Gardu ULP ${cleanUlp} tidak ditemukan di Cloud.`);
  },

  /**
   * Fetch Proteksi / GH points for a specific ULP
   */
  async fetchProteksi(ulpName: string, catalog?: CloudGisCatalog | null): Promise<OverlayFile> {
    const baseUrl = await this.getBaseUrl();
    const cleanUlp = ulpName.trim().toUpperCase();
    const url = `${baseUrl}/proteksi/${encodeURIComponent(cleanUlp)}.geojson`;

    try {
      const res = await fetch(url);
      if (res.ok) {
        const geoJson = await res.json();
        const id = `cloud_pro_${cleanUlp.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        const name = `Proteksi & GH ULP ${cleanUlp}`;
        return this.parseGeoJsonToOverlay(geoJson, id, name, 'proteksi');
      }
    } catch (e) {}

    // Fallback: Aggregate per-penyulang proteksi in this ULP
    if (catalog && catalog.penyulang) {
      const targetPenyulang = catalog.penyulang.filter(
        (p) => p.ulp.toUpperCase() === cleanUlp && p.proteksi
      );

      if (targetPenyulang.length > 0) {
        const allFeatures: any[] = [];
        await Promise.all(
          targetPenyulang.map(async (p) => {
            try {
              const fileName = this.resolveFileName(p.proteksi || p.id, 'proteksi');
              const res = await fetch(`${baseUrl}/proteksi/${encodeURIComponent(fileName)}`);
              if (res.ok) {
                const gj = await res.json();
                if (Array.isArray(gj?.features)) {
                  allFeatures.push(...gj.features);
                }
              }
            } catch (err) {
              console.warn(`Failed loading proteksi for penyulang ${p.nama}:`, err);
            }
          })
        );

        if (allFeatures.length > 0) {
          const combinedGeoJson = {
            type: 'FeatureCollection',
            name: `Proteksi & GH ULP ${cleanUlp}`,
            features: allFeatures,
          };
          const id = `cloud_pro_${cleanUlp.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
          const name = `Proteksi & GH ULP ${cleanUlp}`;
          return this.parseGeoJsonToOverlay(combinedGeoJson, id, name, 'proteksi');
        }
      }
    }

    throw new Error(`Data Proteksi ULP ${cleanUlp} tidak ditemukan di Cloud.`);
  },

  /**
   * Calculate bounding box [[minLat, minLng], [maxLat, maxLng]] of an OverlayFile
   */
  calculateBounds(overlay: OverlayFile): [[number, number], [number, number]] | null {
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;
    let count = 0;

    for (const pt of overlay.data.points) {
      if (pt.lat < minLat) minLat = pt.lat;
      if (pt.lat > maxLat) maxLat = pt.lat;
      if (pt.lng < minLng) minLng = pt.lng;
      if (pt.lng > maxLng) maxLng = pt.lng;
      count++;
    }

    for (const pl of overlay.data.polylines) {
      for (const c of pl.coords) {
        if (c.lat < minLat) minLat = c.lat;
        if (c.lat > maxLat) maxLat = c.lat;
        if (c.lng < minLng) minLng = c.lng;
        if (c.lng > maxLng) maxLng = c.lng;
        count++;
      }
    }

    if (count === 0 || !isFinite(minLat) || !isFinite(maxLat)) {
      return null;
    }

    return [
      [minLat, minLng],
      [maxLat, maxLng],
    ];
  },
};
