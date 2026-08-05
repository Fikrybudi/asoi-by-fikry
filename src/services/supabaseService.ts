// =============================================================================
// PLN SURVEY APP - Supabase Service Layer
// =============================================================================

import { supabase, PHOTO_BUCKET } from './supabaseClient';
import { Survey, Tiang, Gardu, JalurKabel, SurveyShare } from '../types';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';

// =============================================================================
// TYPES
// =============================================================================

interface SurveyRow {
    id: string;
    user_id: string;  // Owner of the survey
    nama_survey: string;
    jenis_survey: string;
    lokasi: string;
    kecamatan?: string;
    kelurahan?: string;
    nama_feeder?: string;
    nama_gardu_induk?: string;
    surveyor: string;
    tanggal_survey: string;
    created_at: string;
    updated_at: string;
}

interface SurveyShareRow {
    id: string;
    survey_id: string;
    shared_by_user_id: string;
    shared_with_email: string;
    created_at: string;
}

interface TiangRow {
    id: string;
    survey_id: string;
    nomor_urut: number;
    latitude: number;
    longitude: number;
    jenis_tiang: string;
    tinggi_tiang: string;
    kekuatan_tiang?: string;
    jenis_jaringan: string;
    konstruksi: string;
    perlengkapan: string[];
    foto?: string[];
    catatan?: string;
    label_position?: number;
    created_at: string;
    updated_at: string;
}

interface GarduRow {
    id: string;
    survey_id: string;
    nomor_gardu: string;
    nama_gardu?: string;
    latitude: number;
    longitude: number;
    jenis_gardu: string;
    kapasitas_kva: number;
    merek_trafo?: string;
    tahun_pasang?: number;
    peralatan_proteksi: string[];
    foto?: string[];
    catatan?: string;
    created_at: string;
    updated_at: string;
}

interface JalurRow {
    id: string;
    survey_id: string;
    nama_jalur?: string;
    koordinat: { latitude: number; longitude: number }[];
    jenis_jaringan: string;
    jenis_penghantar: string;
    penampang_mm: string;
    panjang_meter: number;
    tiang_ids: string[];
    status: string;
    catatan?: string;
    created_at: string;
    updated_at: string;
}

// =============================================================================
// PHOTO UPLOAD SERVICE
// =============================================================================

export const photoService = {
    /**
     * Upload a photo to Supabase Storage
     * @param localUri - Local file URI from ImagePicker
     * @param surveyId - Survey ID for organizing photos
     * @param entityType - Type of entity (tiang, gardu, jalur)
     * @param entityId - Entity ID
     * @returns Public URL of uploaded photo
     */
    async uploadPhoto(
        localUri: string,
        surveyId: string,
        entityType: 'tiang' | 'gardu' | 'jalur',
        entityId: string
    ): Promise<string | null> {
        try {
            // Generate unique filename
            const fileExt = localUri.split('.').pop() || 'jpg';
            const fileName = `${surveyId}/${entityType}/${entityId}/${Crypto.randomUUID()}.${fileExt}`;

            // Read file as base64
            const base64 = await FileSystem.readAsStringAsync(localUri, {
                encoding: 'base64',
            });

            // Convert base64 to ArrayBuffer
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Upload to Supabase Storage
            const { data, error } = await supabase.storage
                .from(PHOTO_BUCKET)
                .upload(fileName, bytes.buffer, {
                    contentType: `image/${fileExt}`,
                    upsert: false,
                });

            if (error) {
                console.error('Photo upload error:', error);
                return null;
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from(PHOTO_BUCKET)
                .getPublicUrl(fileName);

            return urlData.publicUrl;
        } catch (error) {
            console.error('Photo upload error:', error);
            return null;
        }
    },

    /**
     * Delete a photo from Supabase Storage
     */
    async deletePhoto(publicUrl: string): Promise<boolean> {
        try {
            // Extract path from public URL
            const urlParts = publicUrl.split(`${PHOTO_BUCKET}/`);
            if (urlParts.length < 2) return false;

            const filePath = urlParts[1];
            const { error } = await supabase.storage
                .from(PHOTO_BUCKET)
                .remove([filePath]);

            return !error;
        } catch (error) {
            console.error('Photo delete error:', error);
            return false;
        }
    },
};

// =============================================================================
// SURVEY SYNC SERVICE
// =============================================================================

export const supabaseSurveyService = {
    /**
     * Sync a survey to Supabase
     */
    /**
     * Sync a survey to Supabase
     */
    async upsertSurvey(survey: Survey): Promise<{ success: boolean; error?: string }> {
        try {
            // Get current user for ownership
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.error('No authenticated user');
                return {
                    success: false,
                    error: 'Anda belum login ke akun Supabase. Silakan login terlebih dahulu melalui menu Login.'
                };
            }

            let tanggalIso = new Date().toISOString();
            try {
                if (survey.tanggalSurvey) {
                    const d = new Date(survey.tanggalSurvey);
                    if (!isNaN(d.getTime())) {
                        tanggalIso = d.toISOString();
                    }
                }
            } catch (e) {}

            const surveyRow: Partial<SurveyRow> = {
                id: survey.id,
                user_id: user.id,  // Associate survey with current user
                nama_survey: survey.namaSurvey || 'Survey Tanpa Nama',
                jenis_survey: survey.jenisSurvey || 'SUTM',
                lokasi: survey.lokasi || '',
                kecamatan: survey.kecamatan || '',
                kelurahan: survey.kelurahan || '',
                nama_feeder: survey.namaFeeder || '',
                nama_gardu_induk: survey.namaGarduInduk || '',
                surveyor: survey.surveyor || '',
                tanggal_survey: tanggalIso,
                updated_at: new Date().toISOString(),
            };

            const { error: surveyErr } = await supabase
                .from('surveys')
                .upsert(surveyRow, { onConflict: 'id' });

            if (surveyErr) {
                console.error('Survey upsert error:', surveyErr);
                return {
                    success: false,
                    error: `Gagal upsert survey (${surveyErr.code || 'RLS/DB Error'}): ${surveyErr.message}`
                };
            }

            // Sync tiang, gardu, jalur safely
            if (survey.tiangList && survey.tiangList.length > 0) {
                await this.syncTiangList(survey.id, survey.tiangList);
            }
            if (survey.garduList && survey.garduList.length > 0) {
                await this.syncGarduList(survey.id, survey.garduList);
            }
            if (survey.jalurList && survey.jalurList.length > 0) {
                await this.syncJalurList(survey.id, survey.jalurList);
            }

            return { success: true };
        } catch (error: any) {
            console.error('Survey sync error:', error);
            return {
                success: false,
                error: error?.message || 'Terjadi kesalahan sistem saat sinkronisasi survey.'
            };
        }
    },

    /**
     * Sync tiang list for a survey
     */
    async syncTiangList(surveyId: string, tiangList: Tiang[]): Promise<void> {
        for (const tiang of tiangList) {
            try {
                const tiangRow: Partial<TiangRow> = {
                    id: tiang.id,
                    survey_id: surveyId,
                    nomor_urut: tiang.nomorUrut || 1,
                    latitude: tiang.koordinat?.latitude || 0,
                    longitude: tiang.koordinat?.longitude || 0,
                    jenis_tiang: tiang.jenisTiang || 'Beton',
                    tinggi_tiang: tiang.tinggiTiang || '12m',
                    kekuatan_tiang: tiang.kekuatanTiang || '',
                    jenis_jaringan: tiang.jenisJaringan || 'SUTM',
                    konstruksi: tiang.konstruksi || '',
                    perlengkapan: tiang.perlengkapan || [],
                    foto: tiang.foto || [],
                    catatan: tiang.catatan || '',
                    label_position: tiang.labelPosition,
                    updated_at: new Date().toISOString(),
                };

                await supabase.from('tiang').upsert(tiangRow, { onConflict: 'id' });
            } catch (err) {
                console.error(`Error syncing tiang ${tiang.id}:`, err);
            }
        }
    },

    /**
     * Sync gardu list for a survey
     */
    async syncGarduList(surveyId: string, garduList: Gardu[]): Promise<void> {
        for (const gardu of garduList) {
            try {
                const garduRow: Partial<GarduRow> = {
                    id: gardu.id,
                    survey_id: surveyId,
                    nomor_gardu: gardu.nomorGardu || '',
                    nama_gardu: gardu.namaGardu || '',
                    latitude: gardu.koordinat?.latitude || 0,
                    longitude: gardu.koordinat?.longitude || 0,
                    jenis_gardu: gardu.jenisGardu || 'Cantol',
                    kapasitas_kva: gardu.kapasitasKVA || 0,
                    merek_trafo: gardu.merekTrafo || '',
                    tahun_pasang: gardu.tahunPasang || new Date().getFullYear(),
                    peralatan_proteksi: gardu.peralatanProteksi || [],
                    foto: gardu.foto || [],
                    catatan: gardu.catatan || '',
                    updated_at: new Date().toISOString(),
                };

                await supabase.from('gardu').upsert(garduRow, { onConflict: 'id' });
            } catch (err) {
                console.error(`Error syncing gardu ${gardu.id}:`, err);
            }
        }
    },

    /**
     * Sync jalur list for a survey
     */
    async syncJalurList(surveyId: string, jalurList: JalurKabel[]): Promise<void> {
        for (const jalur of jalurList) {
            try {
                const jalurRow: Partial<JalurRow> = {
                    id: jalur.id,
                    survey_id: surveyId,
                    nama_jalur: jalur.namaJalur || '',
                    koordinat: jalur.koordinat || [],
                    jenis_jaringan: jalur.jenisJaringan || 'SUTM',
                    jenis_penghantar: jalur.jenisPenghantar || '',
                    penampang_mm: jalur.penampangMM || '',
                    panjang_meter: jalur.panjangMeter || 0,
                    tiang_ids: jalur.tiangIds || [],
                    status: jalur.status || 'existing',
                    catatan: jalur.catatan || '',
                    updated_at: new Date().toISOString(),
                };

                await supabase.from('jalur').upsert(jalurRow, { onConflict: 'id' });
            } catch (err) {
                console.error(`Error syncing jalur ${jalur.id}:`, err);
            }
        }
    },

    /**
     * Fetch all surveys from Supabase
     */
    async fetchAllSurveys(): Promise<Survey[]> {
        try {
            const { data: surveys, error } = await supabase
                .from('surveys')
                .select('*')
                .order('updated_at', { ascending: false });

            if (error || !surveys) {
                console.error('Fetch surveys error:', error);
                return [];
            }

            // Fetch related data for each survey
            const fullSurveys: Survey[] = [];
            for (const s of surveys) {
                const tiangList = await this.fetchTiangBySurvey(s.id);
                const garduList = await this.fetchGarduBySurvey(s.id);
                const jalurList = await this.fetchJalurBySurvey(s.id);

                fullSurveys.push({
                    id: s.id,
                    namaSurvey: s.nama_survey,
                    jenisSurvey: s.jenis_survey,
                    lokasi: s.lokasi,
                    kecamatan: s.kecamatan,
                    kelurahan: s.kelurahan,
                    namaFeeder: s.nama_feeder,
                    namaGarduInduk: s.nama_gardu_induk,
                    surveyor: s.surveyor,
                    tanggalSurvey: new Date(s.tanggal_survey),
                    tiangList,
                    garduList,
                    jalurList,
                    createdAt: new Date(s.created_at),
                    updatedAt: new Date(s.updated_at),
                    isSynced: true,
                });
            }

            return fullSurveys;
        } catch (error) {
            console.error('Fetch surveys error:', error);
            return [];
        }
    },

    async fetchTiangBySurvey(surveyId: string): Promise<Tiang[]> {
        const { data } = await supabase
            .from('tiang')
            .select('*')
            .eq('survey_id', surveyId)
            .order('nomor_urut');

        if (!data) return [];

        return data.map((t: TiangRow) => ({
            id: t.id,
            nomorUrut: t.nomor_urut,
            koordinat: { latitude: t.latitude, longitude: t.longitude },
            jenisTiang: t.jenis_tiang as 'Beton' | 'Besi/Baja' | 'Kayu',
            tinggiTiang: t.tinggi_tiang,
            kekuatanTiang: t.kekuatan_tiang,
            jenisJaringan: t.jenis_jaringan as 'SUTM' | 'SUTR' | 'SKUTM',
            konstruksi: t.konstruksi,
            perlengkapan: t.perlengkapan || [],
            foto: t.foto,
            catatan: t.catatan,
            labelPosition: t.label_position,
            createdAt: new Date(t.created_at),
            updatedAt: new Date(t.updated_at),
            isSynced: true,
        }));
    },

    async fetchGarduBySurvey(surveyId: string): Promise<Gardu[]> {
        const { data } = await supabase
            .from('gardu')
            .select('*')
            .eq('survey_id', surveyId);

        if (!data) return [];

        return data.map((g: GarduRow) => ({
            id: g.id,
            nomorGardu: g.nomor_gardu,
            namaGardu: g.nama_gardu,
            koordinat: { latitude: g.latitude, longitude: g.longitude },
            jenisGardu: g.jenis_gardu as 'Portal' | 'Cantol' | 'Beton' | 'Ground',
            kapasitasKVA: g.kapasitas_kva,
            merekTrafo: g.merek_trafo,
            tahunPasang: g.tahun_pasang,
            peralatanProteksi: g.peralatan_proteksi || [],
            foto: g.foto,
            catatan: g.catatan,
            createdAt: new Date(g.created_at),
            updatedAt: new Date(g.updated_at),
            isSynced: true,
        }));
    },

    async fetchJalurBySurvey(surveyId: string): Promise<JalurKabel[]> {
        const { data } = await supabase
            .from('jalur')
            .select('*')
            .eq('survey_id', surveyId);

        if (!data) return [];

        return data.map((j: JalurRow) => ({
            id: j.id,
            namaJalur: j.nama_jalur,
            koordinat: j.koordinat,
            jenisJaringan: j.jenis_jaringan as 'SUTM' | 'SKTM' | 'SKUTM' | 'SUTR' | 'SKTR',
            jenisPenghantar: j.jenis_penghantar,
            penampangMM: j.penampang_mm,
            panjangMeter: j.panjang_meter,
            tiangIds: j.tiang_ids || [],
            status: j.status as 'existing' | 'planned' | 'remove',
            catatan: j.catatan,
            createdAt: new Date(j.created_at),
            updatedAt: new Date(j.updated_at),
            isSynced: true,
        }));
    },

    /**
     * Delete a survey and all related data
     */
    async deleteSurvey(surveyId: string): Promise<boolean> {
        try {
            // Cascade delete is handled by DB foreign keys
            const { error } = await supabase
                .from('surveys')
                .delete()
                .eq('id', surveyId);

            return !error;
        } catch (error) {
            console.error('Delete survey error:', error);
            return false;
        }
    },
    /**
     * Share a survey with an email
     */
    async shareSurvey(surveyId: string, email: string): Promise<{ success: boolean; message?: string }> {
        try {
            // Trim and validate email
            const cleanEmail = email.trim().toLowerCase();
            if (!cleanEmail) return { success: false, message: 'Email tidak boleh kosong' };

            // Check if already shared
            const { data: existing } = await supabase
                .from('survey_shares')
                .select('id')
                .eq('survey_id', surveyId)
                .eq('shared_with_email', cleanEmail)
                .single();

            if (existing) {
                return { success: false, message: 'Survey sudah dibagikan ke email ini' };
            }

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { success: false, message: 'User tidak terautentikasi' };

            const { error } = await supabase
                .from('survey_shares')
                .insert({
                    survey_id: surveyId,
                    shared_with_email: cleanEmail,
                    shared_by_user_id: user.id // Explicitly set to secure RLS
                });

            if (error) throw error;
            return { success: true };
        } catch (error: any) {
            console.error('Share survey error:', error);
            return { success: false, message: error.message || 'Gagal membagikan survey' };
        }
    },

    /**
     * Get list of emails a survey is shared with
     */
    async getSurveyShares(surveyId: string): Promise<SurveyShare[]> {
        try {
            const { data, error } = await supabase
                .from('survey_shares')
                .select('*')
                .eq('survey_id', surveyId);

            if (error || !data) return [];

            return data.map((row: SurveyShareRow) => ({
                id: row.id,
                surveyId: row.survey_id,
                sharedByUserId: row.shared_by_user_id,
                sharedWithEmail: row.shared_with_email,
                createdAt: new Date(row.created_at)
            }));
        } catch (error) {
            console.error('Get shares error:', error);
            return [];
        }
    },

    /**
     * Remove a share
     */
    async removeShare(shareId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('survey_shares')
                .delete()
                .eq('id', shareId);

            return !error;
        } catch (error) {
            console.error('Remove share error:', error);
            return false;
        }
    },
};

// =============================================================================
// SYNC MANAGER - Process offline queue
// =============================================================================

export const syncManager = {
    /**
     * Process sync queue and upload to Supabase
     */
    async processQueue(
        queue: { entityType: string; entityId: string; action: string; data: any }[],
        onItemSynced: (id: string) => Promise<void>
    ): Promise<{ success: number; failed: number }> {
        let success = 0;
        let failed = 0;

        for (const item of queue) {
            try {
                let synced = false;

                if (item.entityType === 'survey') {
                    if (item.action === 'delete') {
                        synced = await supabaseSurveyService.deleteSurvey(item.entityId);
                    } else {
                        const res = await supabaseSurveyService.upsertSurvey(item.data);
                        synced = typeof res === 'boolean' ? res : res.success;
                    }
                }

                if (synced) {
                    await onItemSynced(item.entityId);
                    success++;
                } else {
                    failed++;
                }
            } catch (error) {
                console.error('Sync item error:', error);
                failed++;
            }
        }

        return { success, failed };
    },

    /**
     * Check if online
     */
    async isOnline(): Promise<boolean> {
        try {
            const { data, error } = await supabase.from('surveys').select('id').limit(1);
            return !error;
        } catch {
            return false;
        }
    },
};
