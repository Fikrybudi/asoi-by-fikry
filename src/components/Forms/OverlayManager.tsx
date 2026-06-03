// =============================================================================
// PLN SURVEY APP - Overlay Manager Component
// =============================================================================
// Modal UI for importing CSV/KML/KMZ files and managing overlay layers.
// =============================================================================

import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Modal,
    ScrollView,
    Alert,
    ActivityIndicator,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import Slider from '@react-native-community/slider';
import { OverlayFile, OverlayDataType } from '../../types/overlayTypes';
import { parseOverlayFile, detectOverlayType } from '../../services/overlayParser';
import { overlayStorage } from '../../services/overlayStorage';

// Simple UUID generator (avoid importing uuid just for this)
function generateId(): string {
    return 'ovl_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
}

const TYPE_LABELS: Record<OverlayDataType, string> = {
    jtm: '⚡ JTM (Jaringan)',
    gardu: '🔌 Gardu',
    proteksi: '🛡️ Proteksi',
    custom: '📍 Custom',
};

const TYPE_OPTIONS: { value: OverlayDataType; label: string }[] = [
    { value: 'jtm', label: '⚡ JTM (Jaringan/Polyline)' },
    { value: 'gardu', label: '🔌 Gardu (Titik)' },
    { value: 'proteksi', label: '🛡️ Proteksi (Titik)' },
    { value: 'custom', label: '📍 Custom' },
];

const COLOR_PRESETS = [
    '#FFC107', '#FF9800', '#F44336', '#E91E63',
    '#9C27B0', '#2196F3', '#4CAF50', '#00BCD4',
];

interface OverlayManagerProps {
    visible: boolean;
    onClose: () => void;
    overlays: OverlayFile[];
    onOverlaysChange: (overlays: OverlayFile[]) => void;
}

export default function OverlayManager({
    visible,
    onClose,
    overlays,
    onOverlaysChange,
}: OverlayManagerProps) {
    const [importing, setImporting] = useState(false);
    const [importStep, setImportStep] = useState<'idle' | 'confirm'>('idle');

    // Import confirmation state
    const [pendingOverlay, setPendingOverlay] = useState<OverlayFile | null>(null);
    const [pendingName, setPendingName] = useState('');
    const [pendingType, setPendingType] = useState<OverlayDataType>('custom');
    const [pendingColor, setPendingColor] = useState('#FFC107');

    // ── Import Flow ──────────────────────────────────────────────────────

    const handleImport = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: [
                    'text/csv',
                    'text/comma-separated-values',
                    'application/vnd.google-earth.kml+xml',
                    'application/vnd.google-earth.kmz',
                    'application/octet-stream',
                    'text/plain',
                    '*/*', // Fallback for Android
                ],
                copyToCacheDirectory: true,
            });

            if (result.canceled || !result.assets || result.assets.length === 0) return;

            const asset = result.assets[0];
            const fileName = asset.name || 'unknown.csv';
            const ext = fileName.split('.').pop()?.toLowerCase() || '';

            // Validate extension
            if (!['csv', 'kml', 'kmz', 'txt'].includes(ext)) {
                Alert.alert('Format Tidak Didukung', `File .${ext} tidak didukung.\nGunakan file .csv, .kml, atau .kmz`);
                return;
            }

            setImporting(true);

            // Parse file
            const geoData = await parseOverlayFile(asset.uri, fileName);
            const detectedType = detectOverlayType(geoData);

            const totalFeatures = geoData.points.length + geoData.polylines.length;
            if (totalFeatures === 0) {
                Alert.alert('Data Kosong', 'Tidak ditemukan data geografis di file ini.');
                setImporting(false);
                return;
            }

            // Create pending overlay
            const overlay: OverlayFile = {
                id: generateId(),
                name: fileName.replace(/\.[^.]+$/, ''), // Strip extension
                type: detectedType,
                visible: true,
                opacity: 0.7,
                color: detectedType === 'jtm' ? '#FFC107' : undefined,
                data: geoData,
                importedAt: new Date().toISOString(),
            };

            setPendingOverlay(overlay);
            setPendingName(overlay.name);
            setPendingType(detectedType);
            setPendingColor(overlay.color || '#FFC107');
            setImportStep('confirm');
            setImporting(false);
        } catch (error: any) {
            setImporting(false);
            Alert.alert('Error Import', error.message || 'Gagal membaca file');
        }
    };

    const handleConfirmImport = async () => {
        if (!pendingOverlay) return;

        const finalOverlay: OverlayFile = {
            ...pendingOverlay,
            name: pendingName.trim() || pendingOverlay.name,
            type: pendingType,
            color: pendingType === 'jtm' ? pendingColor : undefined,
        };

        const updated = [...overlays, finalOverlay];
        onOverlaysChange(updated);
        await overlayStorage.saveOverlay(finalOverlay);

        // Reset
        setPendingOverlay(null);
        setImportStep('idle');

        Alert.alert(
            '✅ Berhasil',
            `${finalOverlay.name} berhasil diimport.\n${finalOverlay.data.points.length} titik, ${finalOverlay.data.polylines.length} jalur.`
        );
    };

    const handleCancelImport = () => {
        setPendingOverlay(null);
        setImportStep('idle');
    };

    // ── Overlay Management ───────────────────────────────────────────────

    const toggleVisibility = async (id: string) => {
        const updated = overlays.map(o =>
            o.id === id ? { ...o, visible: !o.visible } : o
        );
        onOverlaysChange(updated);
        const overlay = updated.find(o => o.id === id);
        if (overlay) await overlayStorage.updateVisibility(id, overlay.visible);
    };

    const updateOpacity = async (id: string, opacity: number) => {
        const updated = overlays.map(o =>
            o.id === id ? { ...o, opacity } : o
        );
        onOverlaysChange(updated);
        // Debounced save — only save on slide complete (handled by onSlidingComplete)
    };

    const saveOpacity = async (id: string, opacity: number) => {
        await overlayStorage.updateOpacity(id, opacity);
    };

    const handleDelete = (id: string, name: string) => {
        Alert.alert(
            'Hapus Layer',
            `Yakin ingin menghapus "${name}"?`,
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Hapus',
                    style: 'destructive',
                    onPress: async () => {
                        const updated = overlays.filter(o => o.id !== id);
                        onOverlaysChange(updated);
                        await overlayStorage.deleteOverlay(id);
                    },
                },
            ]
        );
    };

    // ── Render ────────────────────────────────────────────────────────────

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>📂 Data Eksisting</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* Import Button */}
                        <TouchableOpacity
                            style={styles.importButton}
                            onPress={handleImport}
                            disabled={importing}
                            activeOpacity={0.7}
                        >
                            {importing ? (
                                <ActivityIndicator color="white" size="small" />
                            ) : (
                                <Ionicons name="cloud-upload-outline" size={20} color="white" />
                            )}
                            <Text style={styles.importButtonText}>
                                {importing ? 'Memproses...' : 'Import File (CSV / KML / KMZ)'}
                            </Text>
                        </TouchableOpacity>

                        {/* Import Confirmation */}
                        {importStep === 'confirm' && pendingOverlay && (
                            <View style={styles.confirmBox}>
                                <Text style={styles.confirmTitle}>Konfirmasi Import</Text>

                                {/* Preview */}
                                <View style={styles.previewBox}>
                                    <Text style={styles.previewText}>
                                        📊 Ditemukan: {pendingOverlay.data.points.length} titik, {pendingOverlay.data.polylines.length} jalur
                                    </Text>
                                    <Text style={styles.previewText}>
                                        🔍 Tipe terdeteksi: {TYPE_LABELS[pendingType]}
                                    </Text>
                                </View>

                                {/* Name */}
                                <Text style={styles.fieldLabel}>Nama Layer</Text>
                                <TextInput
                                    style={styles.input}
                                    value={pendingName}
                                    onChangeText={setPendingName}
                                    placeholder="Nama layer"
                                />

                                {/* Type Selection */}
                                <Text style={styles.fieldLabel}>Tipe Data</Text>
                                <View style={styles.typeRow}>
                                    {TYPE_OPTIONS.map(opt => (
                                        <TouchableOpacity
                                            key={opt.value}
                                            style={[
                                                styles.typeChip,
                                                pendingType === opt.value && styles.typeChipActive,
                                            ]}
                                            onPress={() => setPendingType(opt.value)}
                                        >
                                            <Text style={[
                                                styles.typeChipText,
                                                pendingType === opt.value && styles.typeChipTextActive,
                                            ]}>
                                                {opt.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Color (for polylines) */}
                                {pendingType === 'jtm' && (
                                    <>
                                        <Text style={styles.fieldLabel}>Warna Jalur</Text>
                                        <View style={styles.colorRow}>
                                            {COLOR_PRESETS.map(c => (
                                                <TouchableOpacity
                                                    key={c}
                                                    style={[
                                                        styles.colorSwatch,
                                                        { backgroundColor: c },
                                                        pendingColor === c && styles.colorSwatchActive,
                                                    ]}
                                                    onPress={() => setPendingColor(c)}
                                                />
                                            ))}
                                        </View>
                                    </>
                                )}

                                {/* Confirm / Cancel */}
                                <View style={styles.confirmActions}>
                                    <TouchableOpacity
                                        style={styles.cancelBtn}
                                        onPress={handleCancelImport}
                                    >
                                        <Text style={styles.cancelBtnText}>Batal</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.confirmBtn}
                                        onPress={handleConfirmImport}
                                    >
                                        <Ionicons name="checkmark" size={18} color="white" />
                                        <Text style={styles.confirmBtnText}>Import</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Overlay List */}
                        {overlays.length > 0 && (
                            <Text style={styles.sectionTitle}>
                                Layer Aktif ({overlays.length})
                            </Text>
                        )}

                        {overlays.map(ol => (
                            <View key={ol.id} style={styles.overlayItem}>
                                <View style={styles.overlayHeader}>
                                    <View style={styles.overlayInfo}>
                                        <Text style={styles.overlayName} numberOfLines={1}>
                                            {ol.name}
                                        </Text>
                                        <Text style={styles.overlayMeta}>
                                            {TYPE_LABELS[ol.type]} • {ol.data.points.length} titik, {ol.data.polylines.length} jalur
                                        </Text>
                                    </View>

                                    <View style={styles.overlayActions}>
                                        <TouchableOpacity
                                            onPress={() => toggleVisibility(ol.id)}
                                            style={styles.visibilityBtn}
                                        >
                                            <Ionicons
                                                name={ol.visible ? 'eye' : 'eye-off'}
                                                size={20}
                                                color={ol.visible ? '#1565C0' : '#999'}
                                            />
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={() => handleDelete(ol.id, ol.name)}
                                            style={styles.deleteBtn}
                                        >
                                            <Ionicons name="trash-outline" size={18} color="#F44336" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Opacity Slider */}
                                {ol.visible && (
                                    <View style={styles.opacityRow}>
                                        <Text style={styles.opacityLabel}>Opacity</Text>
                                        <View style={styles.sliderContainer}>
                                            <Slider
                                                style={styles.slider}
                                                minimumValue={0.1}
                                                maximumValue={1}
                                                value={ol.opacity}
                                                onValueChange={(v: number) => updateOpacity(ol.id, v)}
                                                onSlidingComplete={(v: number) => saveOpacity(ol.id, v)}
                                                minimumTrackTintColor="#1565C0"
                                                maximumTrackTintColor="#ddd"
                                                thumbTintColor="#1565C0"
                                            />
                                        </View>
                                        <Text style={styles.opacityValue}>{Math.round(ol.opacity * 100)}%</Text>
                                    </View>
                                )}
                            </View>
                        ))}

                        {overlays.length === 0 && importStep === 'idle' && (
                            <View style={styles.emptyState}>
                                <Ionicons name="layers-outline" size={48} color="#ccc" />
                                <Text style={styles.emptyText}>
                                    Belum ada data eksisting diimport.
                                </Text>
                                <Text style={styles.emptySubtext}>
                                    Tap tombol di atas untuk import file CSV, KML, atau KMZ berisi data jaringan PLN eksisting.
                                </Text>
                            </View>
                        )}

                        {/* Bottom spacing */}
                        <View style={{ height: 30 }} />
                    </ScrollView>

                    {/* Close */}
                    <TouchableOpacity style={styles.footerBtn} onPress={onClose}>
                        <Text style={styles.footerBtnText}>Tutup</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        backgroundColor: 'white',
        borderRadius: 16,
        width: '92%',
        maxHeight: '90%',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    closeBtn: {
        padding: 4,
    },
    content: {
        padding: 16,
        maxHeight: 500,
    },

    // Import Button
    importButton: {
        backgroundColor: '#1565C0',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 10,
        gap: 8,
    },
    importButtonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
    },

    // Confirm Box
    confirmBox: {
        marginTop: 16,
        padding: 14,
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    confirmTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    previewBox: {
        backgroundColor: '#E3F2FD',
        padding: 10,
        borderRadius: 8,
        marginBottom: 12,
    },
    previewText: {
        fontSize: 13,
        color: '#1565C0',
        marginBottom: 2,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#555',
        marginBottom: 4,
        marginTop: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
        backgroundColor: 'white',
    },
    typeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 4,
    },
    typeChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#E0E0E0',
    },
    typeChipActive: {
        backgroundColor: '#1565C0',
    },
    typeChipText: {
        fontSize: 12,
        color: '#555',
    },
    typeChipTextActive: {
        color: 'white',
        fontWeight: '600',
    },
    colorRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 6,
    },
    colorSwatch: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    colorSwatchActive: {
        borderColor: '#333',
        borderWidth: 3,
    },
    confirmActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 14,
    },
    cancelBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#E0E0E0',
    },
    cancelBtnText: {
        color: '#555',
        fontWeight: '600',
    },
    confirmBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#4CAF50',
    },
    confirmBtnText: {
        color: 'white',
        fontWeight: '600',
    },

    // Overlay List
    sectionTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 20,
        marginBottom: 10,
    },
    overlayItem: {
        backgroundColor: '#FAFAFA',
        borderRadius: 10,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    overlayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    overlayInfo: {
        flex: 1,
        marginRight: 8,
    },
    overlayName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    overlayMeta: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    overlayActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    visibilityBtn: {
        padding: 6,
    },
    deleteBtn: {
        padding: 6,
    },

    // Opacity Slider
    opacityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#EEE',
    },
    opacityLabel: {
        fontSize: 12,
        color: '#888',
        width: 50,
    },
    sliderContainer: {
        flex: 1,
        marginHorizontal: 4,
    },
    slider: {
        height: 30,
    },
    opacityValue: {
        fontSize: 12,
        color: '#555',
        fontWeight: '600',
        width: 35,
        textAlign: 'right',
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 15,
        color: '#999',
        marginTop: 12,
        fontWeight: '600',
    },
    emptySubtext: {
        fontSize: 13,
        color: '#bbb',
        marginTop: 6,
        textAlign: 'center',
        lineHeight: 18,
    },

    // Footer
    footerBtn: {
        backgroundColor: '#F5F5F5',
        paddingVertical: 14,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    footerBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#666',
    },
});
