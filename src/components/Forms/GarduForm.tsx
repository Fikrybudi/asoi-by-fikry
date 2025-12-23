// =============================================================================
// PLN SURVEY APP - Gardu Form Component
// =============================================================================

import React, { useState } from 'react';
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
import { Coordinate, Gardu } from '../../types';
import {
    JENIS_GARDU,
    KAPASITAS_TRAFO,
    PERALATAN_PROTEKSI,
} from '../../utils/plnStandards';
import { formatCoordinate } from '../../utils/geoUtils';

// =============================================================================
// TYPES
// =============================================================================

interface GarduFormProps {
    visible: boolean;
    koordinat: Coordinate;
    onSubmit: (data: Omit<Gardu, 'id' | 'createdAt' | 'updatedAt' | 'isSynced'>) => void;
    onCancel: () => void;
    initialData?: Partial<Gardu>;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function GarduForm({
    visible,
    koordinat,
    onSubmit,
    onCancel,
    initialData,
}: GarduFormProps) {
    const [nomorGardu, setNomorGardu] = useState(initialData?.nomorGardu || '');
    const [namaGardu, setNamaGardu] = useState(initialData?.namaGardu || '');
    const [jenisGardu, setJenisGardu] = useState<'Portal' | 'Cantol' | 'Beton' | 'Ground'>(
        initialData?.jenisGardu || 'Cantol'
    );
    const [kapasitasKVA, setKapasitasKVA] = useState(initialData?.kapasitasKVA || 100);
    const [merekTrafo, setMerekTrafo] = useState(initialData?.merekTrafo || '');
    const [tahunPasang, setTahunPasang] = useState(
        initialData?.tahunPasang?.toString() || new Date().getFullYear().toString()
    );
    const [selectedProteksi, setSelectedProteksi] = useState<string[]>(
        initialData?.peralatanProteksi || ['FCO (Fuse Cut Out)', 'LA (Lightning Arrester)']
    );
    const [catatan, setCatatan] = useState(initialData?.catatan || '');
    const [fotos, setFotos] = useState<string[]>(initialData?.foto || []);

    const handleSubmit = () => {
        if (!nomorGardu.trim()) {
            alert('Nomor gardu harus diisi');
            return;
        }

        onSubmit({
            nomorGardu: nomorGardu.trim(),
            namaGardu: namaGardu.trim() || undefined,
            koordinat,
            jenisGardu,
            kapasitasKVA,
            merekTrafo: merekTrafo.trim() || undefined,
            tahunPasang: tahunPasang ? parseInt(tahunPasang) : undefined,
            peralatanProteksi: selectedProteksi,
            foto: fotos.length > 0 ? fotos : undefined,
            catatan: catatan.trim() || undefined,
        });
    };

    const toggleProteksi = (item: string) => {
        setSelectedProteksi(prev =>
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
                    <Text style={styles.title}>Tambah Gardu</Text>
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

                    {/* Nomor Gardu */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Nomor Gardu *</Text>
                        <TextInput
                            style={styles.textInput}
                            value={nomorGardu}
                            onChangeText={setNomorGardu}
                            placeholder="Contoh: GD-001 atau RSC-01"
                        />
                    </View>

                    {/* Nama Gardu */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Nama Gardu</Text>
                        <TextInput
                            style={styles.textInput}
                            value={namaGardu}
                            onChangeText={setNamaGardu}
                            placeholder="Nama lokasi (opsional)"
                        />
                    </View>

                    {/* Jenis Gardu */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Jenis Gardu</Text>
                        <View style={styles.optionRow}>
                            {Object.values(JENIS_GARDU).map((gardu) => (
                                <TouchableOpacity
                                    key={gardu.kode}
                                    style={[
                                        styles.garduButton,
                                        jenisGardu === gardu.kode && styles.garduButtonActive,
                                    ]}
                                    onPress={() => setJenisGardu(gardu.kode as any)}
                                >
                                    <Text style={styles.garduIcon}>
                                        {gardu.kode === 'Portal' && '🏗️'}
                                        {gardu.kode === 'Cantol' && '🔌'}
                                        {gardu.kode === 'Beton' && '🏢'}
                                        {gardu.kode === 'Ground' && '🏠'}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.garduText,
                                            jenisGardu === gardu.kode && styles.garduTextActive,
                                        ]}
                                    >
                                        {gardu.nama}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Kapasitas Trafo */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Kapasitas Trafo (kVA)</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.optionRow}>
                                {KAPASITAS_TRAFO.map((kva) => (
                                    <TouchableOpacity
                                        key={kva}
                                        style={[
                                            styles.kvaButton,
                                            kapasitasKVA === kva && styles.kvaButtonActive,
                                        ]}
                                        onPress={() => setKapasitasKVA(kva)}
                                    >
                                        <Text
                                            style={[
                                                styles.kvaText,
                                                kapasitasKVA === kva && styles.kvaTextActive,
                                            ]}
                                        >
                                            {kva}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </View>

                    {/* Merek Trafo */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Merek Trafo</Text>
                        <TextInput
                            style={styles.textInput}
                            value={merekTrafo}
                            onChangeText={setMerekTrafo}
                            placeholder="Contoh: Trafindo, Schneider"
                        />
                    </View>

                    {/* Tahun Pasang */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Tahun Pasang</Text>
                        <TextInput
                            style={styles.textInput}
                            value={tahunPasang}
                            onChangeText={setTahunPasang}
                            placeholder="Contoh: 2024"
                            keyboardType="numeric"
                            maxLength={4}
                        />
                    </View>

                    {/* Peralatan Proteksi */}
                    <View style={styles.section}>
                        <Text style={styles.label}>Peralatan Proteksi</Text>
                        <View style={styles.checkboxGrid}>
                            {PERALATAN_PROTEKSI.map((item) => (
                                <TouchableOpacity
                                    key={item}
                                    style={[
                                        styles.checkboxItem,
                                        selectedProteksi.includes(item) && styles.checkboxItemActive,
                                    ]}
                                    onPress={() => toggleProteksi(item)}
                                >
                                    <Text style={styles.checkboxIcon}>
                                        {selectedProteksi.includes(item) ? '☑️' : '⬜'}
                                    </Text>
                                    <Text style={styles.checkboxText}>{item}</Text>
                                </TouchableOpacity>
                            ))}
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
        color: '#FF9800',
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
    garduButton: {
        width: '48%',
        padding: 16,
        borderRadius: 12,
        backgroundColor: 'white',
        borderWidth: 2,
        borderColor: '#e0e0e0',
        alignItems: 'center',
    },
    garduButtonActive: {
        backgroundColor: '#FFF3E0',
        borderColor: '#FF9800',
    },
    garduIcon: {
        fontSize: 28,
        marginBottom: 8,
    },
    garduText: {
        fontSize: 13,
        color: '#333',
        textAlign: 'center',
    },
    garduTextActive: {
        color: '#E65100',
        fontWeight: '600',
    },
    kvaButton: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        marginRight: 8,
    },
    kvaButtonActive: {
        backgroundColor: '#FF9800',
        borderColor: '#FF9800',
    },
    kvaText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    kvaTextActive: {
        color: 'white',
    },
    checkboxGrid: {
        gap: 8,
    },
    checkboxItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: 'white',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    checkboxItemActive: {
        backgroundColor: '#FFF3E0',
        borderColor: '#FF9800',
    },
    checkboxIcon: {
        marginRight: 10,
        fontSize: 16,
    },
    checkboxText: {
        fontSize: 14,
        color: '#333',
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
