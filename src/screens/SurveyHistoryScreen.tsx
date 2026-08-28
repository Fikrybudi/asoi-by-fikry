
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
    StatusBar,
    Switch,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Survey } from '../types';
import {
    JENIS_PERMOHONAN_OPTIONS,
    TARIF_DAYA_OPTIONS,
    HASIL_SURVEY_OPTIONS,
    DEFAULT_BA_CHECKLIST,
    CHECKLIST_ITEMS,
    isPresetTarifDaya,
} from '../constants/surveyOptions';
import { surveyService } from '../services/database';
import { supabaseSurveyService, syncManager } from '../services/supabaseService';
import { generateBASurveyPdf } from '../utils/baSurveyPdf';
import SignatureCapture from '../components/Forms/SignatureCapture';
import ShareSurveyModal from '../components/Forms/ShareSurveyModal';
import { Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// CONSTANTS: imported from '../constants/surveyOptions'

// =============================================================================
// TYPES
// =============================================================================

interface SurveyHistoryScreenProps {
    visible: boolean;
    onSelectSurvey: (survey: Survey) => void;
    onEditSurvey?: (survey: Survey) => void;
    onNewSurvey: () => void;
    onClose: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function SurveyHistoryScreen({
    visible,
    onSelectSurvey,
    onEditSurvey,
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

    // Share Modal State
    const [shareSurveyId, setShareSurveyId] = useState<string | null>(null);
    const [shareSurveyName, setShareSurveyName] = useState<string>('');

    // Search & Sort states
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'tiang-desc'>('newest');

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

                        let lastErrorMsg = '';

                        for (const id of selectedIds) {
                            const survey = surveys.find(s => s.id === id);
                            if (survey) {
                                try {
                                    const result = await supabaseSurveyService.upsertSurvey(survey);
                                    const isOk = typeof result === 'boolean' ? result : result.success;
                                    if (isOk) {
                                        success++;
                                        // Mark as synced locally
                                        await surveyService.update(id, { isSynced: true });
                                    } else {
                                        failed++;
                                        if (typeof result === 'object' && result.error) {
                                            lastErrorMsg = result.error;
                                        }
                                    }
                                } catch (error: any) {
                                    console.error('Sync error:', error);
                                    failed++;
                                    lastErrorMsg = error?.message || String(error);
                                }
                            }
                        }

                        setIsSyncing(false);
                        setSelectedIds([]);
                        setIsSelectMode(false);
                        await loadSurveys(); // Refresh list

                        if (failed === 0) {
                            Alert.alert('✅ Berhasil', `${success} survey berhasil di-upload ke cloud!`);
                        } else {
                            Alert.alert(
                                '⚠️ Upload Gagal',
                                `${success} berhasil, ${failed} gagal.\n\n` + (lastErrorMsg ? `Detail Error: ${lastErrorMsg}` : 'Pastikan Anda telah login ke akun Supabase & memiliki koneksi internet.')
                            );
                        }
                    },
                },
            ]
        );
    };

    // Edit Logic
    const handleEditPress = (survey: Survey) => {
        if (onEditSurvey) {
            onEditSurvey(survey);
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

                    {/* Share Button (Only if Owner and Synced) */}
                    {!isSelectMode && item.isSynced && (
                        <TouchableOpacity
                            onPress={() => {
                                setShareSurveyId(item.id);
                                setShareSurveyName(item.namaSurvey);
                            }}
                            style={[styles.editButton, { backgroundColor: '#E3F2FD' }]}
                        >
                            <Text style={{ fontSize: 16 }}>👥</Text>
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

    const filteredSurveys = surveys.filter(s => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
            (s.namaSurvey && s.namaSurvey.toLowerCase().includes(q)) ||
            (s.lokasi && s.lokasi.toLowerCase().includes(q)) ||
            (s.kecamatan && s.kecamatan.toLowerCase().includes(q)) ||
            (s.kelurahan && s.kelurahan.toLowerCase().includes(q)) ||
            (s.surveyor && s.surveyor.toLowerCase().includes(q)) ||
            (s.jenisSurvey && s.jenisSurvey.toLowerCase().includes(q))
        );
    });

    const sortedSurveys = [...filteredSurveys].sort((a, b) => {
        if (sortBy === 'oldest') {
            return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        }
        if (sortBy === 'name-asc') {
            return (a.namaSurvey || '').localeCompare(b.namaSurvey || '');
        }
        if (sortBy === 'name-desc') {
            return (b.namaSurvey || '').localeCompare(a.namaSurvey || '');
        }
        if (sortBy === 'tiang-desc') {
            return (b.tiangList?.length || 0) - (a.tiangList?.length || 0);
        }
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
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

                {/* Search & Sort Bar */}
                {!loading && surveys.length > 0 && (
                    <View style={styles.searchSortContainer}>
                        {/* Search Input */}
                        <View style={styles.searchBar}>
                            <Ionicons name="search-outline" size={18} color="#666" style={{ marginRight: 8 }} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Cari nama survey, lokasi, surveyor..."
                                placeholderTextColor="#999"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <Ionicons name="close-circle" size={18} color="#999" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Sort Chips */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.sortChipsContainer}
                        >
                            <Text style={styles.sortLabel}>Urutkan:</Text>
                            <TouchableOpacity
                                style={[styles.sortChip, sortBy === 'newest' && styles.sortChipActive]}
                                onPress={() => setSortBy('newest')}
                            >
                                <Text style={[styles.sortChipText, sortBy === 'newest' && styles.sortChipTextActive]}>
                                    📅 Terbaru
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.sortChip, sortBy === 'oldest' && styles.sortChipActive]}
                                onPress={() => setSortBy('oldest')}
                            >
                                <Text style={[styles.sortChipText, sortBy === 'oldest' && styles.sortChipTextActive]}>
                                    ⌛ Terlama
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.sortChip, sortBy === 'name-asc' && styles.sortChipActive]}
                                onPress={() => setSortBy('name-asc')}
                            >
                                <Text style={[styles.sortChipText, sortBy === 'name-asc' && styles.sortChipTextActive]}>
                                    🔤 Nama A-Z
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.sortChip, sortBy === 'name-desc' && styles.sortChipActive]}
                                onPress={() => setSortBy('name-desc')}
                            >
                                <Text style={[styles.sortChipText, sortBy === 'name-desc' && styles.sortChipTextActive]}>
                                    🔠 Nama Z-A
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.sortChip, sortBy === 'tiang-desc' && styles.sortChipActive]}
                                onPress={() => setSortBy('tiang-desc')}
                            >
                                <Text style={[styles.sortChipText, sortBy === 'tiang-desc' && styles.sortChipTextActive]}>
                                    📍 Tiang Terbanyak
                                </Text>
                            </TouchableOpacity>
                        </ScrollView>
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
                ) : sortedSurveys.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>🔍</Text>
                        <Text style={styles.emptyTitle}>Tidak Ditemukan</Text>
                        <Text style={styles.emptyText}>
                            Tidak ada survey yang cocok dengan kata kunci "{searchQuery}"
                        </Text>
                        <TouchableOpacity
                            style={[styles.createButton, { backgroundColor: '#757575', marginTop: 12 }]}
                            onPress={() => setSearchQuery('')}
                        >
                            <Text style={styles.createButtonText}>Reset Pencarian</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={sortedSurveys}
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
                                    : searchQuery
                                        ? `Menampilkan ${sortedSurveys.length} dari ${surveys.length} survey`
                                        : 'Tekan lama untuk menghapus survey'}
                            </Text>
                        }
                    />
                )}

                {/* Share Survey Modal */}
                <ShareSurveyModal
                    visible={!!shareSurveyId}
                    surveyId={shareSurveyId || ''}
                    surveyName={shareSurveyName}
                    onClose={() => setShareSurveyId(null)}
                />
            </SafeAreaView>
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
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
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
    // Picker & Checklist styles (shared with BASurveyForm via constants/surveyOptions.ts)
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        backgroundColor: '#f9f9f9',
        overflow: 'hidden',
        marginBottom: 4,
    },
    picker: {
        height: 50,
        color: '#333',
    },
    checklistContainer: {
        backgroundColor: '#f5f5f5',
        borderRadius: 10,
        padding: 10,
        marginBottom: 8,
    },
    checklistItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    checklistLabel: {
        fontSize: 14,
        color: '#333',
    },
    // Search & Sort Styles
    searchSortContainer: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 38,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#212121',
        paddingVertical: 0,
    },
    sortChipsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 8,
        gap: 6,
    },
    sortLabel: {
        fontSize: 12,
        color: '#666',
        fontWeight: 'bold',
        marginRight: 4,
    },
    sortChip: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 16,
        backgroundColor: '#F0F0F0',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    sortChipActive: {
        backgroundColor: '#1976D2',
        borderColor: '#1565C0',
    },
    sortChipText: {
        fontSize: 12,
        color: '#424242',
        fontWeight: '500',
    },
    sortChipTextActive: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
});

