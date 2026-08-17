// =============================================================================
// PLN SURVEY APP - Tiang Action Modal (Custom Action Sheet for Tiang Options)
// =============================================================================

import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, TouchableWithoutFeedback, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Tiang } from '../../types';
import { getTiangDisplayCode } from '../../utils/branchUtils';

interface TiangActionModalProps {
  visible: boolean;
  tiang: Tiang | null;
  onClose: () => void;
  onSelectBranch: (direction: 'R' | 'L') => void;
  onSelectMove: () => void;
  onSelectEdit: () => void;
  onSelectDelete: () => void;
}

export const TiangActionModal: React.FC<TiangActionModalProps> = ({
  visible,
  tiang,
  onClose,
  onSelectBranch,
  onSelectMove,
  onSelectEdit,
  onSelectDelete,
}) => {
  const [showBranchOptions, setShowBranchOptions] = useState(false);

  // Reset branch sub-options state when modal visibility changes
  useEffect(() => {
    if (!visible) {
      setShowBranchOptions(false);
    }
  }, [visible]);

  if (!tiang) return null;

  const kodeTiang = getTiangDisplayCode(tiang);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetContainer}>
              {/* Top Drag Indicator */}
              <View style={styles.dragIndicator} />

              {/* Header Info */}
              <View style={styles.headerContainer}>
                <View style={styles.iconBadge}>
                  <Ionicons name="location" size={24} color="#1565C0" />
                </View>
                <View style={styles.headerTextContainer}>
                  <Text style={styles.title}>Tiang {kodeTiang}</Text>
                  <Text style={styles.subtitle}>
                    {tiang.konstruksi} - {tiang.jenisTiang} ({tiang.tinggiTiang}, {tiang.kekuatanTiang})
                  </Text>
                  {tiang.status === 'existing' && (
                    <Text style={styles.existingTag}>• Existing</Text>
                  )}
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeIconButton}>
                  <Ionicons name="close" size={22} color="#888" />
                </TouchableOpacity>
              </View>

              {/* Options List */}
              <ScrollView style={styles.optionsList} bounces={false}>
                {/* 1. PERCABANGAN OPTION */}
                <TouchableOpacity
                  style={[styles.optionCard, showBranchOptions && styles.optionCardActive]}
                  onPress={() => setShowBranchOptions(!showBranchOptions)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionIconContainer, { backgroundColor: '#E8F5E9' }]}>
                    <Ionicons name="git-branch-outline" size={22} color="#2E7D32" />
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={[styles.optionTitle, { color: '#2E7D32' }]}>🌿 Buat Percabangan (Tee-off)</Text>
                    <Text style={styles.optionSubtitle}>Tarik jalur cabang baru (R/L) dari tiang ini</Text>
                  </View>
                  <Ionicons
                    name={showBranchOptions ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#2E7D32"
                  />
                </TouchableOpacity>

                {/* SUB-MENU PERCABANGAN (EXPANDABLE) */}
                {showBranchOptions && (
                  <View style={styles.branchSubMenuContainer}>
                    <TouchableOpacity
                      style={styles.branchButton}
                      onPress={() => {
                        onClose();
                        onSelectBranch('R');
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="arrow-forward-circle" size={24} color="#1B5E20" />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.branchButtonTitle}>➡️ Percabangan Kanan (R)</Text>
                        <Text style={styles.branchButtonSub}>Kode otomatis: {kodeTiang}R1</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.branchButton, { marginTop: 8 }]}
                      onPress={() => {
                        onClose();
                        onSelectBranch('L');
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="arrow-back-circle" size={24} color="#1B5E20" />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.branchButtonTitle}>⬅️ Percabangan Kiri (L)</Text>
                        <Text style={styles.branchButtonSub}>Kode otomatis: {kodeTiang}L1</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                {/* 2. GESER POSISI */}
                <TouchableOpacity
                  style={styles.optionCard}
                  onPress={() => {
                    onClose();
                    onSelectMove();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionIconContainer, { backgroundColor: '#E3F2FD' }]}>
                    <Ionicons name="move" size={22} color="#1565C0" />
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>📍 Geser Posisi Tiang</Text>
                    <Text style={styles.optionSubtitle}>Pindahkan titik koordinat tiang ini di peta</Text>
                  </View>
                </TouchableOpacity>

                {/* 3. EDIT DATA */}
                <TouchableOpacity
                  style={styles.optionCard}
                  onPress={() => {
                    onClose();
                    onSelectEdit();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionIconContainer, { backgroundColor: '#FFF3E0' }]}>
                    <Ionicons name="create-outline" size={22} color="#E65100" />
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>✏️ Edit Data Tiang</Text>
                    <Text style={styles.optionSubtitle}>Ubah atribut, spesifikasi, atau foto tiang</Text>
                  </View>
                </TouchableOpacity>

                {/* 4. HAPUS TIANG */}
                <TouchableOpacity
                  style={styles.optionCard}
                  onPress={() => {
                    onClose();
                    onSelectDelete();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionIconContainer, { backgroundColor: '#FFEBEE' }]}>
                    <Ionicons name="trash-outline" size={22} color="#C62828" />
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={[styles.optionTitle, { color: '#C62828' }]}>🗑️ Hapus Tiang</Text>
                    <Text style={styles.optionSubtitle}>Hapus tiang ini dari survey</Text>
                  </View>
                </TouchableOpacity>
              </ScrollView>

              {/* Cancel Button */}
              <TouchableOpacity style={styles.cancelButton} onPress={onClose} activeOpacity={0.8}>
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 25,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 10,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 10,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  existingTag: {
    fontSize: 12,
    color: '#E65100',
    fontWeight: '600',
    marginTop: 2,
  },
  closeIconButton: {
    padding: 6,
  },
  optionsList: {
    marginVertical: 5,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  optionCardActive: {
    borderColor: '#81C784',
    backgroundColor: '#F1F8E9',
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  optionSubtitle: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  branchSubMenuContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 10,
    marginTop: -4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  branchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  branchButtonTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  branchButtonSub: {
    fontSize: 11,
    color: '#388E3C',
    marginTop: 1,
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#666',
  },
});

export default TiangActionModal;
