// =============================================================================
// PLN SURVEY APP - Async Storage Database Service
// =============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Survey, Tiang, Gardu, JalurKabel, SyncQueueItem } from '../types';
import { supabaseSurveyService, syncManager } from './supabaseService';

// Generate UUID using expo-crypto
const generateUUID = (): string => {
    return Crypto.randomUUID();
};

const KEYS = {
    SURVEYS: '@pln_surveys',
    CURRENT_SURVEY: '@pln_current_survey',
    SYNC_QUEUE: '@pln_sync_queue',
};

// Flag to enable/disable auto cloud sync
let autoSyncEnabled = true;

export const setAutoSync = (enabled: boolean) => {
    autoSyncEnabled = enabled;
};

// Trigger cloud sync after local operations
const triggerCloudSync = async (survey: Survey) => {
    if (!autoSyncEnabled) return;

    try {
        const isOnline = await syncManager.isOnline();
        if (isOnline) {
            await supabaseSurveyService.upsertSurvey(survey);
            // Mark as synced locally
            const surveys = await surveyService.getAll();
            const index = surveys.findIndex(s => s.id === survey.id);
            if (index !== -1) {
                surveys[index].isSynced = true;
                await AsyncStorage.setItem(KEYS.SURVEYS, JSON.stringify(surveys));
            }
        }
    } catch (error) {
        console.log('Cloud sync failed, will retry later:', error);
    }
};

// =============================================================================
// SURVEY OPERATIONS
// =============================================================================

export const surveyService = {
    // Get all surveys
    async getAll(): Promise<Survey[]> {
        try {
            const data = await AsyncStorage.getItem(KEYS.SURVEYS);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error getting surveys:', error);
            return [];
        }
    },

    // Get survey by ID
    async getById(id: string): Promise<Survey | null> {
        const surveys = await this.getAll();
        return surveys.find(s => s.id === id) || null;
    },

    // Create new survey
    async create(survey: Omit<Survey, 'id' | 'createdAt' | 'updatedAt' | 'isSynced'>): Promise<Survey> {
        const surveys = await this.getAll();
        const newSurvey: Survey = {
            ...survey,
            id: generateUUID(),
            createdAt: new Date(),
            updatedAt: new Date(),
            isSynced: false,
            tiangList: [],
            garduList: [],
            jalurList: [],
        };

        surveys.push(newSurvey);
        await AsyncStorage.setItem(KEYS.SURVEYS, JSON.stringify(surveys));

        // Add to sync queue
        await syncQueueService.add('survey', newSurvey.id, 'create', newSurvey);

        // Trigger cloud sync
        triggerCloudSync(newSurvey);

        return newSurvey;
    },

    // Update survey
    async update(id: string, updates: Partial<Survey>): Promise<Survey | null> {
        const surveys = await this.getAll();
        const index = surveys.findIndex(s => s.id === id);

        if (index === -1) return null;

        surveys[index] = {
            ...surveys[index],
            ...updates,
            updatedAt: new Date(),
            isSynced: false,
        };

        await AsyncStorage.setItem(KEYS.SURVEYS, JSON.stringify(surveys));
        await syncQueueService.add('survey', id, 'update', surveys[index]);

        // Trigger cloud sync
        triggerCloudSync(surveys[index]);

        return surveys[index];
    },

    // Delete survey
    async delete(id: string): Promise<boolean> {
        const surveys = await this.getAll();
        const filtered = surveys.filter(s => s.id !== id);

        if (filtered.length === surveys.length) return false;

        await AsyncStorage.setItem(KEYS.SURVEYS, JSON.stringify(filtered));
        await syncQueueService.add('survey', id, 'delete', { id });

        // Trigger cloud delete
        supabaseSurveyService.deleteSurvey(id).catch(console.log);

        return true;
    },

    // Set current active survey
    async setCurrent(id: string): Promise<void> {
        await AsyncStorage.setItem(KEYS.CURRENT_SURVEY, id);
    },

    // Get current active survey
    async getCurrent(): Promise<Survey | null> {
        const id = await AsyncStorage.getItem(KEYS.CURRENT_SURVEY);
        if (!id) return null;
        return this.getById(id);
    },

    // Import surveys from cloud (merge with local)
    async importSurveys(importedSurveys: Survey[]): Promise<void> {
        try {
            const currentSurveys = await this.getAll();
            const currentMap = new Map(currentSurveys.map(s => [s.id, s]));

            for (const imported of importedSurveys) {
                // Determine if we should update:
                // 1. If it doesn't exist locally -> Add it
                // 2. If it exists but cloud version is newer (based on updatedAt) -> Update it
                // 3. For now, simple strategy: Always overwrite/add if explicitly requested by sync
                currentMap.set(imported.id, {
                    ...imported,
                    isSynced: true // Mark as valid synced copy
                });
            }

            const mergedSurveys = Array.from(currentMap.values());
            await AsyncStorage.setItem(KEYS.SURVEYS, JSON.stringify(mergedSurveys));
        } catch (error) {
            console.error('Error importing surveys:', error);
            throw error;
        }
    },
};

// =============================================================================
// TIANG OPERATIONS (within a survey)
// =============================================================================

export const tiangService = {
    async add(surveyId: string, tiang: Omit<Tiang, 'id' | 'nomorUrut' | 'createdAt' | 'updatedAt' | 'isSynced'>): Promise<Tiang | null> {
        const survey = await surveyService.getById(surveyId);
        if (!survey) return null;

        const newTiang: Tiang = {
            ...tiang,
            id: generateUUID(),
            nomorUrut: survey.tiangList.length + 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            isSynced: false,
        };

        survey.tiangList.push(newTiang);
        await surveyService.update(surveyId, { tiangList: survey.tiangList });

        return newTiang;
    },

    async update(surveyId: string, tiangId: string, updates: Partial<Tiang>): Promise<Tiang | null> {
        const survey = await surveyService.getById(surveyId);
        if (!survey) return null;

        const index = survey.tiangList.findIndex(t => t.id === tiangId);
        if (index === -1) return null;

        survey.tiangList[index] = {
            ...survey.tiangList[index],
            ...updates,
            updatedAt: new Date(),
            isSynced: false,
        };

        await surveyService.update(surveyId, { tiangList: survey.tiangList });
        return survey.tiangList[index];
    },

    async delete(surveyId: string, tiangId: string): Promise<boolean> {
        const survey = await surveyService.getById(surveyId);
        if (!survey) return false;

        const filtered = survey.tiangList.filter(t => t.id !== tiangId);
        if (filtered.length === survey.tiangList.length) return false;

        // Renumber remaining tiang
        filtered.forEach((t, i) => t.nomorUrut = i + 1);

        await surveyService.update(surveyId, { tiangList: filtered });
        return true;
    },
};

// =============================================================================
// GARDU OPERATIONS (within a survey)
// =============================================================================

export const garduService = {
    async add(surveyId: string, gardu: Omit<Gardu, 'id' | 'createdAt' | 'updatedAt' | 'isSynced'>): Promise<Gardu | null> {
        const survey = await surveyService.getById(surveyId);
        if (!survey) return null;

        const newGardu: Gardu = {
            ...gardu,
            id: generateUUID(),
            createdAt: new Date(),
            updatedAt: new Date(),
            isSynced: false,
        };

        survey.garduList.push(newGardu);
        await surveyService.update(surveyId, { garduList: survey.garduList });

        return newGardu;
    },

    async update(surveyId: string, garduId: string, updates: Partial<Gardu>): Promise<Gardu | null> {
        const survey = await surveyService.getById(surveyId);
        if (!survey) return null;

        const index = survey.garduList.findIndex(g => g.id === garduId);
        if (index === -1) return null;

        survey.garduList[index] = {
            ...survey.garduList[index],
            ...updates,
            updatedAt: new Date(),
            isSynced: false,
        };

        await surveyService.update(surveyId, { garduList: survey.garduList });
        return survey.garduList[index];
    },

    async delete(surveyId: string, garduId: string): Promise<boolean> {
        const survey = await surveyService.getById(surveyId);
        if (!survey) return false;

        const filtered = survey.garduList.filter(g => g.id !== garduId);
        if (filtered.length === survey.garduList.length) return false;

        await surveyService.update(surveyId, { garduList: filtered });
        return true;
    },
};

// =============================================================================
// JALUR KABEL OPERATIONS (within a survey)
// =============================================================================

export const jalurService = {
    async add(surveyId: string, jalur: Omit<JalurKabel, 'id' | 'createdAt' | 'updatedAt' | 'isSynced'>): Promise<JalurKabel | null> {
        const survey = await surveyService.getById(surveyId);
        if (!survey) return null;

        const newJalur: JalurKabel = {
            ...jalur,
            id: generateUUID(),
            createdAt: new Date(),
            updatedAt: new Date(),
            isSynced: false,
        };

        survey.jalurList.push(newJalur);
        await surveyService.update(surveyId, { jalurList: survey.jalurList });

        return newJalur;
    },

    async update(surveyId: string, jalurId: string, updates: Partial<JalurKabel>): Promise<JalurKabel | null> {
        const survey = await surveyService.getById(surveyId);
        if (!survey) return null;

        const index = survey.jalurList.findIndex(j => j.id === jalurId);
        if (index === -1) return null;

        survey.jalurList[index] = {
            ...survey.jalurList[index],
            ...updates,
            updatedAt: new Date(),
            isSynced: false,
        };

        await surveyService.update(surveyId, { jalurList: survey.jalurList });
        return survey.jalurList[index];
    },

    async delete(surveyId: string, jalurId: string): Promise<boolean> {
        const survey = await surveyService.getById(surveyId);
        if (!survey) return false;

        const filtered = survey.jalurList.filter(j => j.id !== jalurId);
        if (filtered.length === survey.jalurList.length) return false;

        await surveyService.update(surveyId, { jalurList: filtered });
        return true;
    },
};

// =============================================================================
// SYNC QUEUE OPERATIONS
// =============================================================================

export const syncQueueService = {
    async add(entityType: SyncQueueItem['entityType'], entityId: string, action: SyncQueueItem['action'], data: any): Promise<void> {
        try {
            const queue = await this.getAll();
            const item: SyncQueueItem = {
                id: generateUUID(),
                entityType,
                entityId,
                action,
                data,
                createdAt: new Date(),
                retryCount: 0,
            };
            queue.push(item);
            await AsyncStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify(queue));
        } catch (error) {
            console.error('Error adding to sync queue:', error);
        }
    },

    async getAll(): Promise<SyncQueueItem[]> {
        try {
            const data = await AsyncStorage.getItem(KEYS.SYNC_QUEUE);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error getting sync queue:', error);
            return [];
        }
    },

    async remove(id: string): Promise<void> {
        const queue = await this.getAll();
        const filtered = queue.filter(item => item.id !== id);
        await AsyncStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify(filtered));
    },

    async clear(): Promise<void> {
        await AsyncStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify([]));
    },

    async getCount(): Promise<number> {
        const queue = await this.getAll();
        return queue.length;
    },
};
