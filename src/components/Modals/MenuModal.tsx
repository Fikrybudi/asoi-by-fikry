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
}

function MenuModal({
  visible,
  onClose,
  userEmail,
  onOpenAbout,
  onOpenOverlayManager,
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
        <View style={[styles.modalContent, { width: '80%' }]}>
          <Text style={styles.title}>Menu</Text>

          {/* User Info */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View style={{ backgroundColor: '#1565C0', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
              <Ionicons name="person" size={30} color="white" />
            </View>
            <Text style={{ fontSize: 14, color: '#666' }}>{userEmail}</Text>
          </View>

          {/* About Button */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onClose();
              onOpenAbout();
            }}
          >
            <Ionicons name="information-circle-outline" size={24} color="#1565C0" style={{ marginRight: 12 }} />
            <Text style={{ fontSize: 16, color: '#333' }}>Tentang Aplikasi</Text>
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
            <Text style={{ fontSize: 16, color: '#333' }}>Import Data Eksisting</Text>
          </TouchableOpacity>

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={24} color="#F44336" style={{ marginRight: 12 }} />
            <Text style={{ fontSize: 16, color: '#F44336' }}>Logout</Text>
          </TouchableOpacity>

          {/* Close Button */}
          <TouchableOpacity
            style={[styles.closeButton, { marginTop: 20 }]}
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
