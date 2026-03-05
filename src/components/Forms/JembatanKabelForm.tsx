// =============================================================================
// PLN SURVEY APP - Jembatan Kabel Form Component
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Modal,
} from 'react-native';
import Constants from 'expo-constants';
import { Coordinate, JembatanKabel } from '../../types';
import { JENIS_JARINGAN } from '../../utils/plnStandards';
import { formatDistance, calculatePolylineLength } from '../../utils/geoUtils';

// =============================================================================
// TYPES
// =============================================================================

interface JembatanKabelFormProps {
    visible: boolean;
    koordinat: Coordinate[];
    onSubmit: (data: Omit<JembatanKabel, 'id' | 'createdAt' | 'updatedAt' | 'isSynced'>) => void;
    onCancel: () => void;
    // For edit mode
    editMode?: boolean;
    initialData?: Partial<JembatanKabel>;
}

type JenisJaringanType = 'SUTM' | 'SKTM' | 'SKUTM' | 'SUTR' | 'SKTR';

// =============================================================================
// COMPONENT
// =============================================================================

export default function JembatanKabelForm({
    visible,
    koordinat,
    onSubmit,
    onCancel,
    editMode = false,
    initialData,
}: JembatanKabelFormProps) {
    const [namaJembatan, setNamaJembatan] = useState(initialData?.namaJembatan || '');
    const [jenisJaringan, setJenisJaringan] = useState<JenisJaringanType>(
        (initialData?.jenisJaringan as JenisJaringanType) || 'SKTM'
    );
    const [catatan, setCatatan] = useState(initialData?.catatan || '');

    // Reset form when visibility changes or initialData changes
    useEffect(() => {
        if (visible) {
            setNamaJembatan(initialData?.namaJembatan || '');
            setJenisJaringan((initialData?.jenisJaringan as JenisJaringanType) || 'SKTM');
            setCatatan(initialData?.catatan || '');
        }
    }, [visible, initialData]);

    const panjangMeter = calculatePolylineLength(koordinat);

    const handleSubmit = () => {
        onSubmit({
            namaJembatan: namaJembatan.trim() || undefined,
            koordinat,
            jenisJaringan,
            panjangMeter,
            catatan: catatan.trim() || undefined,
        });
    };

    // ==========================================================================
    // RENDER
    // ==========================================================================

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onCancel}
        >
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onCancel}>
                        <Text style={styles.cancelButton}>Batal</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>{editMode ? 'Edit Jembatan Kabel' : 'Tambah Jembatan Kabel'}</Text>
                    <TouchableOpacity onPress={handleSubmit}>
                        <Text style={styles.saveButton}>Simpan</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.form}>
                    {/* Panjang Jembatan */}
                    <View style={styles.infoCard}>
                        <Text style={styles.infoLabel}>Panjang Jembatan Kabel</Text>
                        <Text style={styles.infoValue}>{formatDistance(panjangMeter)}</Text>
                        <Text style={styles.infoSub}>{koordinat.length} titik koordinat</Text>
                    </View>

                    {/* Nama Jembatan */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Nama Jembatan (Opsional)</Text>
                        <TextInput
                            style={styles.textInput}
                            value={namaJembatan}
                            onChangeText={setNamaJembatan}
                            placeholder="Contoh: JK Sungai Ciliwung"
                            placeholderTextColor="#999"
                        />
                    </View>

                    {/* Jenis Jaringan */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Jenis Jaringan</Text>
                        <View style={styles.optionRow}>
                            {(Object.keys(JENIS_JARINGAN) as JenisJaringanType[]).map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    style={[
                                        styles.jaringanButton,
                                        jenisJaringan === type && styles.jaringanButtonActive,
                                    ]}
                                    onPress={() => setJenisJaringan(type)}
                                >
                                    <Text
                                        style={[
                                            styles.jaringanCode,
                                            jenisJaringan === type && styles.jaringanCodeActive,
                                        ]}
                                    >
                                        {type}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.jaringanName,
                                            jenisJaringan === type && styles.jaringanNameActive,
                                        ]}
                                        numberOfLines={2}
                                    >
                                        {JENIS_JARINGAN[type]}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Catatan */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Catatan</Text>
                        <TextInput
                            style={styles.textAreaInput}
                            value={catatan}
                            onChangeText={setCatatan}
                            placeholder="Catatan tambahan..."
                            placeholderTextColor="#999"
                            multiline
                            numberOfLines={3}
                        />
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </View>
        </Modal>
    );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: Constants.statusBarHeight + 10,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    cancelButton: {
        color: '#666',
        fontSize: 16,
    },
    saveButton: {
        color: '#00BCD4',
        fontSize: 16,
        fontWeight: '600',
    },
    form: {
        flex: 1,
        padding: 16,
    },
    infoCard: {
        backgroundColor: '#00BCD4',
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
        alignItems: 'center',
    },
    infoLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        marginBottom: 4,
    },
    infoValue: {
        color: 'white',
        fontSize: 28,
        fontWeight: 'bold',
    },
    infoSub: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        marginTop: 4,
    },
    section: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    textInput: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#333',
    },
    textAreaInput: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: '#333',
        textAlignVertical: 'top',
        minHeight: 80,
    },
    optionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    jaringanButton: {
        width: '31%',
        padding: 12,
        borderRadius: 10,
        backgroundColor: 'white',
        borderWidth: 2,
        borderColor: '#e0e0e0',
        alignItems: 'center',
    },
    jaringanButtonActive: {
        backgroundColor: '#E0F7FA',
        borderColor: '#00BCD4',
    },
    jaringanCode: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    jaringanCodeActive: {
        color: '#00BCD4',
    },
    jaringanName: {
        fontSize: 9,
        color: '#666',
        textAlign: 'center',
    },
    jaringanNameActive: {
        color: '#00838F',
    },
});
