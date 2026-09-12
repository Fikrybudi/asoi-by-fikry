// =============================================================================
// PLN SURVEY APP - Menu Modal
// =============================================================================

import React from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabaseClient';

interface MenuModalProps {
  visible: boolean;
  onClose: () => void;
  userEmail: string;
  onOpenAbout: () => void;
  onOpenOverlayManager: () => void;
  onCheckUpdate?: () => void;
  onHideUI?: () => void;
  isSuperadmin?: boolean;
  onOpenNotifications?: () => void;
  unreadCount?: number;
}

function MenuModal({
  visible,
  onClose,
  userEmail,
  onOpenAbout,
  onOpenOverlayManager,
  onCheckUpdate,
  onHideUI,
  isSuperadmin,
  onOpenNotifications,
  unreadCount = 0,
}: MenuModalProps) {
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Yakin ingin keluar dari aplikasi?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            onClose();
          }
        }
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContent, { width: '85%' }]}>
          <Text style={styles.title}>Menu</Text>

          {/* User Info */}
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View style={{ backgroundColor: '#1565C0', width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="person" size={28} color="white" />
            </View>
            <Text style={{ fontSize: 13, color: '#666' }}>{userEmail}</Text>
          </View>

          {/* Superadmin Notification History */}
          {isSuperadmin && onOpenNotifications && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onClose();
                onOpenNotifications();
              }}
            >
              <Ionicons name="notifications-outline" size={24} color="#D97706" style={{ marginRight: 12 }} />
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 15, color: '#333', fontWeight: '600' }}>Pemberitahuan Survey</Text>
                {unreadCount > 0 && (
                  <View style={{ backgroundColor: '#EF4444', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>{unreadCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}

          {/* Mode Screenshot Button */}
          {onHideUI && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onClose();
                onHideUI();
              }}
            >
              <Ionicons name="eye-outline" size={24} color="#0284C7" style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 15, color: '#333' }}>Mode Screenshot (Sembunyikan UI)</Text>
            </TouchableOpacity>
          )}

          {/* Check OTA Update Button */}
          {onCheckUpdate && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onClose();
                onCheckUpdate();
              }}
            >
              <Ionicons name="cloud-download-outline" size={24} color="#2E7D32" style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 15, color: '#2E7D32', fontWeight: 'bold' }}>Cek Pembaruan Aplikasi</Text>
            </TouchableOpacity>
          )}

          {/* About Button */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onClose();
              onOpenAbout();
            }}
          >
            <Ionicons name="information-circle-outline" size={24} color="#1565C0" style={{ marginRight: 12 }} />
            <Text style={{ fontSize: 15, color: '#333' }}>Tentang Aplikasi</Text>
          </TouchableOpacity>

          {/* Import Data Eksisting Button */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onClose();
              onOpenOverlayManager();
            }}
          >
            <Ionicons name="layers-outline" size={24} color="#FF9800" style={{ marginRight: 12 }} />
            <Text style={{ fontSize: 15, color: '#333' }}>Import Data Eksisting</Text>
          </TouchableOpacity>

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={24} color="#F44336" style={{ marginRight: 12 }} />
            <Text style={{ fontSize: 15, color: '#F44336' }}>Logout</Text>
          </TouchableOpacity>

          {/* Close Button */}
          <TouchableOpacity
            style={[styles.closeButton, { marginTop: 14 }]}
            onPress={onClose}
          >
            <Text style={styles.closeText}>Tutup</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    width: '85%',
    maxHeight: '70%',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default React.memo(MenuModal);
