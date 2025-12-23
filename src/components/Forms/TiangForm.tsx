// =============================================================================
// PLN SURVEY APP - Tiang Form Component
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
    Image,
    Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Coordinate, Tiang } from '../../types';
import {
    KONSTRUKSI_TM,
    KONSTRUKSI_TR,
    KONSTRUKSI_SKUTM,
    JENIS_TIANG,
    PERLENGKAPAN_JARINGAN,
    DEFAULT_TIANG,
} from '../../utils/plnStandards';
import { formatCoordinate } from '../../utils/geoUtils';

// =============================================================================
// TYPES
// =============================================================================

interface TiangFormProps {
    visible: boolean;
    koordinat: Coordinate;
    onSubmit: (data: Omit<Tiang, 'id' | 'nomorUrut' | 'createdAt' | 'updatedAt' | 'isSynced'>) => void;
    onCancel: () => void;
    initialData?: Partial<Tiang>;
    // Remember last selection from previous tiang
    lastJenisJaringan?: 'SUTM' | 'SUTR' | 'SKUTM';
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function TiangForm({
    visible,
    koordinat,
    onSubmit,
    onCancel,
    initialData,
    lastJenisJaringan,
}: TiangFormProps) {
    // Determine initial jenis jaringan from lastJenisJaringan or default to SUTM
    const initialJenis = lastJenisJaringan || initialData?.jenisJaringan || 'SUTM';
    const defaults = DEFAULT_TIANG[initialJenis];

    const [jenisJaringan, setJenisJaringan] = useState<'SUTM' | 'SUTR' | 'SKUTM'>(initialJenis);
    const [konstruksi, setKonstruksi] = useState(initialData?.konstruksi || defaults.konstruksi);
    const [jenisTiang, setJenisTiang] = useState<'Beton' | 'Besi/Baja' | 'Kayu'>(
        initialData?.jenisTiang || defaults.bahan
    );
    const [tinggiTiang, setTinggiTiang] = useState(initialData?.tinggiTiang || defaults.tinggi);
    const [kekuatanTiang, setKekuatanTiang] = useState(initialData?.kekuatanTiang || defaults.kekuatan);
    const [selectedPerlengkapan, setSelectedPerlengkapan] = useState<string[]>(
        initialData?.perlengkapan || []
    );
    const [catatan, setCatatan] = useState(initialData?.catatan || '');
    const [fotos, setFotos] = useState<string[]>(initialData?.foto || []);

    // Update defaults when jenis jaringan changes
    useEffect(() => {
        const newDefaults = DEFAULT_TIANG[jenisJaringan];
        setKonstruksi(newDefaults.konstruksi);
        setTinggiTiang(newDefaults.tinggi);
        setJenisTiang(newDefaults.bahan);
        setKekuatanTiang(newDefaults.kekuatan);
    }, [jenisJaringan]);

    // Get konstruksi options based on jaringan type
    const getKonstruksiOptions = () => {
        if (jenisJaringan === 'SUTR') {
            return Object.values(KONSTRUKSI_TR);
        }
        if (jenisJaringan === 'SKUTM') {
            return Object.values(KONSTRUKSI_SKUTM);
        }
        return Object.values(KONSTRUKSI_TM);
    };

    const konstruksiOptions = getKonstruksiOptions();

    const handleSubmit = () => {
        onSubmit({
            koordinat,
            jenisJaringan,
            konstruksi,
            jenisTiang,
            tinggiTiang,
            kekuatanTiang,
            perlengkapan: selectedPerlengkapan,
            foto: fotos.length > 0 ? fotos : undefined,
            catatan: catatan || undefined,
        });
    };

    const togglePerlengkapan = (item: string) => {
        setSelectedPerlengkapan(prev =>
            prev.includes(item)
                ? prev.filter(p => p !== item)
                : [...prev, item]
        );
    };

    // Photo picker handlers
    const pickImageFromCamera = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Izin kamera diperlukan untuk mengambil foto');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
            allowsEditing: true,
            aspect: [4, 3],
        });

        if (!result.canceled && result.assets[0]) {
            setFotos(prev => [...prev, result.assets[0].uri]);
        }
    };

    const pickImageFromGallery = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
            allowsMultipleSelection: true,
            selectionLimit: 5,
        });

        if (!result.canceled && result.assets.length > 0) {
            const newUris = result.assets.map(asset => asset.uri);
            setFotos(prev => [...prev, ...newUris].slice(0, 5)); // Max 5 photos
        }
    };

    const removePhoto = (index: number) => {
        setFotos(prev => prev.filter((_, i) => i !== index));
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
                    <Text style={styles.title}>Tambah Tiang</Text>
                    <TouchableOpacity onPress={handleSubmit}>
                        <Text style={styles.saveButton}>Simpan</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.form}>
                    {/* Koordinat */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Koordinat</Text>
                        <Text style={styles.coordinateText}>{formatCoordinate(koordinat)}</Text>
                    </View>

                    {/* Jenis Jaringan */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Jenis Jaringan</Text>
                        <View style={styles.optionRow}>
                            {(['SUTM', 'SUTR', 'SKUTM'] as const).map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    style={[
                                        styles.optionButton,
                                        jenisJaringan === type && styles.optionButtonActive,
                                    ]}
                                    onPress={() => setJenisJaringan(type)}
                                >
                                    <Text
                                        style={[
                                            styles.optionText,
                                            jenisJaringan === type && styles.optionTextActive,
                                        ]}
                                    >
                                        {type}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Konstruksi */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Konstruksi</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.konstruksiRow}>
                                {konstruksiOptions.map((k) => (
                                    <TouchableOpacity
                                        key={k.kode}
                                        style={[
                                            styles.konstruksiButton,
                                            konstruksi === k.kode && styles.konstruksiButtonActive,
                                        ]}
                                        onPress={() => setKonstruksi(k.kode)}
                                    >
                                        <Text
                                            style={[
                                                styles.konstruksiCode,
                                                konstruksi === k.kode && styles.konstruksiCodeActive,
                                            ]}
                                        >
                                            {k.kode}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.konstruksiName,
                                                konstruksi === k.kode && styles.konstruksiNameActive,
                                            ]}
                                            numberOfLines={2}
                                        >
                                            {k.nama}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                        {/* Show selected konstruksi details */}
                        {konstruksi && (
                            <View style={styles.konstruksiInfo}>
                                <Text style={styles.konstruksiInfoText}>
                                    {konstruksiOptions.find(k => k.kode === konstruksi)?.keterangan}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Jenis Tiang */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Jenis Tiang</Text>
                        <View style={styles.optionRow}>
                            {JENIS_TIANG.bahan.map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    style={[
                                        styles.optionButton,
                                        jenisTiang === type && styles.optionButtonActive,
                                    ]}
                                    onPress={() => setJenisTiang(type as any)}
                                >
                                    <Text
                                        style={[
                                            styles.optionText,
                                            jenisTiang === type && styles.optionTextActive,
                                        ]}
                                    >
                                        {type}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Tinggi & Kekuatan Tiang - Compact Row */}
                    <View style={styles.rowSection}>
                        {/* Tinggi Tiang */}
                        <View style={styles.halfSection}>
                            <Text style={styles.label}>Tinggi</Text>
                            <View style={styles.compactOptionRow}>
                                {JENIS_TIANG.tinggi.map((height) => (
                                    <TouchableOpacity
                                        key={height}
                                        style={[
                                            styles.compactOptionButton,
                                            tinggiTiang === height && styles.optionButtonActive,
                                        ]}
                                        onPress={() => setTinggiTiang(height)}
                                    >
                                        <Text
                                            style={[
                                                styles.compactOptionText,
                                                tinggiTiang === height && styles.optionTextActive,
                                            ]}
                                        >
                                            {height}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Kekuatan Tiang */}
                        <View style={styles.halfSection}>
                            <Text style={styles.label}>Kekuatan</Text>
                            <View style={styles.compactOptionRow}>
                                {JENIS_TIANG.kekuatan.map((strength) => (
                                    <TouchableOpacity
                                        key={strength}
                                        style={[
                                            styles.compactOptionButton,
                                            kekuatanTiang === strength && styles.optionButtonActive,
                                        ]}
                                        onPress={() => setKekuatanTiang(strength)}
                                    >
                                        <Text
                                            style={[
                                                styles.compactOptionText,
                                                kekuatanTiang === strength && styles.optionTextActive,
                                            ]}
                                        >
                                            {strength.replace(' daN', '')}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>

                    {/* Perlengkapan */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Perlengkapan (opsional)</Text>
                        <View style={styles.emptyPerlengkapan}>
                            <Text style={styles.emptyPerlengkapanText}>
                                Akan diperbarui...
                            </Text>
                        </View>
                    </View>

                    {/* Foto Dokumentasi */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Foto Dokumentasi (opsional)</Text>

                        {/* Photo thumbnails */}
                        {fotos.length > 0 && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                                <View style={styles.photoRow}>
                                    {fotos.map((uri, index) => (
                                        <View key={index} style={styles.photoContainer}>
                                            <Image source={{ uri }} style={styles.photoThumbnail} />
                                            <TouchableOpacity
                                                style={styles.removePhotoButton}
                                                onPress={() => removePhoto(index)}
                                            >
                                                <Text style={styles.removePhotoText}>✕</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            </ScrollView>
                        )}

                        {/* Photo picker buttons */}
                        <View style={styles.photoButtons}>
                            <TouchableOpacity
                                style={styles.photoButton}
                                onPress={pickImageFromCamera}
                            >
                                <Text style={styles.photoButtonIcon}>📷</Text>
                                <Text style={styles.photoButtonText}>Kamera</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.photoButton}
                                onPress={pickImageFromGallery}
                            >
                                <Text style={styles.photoButtonIcon}>🖼️</Text>
                                <Text style={styles.photoButtonText}>Galeri</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.photoHint}>Maksimal 5 foto</Text>
                    </View>

                    {/* Catatan */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Catatan (opsional)</Text>
                        <TextInput
                            style={styles.textInput}
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
        padding: 16,
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
        color: '#2196F3',
        fontSize: 16,
        fontWeight: '600',
    },
    form: {
        flex: 1,
        padding: 16,
    },
    section: {
        marginBottom: 20,
    },
    rowSection: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    halfSection: {
        flex: 1,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    coordinateText: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'monospace',
    },
    optionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    optionButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    optionButtonActive: {
        backgroundColor: '#2196F3',
        borderColor: '#2196F3',
    },
    optionText: {
        fontSize: 14,
        color: '#333',
    },
    optionTextActive: {
        color: 'white',
    },
    compactOptionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
    },
    compactOptionButton: {
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    compactOptionText: {
        fontSize: 11,
        color: '#333',
    },
    konstruksiRow: {
        flexDirection: 'row',
        gap: 8,
    },
    konstruksiButton: {
        width: 90,
        padding: 10,
        borderRadius: 8,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    konstruksiButtonActive: {
        backgroundColor: '#2196F3',
        borderColor: '#2196F3',
    },
    konstruksiCode: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 2,
    },
    konstruksiCodeActive: {
        color: 'white',
    },
    konstruksiName: {
        fontSize: 10,
        color: '#666',
    },
    konstruksiNameActive: {
        color: 'rgba(255,255,255,0.9)',
    },
    konstruksiInfo: {
        marginTop: 8,
        padding: 10,
        backgroundColor: '#E3F2FD',
        borderRadius: 8,
    },
    konstruksiInfoText: {
        fontSize: 12,
        color: '#1565C0',
    },
    checkboxGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    checkboxItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: 'white',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    checkboxItemActive: {
        backgroundColor: '#E3F2FD',
        borderColor: '#2196F3',
    },
    checkboxIcon: {
        marginRight: 4,
        fontSize: 12,
    },
    checkboxText: {
        fontSize: 11,
        color: '#333',
    },
    textInput: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        textAlignVertical: 'top',
    },
    emptyPerlengkapan: {
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
    },
    emptyPerlengkapanText: {
        color: '#999',
        fontSize: 13,
        fontStyle: 'italic',
    },
    // Photo styles
    photoScroll: {
        marginBottom: 12,
    },
    photoRow: {
        flexDirection: 'row',
        gap: 8,
    },
    photoContainer: {
        position: 'relative',
    },
    photoThumbnail: {
        width: 80,
        height: 80,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
    },
    removePhotoButton: {
        position: 'absolute',
        top: -6,
        right: -6,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#F44336',
        alignItems: 'center',
        justifyContent: 'center',
    },
    removePhotoText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    photoButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    photoButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        paddingVertical: 12,
        gap: 8,
    },
    photoButtonIcon: {
        fontSize: 18,
    },
    photoButtonText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    photoHint: {
        marginTop: 8,
        fontSize: 11,
        color: '#999',
        textAlign: 'center',
    },
});
