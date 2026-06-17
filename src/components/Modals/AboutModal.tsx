// =============================================================================
// PLN SURVEY APP - About Modal
// =============================================================================

import React from 'react';
import { StyleSheet, View, Text, Modal, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AboutModalProps {
  visible: boolean;
  onClose: () => void;
}

function AboutModal({ visible, onClose }: AboutModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContent, { width: '90%', maxHeight: '80%' }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* App Logo & Version */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <Ionicons name="location" size={50} color="#1565C0" />
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#1565C0', marginTop: 10 }}>ASOI</Text>
              <Text style={{ fontSize: 14, color: '#666' }}>Aplikasi Survey Online</Text>
              <Text style={{ fontSize: 12, color: '#999', marginTop: 5 }}>Versi 1.9.0</Text>
            </View>

            {/* Developer Info */}
            <View style={{ backgroundColor: '#f5f5f5', padding: 15, borderRadius: 10, marginBottom: 15 }}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 10 }}>👨‍💻 Informasi Pengembang</Text>
              <Text style={{ fontSize: 13, color: '#555', marginBottom: 5 }}>Aplikasi ini dikembangkan dan dikelola oleh:</Text>
              <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#1565C0' }}>Fikry Budi H</Text>
              <TouchableOpacity
                onPress={() => Linking.openURL('https://wa.me/6287773068968')}
                style={{ marginTop: 8 }}
              >
                <Text style={{ fontSize: 13, color: '#25D366', textDecorationLine: 'underline' }}>087773068968</Text>
              </TouchableOpacity>
            </View>

            {/* Legal */}
            <View style={{ backgroundColor: '#f5f5f5', padding: 15, borderRadius: 10, marginBottom: 15 }}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 10 }}>⚖️ Legalitas & Kebijakan</Text>
              <Text style={{ fontSize: 13, color: '#1565C0', marginBottom: 5 }}>• Ketentuan Layanan</Text>
              <Text style={{ fontSize: 13, color: '#1565C0', marginBottom: 5 }}>• Kebijakan Privasi</Text>
              <Text style={{ fontSize: 13, color: '#1565C0' }}>• Lisensi Pihak Ketiga</Text>
            </View>

            {/* Copyright */}
            <View style={{ alignItems: 'center', marginTop: 10, marginBottom: 20 }}>
              <Text style={{ fontSize: 12, color: '#999', textAlign: 'center' }}>© 2024 Fikry. All Rights Reserved.</Text>
              <Text style={{ fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 5, fontStyle: 'italic' }}>
                Dibuat dengan semangat untuk memudahkan riset digital di Indonesia.
              </Text>
            </View>
          </ScrollView>

          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
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

export default React.memo(AboutModal);
