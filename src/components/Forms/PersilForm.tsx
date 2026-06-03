// =============================================================================
// PLN SURVEY APP - Persil Pelanggan Form
// Form untuk input nama & warna kotak persil di peta
// =============================================================================

import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { Coordinate } from '../../types';

// =============================================================================
// TYPES
// =============================================================================

export interface PersilFormData {
    namaPersil: string;
    warnaBorder: string;
    catatan?: string;
    koordinatSudut: [Coordinate, Coordinate];
}

interface PersilFormProps {
    visible: boolean;
    koordinatSudut: [Coordinate, Coordinate] | null;
    onSubmit: (data: PersilFormData) => void;
    onCancel: () => void;
    // Edit mode
    initialData?: { namaPersil: string; warnaBorder: string; catatan?: string };
}

// =============================================================================
// WARNA OPTIONS
// =============================================================================

const WARNA_OPTIONS = [
    { label: 'Pink', value: '#E91E63' },
    { label: 'Biru', value: '#2196F3' },
    { label: 'Hijau', value: '#4CAF50' },
    { label: 'Oranye', value: '#FF9800' },
    { label: 'Ungu', value: '#9C27B0' },
    { label: 'Kuning', value: '#FFC107' },
    { label: 'Merah', value: '#F44336' },
    { label: 'Cyan', value: '#00BCD4' },
];

// =============================================================================
// COMPONENT
// =============================================================================

export default function PersilForm({
    visible,
    koordinatSudut,
    onSubmit,
    onCancel,
    initialData,
}: PersilFormProps) {
    const [namaPersil, setNamaPersil] = useState(initialData?.namaPersil || '');
    const [warnaBorder, setWarnaBorder] = useState(initialData?.warnaBorder || WARNA_OPTIONS[0].value);
    const [catatan, setCatatan] = useState(initialData?.catatan || '');

    // Reset form when modal opens with new data
    React.useEffect(() => {
        if (visible) {
            setNamaPersil(initialData?.namaPersil || '');
            setWarnaBorder(initialData?.warnaBorder || WARNA_OPTIONS[0].value);
            setCatatan(initialData?.catatan || '');
        }
    }, [visible, initialData]);

    const handleSubmit = () => {
        if (!namaPersil.trim()) {
            alert('Nama persil tidak boleh kosong');
            return;
        }
        if (!koordinatSudut) {
            alert('Koordinat belum ditentukan');
            return;
        }

        onSubmit({
            namaPersil: namaPersil.trim(),
            warnaBorder,
            catatan: catatan.trim() || undefined,
            koordinatSudut,
        });
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: warnaBorder }]}>
                        <Text style={styles.headerTitle}>🏘️ Tandai Persil</Text>
                        <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* Preview kotak */}
                        <View style={[styles.previewBox, { borderColor: warnaBorder }]}>
                            <Text style={[styles.previewLabel, { color: warnaBorder }]}>
                                {namaPersil || 'Nama Persil'}
                            </Text>
                        </View>

                        {/* Nama Persil */}
                        <Text style={styles.label}>Nama Persil / Pemilik *</Text>
                        <TextInput
                            style={styles.input}
                            value={namaPersil}
                            onChangeText={setNamaPersil}
                            placeholder="Contoh: PT. Mekarjaya / Pak Budi"
                            placeholderTextColor="#999"
                            autoFocus
                        />

                        {/* Pilih Warna */}
                        <Text style={styles.label}>Warna Kotak</Text>
                        <View style={styles.colorGrid}>
                            {WARNA_OPTIONS.map((w) => (
                                <TouchableOpacity
                                    key={w.value}
                                    style={[
                                        styles.colorOption,
                                        { backgroundColor: w.value },
                                        warnaBorder === w.value && styles.colorOptionSelected,
                                    ]}
                                    onPress={() => setWarnaBorder(w.value)}
                                >
                                    {warnaBorder === w.value && (
                                        <Text style={styles.colorCheck}>✓</Text>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={styles.colorLabel}>
                            {WARNA_OPTIONS.find(w => w.value === warnaBorder)?.label}
                        </Text>

                        {/* Catatan */}
                        <Text style={styles.label}>Catatan (Opsional)</Text>
                        <TextInput
                            style={[styles.input, { height: 60 }]}
                            value={catatan}
                            onChangeText={setCatatan}
                            placeholder="Contoh: Luas ±500m², bersebelahan dengan gardu"
                            placeholderTextColor="#999"
                            multiline
                        />

                        {/* Info koordinat */}
                        {koordinatSudut && (
                            <View style={styles.coordInfo}>
                                <Text style={styles.coordInfoText}>
                                    📍 SW: {koordinatSudut[0].latitude.toFixed(6)}, {koordinatSudut[0].longitude.toFixed(6)}
                                </Text>
                                <Text style={styles.coordInfoText}>
                                    📍 NE: {koordinatSudut[1].latitude.toFixed(6)}, {koordinatSudut[1].longitude.toFixed(6)}
                                </Text>
                            </View>
                        )}
                    </ScrollView>

                    {/* Actions */}
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                            <Text style={styles.cancelText}>Batal</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.submitButton, { backgroundColor: warnaBorder }]}
                            onPress={handleSubmit}
                        >
                            <Text style={styles.submitText}>
                                {initialData ? '💾 Simpan' : '✅ Tambahkan'}
                            </Text>
                        </TouchableOpacity>
                    </View>
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
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '85%',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 3,
        borderBottomColor: '#E91E63',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    closeBtn: {
        padding: 4,
    },
    closeText: {
        fontSize: 18,
        color: '#666',
    },
    content: {
        padding: 16,
    },
    previewBox: {
        borderWidth: 2,
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.03)',
    },
    previewLabel: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#444',
        marginBottom: 6,
        marginTop: 12,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        backgroundColor: '#f9f9f9',
        color: '#333',
    },
    colorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 6,
    },
    colorOption: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    colorOptionSelected: {
        transform: [{ scale: 1.25 }],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 6,
    },
    colorCheck: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    colorLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    coordInfo: {
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        padding: 10,
        marginTop: 12,
        marginBottom: 8,
    },
    coordInfoText: {
        fontSize: 11,
        color: '#888',
        fontFamily: 'monospace',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    cancelButton: {
        flex: 1,
        padding: 14,
        borderRadius: 10,
        backgroundColor: '#f5f5f5',
        alignItems: 'center',
    },
    cancelText: {
        color: '#666',
        fontWeight: '600',
        fontSize: 15,
    },
    submitButton: {
        flex: 2,
        padding: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    submitText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 15,
    },
});
