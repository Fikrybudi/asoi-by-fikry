// =============================================================================
// PLN SURVEY APP - Overlay Manager Component (Light Mobile Theme)
// =============================================================================
// Fitur:
// 1. Cloud GIS On-Demand:
//    - JTM 20 kV per Penyulang (warna-warni per penyulang)
//    - JTR per Gardu (Kabel TR Oren Menyala #FF6600 & Tiang TR Ungu #7C3AED)
//    - Titik Gardu Distribusi & Proteksi/GH per ULP
// 2. Import File Lokal (CSV, KML, KMZ)
// 3. Manajemen Layer Aktif (Visibility, Opacity Slider, Zoom/Focus, Hapus)
// =============================================================================

import React, { useState, useEffect, useMemo } from 'react';
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
import { Picker } from '@react-native-picker/picker';
import { OverlayFile, OverlayDataType } from '../../types/overlayTypes';
import { parseOverlayFile, detectOverlayType } from '../../services/overlayParser';
import { overlayStorage } from '../../services/overlayStorage';
import {
    cloudGisService,
    CloudGisCatalog,
    CloudGardu,
} from '../../services/cloudGisService';

function generateId(): string {
    return 'ovl_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
}

const TYPE_LABELS: Record<OverlayDataType, string> = {
    jtm: '⚡ JTM (Jaringan)',
    jtr: '🔌 JTR (Tegangan Rendah)',
    gardu: '🏠 Gardu Distribusi',
    proteksi: '🛡️ Proteksi & GH',
    custom: '📍 Titik / Jalur',
};

const TYPE_OPTIONS: { value: OverlayDataType; label: string }[] = [
    { value: 'jtm', label: '⚡ JTM 20 kV' },
    { value: 'jtr', label: '🔌 JTR & Tiang TR' },
    { value: 'gardu', label: '🏠 Gardu' },
    { value: 'proteksi', label: '🛡️ Proteksi' },
    { value: 'custom', label: '📍 Custom' },
];

const COLOR_PRESETS = [
    'multi', '#FF6600', '#FF9800', '#F44336', '#E91E63',
    '#9C27B0', '#2196F3', '#4CAF50', '#00BCD4',
];

interface OverlayManagerProps {
    visible: boolean;
    onClose: () => void;
    overlays: OverlayFile[];
    onOverlaysChange: (overlays: OverlayFile[]) => void;
    onFocusOverlay?: (bounds: [[number, number], [number, number]]) => void;
}

export default function OverlayManager({
    visible,
    onClose,
    overlays,
    onOverlaysChange,
    onFocusOverlay,
}: OverlayManagerProps) {
    // Tab Navigation
    const [activeTab, setActiveTab] = useState<'cloud' | 'local'>('cloud');

    // Local Import Flow
    const [importing, setImporting] = useState(false);
    const [importStep, setImportStep] = useState<'idle' | 'confirm'>('idle');
    const [pendingOverlay, setPendingOverlay] = useState<OverlayFile | null>(null);
    const [pendingName, setPendingName] = useState('');
    const [pendingType, setPendingType] = useState<OverlayDataType>('jtr');
    const [pendingColor, setPendingColor] = useState('multi');

    // Cloud GIS Flow
    const [catalog, setCatalog] = useState<CloudGisCatalog | null>(null);
    const [loadingCatalog, setLoadingCatalog] = useState(false);
    const [catalogError, setCatalogError] = useState<string | null>(null);
    const [selectedUlp, setSelectedUlp] = useState<string>('ALL');
    const [selectedPenyulangId, setSelectedPenyulangId] = useState<string>('');
    const [garduSearch, setGarduSearch] = useState<string>('');
    const [loadingAction, setLoadingAction] = useState<string | null>(null);

    // Auto-load catalog on modal open
    useEffect(() => {
        if (visible && !catalog && !loadingCatalog) {
            loadCatalog();
        }
    }, [visible]);

    const loadCatalog = async (forceRefresh = false) => {
        setLoadingCatalog(true);
        setCatalogError(null);
        try {
            const data = await cloudGisService.getCatalog(forceRefresh);
            setCatalog(data);
            if (data.penyulang.length > 0 && !selectedPenyulangId) {
                setSelectedPenyulangId(data.penyulang[0].id);
            }
        } catch (err: any) {
            setCatalogError(err.message || 'Gagal memuat katalog dari Cloud');
        } finally {
            setLoadingCatalog(false);
        }
    };

    // Filtered Penyulang list based on ULP
    const filteredPenyulang = useMemo(() => {
        if (!catalog) return [];
        if (selectedUlp === 'ALL') return catalog.penyulang;
        return catalog.penyulang.filter((p) => p.ulp.toUpperCase() === selectedUlp.toUpperCase());
    }, [catalog, selectedUlp]);

    // Keep selected penyulang valid
    useEffect(() => {
        if (filteredPenyulang.length > 0) {
            const exists = filteredPenyulang.some((p) => p.id === selectedPenyulangId);
            if (!exists) {
                setSelectedPenyulangId(filteredPenyulang[0].id);
            }
        } else {
            setSelectedPenyulangId('');
        }
    }, [filteredPenyulang, selectedPenyulangId]);

    // Filtered Gardu list for search
    const filteredGardu = useMemo(() => {
        if (!catalog) return [];
        let list = catalog.gardu;
        if (selectedUlp !== 'ALL') {
            list = list.filter((g) => g.ulp.toUpperCase() === selectedUlp.toUpperCase());
        }
        const q = garduSearch.trim().toLowerCase();
        if (!q) {
            return list.slice(0, 10);
        }
        return list
            .filter(
                (g) =>
                    g.id.toLowerCase().includes(q) ||
                    g.nama.toLowerCase().includes(q) ||
                    g.penyulang.toLowerCase().includes(q)
            )
            .slice(0, 25);
    }, [catalog, selectedUlp, garduSearch]);

    // ── Cloud GIS Actions ────────────────────────────────────────────────

    const handleLoadJtm = async () => {
        if (!catalog || !selectedPenyulangId) return;
        const pObj = catalog.penyulang.find((x) => x.id === selectedPenyulangId);
        if (!pObj) return;

        setLoadingAction(`jtm-${pObj.id}`);
        try {
            const overlay = await cloudGisService.fetchJtm(pObj.file, pObj.nama);

            const existsIdx = overlays.findIndex((o) => o.id === overlay.id);
            let updated: OverlayFile[];
            if (existsIdx >= 0) {
                updated = [...overlays];
                updated[existsIdx] = overlay;
            } else {
                updated = [...overlays, overlay];
            }

            onOverlaysChange(updated);
            await overlayStorage.saveOverlay(overlay);

            const bounds = cloudGisService.calculateBounds(overlay);
            if (bounds && onFocusOverlay) {
                onFocusOverlay(bounds);
            }

            Alert.alert('✅ JTM Dimuat', `${overlay.name} (${overlay.data.polylines.length} segmen) berhasil ditampilkan di peta.`);
        } catch (err: any) {
            Alert.alert('Gagal Memuat JTM', err.message);
        } finally {
            setLoadingAction(null);
        }
    };

    const handleLoadJtr = async (gardu: CloudGardu) => {
        setLoadingAction(`jtr-${gardu.id}`);
        try {
            const overlay = await cloudGisService.fetchJtr(gardu.id, gardu.nama);

            const existsIdx = overlays.findIndex((o) => o.id === overlay.id);
            let updated: OverlayFile[];
            if (existsIdx >= 0) {
                updated = [...overlays];
                updated[existsIdx] = overlay;
            } else {
                updated = [...overlays, overlay];
            }

            onOverlaysChange(updated);
            await overlayStorage.saveOverlay(overlay);

            const bounds = cloudGisService.calculateBounds(overlay);
            if (bounds && onFocusOverlay) {
                onFocusOverlay(bounds);
            }

            Alert.alert(
                '✅ JTR Dimuat',
                `JTR Gardu ${gardu.id} berhasil dimuat!\n${overlay.data.polylines.length} segmen kabel (Oren), ${overlay.data.points.length} tiang TR (Ungu).`
            );
        } catch (err: any) {
            Alert.alert('Gagal Memuat JTR', err.message);
        } finally {
            setLoadingAction(null);
        }
    };

    const handleLoadGarduUlp = async (ulp: string) => {
        const targetUlp = ulp === 'ALL' ? 'LABUAN' : ulp;
        setLoadingAction(`gardu-${targetUlp}`);
        try {
            const overlay = await cloudGisService.fetchGardu(targetUlp);

            const existsIdx = overlays.findIndex((o) => o.id === overlay.id);
            let updated: OverlayFile[];
            if (existsIdx >= 0) {
                updated = [...overlays];
                updated[existsIdx] = overlay;
            } else {
                updated = [...overlays, overlay];
            }

            onOverlaysChange(updated);
            await overlayStorage.saveOverlay(overlay);

            const bounds = cloudGisService.calculateBounds(overlay);
            if (bounds && onFocusOverlay) {
                onFocusOverlay(bounds);
            }

            Alert.alert('✅ Titik Gardu Dimuat', `${overlay.name} (${overlay.data.points.length} gardu) berhasil ditampilkan di peta.`);
        } catch (err: any) {
            Alert.alert('Gagal Memuat Gardu', err.message);
        } finally {
            setLoadingAction(null);
        }
    };

    const handleLoadProteksiUlp = async (ulp: string) => {
        const targetUlp = ulp === 'ALL' ? 'LABUAN' : ulp;
        setLoadingAction(`pro-${targetUlp}`);
        try {
            const overlay = await cloudGisService.fetchProteksi(targetUlp);

            const existsIdx = overlays.findIndex((o) => o.id === overlay.id);
            let updated: OverlayFile[];
            if (existsIdx >= 0) {
                updated = [...overlays];
                updated[existsIdx] = overlay;
            } else {
                updated = [...overlays, overlay];
            }

            onOverlaysChange(updated);
            await overlayStorage.saveOverlay(overlay);

            const bounds = cloudGisService.calculateBounds(overlay);
            if (bounds && onFocusOverlay) {
                onFocusOverlay(bounds);
            }

            Alert.alert('✅ Proteksi Dimuat', `${overlay.name} (${overlay.data.points.length} titik proteksi) berhasil ditampilkan.`);
        } catch (err: any) {
            Alert.alert('Gagal Memuat Proteksi', err.message);
        } finally {
            setLoadingAction(null);
        }
    };

    const handleFocusOverlayAction = (ol: OverlayFile) => {
        const bounds = cloudGisService.calculateBounds(ol);
        if (bounds && onFocusOverlay) {
            onFocusOverlay(bounds);
            onClose();
        } else {
            Alert.alert('Info', 'Tidak dapat menghitung batas layer untuk zooming.');
        }
    };

    // ── Local File Import Flow ───────────────────────────────────────────

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
                    '*/*',
                ],
                copyToCacheDirectory: true,
            });

            if (result.canceled || !result.assets || result.assets.length === 0) return;

            const asset = result.assets[0];
            const fileName = asset.name || 'unknown.csv';
            const ext = fileName.split('.').pop()?.toLowerCase() || '';

            if (!['csv', 'kml', 'kmz', 'txt'].includes(ext)) {
                Alert.alert('Format Tidak Didukung', `File .${ext} tidak didukung.\nGunakan file .csv, .kml, atau .kmz`);
                return;
            }

            setImporting(true);
            const geoData = await parseOverlayFile(asset.uri, fileName);
            const detectedType = detectOverlayType(geoData);

            const totalFeatures = geoData.points.length + geoData.polylines.length;
            if (totalFeatures === 0) {
                Alert.alert('Data Kosong', 'Tidak ditemukan data geografis di file ini.');
                setImporting(false);
                return;
            }

            const overlay: OverlayFile = {
                id: generateId(),
                name: fileName.replace(/\.[^.]+$/, ''),
                type: detectedType,
                visible: true,
                opacity: 0.85,
                color: detectedType === 'jtr' ? '#FF6600' : undefined,
                data: geoData,
                importedAt: new Date().toISOString(),
            };

            setPendingOverlay(overlay);
            setPendingName(overlay.name);
            setPendingType(detectedType);
            setPendingColor(detectedType === 'jtr' ? '#FF6600' : 'multi');
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
            color: (pendingType === 'jtm' || pendingType === 'jtr')
                ? (pendingColor === 'multi' ? (pendingType === 'jtr' ? '#FF6600' : undefined) : pendingColor)
                : undefined,
        };

        const updated = [...overlays, finalOverlay];
        onOverlaysChange(updated);
        await overlayStorage.saveOverlay(finalOverlay);

        const bounds = cloudGisService.calculateBounds(finalOverlay);
        if (bounds && onFocusOverlay) {
            onFocusOverlay(bounds);
        }

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

    // ── Layer Management ─────────────────────────────────────────────────

    const toggleVisibility = async (id: string) => {
        const updated = overlays.map(o => (o.id === id ? { ...o, visible: !o.visible } : o));
        onOverlaysChange(updated);
        const overlay = updated.find(o => o.id === id);
        if (overlay) await overlayStorage.updateVisibility(id, overlay.visible);
    };

    const updateOpacity = async (id: string, opacity: number) => {
        const updated = overlays.map(o => (o.id === id ? { ...o, opacity } : o));
        onOverlaysChange(updated);
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

    const handleClearAll = () => {
        Alert.alert(
            'Bersihkan Semua Layer',
            `Yakin ingin menghapus semua ${overlays.length} layer data eksisting dari peta?`,
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Hapus Semua',
                    style: 'destructive',
                    onPress: async () => {
                        onOverlaysChange([]);
                        await overlayStorage.clearAllOverlays();
                    },
                },
            ]
        );
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header Modal */}
                    <View style={styles.header}>
                        <View style={styles.headerTitleRow}>
                            <View style={styles.headerIconBadge}>
                                <Ionicons name="globe-outline" size={20} color="white" />
                            </View>
                            <View>
                                <Text style={styles.title}>Data Jaringan Eksisting</Text>
                                <Text style={styles.subtitle}>Peta JTM & JTR On-Demand Cloud GIS</Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="close" size={22} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    {/* Segmented Tab Controls */}
                    <View style={styles.tabBarContainer}>
                        <View style={styles.tabBar}>
                            <TouchableOpacity
                                style={[styles.tabButton, activeTab === 'cloud' && styles.tabButtonActive]}
                                onPress={() => setActiveTab('cloud')}
                                activeOpacity={0.8}
                            >
                                <Ionicons
                                    name="cloud-download-outline"
                                    size={16}
                                    color={activeTab === 'cloud' ? '#1565C0' : '#64748B'}
                                />
                                <Text style={[styles.tabText, activeTab === 'cloud' && styles.tabTextActive]}>
                                    Cloud GIS
                                </Text>
                                <View style={[styles.badgeAuto, activeTab === 'cloud' && styles.badgeAutoActive]}>
                                    <Text style={[styles.badgeAutoText, activeTab === 'cloud' && styles.badgeAutoTextActive]}>
                                        AUTO
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.tabButton, activeTab === 'local' && styles.tabButtonActive]}
                                onPress={() => setActiveTab('local')}
                                activeOpacity={0.8}
                            >
                                <Ionicons
                                    name="document-attach-outline"
                                    size={16}
                                    color={activeTab === 'local' ? '#1565C0' : '#64748B'}
                                />
                                <Text style={[styles.tabText, activeTab === 'local' && styles.tabTextActive]}>
                                    File Lokal
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Body Scroll */}
                    <ScrollView
                        style={styles.content}
                        showsVerticalScrollIndicator={true}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* ========================================================= */}
                        {/* TAB 1: CLOUD GIS */}
                        {/* ========================================================= */}
                        {activeTab === 'cloud' && (
                            <View>
                                {/* Server status */}
                                <View style={styles.serverStatusCard}>
                                    <View style={styles.statusIndicatorRow}>
                                        <View style={[styles.statusDot, catalog ? styles.dotGreen : styles.dotOrange]} />
                                        <Text style={styles.serverStatusText} numberOfLines={1}>
                                            {loadingCatalog ? (
                                                'Menghubungkan ke Cloud Server...'
                                            ) : catalog ? (
                                                `Online: ${catalog.gardu.length.toLocaleString()} Gardu · ${catalog.penyulang.length} Penyulang`
                                            ) : (
                                                'Gagal terhubung ke Cloud GIS'
                                            )}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.refreshButton}
                                        onPress={() => loadCatalog(true)}
                                        disabled={loadingCatalog}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        {loadingCatalog ? (
                                            <ActivityIndicator size="small" color="#1565C0" />
                                        ) : (
                                            <Ionicons name="reload-outline" size={15} color="#1565C0" />
                                        )}
                                    </TouchableOpacity>
                                </View>

                                {catalogError && (
                                    <View style={styles.errorBox}>
                                        <Ionicons name="alert-circle" size={16} color="#DC2626" />
                                        <Text style={styles.errorText}>{catalogError}</Text>
                                    </View>
                                )}

                                {/* ULP Filter Pills */}
                                {catalog && (
                                    <View style={styles.filterSection}>
                                        <Text style={styles.filterLabel}>WILAYAH KERJA ULP:</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ulpScroll}>
                                            <TouchableOpacity
                                                style={[styles.ulpPill, selectedUlp === 'ALL' && styles.ulpPillActive]}
                                                onPress={() => setSelectedUlp('ALL')}
                                            >
                                                <Text style={[styles.ulpPillText, selectedUlp === 'ALL' && styles.ulpPillTextActive]}>
                                                    Semua ({catalog.gardu.length})
                                                </Text>
                                            </TouchableOpacity>
                                            {catalog.ulp.map((u) => {
                                                const count = catalog.gardu.filter((g) => g.ulp.toUpperCase() === u.toUpperCase()).length;
                                                const isSel = selectedUlp.toUpperCase() === u.toUpperCase();
                                                return (
                                                    <TouchableOpacity
                                                        key={u}
                                                        style={[styles.ulpPill, isSel && styles.ulpPillActive]}
                                                        onPress={() => setSelectedUlp(u)}
                                                    >
                                                        <Text style={[styles.ulpPillText, isSel && styles.ulpPillTextActive]}>
                                                            {u} ({count})
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </ScrollView>
                                    </View>
                                )}

                                {/* CARD 1: JTM 20 kV */}
                                {catalog && (
                                    <View style={styles.cardBox}>
                                        <View style={styles.cardHeaderRow}>
                                            <View style={styles.cardTitleWithIcon}>
                                                <Ionicons name="flash" size={16} color="#1565C0" />
                                                <Text style={styles.cardTitle}>JTM 20 kV (Penyulang)</Text>
                                            </View>
                                            <Text style={styles.cardBadgeCount}>{filteredPenyulang.length} penyulang</Text>
                                        </View>

                                        <View style={styles.pickerWrapper}>
                                            <Picker
                                                selectedValue={selectedPenyulangId}
                                                onValueChange={(itemValue) => setSelectedPenyulangId(itemValue)}
                                                style={styles.picker}
                                                dropdownIconColor="#1565C0"
                                            >
                                                {filteredPenyulang.map((p) => {
                                                    const isLoaded = overlays.some((o) => o.id === `cloud_jtm_${p.file.replace('.geojson', '').toLowerCase().replace(/[^a-z0-9]/g, '_')}`);
                                                    return (
                                                        <Picker.Item
                                                            key={p.id}
                                                            label={`${p.nama} (${p.ulp})${isLoaded ? ' ✓ [Aktif]' : ''}`}
                                                            value={p.id}
                                                            color="#1E293B"
                                                        />
                                                    );
                                                })}
                                            </Picker>
                                        </View>

                                        <TouchableOpacity
                                            style={styles.actionBtnPrimary}
                                            onPress={handleLoadJtm}
                                            disabled={!selectedPenyulangId || loadingAction?.startsWith('jtm-')}
                                            activeOpacity={0.8}
                                        >
                                            {loadingAction?.startsWith('jtm-') ? (
                                                <ActivityIndicator size="small" color="white" />
                                            ) : (
                                                <Ionicons name="map-outline" size={16} color="white" />
                                            )}
                                            <Text style={styles.actionBtnText}>
                                                {loadingAction?.startsWith('jtm-') ? 'Memuat JTM...' : 'Tampilkan JTM di Peta'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {/* CARD 2: JTR PER GARDU */}
                                {catalog && (
                                    <View style={[styles.cardBox, styles.cardBoxJtr]}>
                                        <View style={styles.cardHeaderRow}>
                                            <View style={styles.cardTitleWithIcon}>
                                                <Ionicons name="git-network" size={16} color="#EA580C" />
                                                <Text style={[styles.cardTitle, { color: '#C2410C' }]}>
                                                    JTR & Tiang TR (Per Gardu)
                                                </Text>
                                            </View>
                                            <View style={styles.colorPillOrange}>
                                                <Text style={styles.colorPillText}>Oren & Ungu</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.cardDescText}>
                                            Muat jalur kabel TR (Oren) & posisi tiang TR (Ungu) sesuai gardu distribusi.
                                        </Text>

                                        {/* Search Input */}
                                        <View style={styles.searchBar}>
                                            <Ionicons name="search" size={16} color="#64748B" style={styles.searchIcon} />
                                            <TextInput
                                                style={styles.searchInput}
                                                placeholder="Ketik kode/nama gardu (cth: TGP240, AAP, TELUK)..."
                                                placeholderTextColor="#94A3B8"
                                                value={garduSearch}
                                                onChangeText={setGarduSearch}
                                            />
                                            {garduSearch.length > 0 && (
                                                <TouchableOpacity onPress={() => setGarduSearch('')} style={styles.clearSearchBtn}>
                                                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
                                                </TouchableOpacity>
                                            )}
                                        </View>

                                        {/* Gardu Results (Smooth Non-Conflicting List) */}
                                        <View style={styles.garduListContainer}>
                                            {filteredGardu.length === 0 ? (
                                                <Text style={styles.garduEmptyText}>Tidak ditemukan gardu "{garduSearch}"</Text>
                                            ) : (
                                                filteredGardu.map((g) => {
                                                    const isLoaded = overlays.some((o) => o.id === `cloud_jtr_${g.id.toLowerCase().replace(/[^a-z0-9]/g, '_')}`);
                                                    const isLoading = loadingAction === `jtr-${g.id}`;
                                                    return (
                                                        <View
                                                            key={g.id}
                                                            style={[styles.garduRow, isLoaded && styles.garduRowActive]}
                                                        >
                                                            <View style={styles.garduRowInfo}>
                                                                <View style={styles.garduHeaderLine}>
                                                                    <Text style={styles.garduIdText}>{g.id}</Text>
                                                                    <View style={[styles.badgeJtr, g.ada_jtr ? styles.badgeJtrGreen : styles.badgeJtrGray]}>
                                                                        <Text style={[styles.badgeJtrText, g.ada_jtr ? styles.textGreen : styles.textGray]}>
                                                                            {g.ada_jtr ? 'Ada JTR' : 'Belum Ada'}
                                                                        </Text>
                                                                    </View>
                                                                    <Text style={styles.garduFeederText}>{g.penyulang}</Text>
                                                                </View>
                                                                <Text style={styles.garduNameText} numberOfLines={1}>
                                                                    {g.nama}
                                                                </Text>
                                                            </View>

                                                            <TouchableOpacity
                                                                style={[
                                                                    styles.loadJtrBtn,
                                                                    isLoaded ? styles.loadJtrBtnActive : !g.ada_jtr ? styles.loadJtrBtnDisabled : styles.loadJtrBtnReady,
                                                                ]}
                                                                disabled={!g.ada_jtr || isLoading}
                                                                onPress={() => handleLoadJtr(g)}
                                                                activeOpacity={0.8}
                                                            >
                                                                {isLoading ? (
                                                                    <ActivityIndicator size="small" color="white" />
                                                                ) : (
                                                                    <>
                                                                        <Ionicons
                                                                            name={isLoaded ? 'checkmark-circle' : 'flash'}
                                                                            size={13}
                                                                            color="white"
                                                                        />
                                                                        <Text style={styles.loadJtrBtnText}>
                                                                            {isLoaded ? 'Aktif' : 'Muat JTR'}
                                                                        </Text>
                                                                    </>
                                                                )}
                                                            </TouchableOpacity>
                                                        </View>
                                                    );
                                                })
                                            )}
                                        </View>
                                    </View>
                                )}

                                {/* CARD 3: TITIK GARDU & PROTEKSI ULP */}
                                {catalog && (
                                    <View style={styles.bulkRow}>
                                        <TouchableOpacity
                                            style={styles.bulkButton}
                                            disabled={loadingAction?.startsWith('gardu-')}
                                            onPress={() => handleLoadGarduUlp(selectedUlp === 'ALL' ? 'LABUAN' : selectedUlp)}
                                            activeOpacity={0.7}
                                        >
                                            {loadingAction?.startsWith('gardu-') ? (
                                                <ActivityIndicator size="small" color="#1565C0" />
                                            ) : (
                                                <Ionicons name="location-outline" size={16} color="#1565C0" />
                                            )}
                                            <Text style={styles.bulkButtonText}>
                                                Titik Gardu ({selectedUlp === 'ALL' ? 'LABUAN' : selectedUlp})
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.bulkButton}
                                            disabled={loadingAction?.startsWith('pro-')}
                                            onPress={() => handleLoadProteksiUlp(selectedUlp)}
                                            activeOpacity={0.7}
                                        >
                                            {loadingAction?.startsWith('pro-') ? (
                                                <ActivityIndicator size="small" color="#E11D48" />
                                            ) : (
                                                <Ionicons name="shield-outline" size={16} color="#E11D48" />
                                            )}
                                            <Text style={[styles.bulkButtonText, { color: '#BE123C' }]}>
                                                Proteksi & GH (LABUAN)
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* ========================================================= */}
                        {/* TAB 2: LOCAL FILE IMPORT */}
                        {/* ========================================================= */}
                        {activeTab === 'local' && (
                            <View>
                                <TouchableOpacity
                                    style={styles.importButton}
                                    onPress={handleImport}
                                    disabled={importing}
                                    activeOpacity={0.8}
                                >
                                    {importing ? (
                                        <ActivityIndicator color="white" size="small" />
                                    ) : (
                                        <Ionicons name="cloud-upload-outline" size={20} color="white" />
                                    )}
                                    <Text style={styles.importButtonText}>
                                        {importing ? 'Memproses File...' : 'Pilih File (CSV / KML / KMZ)'}
                                    </Text>
                                </TouchableOpacity>

                                {/* Import Confirmation */}
                                {importStep === 'confirm' && pendingOverlay && (
                                    <View style={styles.confirmBox}>
                                        <Text style={styles.confirmTitle}>Konfirmasi Import File</Text>

                                        {/* Preview */}
                                        <View style={styles.previewBox}>
                                            <Text style={styles.previewText}>
                                                📊 Ditemukan: {pendingOverlay.data.points.length} titik, {pendingOverlay.data.polylines.length} jalur
                                            </Text>
                                            <Text style={styles.previewText}>
                                                🔍 Tipe terdeteksi: {TYPE_LABELS[pendingType]}
                                            </Text>
                                        </View>

                                        {/* Layer Name */}
                                        <Text style={styles.inputLabel}>Nama Layer</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={pendingName}
                                            onChangeText={setPendingName}
                                            placeholder="Nama layer"
                                            placeholderTextColor="#94A3B8"
                                        />

                                        {/* Type Selector */}
                                        <Text style={styles.inputLabel}>Tipe Data</Text>
                                        <View style={styles.typeOptions}>
                                            {TYPE_OPTIONS.map((opt) => (
                                                <TouchableOpacity
                                                    key={opt.value}
                                                    style={[
                                                        styles.typeBtn,
                                                        pendingType === opt.value && styles.typeBtnActive,
                                                    ]}
                                                    onPress={() => setPendingType(opt.value)}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.typeBtnText,
                                                            pendingType === opt.value && styles.typeBtnTextActive,
                                                        ]}
                                                    >
                                                        {opt.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>

                                        {/* Color Selector */}
                                        {(pendingType === 'jtm' || pendingType === 'jtr') && (
                                            <View style={styles.colorSection}>
                                                <Text style={styles.inputLabel}>Warna Garis</Text>
                                                <View style={styles.colorPresets}>
                                                    {COLOR_PRESETS.map((c) => (
                                                        <TouchableOpacity
                                                            key={c}
                                                            style={[
                                                                styles.colorDot,
                                                                c !== 'multi' && { backgroundColor: c },
                                                                pendingColor === c && styles.colorDotActive,
                                                            ]}
                                                            onPress={() => setPendingColor(c)}
                                                        >
                                                            {c === 'multi' && <Text style={{ fontSize: 13 }}>🌈</Text>}
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>
                                            </View>
                                        )}

                                        {/* Action Buttons */}
                                        <View style={styles.confirmActions}>
                                            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelImport}>
                                                <Text style={styles.cancelBtnText}>Batal</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmImport}>
                                                <Ionicons name="checkmark" size={16} color="white" />
                                                <Text style={styles.confirmBtnText}>Simpan & Tampilkan</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* ========================================================= */}
                        {/* UNIFIED ACTIVE OVERLAY LIST */}
                        {/* ========================================================= */}
                        <View style={styles.activeSectionHeader}>
                            <Text style={styles.sectionTitle}>
                                LAYER AKTIF ({overlays.length})
                            </Text>
                            {overlays.length > 0 && (
                                <TouchableOpacity onPress={handleClearAll} style={styles.clearAllBtn}>
                                    <Ionicons name="trash-outline" size={13} color="#DC2626" />
                                    <Text style={styles.clearAllText}>Hapus Semua</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {overlays.map((ol) => {
                            const isJtr = ol.type === 'jtr';
                            return (
                                <View key={ol.id} style={[styles.overlayItem, isJtr && styles.overlayItemJtr]}>
                                    <View style={styles.overlayHeader}>
                                        <View style={styles.overlayInfo}>
                                            <View style={styles.overlayTitleRow}>
                                                <View
                                                    style={[
                                                        styles.layerColorIndicator,
                                                        { backgroundColor: ol.color || (isJtr ? '#FF6600' : '#1565C0') },
                                                    ]}
                                                />
                                                <Text style={styles.overlayName} numberOfLines={1}>
                                                    {ol.name}
                                                </Text>
                                            </View>
                                            <Text style={styles.overlayMeta}>
                                                {TYPE_LABELS[ol.type]} • {ol.data?.points?.length || 0} titik, {ol.data?.polylines?.length || 0} jalur
                                            </Text>
                                        </View>

                                        <View style={styles.overlayActions}>
                                            {/* Zoom / Focus */}
                                            {onFocusOverlay && (
                                                <TouchableOpacity
                                                    style={styles.actionIconBtn}
                                                    onPress={() => handleFocusOverlayAction(ol)}
                                                >
                                                    <Ionicons name="locate-outline" size={18} color="#1565C0" />
                                                </TouchableOpacity>
                                            )}

                                            {/* Toggle Visibility */}
                                            <TouchableOpacity
                                                style={styles.actionIconBtn}
                                                onPress={() => toggleVisibility(ol.id)}
                                            >
                                                <Ionicons
                                                    name={ol.visible ? 'eye' : 'eye-off'}
                                                    size={18}
                                                    color={ol.visible ? '#1565C0' : '#94A3B8'}
                                                />
                                            </TouchableOpacity>

                                            {/* Delete */}
                                            <TouchableOpacity
                                                style={styles.actionIconBtn}
                                                onPress={() => handleDelete(ol.id, ol.name)}
                                            >
                                                <Ionicons name="trash-outline" size={18} color="#DC2626" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {/* Opacity Slider */}
                                    {ol.visible && (
                                        <View style={styles.opacityRow}>
                                            <Text style={styles.opacityLabel}>Transparansi</Text>
                                            <View style={styles.sliderContainer}>
                                                <Slider
                                                    style={styles.slider}
                                                    minimumValue={0.1}
                                                    maximumValue={1.0}
                                                    step={0.05}
                                                    value={ol.opacity}
                                                    minimumTrackTintColor="#1565C0"
                                                    maximumTrackTintColor="#CBD5E1"
                                                    thumbTintColor="#1565C0"
                                                    onValueChange={(val: number) => updateOpacity(ol.id, val)}
                                                    onSlidingComplete={(val: number) => saveOpacity(ol.id, val)}
                                                />
                                            </View>
                                            <Text style={styles.opacityValue}>{Math.round(ol.opacity * 100)}%</Text>
                                        </View>
                                    )}
                                </View>
                            );
                        })}

                        {overlays.length === 0 && (
                            <View style={styles.emptyState}>
                                <Ionicons name="layers-outline" size={38} color="#CBD5E1" />
                                <Text style={styles.emptyText}>Belum ada layer data eksisting yang aktif.</Text>
                                <Text style={styles.emptySubtext}>
                                    Pilih penyulang/gardu di tab Cloud GIS atau import file lokal untuk menampilkan jaringan di peta.
                                </Text>
                            </View>
                        )}

                        <View style={{ height: 20 }} />
                    </ScrollView>

                    {/* Footer Close Button */}
                    <TouchableOpacity style={styles.footerBtn} onPress={onClose} activeOpacity={0.8}>
                        <Text style={styles.footerBtnText}>Tutup</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

// =============================================================================
// STYLES (Clean PLN Light Theme)
// =============================================================================

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
    },
    container: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        width: '92%',
        maxHeight: '88%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        backgroundColor: '#FFFFFF',
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerIconBadge: {
        width: 36,
        height: 36,
        borderRadius: 9,
        backgroundColor: '#1565C0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    subtitle: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 1,
    },
    closeBtn: {
        padding: 4,
    },

    // Segmented Tabs
    tabBarContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
        backgroundColor: '#FFFFFF',
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 10,
        padding: 3,
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
        borderRadius: 8,
    },
    tabButtonActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },
    tabTextActive: {
        color: '#1565C0',
        fontWeight: 'bold',
    },
    badgeAuto: {
        backgroundColor: '#E2E8F0',
        paddingHorizontal: 5,
        paddingVertical: 1.5,
        borderRadius: 4,
    },
    badgeAutoActive: {
        backgroundColor: '#EA580C',
    },
    badgeAutoText: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#64748B',
    },
    badgeAutoTextActive: {
        color: '#FFFFFF',
    },

    content: {
        paddingHorizontal: 16,
        paddingTop: 6,
    },

    // Server Status Card
    serverStatusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F0F9FF',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderWidth: 1,
        borderColor: '#BAE6FD',
        marginBottom: 10,
    },
    statusIndicatorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    dotGreen: {
        backgroundColor: '#10B981',
    },
    dotOrange: {
        backgroundColor: '#EA580C',
    },
    serverStatusText: {
        fontSize: 12,
        color: '#0369A1',
        fontWeight: '600',
        flex: 1,
    },
    refreshButton: {
        padding: 5,
        backgroundColor: '#E0F2FE',
        borderRadius: 6,
    },

    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FCA5A5',
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
    },
    errorText: {
        fontSize: 12,
        color: '#DC2626',
        flex: 1,
    },

    // ULP Filter
    filterSection: {
        marginBottom: 12,
    },
    filterLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
        marginBottom: 6,
        letterSpacing: 0.3,
    },
    ulpScroll: {
        flexDirection: 'row',
    },
    ulpPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginRight: 6,
    },
    ulpPillActive: {
        backgroundColor: '#1565C0',
        borderColor: '#1565C0',
    },
    ulpPillText: {
        fontSize: 12,
        color: '#475569',
        fontWeight: '600',
    },
    ulpPillTextActive: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },

    // Feature Card Box
    cardBox: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    cardBoxJtr: {
        borderColor: '#FED7AA',
        backgroundColor: '#FFFBF5',
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    cardTitleWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    cardTitle: {
        fontSize: 13.5,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    cardBadgeCount: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '500',
    },
    cardDescText: {
        fontSize: 11.5,
        color: '#64748B',
        marginBottom: 8,
        lineHeight: 16,
    },
    colorPillOrange: {
        backgroundColor: '#FFEDD5',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    colorPillText: {
        fontSize: 10,
        color: '#EA580C',
        fontWeight: 'bold',
    },

    pickerWrapper: {
        backgroundColor: '#F8FAFC',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        marginBottom: 10,
        overflow: 'hidden',
    },
    picker: {
        color: '#1E293B',
        height: 50,
    },

    actionBtnPrimary: {
        backgroundColor: '#1565C0',
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
    },
    actionBtnText: {
        color: 'white',
        fontSize: 13,
        fontWeight: 'bold',
    },

    // JTR Search Bar & Items
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        paddingHorizontal: 10,
        marginBottom: 8,
    },
    searchIcon: {
        marginRight: 6,
    },
    searchInput: {
        flex: 1,
        height: 38,
        color: '#1E293B',
        fontSize: 12.5,
    },
    clearSearchBtn: {
        padding: 4,
    },

    garduListContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        overflow: 'hidden',
    },
    garduEmptyText: {
        textAlign: 'center',
        paddingVertical: 14,
        color: '#94A3B8',
        fontSize: 12,
    },
    garduRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    garduRowActive: {
        backgroundColor: '#FFF7ED',
    },
    garduRowInfo: {
        flex: 1,
        marginRight: 8,
    },
    garduHeaderLine: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    garduIdText: {
        fontSize: 12.5,
        fontWeight: 'bold',
        color: '#1E293B',
    },
    badgeJtr: {
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 4,
    },
    badgeJtrGreen: {
        backgroundColor: '#DCFCE7',
    },
    badgeJtrGray: {
        backgroundColor: '#F1F5F9',
    },
    badgeJtrText: {
        fontSize: 9.5,
        fontWeight: 'bold',
    },
    textGreen: {
        color: '#15803D',
    },
    textGray: {
        color: '#64748B',
    },
    garduFeederText: {
        fontSize: 11,
        color: '#64748B',
    },
    garduNameText: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 2,
    },

    loadJtrBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
    },
    loadJtrBtnReady: {
        backgroundColor: '#EA580C',
    },
    loadJtrBtnActive: {
        backgroundColor: '#16A34A',
    },
    loadJtrBtnDisabled: {
        backgroundColor: '#E2E8F0',
    },
    loadJtrBtnText: {
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold',
    },

    // Bulk buttons
    bulkRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 14,
    },
    bulkButton: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
    },
    bulkButtonText: {
        color: '#1565C0',
        fontSize: 11.5,
        fontWeight: '600',
    },

    // Local Import Styles
    importButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#1565C0',
        paddingVertical: 13,
        borderRadius: 10,
        marginBottom: 14,
    },
    importButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },

    confirmBox: {
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: '#BAE6FD',
        marginBottom: 14,
    },
    confirmTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1565C0',
        marginBottom: 8,
    },
    previewBox: {
        backgroundColor: '#EFF6FF',
        borderRadius: 8,
        padding: 8,
        marginBottom: 10,
    },
    previewText: {
        fontSize: 12,
        color: '#1E40AF',
        lineHeight: 17,
    },
    inputLabel: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#475569',
        marginBottom: 4,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        paddingHorizontal: 10,
        height: 38,
        color: '#1E293B',
        fontSize: 13,
        marginBottom: 10,
    },
    typeOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 10,
    },
    typeBtn: {
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 6,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#CBD5E1',
    },
    typeBtnActive: {
        backgroundColor: '#1565C0',
        borderColor: '#1565C0',
    },
    typeBtnText: {
        fontSize: 11,
        color: '#475569',
        fontWeight: '600',
    },
    typeBtnTextActive: {
        color: 'white',
        fontWeight: 'bold',
    },

    colorSection: {
        marginBottom: 10,
    },
    colorPresets: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    colorDot: {
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 2,
        borderColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
    },
    colorDotActive: {
        borderColor: '#1565C0',
        transform: [{ scale: 1.15 }],
    },

    confirmActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 6,
    },
    cancelBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 6,
        backgroundColor: '#E2E8F0',
    },
    cancelBtnText: {
        color: '#475569',
        fontSize: 12,
        fontWeight: '600',
    },
    confirmBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 6,
        backgroundColor: '#1565C0',
    },
    confirmBtnText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },

    // Active Section
    activeSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 6,
        marginBottom: 8,
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#475569',
        letterSpacing: 0.5,
    },
    clearAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    clearAllText: {
        fontSize: 11,
        color: '#DC2626',
        fontWeight: '600',
    },

    overlayItem: {
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 8,
    },
    overlayItemJtr: {
        borderColor: '#FED7AA',
        backgroundColor: '#FFFDF9',
    },
    overlayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    overlayInfo: {
        flex: 1,
        marginRight: 6,
    },
    overlayTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    layerColorIndicator: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    overlayName: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#1E293B',
        flex: 1,
    },
    overlayMeta: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 2,
    },
    overlayActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    actionIconBtn: {
        padding: 5,
    },

    opacityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    opacityLabel: {
        fontSize: 11,
        color: '#64748B',
        width: 70,
    },
    sliderContainer: {
        flex: 1,
        marginHorizontal: 4,
    },
    slider: {
        height: 24,
    },
    opacityValue: {
        fontSize: 11,
        color: '#1E293B',
        fontWeight: 'bold',
        width: 32,
        textAlign: 'right',
    },

    emptyState: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    emptyText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
        marginTop: 8,
    },
    emptySubtext: {
        fontSize: 11.5,
        color: '#94A3B8',
        marginTop: 4,
        textAlign: 'center',
        lineHeight: 16,
        paddingHorizontal: 20,
    },

    // Footer
    footerBtn: {
        backgroundColor: '#F8FAFC',
        paddingVertical: 13,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    footerBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
    },
});
