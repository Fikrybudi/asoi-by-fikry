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
  onOverlayUpdate?: (updatedOverlay: OverlayFile) => void;
}

function LayerControlModal({
  visible,
  onClose,
  layerVisibility,
  onLayerChange,
  overlayLayers,
  onOverlayVisibilityChange,
  onOverlayUpdate,
}: LayerControlModalProps) {
  const handleToggleFeeder = (ol: OverlayFile, feederName: string, isVisible: boolean) => {
    const currentHidden = ol.hiddenFeeders || [];
    let updatedHidden: string[];
    if (isVisible) {
      updatedHidden = currentHidden.filter(f => f !== feederName);
    } else {
      updatedHidden = [...currentHidden, feederName];
    }
    const updated = { ...ol, hiddenFeeders: updatedHidden };
    if (onOverlayUpdate) onOverlayUpdate(updated);
  };

  const handleToggleType = (ol: OverlayFile, typeKey: string, isVisible: boolean) => {
    const currentHidden = ol.hiddenTypes || [];
    let updatedHidden: string[];
    if (isVisible) {
      updatedHidden = currentHidden.filter(t => t !== typeKey);
    } else {
      updatedHidden = [...currentHidden, typeKey];
    }
    const updated = { ...ol, hiddenTypes: updatedHidden };
    if (onOverlayUpdate) onOverlayUpdate(updated);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContent, { maxHeight: '85%' }]}>
          <Text style={styles.title}>Atur Layer Peta</Text>

          <ScrollView style={{ maxHeight: 440 }}>
            <Text style={{ marginBottom: 6, fontSize: 13, color: '#1565C0', fontWeight: 'bold', letterSpacing: 0.3 }}>
              📌 LAYER SURVEY AKTIF
            </Text>

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

            <Text style={{ marginTop: 15, marginBottom: 5, fontSize: 13, color: '#666', fontWeight: 'bold' }}>TITIK MARKER SURVEY</Text>

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

            <Text style={{ marginTop: 15, marginBottom: 5, fontSize: 13, color: '#666', fontWeight: 'bold' }}>JALUR KABEL SURVEY</Text>

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

            {/* Overlay Data Eksisting (KML / KMZ) */}
            {overlayLayers.length > 0 && (
              <>
                <Text style={{ marginTop: 22, marginBottom: 8, fontSize: 13, color: '#D81B60', fontWeight: 'bold', letterSpacing: 0.3 }}>
                  📂 DATA JARINGAN EKSISTING (KML)
                </Text>

                {overlayLayers.map(ol => {
                  const uniqueFeeders = Array.from(new Set((ol.data?.polylines || []).map(pl => pl.name).filter(Boolean)));
                  const points = ol.data?.points || [];
                  const garduCount = points.filter(pt => (pt.properties['CLASSIFICATION']?.includes('GD') || pt.properties['TYPE_GARDU'] === 'GD' || pt.name.match(/^[A-Za-z]{2,4}\d{3}[A-Za-z]?$/))).length;
                  const proteksiCount = points.filter(pt => /lbs|gh|pmr|sso|recloser|fuse|cutout|fco|proteksi/i.test(pt.name) || /lbs|gh|pmr|sso|recloser|fuse|cutout|fco|proteksi/i.test(pt.properties['JENIS'] || pt.properties['jenis'] || '')).length;

                  return (
                    <View key={ol.id} style={{ marginBottom: 16, backgroundColor: '#F8F9FA', borderRadius: 10, padding: 10, borderLeftWidth: 4, borderLeftColor: '#E91E63' }}>
                      {/* Master File Header Switch */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 }}>
                          <Ionicons name="folder-open" size={18} color="#D81B60" style={{ marginRight: 6 }} />
                          <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#222' }} numberOfLines={1}>
                            {ol.name}
                          </Text>
                        </View>
                        <Switch
                          value={ol.visible}
                          onValueChange={(v) => onOverlayVisibilityChange(ol.id, v)}
                          trackColor={{ false: "#767577", true: "#f8bbd0" }}
                          thumbColor={ol.visible ? "#D81B60" : "#f4f3f4"}
                        />
                      </View>

                      {/* Sub-layers (Only shown if master file is ON) */}
                      {ol.visible && (
                        <View style={{ paddingLeft: 8, marginTop: 4 }}>
                          {/* ⚡ JTM Per Penyulang Switches */}
                          {uniqueFeeders.length > 0 && (
                            <View style={{ marginTop: 6 }}>
                              <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#E91E63', marginBottom: 4 }}>
                                ⚡ PENYULANG JTM ({uniqueFeeders.length} jalur)
                              </Text>
                              {uniqueFeeders.map(feederName => {
                                const isFeederVis = !ol.hiddenFeeders?.includes(feederName);
                                return (
                                  <View key={feederName} style={[styles.layerItem, { paddingVertical: 6, borderBottomWidth: 0 }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                      <Ionicons name="git-merge" size={15} color="#E91E63" style={{ marginRight: 6 }} />
                                      <Text style={{ fontSize: 13, color: '#333', flex: 1 }} numberOfLines={1}>{feederName}</Text>
                                    </View>
                                    <Switch
                                      value={isFeederVis}
                                      onValueChange={(v) => handleToggleFeeder(ol, feederName, v)}
                                      trackColor={{ false: "#767577", true: "#f8bbd0" }}
                                      thumbColor={isFeederVis ? "#E91E63" : "#f4f3f4"}
                                    />
                                  </View>
                                );
                              })}
                            </View>
                          )}

                          {/* 🏢 Gardu Eksisting Switches (Grouped per Feeder) */}
                          {(garduCount > 0 || ol.type === 'gardu') && (() => {
                            const garduPoints = points.filter(pt => (pt.properties['CLASSIFICATION']?.includes('GD') || pt.properties['TYPE_GARDU'] === 'GD' || pt.name.match(/^[A-Za-z]{2,4}\d{3}[A-Za-z]?$/)));
                            const garduByFeeder: Record<string, number> = {};
                            garduPoints.forEach(pt => {
                              const fName = pt.properties['feeder'] || pt.properties['FEEDER'] || pt.properties['PENYULANG'] || pt.properties['penyulang'] || '';
                              if (fName) garduByFeeder[fName] = (garduByFeeder[fName] || 0) + 1;
                            });
                            const gFeeders = Object.keys(garduByFeeder);

                            return (
                              <View style={{ marginTop: 8 }}>
                                <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#1565C0', marginBottom: 4 }}>
                                  🏢 GARDU EKSISTING ({garduCount} unit)
                                </Text>
                                {/* Master Gardu Toggle */}
                                <View style={[styles.layerItem, { paddingVertical: 6, borderBottomWidth: 0 }]}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                    <Ionicons name="flash" size={15} color="#2196F3" style={{ marginRight: 6 }} />
                                    <Text style={{ fontSize: 13, color: '#333', fontWeight: 'bold', flex: 1 }}>
                                      Semua Gardu Eksisting
                                    </Text>
                                  </View>
                                  <Switch
                                    value={!ol.hiddenTypes?.includes('gardu')}
                                    onValueChange={(v) => handleToggleType(ol, 'gardu', v)}
                                    trackColor={{ false: "#767577", true: "#bbdefb" }}
                                    thumbColor={!ol.hiddenTypes?.includes('gardu') ? "#2196F3" : "#f4f3f4"}
                                  />
                                </View>

                                {/* Per-Feeder Gardu Sub-Toggles */}
                                {gFeeders.length > 1 && !ol.hiddenTypes?.includes('gardu') && gFeeders.map(fName => {
                                  const isGVis = !ol.hiddenTypes?.includes('gardu_' + fName) && !ol.hiddenFeeders?.includes(fName);
                                  return (
                                    <View key={'g_' + fName} style={[styles.layerItem, { paddingVertical: 4, paddingLeft: 14, borderBottomWidth: 0 }]}>
                                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                        <Ionicons name="location-outline" size={14} color="#1E88E5" style={{ marginRight: 6 }} />
                                        <Text style={{ fontSize: 12, color: '#444', flex: 1 }} numberOfLines={1}>
                                          Gardu {fName} ({garduByFeeder[fName]} unit)
                                        </Text>
                                      </View>
                                      <Switch
                                        value={isGVis}
                                        onValueChange={(v) => handleToggleType(ol, 'gardu_' + fName, v)}
                                        trackColor={{ false: "#767577", true: "#bbdefb" }}
                                        thumbColor={isGVis ? "#1E88E5" : "#f4f3f4"}
                                      />
                                    </View>
                                  );
                                })}
                              </View>
                            );
                          })()}

                          {/* 🛡️ Titik Proteksi Switches (Grouped per Feeder) */}
                          {(proteksiCount > 0 || ol.type === 'proteksi') && (() => {
                            const proteksiPoints = points.filter(pt => /lbs|gh|pmr|sso|recloser|fuse|cutout|fco|proteksi/i.test(pt.name) || /lbs|gh|pmr|sso|recloser|fuse|cutout|fco|proteksi/i.test(pt.properties['JENIS'] || pt.properties['jenis'] || ''));
                            const proteksiByFeeder: Record<string, number> = {};
                            proteksiPoints.forEach(pt => {
                              const fName = pt.properties['feeder'] || pt.properties['FEEDER'] || pt.properties['PENYULANG'] || pt.properties['penyulang'] || '';
                              if (fName) proteksiByFeeder[fName] = (proteksiByFeeder[fName] || 0) + 1;
                            });
                            const pFeeders = Object.keys(proteksiByFeeder);

                            return (
                              <View style={{ marginTop: 8 }}>
                                <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#E65100', marginBottom: 4 }}>
                                  🛡️ TITIK PROTEKSI ({proteksiCount} unit: GH, LBS, PMR)
                                </Text>
                                {/* Master Proteksi Toggle */}
                                <View style={[styles.layerItem, { paddingVertical: 6, borderBottomWidth: 0 }]}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                    <Ionicons name="shield-checkmark" size={15} color="#FF6600" style={{ marginRight: 6 }} />
                                    <Text style={{ fontSize: 13, color: '#333', fontWeight: 'bold', flex: 1 }}>
                                      Semua Titik Proteksi
                                    </Text>
                                  </View>
                                  <Switch
                                    value={!ol.hiddenTypes?.includes('proteksi')}
                                    onValueChange={(v) => handleToggleType(ol, 'proteksi', v)}
                                    trackColor={{ false: "#767577", true: "#ffe0b2" }}
                                    thumbColor={!ol.hiddenTypes?.includes('proteksi') ? "#FF6600" : "#f4f3f4"}
                                  />
                                </View>

                                {/* Per-Feeder Proteksi Sub-Toggles */}
                                {pFeeders.length > 1 && !ol.hiddenTypes?.includes('proteksi') && pFeeders.map(fName => {
                                  const isPVis = !ol.hiddenTypes?.includes('proteksi_' + fName) && !ol.hiddenFeeders?.includes(fName);
                                  return (
                                    <View key={'p_' + fName} style={[styles.layerItem, { paddingVertical: 4, paddingLeft: 14, borderBottomWidth: 0 }]}>
                                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                        <Ionicons name="shield-outline" size={14} color="#F57C00" style={{ marginRight: 6 }} />
                                        <Text style={{ fontSize: 12, color: '#444', flex: 1 }} numberOfLines={1}>
                                          Proteksi {fName} ({proteksiByFeeder[fName]} unit)
                                        </Text>
                                      </View>
                                      <Switch
                                        value={isPVis}
                                        onValueChange={(v) => handleToggleType(ol, 'proteksi_' + fName, v)}
                                        trackColor={{ false: "#767577", true: "#ffe0b2" }}
                                        thumbColor={isPVis ? "#F57C00" : "#f4f3f4"}
                                      />
                                    </View>
                                  );
                                })}
                              </View>
                            );
                          })()}
                        </View>
                      )}
                    </View>
                  );
                })}
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
