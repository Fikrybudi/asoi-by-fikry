// =============================================================================
// PLN SURVEY APP - Superadmin Notification Service (Mobile)
// Realtime Push Notifications, In-App Alert & Offline Catch-Up
// =============================================================================

import { supabase } from './supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Vibration } from 'react-native';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface SuperadminNotification {
  id: string;
  type: 'INSERT' | 'UPDATE';
  surveyId: string;
  namaSurvey: string;
  jenisSurvey: string;
  surveyor: string;
  lokasi?: string;
  updatedBy?: string;
  timestamp: string;
  read: boolean;
  title?: string;
  message?: string;
}

const STORAGE_KEY = '@masiv_superadmin_notifications_v1';
const LAST_SEEN_KEY = '@masiv_superadmin_last_seen_timestamp';

export const mobileNotificationService = {
  /**
   * Trigger subtle phone vibration pattern for incoming notification
   */
  triggerVibration() {
    try {
      Vibration.vibrate([0, 150, 80, 150]);
    } catch {}
  },

  /**
   * Get cached notifications from AsyncStorage
   */
  async getLocalNotifications(): Promise<SuperadminNotification[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  async getStoredNotifications(): Promise<SuperadminNotification[]> {
    return this.getLocalNotifications();
  },

  /**
   * Save notifications to AsyncStorage
   */
  async saveLocalNotifications(notifications: SuperadminNotification[]): Promise<void> {
    try {
      const trimmed = notifications.slice(0, 50);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Failed to save notifications to AsyncStorage:', e);
    }
  },

  /**
   * Append a new notification and save
   */
  async addNotification(notif: SuperadminNotification): Promise<SuperadminNotification[]> {
    const list = await this.getLocalNotifications();
    const filtered = list.filter((n) => n.id !== notif.id);
    const updated = [notif, ...filtered];
    await this.saveLocalNotifications(updated);
    return updated;
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<SuperadminNotification[]> {
    const list = (await this.getLocalNotifications()).map((n) => ({ ...n, read: true }));
    await this.saveLocalNotifications(list);
    return list;
  },

  /**
   * Clear all notification history
   */
  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {}
  },

  async clearAllNotifications(): Promise<void> {
    return this.clearAll();
  },

  /**
   * Get timestamp when superadmin last checked/opened notifications
   */
  async getLastSeenTimestamp(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(LAST_SEEN_KEY);
    } catch {
      return null;
    }
  },

  /**
   * Update last seen timestamp
   */
  async setLastSeenTimestamp(isoTime: string = new Date().toISOString()): Promise<void> {
    try {
      await AsyncStorage.setItem(LAST_SEEN_KEY, isoTime);
    } catch {}
  },

  /**
   * Catch-up query: Fetch all surveys created or updated in cloud since last visit
   */
  async checkCatchupSurveys(currentUserId: string): Promise<SuperadminNotification[]> {
    try {
      const lastSeen = await this.getLastSeenTimestamp();
      let query = supabase
        .from('surveys')
        .select('id, user_id, nama_survey, jenis_survey, surveyor, lokasi, updated_by, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(20);

      if (lastSeen) {
        query = query.gt('updated_at', lastSeen);
      }

      const { data, error } = await query;
      if (error || !data) return [];

      const catchupList: SuperadminNotification[] = [];
      for (const row of data) {
        if (row.updated_by === currentUserId || (row.user_id === currentUserId && !row.updated_by)) {
          continue;
        }

        const isInsert = row.created_at === row.updated_at;
        catchupList.push({
          id: `catchup-${row.id}-${row.updated_at}`,
          type: isInsert ? 'INSERT' : 'UPDATE',
          surveyId: row.id,
          namaSurvey: row.nama_survey || 'Survey Tanpa Nama',
          jenisSurvey: row.jenis_survey || 'SUTM',
          surveyor: row.surveyor || 'Surveyor',
          lokasi: row.lokasi || '',
          updatedBy: row.updated_by || row.surveyor,
          timestamp: row.updated_at || row.created_at || new Date().toISOString(),
          read: false,
          title: isInsert ? 'Survey Baru Diunggah' : 'Survey Diperbarui',
          message: `${row.nama_survey || 'Survey'} (${row.updated_by || row.surveyor || 'Surveyor'})`,
        });
      }

      return catchupList;
    } catch (err) {
      console.warn('Error during mobile catch-up survey check:', err);
      return [];
    }
  },

  /**
   * Subscribe to Supabase Realtime channel for survey table changes
   */
  subscribeToSuperadminNotifications(
    currentUserId: string,
    onReceive: (notification: SuperadminNotification) => void
  ): () => void {
    const channelName = `superadmin-surveys-mobile-${Date.now()}`;
    const channel: RealtimeChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'surveys',
        },
        async (payload) => {
          const newRow = payload.new as any;
          if (!newRow || !newRow.id) return;

          // Don't notify the superadmin of their own immediate actions
          if (newRow.updated_by === currentUserId) return;

          const eventType = payload.eventType === 'INSERT' ? 'INSERT' : 'UPDATE';
          const notification: SuperadminNotification = {
            id: `rt-${newRow.id}-${Date.now()}`,
            type: eventType,
            surveyId: newRow.id,
            namaSurvey: newRow.nama_survey || 'Survey Tanpa Nama',
            jenisSurvey: newRow.jenis_survey || 'SUTM',
            surveyor: newRow.surveyor || 'Surveyor',
            lokasi: newRow.lokasi || '',
            updatedBy: newRow.updated_by || newRow.surveyor,
            timestamp: newRow.updated_at || newRow.created_at || new Date().toISOString(),
            read: false,
            title: eventType === 'INSERT' ? 'Survey Baru Diunggah' : 'Survey Diperbarui',
            message: `${newRow.nama_survey || 'Survey'} (${newRow.updated_by || newRow.surveyor || 'Surveyor'})`,
          };

          await this.addNotification(notification);
          this.triggerVibration();

          onReceive(notification);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Mobile Superadmin Realtime Survey Notifications active');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
