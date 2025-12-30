
// =============================================================================
// PLN SURVEY APP - Survey History Screen
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    FlatList,
    Alert,
    RefreshControl,
    SafeAreaView,
    ActivityIndicator,
    TextInput,
    Modal,
    KeyboardAvoidingView,
    ScrollView,
    Platform,
} from 'react-native';
import { Survey } from '../types';
import { surveyService } from '../services/database';
import { supabaseSurveyService, syncManager } from '../services/supabaseService';
import { generateBASurveyPdf } from '../utils/baSurveyPdf';
import SignatureCapture from '../components/Forms/SignatureCapture';
import { Image } from 'react-native';

// =============================================================================
// TYPES
// =============================================================================

interface SurveyHistoryScreenProps {
    visible: boolean;
    onSelectSurvey: (survey: Survey) => void;
    onNewSurvey: () => void;
    onClose: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function SurveyHistoryScreen({
    visible,
    onSelectSurvey,
    onNewSurvey,
    onClose,
}: SurveyHistoryScreenProps) {
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Sync mode states
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);

    // Edit Logic
    const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
    const [editName, setEditName] = useState('');
    const [editLokasi, setEditLokasi] = useState('');
    const [editSurveyor, setEditSurveyor] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // BA Survey Edit States
    const [editIdPelanggan, setEditIdPelanggan] = useState('');
    const [editNamaPelanggan, setEditNamaPelanggan] = useState('');
    const [editTarifDaya, setEditTarifDaya] = useState('');
    const [editHasilSurvey, setEditHasilSurvey] = useState('');
    const [editNamaPerwakilan, setEditNamaPerwakilan] = useState('');
    const [editKeterangan, setEditKeterangan] = useState('');
    const [editChecklist, setEditChecklist] = useState({
        perluasanJTM: false,
        bangunGardu: false,
        perluasanJTR: false,
        tanamTiang: false,
        dikenakanPFK: false,
    });
    const [editAppDipasang, setEditAppDipasang] = useState<'Persil' | 'Gardu'>('Persil');
    const [editKonstruksiOleh, setEditKonstruksiOleh] = useState<'Pelanggan' | 'PLN'>('Pelanggan');
    // Signature states
    const [editSignaturePelanggan, setEditSignaturePelanggan] = useState<string>('');
    const [editSignatureSurveyor, setEditSignatureSurveyor] = useState<string>('');
    const [showSignaturePad, setShowSignaturePad] = useState<'pelanggan' | 'surveyor' | null>(null);

    useEffect(() => {
        if (visible) {
            loadSurveys();
        }
    }, [visible]);

    const loadSurveys = async () => {
        try {
            setLoading(true);
            const localSurveys = await surveyService.getAll();
            setSurveys(localSurveys.sort((a, b) =>
                new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            ));
        } catch (error) {
            console.error('Error loading surveys:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadSurveys();
        setRefreshing(false);
    };

    const handleDeleteSurvey = (survey: Survey) => {
        Alert.alert(
            '🗑️ Hapus Survey',
            `Apakah Anda yakin ingin menghapus survey "${survey.namaSurvey}" ?\n\nSemua data tiang, gardu, dan jalur akan dihapus.`,
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Hapus',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await surveyService.delete(survey.id);
                            setSurveys(prev => prev.filter(s => s.id !== survey.id));
                            Alert.alert('✅ Berhasil', 'Survey berhasil dihapus');
                        } catch (error) {
                            Alert.alert('Error', 'Gagal menghapus survey');
                        }
                    },
                },
            ]
        );
    };

    // Toggle selection mode
    const toggleSelectMode = () => {
        setIsSelectMode(!isSelectMode);
        setSelectedIds([]);
    };

    // Toggle survey selection
    const toggleSelection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        );
    };

    // Select/Deselect all
    const toggleSelectAll = () => {
        if (selectedIds.length === surveys.filter(s => !s.isSynced).length) {
            setSelectedIds([]);
        } else {
            // Select only unsynced surveys
            setSelectedIds(surveys.filter(s => !s.isSynced).map(s => s.id));
        }
    };

    // Sync selected surveys to cloud
    const handleSyncSelected = async () => {
        if (selectedIds.length === 0) {
            Alert.alert('⚠️ Pilih Survey', 'Pilih minimal 1 survey untuk di-sync');
            return;
        }

        // Check if online
        const isOnline = await syncManager.isOnline();
        if (!isOnline) {
            Alert.alert('❌ Offline', 'Tidak ada koneksi internet. Coba lagi nanti.');
            return;
        }

        Alert.alert(
            '☁️ Upload ke Cloud',
            `Upload ${selectedIds.length} survey ke database cloud ? `,
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Upload',
                    onPress: async () => {
                        setIsSyncing(true);
                        let success = 0;
                        let failed = 0;

                        for (const id of selectedIds) {
                            const survey = surveys.find(s => s.id === id);
                            if (survey) {
                                try {
                                    const result = await supabaseSurveyService.upsertSurvey(survey);
                                    if (result) {
                                        success++;
                                        // Mark as synced locally
                                        await surveyService.update(id, { isSynced: true });
                                    } else {
                                        failed++;
                                    }
                                } catch (error) {
                                    console.error('Sync error:', error);
                                    failed++;
                                }
                            }
                        }

                        setIsSyncing(false);
                        setSelectedIds([]);
                        setIsSelectMode(false);
                        await loadSurveys(); // Refresh list

                        if (failed === 0) {
                            Alert.alert('✅ Berhasil', `${success} survey berhasil di - upload ke cloud!`);
                        } else {
                            Alert.alert('⚠️ Selesai', `${success} berhasil, ${failed} gagal`);
                        }
                    },
                },
            ]
        );
    };

    // Edit Logic
    const handleEditPress = (survey: Survey) => {
        setEditingSurvey(survey);
        setEditName(survey.namaSurvey);
        setEditLokasi(survey.lokasi || '');
        setEditSurveyor(survey.surveyor || '');
        // BA fields
        setEditIdPelanggan(survey.idPelanggan || '');
        setEditNamaPelanggan(survey.namaPelanggan || '');
        setEditTarifDaya(survey.tarifDaya || '');
        setEditHasilSurvey(survey.hasilSurvey || '');
        setEditNamaPerwakilan(survey.namaPerwakilan || '');
        setEditKeterangan(survey.keterangan || '');
        setEditChecklist(survey.baChecklist || {
            perluasanJTM: false,
            bangunGardu: false,
            perluasanJTR: false,
            tanamTiang: false,
            dikenakanPFK: false,
        });
        setEditAppDipasang(survey.appDipasang || 'Persil');
        setEditKonstruksiOleh(survey.konstruksiOleh || 'Pelanggan');
        setEditSignaturePelanggan(survey.signaturePelanggan || '');
        setEditSignatureSurveyor(survey.signatureSurveyor || '');
    };

    const handleSaveEdit = async () => {
        if (!editingSurvey) return;
        if (!editName.trim()) {
            Alert.alert('Eits', 'Nama survey tidak boleh kosong');
            return;
        }

        try {
            setIsSaving(true);
            const updates = {
                namaSurvey: editName,
                lokasi: editLokasi,
                surveyor: editSurveyor,
                // BA fields
                idPelanggan: editIdPelanggan,
                namaPelanggan: editNamaPelanggan,
                alamatPelanggan: editLokasi,
                tarifDaya: editTarifDaya,
                hasilSurvey: editHasilSurvey,
                namaPerwakilan: editNamaPerwakilan,
                keterangan: editKeterangan,
                baChecklist: editChecklist,
                appDipasang: editAppDipasang,
                konstruksiOleh: editKonstruksiOleh,
                signaturePelanggan: editSignaturePelanggan,
                signatureSurveyor: editSignatureSurveyor,
            };

            // Update Local & Trigger Cloud Sync
            await surveyService.update(editingSurvey.id, updates);

            // Update State
            setSurveys(prev => prev.map(s =>
                s.id === editingSurvey.id ? { ...s, ...updates } : s
            ));

            setEditingSurvey(null);
            Alert.alert('✅ Berhasil', 'Data survey berhasil diupdate!');
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Gagal mengupdate survey');
        } finally {
            setIsSaving(false);
        }
    };

    const formatDate = (date: Date) => {
        const d = new Date(date);
        return d.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const renderSurveyItem = ({ item }: { item: Survey }) => (
        <TouchableOpacity
            style={[
                styles.surveyCard,
                isSelectMode && selectedIds.includes(item.id) && styles.surveyCardSelected
            ]}
            onPress={() => {
                if (isSelectMode) {
                    toggleSelection(item.id);
                } else {
                    onSelectSurvey(item);
                }
            }}
            onLongPress={() => !isSelectMode && handleDeleteSurvey(item)}
        >
            <View style={styles.surveyHeader}>
                {/* Checkbox in select mode */}
                {isSelectMode && (
                    <TouchableOpacity
                        style={styles.checkbox}
                        onPress={() => toggleSelection(item.id)}
                    >
                        <Text style={styles.checkboxText}>
                            {selectedIds.includes(item.id) ? '☑️' : '⬜'}
                        </Text>
                    </TouchableOpacity>
                )}

                <Text style={[styles.surveyName, isSelectMode && { marginLeft: 8 }]} numberOfLines={1}>
                    {item.namaSurvey}
                </Text>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                    {/* Edit Button */}
                    {!isSelectMode && (
                        <TouchableOpacity
                            onPress={() => handleEditPress(item)}
                            style={styles.editButton}
                        >
                            <Text style={{ fontSize: 16 }}>✏️</Text>
                        </TouchableOpacity>
                    )}

                    <View style={[
                        styles.syncBadge,
                        item.isSynced ? styles.syncedBadge : styles.unsyncedBadge
                    ]}>
                        <Text style={styles.syncBadgeText}>
                            {item.isSynced ? '☁️' : '📱'}
                        </Text>
                    </View>
                </View>
            </View>

            <Text style={styles.surveyType}>{item.jenisSurvey}</Text>

            <View style={styles.surveyStats}>
                <View style={styles.statItem}>
                    <Text style={styles.statIcon}>🔵</Text>
                    <Text style={styles.statText}>{item.tiangList?.length || 0} Tiang</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statIcon}>🟠</Text>
                    <Text style={styles.statText}>{item.garduList?.length || 0} Gardu</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statIcon}>📍</Text>
                    <Text style={styles.statText}>{item.jalurList?.length || 0} Jalur</Text>
                </View>
            </View>

            <View style={styles.surveyFooter}>
                <Text style={styles.surveyDate}>
                    📅 {formatDate(item.updatedAt || item.createdAt)}
                </Text>
                <Text style={styles.surveyLocation} numberOfLines={1}>
                    📍 {item.lokasi || 'Lokasi tidak diset'}
                </Text>
            </View>
        </TouchableOpacity>
    );

    if (!visible) return null;

    const unsyncedCount = surveys.filter(s => !s.isSynced).length;

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={isSelectMode ? toggleSelectMode : onClose}>
                    <Text style={styles.backButton}>
                        {isSelectMode ? '✕ Batal' : '← Kembali'}
                    </Text>
                </TouchableOpacity>
                <Text style={styles.title}>
                    {isSelectMode ? `Pilih Survey(${selectedIds.length})` : 'Riwayat Survey'}
                </Text>
                {isSelectMode ? (
                    <TouchableOpacity onPress={toggleSelectAll}>
                        <Text style={styles.selectAllButton}>
                            {selectedIds.length === unsyncedCount ? 'Batal' : 'Semua'}
                        </Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity onPress={onNewSurvey}>
                        <Text style={styles.newButton}>+ Baru</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Sync Action Bar */}
            {!loading && (
                <View style={styles.syncBar}>
                    {isSelectMode ? (
                        <TouchableOpacity
                            style={[
                                styles.syncButton,
                                selectedIds.length === 0 && styles.syncButtonDisabled
                            ]}
                            onPress={handleSyncSelected}
                            disabled={isSyncing}
                        >
                            {isSyncing ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <>
                                    <Text style={styles.syncButtonIcon}>☁️</Text>
                                    <Text style={styles.syncButtonText}>
                                        Upload {selectedIds.length} Survey
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            {/* Upload Button */}
                            <TouchableOpacity
                                style={[styles.selectModeButton, { flex: 1 }]}
                                onPress={toggleSelectMode}
                            >
                                <Text style={styles.selectModeIcon}>☁️⬇️</Text>
                                <Text style={styles.selectModeText}>
                                    Upload ({unsyncedCount})
                                </Text>
                            </TouchableOpacity>

                            {/* Download Button */}
                            <TouchableOpacity
                                style={[styles.selectModeButton, { flex: 1, backgroundColor: '#E8F5E9' }]}
                                onPress={async () => {
                                    Alert.alert(
                                        '☁️ Download Cloud',
                                        'Ambil semua data survey dari database cloud?',
                                        [
                                            { text: 'Batal', style: 'cancel' },
                                            {
                                                text: 'Download',
                                                onPress: async () => {
                                                    try {
                                                        const isOnline = await syncManager.isOnline();
                                                        if (!isOnline) {
                                                            Alert.alert('❌ Offline', 'Periksa internet anda.');
                                                            return;
                                                        }

                                                        setLoading(true);
                                                        const cloudSurveys = await supabaseSurveyService.fetchAllSurveys();
                                                        if (cloudSurveys.length > 0) {
                                                            await surveyService.importSurveys(cloudSurveys);
                                                            await loadSurveys();
                                                            Alert.alert('✅ Berhasil', `${cloudSurveys.length} survey berhasil diambil.`);
                                                        } else {
                                                            Alert.alert('ℹ️ Info', 'Tidak ada data di cloud.');
                                                            setLoading(false);
                                                        }
                                                    } catch (err) {
                                                        console.error(err);
                                                        Alert.alert('Error', 'Gagal mengambil data.');
                                                        setLoading(false);
                                                    }
                                                }
                                            }
                                        ]
                                    );
                                }}
                            >
                                <Text style={styles.selectModeIcon}>☁️⬇️</Text>
                                <Text style={styles.selectModeText}>
                                    Ambil Data
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}

            {/* Survey List */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Memuat survey...</Text>
                </View>
            ) : surveys.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>📋</Text>
                    <Text style={styles.emptyTitle}>Belum Ada Survey</Text>
                    <Text style={styles.emptyText}>
                        Tekan tombol "+ Baru" untuk membuat survey pertama Anda
                    </Text>
                    <TouchableOpacity style={styles.createButton} onPress={onNewSurvey}>
                        <Text style={styles.createButtonText}>+ Buat Survey Baru</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={surveys}
                    keyExtractor={(item) => item.id}
                    renderItem={renderSurveyItem}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={['#2196F3']}
                        />
                    }
                    ListFooterComponent={
                        <Text style={styles.footerHint}>
                            {isSelectMode
                                ? '☁️ = sudah sync • 📱 = belum sync'
                                : 'Tekan lama untuk menghapus survey'}
                        </Text>
                    }
                />
            )}

            {/* Edit Modal / Popup Dialog */}
            <Modal
                visible={!!editingSurvey}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setEditingSurvey(null)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            <Text style={styles.modalTitle}>✏️ Edit Data Survey</Text>

                            <Text style={styles.label}>Nama Survey</Text>
                            <TextInput
                                style={styles.input}
                                value={editName}
                                onChangeText={setEditName}
                                placeholder="Contoh: Survey Jalan Raya"
                                selectTextOnFocus
                            />

                            <Text style={styles.label}>Lokasi / Alamat</Text>
                            <TextInput
                                style={styles.input}
                                value={editLokasi}
                                onChangeText={setEditLokasi}
                                placeholder="Contoh: Kecamatan X"
                                selectTextOnFocus
                            />

                            {/* Separator BA Survey Data */}
                            <Text style={{ marginTop: 16, marginBottom: 8, fontSize: 14, fontWeight: 'bold', color: '#1565C0' }}>
                                📋 Data BA Survey
                            </Text>

                            <Text style={styles.label}>ID Pelanggan (opsional)</Text>
                            <TextInput
                                style={styles.input}
                                value={editIdPelanggan}
                                onChangeText={setEditIdPelanggan}
                                placeholder="ID PLN jika ada"
                            />

                            <Text style={styles.label}>Nama Pelanggan</Text>
                            <TextInput
                                style={styles.input}
                                value={editNamaPelanggan}
                                onChangeText={setEditNamaPelanggan}
                                placeholder="Contoh: PT. Mekarjaya"
                            />

                            <Text style={styles.label}>Tarif / Daya</Text>
                            <TextInput
                                style={styles.input}
                                value={editTarifDaya}
                                onChangeText={setEditTarifDaya}
                                placeholder="Contoh: R3 / 197kVA"
                            />

                            <Text style={styles.label}>Hasil Survey</Text>
                            <TextInput
                                style={styles.input}
                                value={editHasilSurvey}
                                onChangeText={setEditHasilSurvey}
                                placeholder="Contoh: Survei Perencanaan"
                            />

                            <Text style={styles.label}>Keterangan Sketsa</Text>
                            <TextInput
                                style={[styles.input, { height: 60 }]}
                                value={editKeterangan}
                                onChangeText={setEditKeterangan}
                                placeholder="Contoh: Kebutuhan tiang 2 btg..."
                                multiline
                            />

                            {/* Checklist */}
                            <Text style={{ marginTop: 12, marginBottom: 6, fontSize: 13, fontWeight: '600', color: '#333' }}>Checklist Pekerjaan</Text>
                            {[
                                { key: 'perluasanJTM', label: 'Perluasan JTM' },
                                { key: 'bangunGardu', label: 'Bangun Gardu' },
                                { key: 'perluasanJTR', label: 'Perluasan JTR' },
                                { key: 'tanamTiang', label: 'Tanam Tiang' },
                                { key: 'dikenakanPFK', label: 'Dikenakan PFK' },
                            ].map((item) => (
                                <TouchableOpacity
                                    key={item.key}
                                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}
                                    onPress={() => setEditChecklist(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                                >
                                    <Text style={{ fontSize: 16, marginRight: 8 }}>
                                        {editChecklist[item.key as keyof typeof editChecklist] ? '☑️' : '⬜'}
                                    </Text>
                                    <Text style={{ fontSize: 14, color: '#333' }}>{item.label}</Text>
                                </TouchableOpacity>
                            ))}

                            {/* Pasal 7: APP Dipasang */}
                            <Text style={{ marginTop: 12, marginBottom: 6, fontSize: 13, fontWeight: '600', color: '#333' }}>7. APP Dipasang di</Text>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity
                                    style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: editAppDipasang === 'Persil' ? '#2196F3' : '#f0f0f0', alignItems: 'center' }}
                                    onPress={() => setEditAppDipasang('Persil')}
                                >
                                    <Text style={{ color: editAppDipasang === 'Persil' ? 'white' : '#333', fontWeight: '600' }}>Persil</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: editAppDipasang === 'Gardu' ? '#2196F3' : '#f0f0f0', alignItems: 'center' }}
                                    onPress={() => setEditAppDipasang('Gardu')}
                                >
                                    <Text style={{ color: editAppDipasang === 'Gardu' ? 'white' : '#333', fontWeight: '600' }}>Gardu</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Pasal 8: Konstruksi Oleh */}
                            <Text style={{ marginTop: 12, marginBottom: 6, fontSize: 13, fontWeight: '600', color: '#333' }}>8. Konstruksi Bangunan Gardu Oleh</Text>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity
                                    style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: editKonstruksiOleh === 'Pelanggan' ? '#2196F3' : '#f0f0f0', alignItems: 'center' }}
                                    onPress={() => setEditKonstruksiOleh('Pelanggan')}
                                >
                                    <Text style={{ color: editKonstruksiOleh === 'Pelanggan' ? 'white' : '#333', fontWeight: '600' }}>Pelanggan</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{ flex: 1, padding: 10, borderRadius: 8, backgroundColor: editKonstruksiOleh === 'PLN' ? '#2196F3' : '#f0f0f0', alignItems: 'center' }}
                                    onPress={() => setEditKonstruksiOleh('PLN')}
                                >
                                    <Text style={{ color: editKonstruksiOleh === 'PLN' ? 'white' : '#333', fontWeight: '600' }}>PLN</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Separator Tanda Tangan */}
                            <Text style={{ marginTop: 16, marginBottom: 8, fontSize: 14, fontWeight: 'bold', color: '#1565C0' }}>
                                ✍️ Tanda Tangan
                            </Text>

                            <Text style={styles.label}>Nama Perwakilan Pelanggan</Text>
                            <TextInput
                                style={styles.input}
                                value={editNamaPerwakilan}
                                onChangeText={setEditNamaPerwakilan}
                                placeholder="Yang menandatangani"
                            />
                            {/* Signature Pelanggan */}
                            <TouchableOpacity
                                style={{ marginTop: 8, padding: 12, backgroundColor: editSignaturePelanggan ? '#E8F5E9' : '#f0f0f0', borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: editSignaturePelanggan ? '#4CAF50' : '#ddd', borderStyle: 'dashed' }}
                                onPress={() => setShowSignaturePad('pelanggan')}
                            >
                                {editSignaturePelanggan ? (
                                    <Image source={{ uri: editSignaturePelanggan }} style={{ width: 200, height: 60, resizeMode: 'contain' }} />
                                ) : (
                                    <Text style={{ color: '#666' }}>✍️ Tap untuk tanda tangan Pelanggan</Text>
                                )}
                            </TouchableOpacity>

                            <Text style={[styles.label, { marginTop: 16 }]}>Nama Surveyor PLN</Text>
                            <TextInput
                                style={styles.input}
                                value={editSurveyor}
                                onChangeText={setEditSurveyor}
                                placeholder="Nama Surveyor"
                                selectTextOnFocus
                            />
                            {/* Signature Surveyor */}
                            <TouchableOpacity
                                style={{ marginTop: 8, padding: 12, backgroundColor: editSignatureSurveyor ? '#E3F2FD' : '#f0f0f0', borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: editSignatureSurveyor ? '#2196F3' : '#ddd', borderStyle: 'dashed' }}
                                onPress={() => setShowSignaturePad('surveyor')}
                            >
                                {editSignatureSurveyor ? (
                                    <Image source={{ uri: editSignatureSurveyor }} style={{ width: 200, height: 60, resizeMode: 'contain' }} />
                                ) : (
                                    <Text style={{ color: '#666' }}>✍️ Tap untuk tanda tangan Surveyor</Text>
                                )}
                            </TouchableOpacity>

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.cancelButton]}
                                    onPress={() => setEditingSurvey(null)}
                                >
                                    <Text style={styles.cancelButtonText}>Batal</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.saveButton]}
                                    onPress={handleSaveEdit}
                                    disabled={isSaving}
                                >
                                    <Text style={styles.saveButtonText}>
                                        {isSaving ? 'Menyimpan...' : 'Simpan'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Regenerate PDF BA Button */}
                            {editingSurvey?.namaPelanggan && (
                                <TouchableOpacity
                                    style={[styles.modalButton, { backgroundColor: '#FF9800', marginTop: 12 }]}
                                    onPress={async () => {
                                        if (!editingSurvey) return;
                                        try {
                                            await generateBASurveyPdf({
                                                baData: {
                                                    jenisPermohonan: editingSurvey.jenisSurvey || 'Pasang Baru',
                                                    tarifDaya: editingSurvey.tarifDaya || 'R1 / 1300VA',
                                                    idPelanggan: editingSurvey.idPelanggan || '',
                                                    namaPelanggan: editingSurvey.namaPelanggan || '',
                                                    alamat: editingSurvey.alamatPelanggan || editingSurvey.lokasi || '',
                                                    tanggalSurvey: new Date(editingSurvey.tanggalSurvey),
                                                    hasilSurvey: editingSurvey.hasilSurvey || 'Survei Perencanaan',
                                                    namaSurveyor: editingSurvey.surveyor || '',
                                                    namaPerwakilan: editingSurvey.namaPerwakilan || '',
                                                    keterangan: editingSurvey.keterangan || '',
                                                    appDipasang: editingSurvey.appDipasang || 'Persil',
                                                    konstruksiOleh: editingSurvey.konstruksiOleh || 'Pelanggan',
                                                    checklist: editingSurvey.baChecklist || {
                                                        perluasanJTM: false,
                                                        bangunGardu: false,
                                                        perluasanJTR: false,
                                                        tanamTiang: false,
                                                        dikenakanPFK: false,
                                                    },
                                                    signaturePelanggan: editingSurvey.signaturePelanggan,
                                                    signatureSurveyor: editingSurvey.signatureSurveyor,
                                                }
                                            });
                                            Alert.alert('✅ PDF BA', 'PDF Berita Acara Survey berhasil di-generate!');
                                        } catch (error) {
                                            console.error(error);
                                            Alert.alert('Error', 'Gagal generate PDF BA');
                                        }
                                    }}
                                >
                                    <Text style={styles.saveButtonText}>📄 Regenerate PDF BA</Text>
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Signature Capture Modal */}
            <SignatureCapture
                visible={showSignaturePad !== null}
                title={showSignaturePad === 'pelanggan' ? 'Tanda Tangan Perwakilan Pelanggan' : 'Tanda Tangan Surveyor PLN'}
                onSave={(signature) => {
                    if (showSignaturePad === 'pelanggan') {
                        setEditSignaturePelanggan(signature);
                    } else {
                        setEditSignatureSurveyor(signature);
                    }
                    setShowSignaturePad(null);
                }}
                onCancel={() => setShowSignaturePad(null)}
            />
        </SafeAreaView>
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
        color: '#333',
    },
    backButton: {
        fontSize: 16,
        color: '#2196F3',
    },
    newButton: {
        fontSize: 16,
        color: '#4CAF50',
        fontWeight: '600',
    },
    listContainer: {
        padding: 16,
    },
    surveyCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    surveyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    surveyName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
    },
    syncBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    syncedBadge: {
        backgroundColor: '#E3F2FD',
    },
    unsyncedBadge: {
        backgroundColor: '#FFF3E0',
    },
    syncBadgeText: {
        fontSize: 12,
    },
    surveyType: {
        fontSize: 13,
        color: '#666',
        marginBottom: 12,
    },
    surveyStats: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 12,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statIcon: {
        fontSize: 12,
    },
    statText: {
        fontSize: 13,
        color: '#555',
    },
    surveyFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    surveyDate: {
        fontSize: 12,
        color: '#888',
    },
    surveyLocation: {
        fontSize: 12,
        color: '#888',
        flex: 1,
        textAlign: 'right',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
    },
    createButton: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 8,
    },
    createButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    footerHint: {
        textAlign: 'center',
        fontSize: 12,
        color: '#999',
        paddingVertical: 16,
    },
    // Selection and Sync styles
    surveyCardSelected: {
        borderWidth: 2,
        borderColor: '#2196F3',
        backgroundColor: '#E3F2FD',
    },
    checkbox: {
        marginRight: 4,
    },
    checkboxText: {
        fontSize: 18,
    },
    selectAllButton: {
        fontSize: 16,
        color: '#2196F3',
        fontWeight: '600',
    },
    syncBar: {
        backgroundColor: 'white',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    syncButton: {
        backgroundColor: '#4CAF50',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
    },
    syncButtonDisabled: {
        backgroundColor: '#BDBDBD',
    },
    syncButtonIcon: {
        fontSize: 16,
    },
    syncButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    selectModeButton: {
        backgroundColor: '#E3F2FD',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
    },
    selectModeIcon: {
        fontSize: 16,
    },
    selectModeText: {
        color: '#1976D2',
        fontSize: 14,
        fontWeight: '500',
    },
    // Modal Styles
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#333',
    },
    label: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
        fontWeight: '500',
    },
    input: {
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        color: '#333',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    modalButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#f5f5f5',
    },
    saveButton: {
        backgroundColor: '#2196F3',
    },
    cancelButtonText: {
        color: '#666',
        fontWeight: '600',
    },
    saveButtonText: {
        color: 'white',
        fontWeight: '600',
    },
    editButton: {
        padding: 4,
        marginRight: 4,
    },
});

