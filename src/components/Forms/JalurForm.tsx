// =============================================================================
// PLN SURVEY APP - Jalur Form Component (Create & Edit)
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
import { Coordinate, JalurKabel } from '../../types';
import { PENGHANTAR, JENIS_JARINGAN } from '../../utils/plnStandards';
import { formatDistance, calculatePolylineLength } from '../../utils/geoUtils';

// =============================================================================
// TYPES
// =============================================================================

interface JalurFormProps {
    visible: boolean;
    koordinat: Coordinate[];
    onSubmit: (data: Omit<JalurKabel, 'id' | 'createdAt' | 'updatedAt' | 'isSynced'>) => void;
    onCancel: () => void;
    // For edit mode
    editMode?: boolean;
    initialData?: Partial<JalurKabel>;
    // Remembered values from last jalur
    lastPenghantar?: { jenis: string; penampang: string };
}

type JenisJaringanType = 'SUTM' | 'SKTM' | 'SKUTM' | 'SUTR' | 'SKTR';

// =============================================================================
// COMPONENT
// =============================================================================

export default function JalurForm({
    visible,
    koordinat,
    onSubmit,
    onCancel,
    editMode = false,
    initialData,
    lastPenghantar,
}: JalurFormProps) {
    // Determine initial values
    const getInitialPenghantar = () => {
        if (initialData?.jenisPenghantar) return initialData.jenisPenghantar;
        if (lastPenghantar?.jenis) return lastPenghantar.jenis;
        return 'A3CS';
    };

    const getInitialPenampang = () => {
        if (initialData?.penampangMM) return initialData.penampangMM;
        if (lastPenghantar?.penampang) return lastPenghantar.penampang;
        return '150mm²';
    };

    const [namaJalur, setNamaJalur] = useState(initialData?.namaJalur || '');
    const [jenisJaringan, setJenisJaringan] = useState<JenisJaringanType>(
        (initialData?.jenisJaringan as JenisJaringanType) || 'SUTM'
    );
    const [jenisPenghantar, setJenisPenghantar] = useState(getInitialPenghantar());
    const [penampangMM, setPenampangMM] = useState(getInitialPenampang());
    const [status, setStatus] = useState<'existing' | 'planned' | 'remove'>(
        initialData?.status || 'planned'
    );
    const [catatan, setCatatan] = useState(initialData?.catatan || '');

    // Reset form when visibility changes or initialData changes
    useEffect(() => {
        if (visible) {
            setNamaJalur(initialData?.namaJalur || '');
            setJenisJaringan((initialData?.jenisJaringan as JenisJaringanType) || 'SUTM');
            setJenisPenghantar(getInitialPenghantar());
            setPenampangMM(getInitialPenampang());
            setStatus(initialData?.status || 'planned');
            setCatatan(initialData?.catatan || '');
        }
    }, [visible, initialData]);

    const panjangMeter = calculatePolylineLength(koordinat);

    // Get penghantar options based on jaringan type
    const getPenghantarJenis = () => {
        if (jenisJaringan === 'SUTM' || jenisJaringan === 'SKUTM') {
            return PENGHANTAR.SUTM.jenis;
        }
        if (jenisJaringan === 'SKTM') {
            return PENGHANTAR.SKTM.jenis;
        }
        // SUTR/SKTR
        return ['NFA2X', 'LVTC', 'Twisted Cable'];
    };

    const getPenampangOptions = () => {
        if (jenisJaringan === 'SUTM' || jenisJaringan === 'SKUTM') {
            return PENGHANTAR.SUTM.penampang;
        }
        if (jenisJaringan === 'SKTM') {
            return PENGHANTAR.SKTM.penampang;
        }
        return ['3x35+1x25mm²', '3x50+1x35mm²', '3x70+1x50mm²', '3x95+1x70mm²'];
    };

    const handleSubmit = () => {
        onSubmit({
            namaJalur: namaJalur.trim() || undefined,
            koordinat,
            jenisJaringan,
            jenisPenghantar,
            penampangMM,
            panjangMeter,
            tiangIds: initialData?.tiangIds || [],
            status,
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
                    <Text style={styles.title}>{editMode ? 'Edit Jalur' : 'Tambah Jalur'}</Text>
                    <TouchableOpacity onPress={handleSubmit}>
                        <Text style={styles.saveButton}>Simpan</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.form}>
                    {/* Panjang Jalur */}
                    <View style={styles.infoCard}>
                        <Text style={styles.infoLabel}>Panjang Jalur</Text>
                        <Text style={styles.infoValue}>{formatDistance(panjangMeter)}</Text>
                        <Text style={styles.infoSub}>{koordinat.length} titik koordinat</Text>
                    </View>

                    {/* Nama Jalur */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Nama Jalur (Opsional)</Text>
                        <TextInput
                            style={styles.textInput}
                            value={namaJalur}
                            onChangeText={setNamaJalur}
                            placeholder="Contoh: Feeder KBN-01"
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
                                    onPress={() => {
                                        setJenisJaringan(type);
                                        // Reset penghantar when changing jaringan type
                                        const newJenis = getPenghantarJenis()[0];
                                        const newPenampang = getPenampangOptions()[0];
                                        setJenisPenghantar(newJenis || 'A3CS');
                                        setPenampangMM(newPenampang || '150mm²');
                                    }}
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

                    {/* Jenis Penghantar */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Jenis Penghantar</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.optionRow}>
                                {getPenghantarJenis().map((jenis) => (
                                    <TouchableOpacity
                                        key={jenis}
                                        style={[
                                            styles.optionButton,
                                            jenisPenghantar === jenis && styles.optionButtonActive,
                                        ]}
                                        onPress={() => setJenisPenghantar(jenis)}
                                    >
                                        <Text
                                            style={[
                                                styles.optionText,
                                                jenisPenghantar === jenis && styles.optionTextActive,
                                            ]}
                                        >
                                            {jenis}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </View>

                    {/* Penampang */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Penampang</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.optionRow}>
                                {getPenampangOptions().map((penampang) => (
                                    <TouchableOpacity
                                        key={penampang}
                                        style={[
                                            styles.optionButton,
                                            penampangMM === penampang && styles.optionButtonActive,
                                        ]}
                                        onPress={() => setPenampangMM(penampang)}
                                    >
                                        <Text
                                            style={[
                                                styles.optionText,
                                                penampangMM === penampang && styles.optionTextActive,
                                            ]}
                                        >
                                            {penampang}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </View>

                    {/* Status */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Status</Text>
                        <View style={styles.statusRow}>
                            <TouchableOpacity
                                style={[
                                    styles.statusButton,
                                    status === 'existing' && styles.statusExisting,
                                ]}
                                onPress={() => setStatus('existing')}
                            >
                                <Text style={[
                                    styles.statusText,
                                    status === 'existing' && styles.statusTextActive,
                                ]}>
                                    ✓ Existing
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.statusButton,
                                    status === 'planned' && styles.statusPlanned,
                                ]}
                                onPress={() => setStatus('planned')}
                            >
                                <Text style={[
                                    styles.statusText,
                                    status === 'planned' && styles.statusTextActive,
                                ]}>
                                    ⊕ Rencana Pasang
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.statusButton,
                                    status === 'remove' && styles.statusRemove,
                                ]}
                                onPress={() => setStatus('remove')}
                            >
                                <Text style={[
                                    styles.statusText,
                                    status === 'remove' && styles.statusTextActive,
                                ]}>
                                    ✕ Rencana Bongkar
                                </Text>
                            </TouchableOpacity>
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
        color: '#E91E63',
        fontSize: 16,
        fontWeight: '600',
    },
    form: {
        flex: 1,
        padding: 16,
    },
    infoCard: {
        backgroundColor: '#E91E63',
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
    },
    textAreaInput: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
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
        backgroundColor: '#FCE4EC',
        borderColor: '#E91E63',
    },
    jaringanCode: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    jaringanCodeActive: {
        color: '#E91E63',
    },
    jaringanName: {
        fontSize: 9,
        color: '#666',
        textAlign: 'center',
    },
    jaringanNameActive: {
        color: '#C2185B',
    },
    optionButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        marginRight: 8,
    },
    optionButtonActive: {
        backgroundColor: '#E91E63',
        borderColor: '#E91E63',
    },
    optionText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    optionTextActive: {
        color: 'white',
    },
    statusRow: {
        flexDirection: 'row',
        gap: 8,
    },
    statusButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: 'white',
        borderWidth: 2,
        borderColor: '#e0e0e0',
        alignItems: 'center',
    },
    statusExisting: {
        backgroundColor: '#E8F5E9',
        borderColor: '#4CAF50',
    },
    statusPlanned: {
        backgroundColor: '#E3F2FD',
        borderColor: '#2196F3',
    },
    statusRemove: {
        backgroundColor: '#FFEBEE',
        borderColor: '#F44336',
    },
    statusText: {
        fontSize: 11,
        color: '#666',
        fontWeight: '500',
    },
    statusTextActive: {
        color: '#333',
        fontWeight: '600',
    },
});
