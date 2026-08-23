// =============================================================================
// PLN SURVEY APP - About Modal
// =============================================================================

import React from 'react';
import { StyleSheet, View, Text, Modal, ScrollView, TouchableOpacity, Linking, Image } from 'react-native';
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
              <Image
                source={require('../../../assets/logo_masiv_icon.png')}
                style={{ width: 64, height: 64, borderRadius: 12, marginBottom: 8 }}
                resizeMode="contain"
              />
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#0D47A1', marginTop: 4 }}>MASIV</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#555', textAlign: 'center', marginTop: 2 }}>
                Mobile Asset Surveying, Information and Verification system
              </Text>
              <Text style={{ fontSize: 12, color: '#999', marginTop: 5 }}>Versi 2.2.4</Text>
              <View style={{ backgroundColor: '#E3F2FD', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 8, borderWidth: 1, borderColor: '#90CAF9' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#0D47A1', textAlign: 'center' }}>
                  Survey Made Easy : Mudah, Cepat, Akurat
                </Text>
              </View>
            </View>

            {/* Filosofi & Nilai MASIV */}
            <View style={{ backgroundColor: '#E3F2FD', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#BBDEFB' }}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#0D47A1', marginBottom: 10 }}>✨ Nilai Utama MASIV</Text>

              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1565C0' }}>⚡ Kecepatan</Text>
                <Text style={{ fontSize: 12, color: '#444', marginTop: 2 }}>
                  Mobile berarti bisa dieksekusi langsung dari smartphone masing-masing surveyor tanpa alat tambahan.
                </Text>
              </View>

              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1565C0' }}>🛡️ Validitas</Text>
                <Text style={{ fontSize: 12, color: '#444', marginTop: 2 }}>
                  Surveying, Information and Verification system memastikan semua data (termasuk standar konstruksi K3) tervalidasi dan tersimpan rapi sebagai informasi yang traceable.
                </Text>
              </View>

              <View>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1565C0' }}>🎯 Presisi</Text>
                <Text style={{ fontSize: 12, color: '#444', marginTop: 2 }}>
                  Berfokus pada pendataan aset secara aktual di titik lokasi.
                </Text>
              </View>
            </View>

            {/* Developer & Team Info */}
            <View style={{ backgroundColor: '#f5f5f5', padding: 15, borderRadius: 10, marginBottom: 15 }}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 10 }}>👥 Tim MASIV</Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Ionicons name="person-circle" size={18} color="#1565C0" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#333' }}>Fikry Budi H</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Ionicons name="person-circle" size={18} color="#1565C0" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#333' }}>Rifzki Yanika Sukoco</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="person-circle" size={18} color="#1565C0" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#333' }}>Dinda Widi Mirna</Text>
              </View>

              <View style={{ height: 1, backgroundColor: '#e0e0e0', marginBottom: 10 }} />

              <TouchableOpacity
                onPress={() => Linking.openURL('https://wa.me/6287773068968')}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#25D366" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 13, color: '#25D366', fontWeight: 'bold' }}>WhatsApp: 087773068968</Text>
              </TouchableOpacity>
            </View>

            {/* Legalitas & Kebijakan */}
            <View style={{ backgroundColor: '#f5f5f5', padding: 15, borderRadius: 10, marginBottom: 15 }}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 10 }}>⚖️ Legalitas & Kebijakan</Text>
              
              <TouchableOpacity
                onPress={() => Linking.openURL('https://web.pln.co.id/kebijakan-privasi')}
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}
              >
                <Ionicons name="shield-checkmark-outline" size={16} color="#1565C0" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 13, color: '#1565C0', textDecorationLine: 'underline' }}>Kebijakan Privasi Portal PLN</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => Linking.openURL('https://web.pln.co.id/syarat-dan-ketentuan')}
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}
              >
                <Ionicons name="document-text-outline" size={16} color="#1565C0" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 13, color: '#1565C0', textDecorationLine: 'underline' }}>Syarat & Ketentuan Layanan PLN</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <Ionicons name="code-slash-outline" size={16} color="#1565C0" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 13, color: '#1565C0', textDecorationLine: 'underline' }}>Lisensi OpenStreetMap & Data Peta</Text>
              </TouchableOpacity>
            </View>

            {/* Copyright */}
            <View style={{ alignItems: 'center', marginTop: 10, marginBottom: 20 }}>
              <Text style={{ fontSize: 12, color: '#999', textAlign: 'center' }}>© 2026 Tim MASIV / PLN OPTADIS. All Rights Reserved.</Text>
              <Text style={{ fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 5, fontStyle: 'italic' }}>
                MASIV - Mobile Asset Surveying, Information and Verification system
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
