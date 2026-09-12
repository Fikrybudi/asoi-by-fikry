// =============================================================================
// PLN SURVEY APP - Superadmin Notification Modal (Mobile)
// =============================================================================

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SuperadminNotification } from '../../services/notificationService';

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  notifications: SuperadminNotification[];
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onSelectSurvey: (surveyId: string) => void;
}

export function NotificationModal({
  visible,
  onClose,
  notifications,
  onMarkAllRead,
  onClearAll,
  onSelectSurvey,
}: NotificationModalProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <View style={styles.iconCircle}>
                  <Ionicons name="notifications" size={20} color="#0284C7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>Aktivitas Survey Cloud</Text>
                  <Text style={styles.subtitle}>Notifikasi Realtime Khusus Superadmin</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={22} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Action Toolbar */}
              <View style={styles.toolbar}>
                <View style={styles.unreadBadgeRow}>
                  {unreadCount > 0 ? (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{unreadCount} Baru</Text>
                    </View>
                  ) : (
                    <Text style={styles.countText}>{notifications.length} Total</Text>
                  )}
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {unreadCount > 0 && (
                    <TouchableOpacity style={styles.readAllBtn} onPress={onMarkAllRead}>
                      <Ionicons name="checkmark-done" size={14} color="#0284C7" style={{ marginRight: 4 }} />
                      <Text style={styles.readAllText}>Tandai Dibaca</Text>
                    </TouchableOpacity>
                  )}
                  {notifications.length > 0 && (
                    <TouchableOpacity style={styles.clearBtn} onPress={onClearAll}>
                      <Ionicons name="trash-outline" size={14} color="#EF4444" style={{ marginRight: 4 }} />
                      <Text style={styles.clearText}>Bersihkan</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            {/* Notification List */}
            <ScrollView style={styles.list} contentContainerStyle={{ padding: 14 }}>
              {notifications.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="notifications-outline" size={48} color="#94A3B8" />
                  <Text style={styles.emptyTitle}>Belum ada notifikasi survey</Text>
                  <Text style={styles.emptySubtitle}>
                    Notifikasi survey baru atau yang dirubah di cloud oleh surveyor akan otomatis muncul di sini secara realtime.
                  </Text>
                </View>
              ) : (
                notifications.map((notif) => {
                  const isInsert = notif.type === 'INSERT';
                  return (
                    <View
                      key={notif.id}
                      style={[
                        styles.card,
                        notif.read ? styles.cardRead : styles.cardUnread,
                      ]}
                    >
                      {/* Top Row: Type & Time */}
                      <View style={styles.cardHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View
                            style={[
                              styles.typeBadge,
                              { backgroundColor: isInsert ? '#15803D' : '#0369A1' },
                            ]}
                          >
                            <Text style={styles.typeBadgeText}>
                              {isInsert ? 'SURVEY BARU' : 'DIPERBARUI'}
                            </Text>
                          </View>
                          <View style={styles.jenisBadge}>
                            <Text style={styles.jenisBadgeText}>{notif.jenisSurvey}</Text>
                          </View>
                        </View>
                        <Text style={styles.timeText}>{formatTime(notif.timestamp)}</Text>
                      </View>

                      {/* Survey Name */}
                      <Text style={styles.surveyName}>{notif.namaSurvey}</Text>

                      {/* Surveyor & Location */}
                      <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                          <Ionicons name="person-outline" size={13} color="#0284C7" />
                          <Text style={styles.metaText}>{notif.surveyor}</Text>
                        </View>
                        {notif.lokasi ? (
                          <View style={styles.metaItem}>
                            <Ionicons name="location-outline" size={13} color="#F59E0B" />
                            <Text style={styles.metaText} numberOfLines={1}>
                              {notif.lokasi}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Action Button */}
                      <View style={styles.cardActionRow}>
                        <TouchableOpacity
                          style={styles.openBtn}
                          onPress={() => {
                            onSelectSurvey(notif.surveyId);
                            onClose();
                          }}
                        >
                          <Ionicons name="open-outline" size={13} color="white" style={{ marginRight: 4 }} />
                          <Text style={styles.openBtnText}>Buka Survey</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.75)',
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: '90%',
  },
  modalContent: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: '100%',
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#131D33',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.35)',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 11.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  unreadBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadBadge: {
    backgroundColor: '#EA580C',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  unreadBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
  countText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  readAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.3)',
  },
  readAllText: {
    color: '#38BDF8',
    fontSize: 11.5,
    fontWeight: '600',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  clearText: {
    color: '#F87171',
    fontSize: 11.5,
    fontWeight: '600',
  },
  list: {
    maxHeight: 480,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    marginTop: 10,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  cardUnread: {
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  cardRead: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    color: 'white',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  jenisBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  jenisBadgeText: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: '700',
  },
  timeText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  surveyName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11.5,
    color: '#94A3B8',
  },
  cardActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  openBtnText: {
    color: 'white',
    fontSize: 11.5,
    fontWeight: '700',
  },
});

export default NotificationModal;

