// =============================================================================
// PLN SURVEY APP - Layer Control Modal
// =============================================================================

import React from 'react';
import { StyleSheet, View, Text, Modal, Switch, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OverlayFile } from '../../types/overlayTypes';
import { overlayStorage } from '../../services/overlayStorage';

interface LayerVisibility {
  tiang: boolean;
  gardu: boolean;
  titikTiang: boolean;
  titikGardu: boolean;
  sutr: boolean;
  sutm: boolean;
  skutm: boolean;
  sktm: boolean;
}

interface LayerControlModalProps {
  visible: boolean;
  onClose: () => void;
  layerVisibility: LayerVisibility;
  onLayerChange: (update: Partial<LayerVisibility>) => void;
  overlayLayers: OverlayFile[];
  onOverlayVisibilityChange: (id: string, visible: boolean) => void;
}

function LayerControlModal({
  visible,
  onClose,
  layerVisibility,
  onLayerChange,
  overlayLayers,
  onOverlayVisibilityChange,
}: LayerControlModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContent, { maxHeight: '80%' }]}>
          <Text style={styles.title}>Atur Layer Peta</Text>

          <ScrollView style={{ maxHeight: 400 }}>
            <View style={styles.layerItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="pricetag" size={18} color="#666" style={{ marginRight: 8 }} />
                <Text style={styles.layerItemText}>Label Tiang</Text>
              </View>
              <Switch
                value={layerVisibility.tiang}
                onValueChange={(v) => onLayerChange({ tiang: v })}
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={layerVisibility.tiang ? "#2196F3" : "#f4f3f4"}
              />
            </View>

            <View style={styles.layerItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="flash" size={18} color="#FF9800" style={{ marginRight: 8 }} />
                <Text style={styles.layerItemText}>Label Gardu</Text>
              </View>
              <Switch
                value={layerVisibility.gardu}
                onValueChange={(v) => onLayerChange({ gardu: v })}
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={layerVisibility.gardu ? "#2196F3" : "#f4f3f4"}
              />
            </View>

            <Text style={{ marginTop: 15, marginBottom: 5, fontSize: 14, color: '#666', fontWeight: 'bold' }}>Titik Marker</Text>

            <View style={styles.layerItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="ellipse" size={18} color="#2196F3" style={{ marginRight: 8 }} />
                <Text style={styles.layerItemText}>Titik Tiang</Text>
              </View>
              <Switch
                value={layerVisibility.titikTiang}
                onValueChange={(v) => onLayerChange({ titikTiang: v })}
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={layerVisibility.titikTiang ? "#2196F3" : "#f4f3f4"}
              />
            </View>

            <View style={styles.layerItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="ellipse" size={18} color="#FF9800" style={{ marginRight: 8 }} />
                <Text style={styles.layerItemText}>Titik Gardu</Text>
              </View>
              <Switch
                value={layerVisibility.titikGardu}
                onValueChange={(v) => onLayerChange({ titikGardu: v })}
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={layerVisibility.titikGardu ? "#FF9800" : "#f4f3f4"}
              />
            </View>

            <Text style={{ marginTop: 15, marginBottom: 5, fontSize: 14, color: '#666', fontWeight: 'bold' }}>Jalur Kabel</Text>

            <View style={styles.layerItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="radio-button-on" size={18} color="#4CAF50" style={{ marginRight: 8 }} />
                <Text style={styles.layerItemText}>Label SUTR (TR)</Text>
              </View>
              <Switch
                value={layerVisibility.sutr}
                onValueChange={(v) => onLayerChange({ sutr: v })}
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={layerVisibility.sutr ? "#4CAF50" : "#f4f3f4"}
              />
            </View>

            <View style={styles.layerItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="radio-button-on" size={18} color="#E91E63" style={{ marginRight: 8 }} />
                <Text style={styles.layerItemText}>Label SUTM (TM)</Text>
              </View>
              <Switch
                value={layerVisibility.sutm}
                onValueChange={(v) => onLayerChange({ sutm: v })}
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={layerVisibility.sutm ? "#E91E63" : "#f4f3f4"}
              />
            </View>

            <View style={styles.layerItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="radio-button-on" size={18} color="#00BCD4" style={{ marginRight: 8 }} />
                <Text style={styles.layerItemText}>Label SKUTM</Text>
              </View>
              <Switch
                value={layerVisibility.skutm}
                onValueChange={(v) => onLayerChange({ skutm: v })}
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={layerVisibility.skutm ? "#00BCD4" : "#f4f3f4"}
              />
            </View>

            <View style={styles.layerItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="radio-button-on" size={18} color="#9C27B0" style={{ marginRight: 8 }} />
                <Text style={styles.layerItemText}>Label SKTM</Text>
              </View>
              <Switch
                value={layerVisibility.sktm}
                onValueChange={(v) => onLayerChange({ sktm: v })}
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={layerVisibility.sktm ? "#9C27B0" : "#f4f3f4"}
              />
            </View>

            {/* Overlay Eksisting */}
            {overlayLayers.length > 0 && (
              <>
                <Text style={{ marginTop: 15, marginBottom: 5, fontSize: 14, color: '#666', fontWeight: 'bold' }}>Data Eksisting</Text>
                {overlayLayers.map(ol => (
                  <View key={ol.id} style={styles.layerItem}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <Ionicons
                        name={ol.type === 'jtm' ? 'git-merge-outline' : ol.type === 'gardu' ? 'flash-outline' : ol.type === 'proteksi' ? 'shield-outline' : 'layers-outline'}
                        size={18}
                        color={ol.type === 'jtm' ? '#FFC107' : ol.type === 'gardu' ? '#FF9800' : ol.type === 'proteksi' ? '#F44336' : '#607D8B'}
                        style={{ marginRight: 8 }}
                      />
                      <Text style={[styles.layerItemText, { flex: 1 }]} numberOfLines={1}>{ol.name}</Text>
                    </View>
                    <Switch
                      value={ol.visible}
                      onValueChange={(v) => onOverlayVisibilityChange(ol.id, v)}
                      trackColor={{ false: "#767577", true: "#81b0ff" }}
                      thumbColor={ol.visible ? "#FFC107" : "#f4f3f4"}
                    />
                  </View>
                ))}
              </>
            )}
          </ScrollView>

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
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  layerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  layerItemText: {
    fontSize: 16,
    color: '#333',
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

export default React.memo(LayerControlModal);
