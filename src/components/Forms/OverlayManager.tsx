// =============================================================================
// PLN SURVEY APP - Overlay Manager Component
// =============================================================================
// Supports:
// 1. Cloud GIS On-Demand (JTM per Penyulang, JTR per Gardu, Gardu & Proteksi per ULP)
//    hosted on Cloudflare CDN / aaPanel static hosting.
// 2. Local File Import (CSV, KML, and KMZ files).
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
    DEFAULT_CLOUD_GIS_URL,
} from '../../services/cloudGisService';

function generateId(): string {
    return 'ovl_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
}

const TYPE_LABELS: Record<OverlayDataType, string> = {
    jtm: '⚡ JTM (Jaringan)',
    jtr: '🔌 JTR (Tegangan Rendah)',
    gardu: '🏠 Gardu Distribusi',
    proteksi: '🛡️ Proteksi & GH',
    custom: '📍 Custom',
};

const TYPE_OPTIONS: { value: OverlayDataType; label: string }[] = [
    { value: 'jtm', label: '⚡ JTM (Jaringan/Polyline)' },
    { value: 'jtr', label: '🔌 JTR (Jaringan & Tiang TR)' },
    { value: 'gardu', label: '🏠 Gardu (Titik)' },
    { value: 'proteksi', label: '🛡️ Proteksi (Titik)' },
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
            return list.slice(0, 15);
        }
        return list
            .filter(
                (g) =>
                    g.id.toLowerCase().includes(q) ||
                    g.nama.toLowerCase().includes(q) ||
                    g.penyulang.toLowerCase().includes(q)
            )
            .slice(0, 40);
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
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerTitleRow}>
                            <View style={styles.headerIconBadge}>
                                <Ionicons name="globe-outline" size={18} color="white" />
                            </View>
                            <View>
                                <Text style={styles.title}>Data Jaringan Eksisting</Text>
                                <Text style={styles.subtitle}>Cloud GIS On-Demand & File Import</Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color="#94a3b8" />
                        </TouchableOpacity>
                    </View>

                    {/* Tab Bar */}
                    <View style={styles.tabBar}>
                        <TouchableOpacity
                            style={[styles.tabButton, activeTab === 'cloud' && styles.tabButtonActiveCloud]}
                            onPress={() => setActiveTab('cloud')}
                        >
                            <Ionicons
                                name="cloud-download-outline"
                                size={16}
                                color={activeTab === 'cloud' ? '#ea580c' : '#94a3b8'}
                            />
                            <Text style={[styles.tabText, activeTab === 'cloud' && styles.tabTextActiveCloud]}>
                                Cloud GIS
                            </Text>
                            <View style={[styles.badgeRecommend, activeTab === 'cloud' ? styles.badgeActive : null]}>
                                <Text style={styles.badgeText}>AUTO</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.tabButton, activeTab === 'local' && styles.tabButtonActiveLocal]}
                            onPress={() => setActiveTab('local')}
                        >
                            <Ionicons
                                name="document-text-outline"
                                size={16}
                                color={activeTab === 'local' ? '#0284c7' : '#94a3b8'}
                            />
                            <Text style={[styles.tabText, activeTab === 'local' && styles.tabTextActiveLocal]}>
                                File Lokal
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* ========================================================= */}
                        {/* TAB 1: CLOUD GIS */}
                        {/* ========================================================= */}
                        {activeTab === 'cloud' && (
                            <View>
                                {/* Server status */}
                                <View style={styles.serverStatusCard}>
                                    <View style={styles.statusIndicatorRow}>
                                        <View style={[styles.statusDot, catalog ? styles.dotGreen : styles.dotOrange]} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.serverStatusText}>
                                                {loadingCatalog ? (
                                                    'Menghubungkan ke Cloud Server...'
                                                ) : catalog ? (
                                                    `Server Online: ${catalog.gardu.length.toLocaleString()} Gardu · ${catalog.penyulang.length} Penyulang`
                                                ) : (
                                                    'Gagal terhubung ke Cloud GIS'
                                                )}
                                            </Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.refreshButton}
                                        onPress={() => loadCatalog(true)}
                                        disabled={loadingCatalog}
                                    >
                                        {loadingCatalog ? (
                                            <ActivityIndicator size="small" color="#cbd5e1" />
                                        ) : (
                                            <Ionicons name="refresh-outline" size={16} color="#cbd5e1" />
                                        )}
                                    </TouchableOpacity>
                                </View>

                                {catalogError && (
                                    <View style={styles.errorBox}>
                                        <Ionicons name="alert-circle-outline" size={18} color="#ef4444" />
                                        <Text style={styles.errorText}>{catalogError}</Text>
                                    </View>
                                )}

                                {/* ULP Filter Pills */}
                                {catalog && (
                                    <View style={styles.filterSection}>
                                        <Text style={styles.filterLabel}>WILAYAH ULP:</Text>
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
                                    <View style={styles.featureCard}>
                                        <View style={styles.cardHeaderRow}>
                                            <View style={styles.cardTitleWithIcon}>
                                                <Ionicons name="flash-outline" size={16} color="#0284c7" />
                                                <Text style={styles.cardTitle}>JTM 20 kV (Per Penyulang)</Text>
                                            </View>
                                            <Text style={styles.cardBadgeCount}>{filteredPenyulang.length} penyulang</Text>
                                        </View>

                                        <View style={styles.pickerWrapper}>
                                            <Picker
                                                selectedValue={selectedPenyulangId}
                                                onValueChange={(itemValue) => setSelectedPenyulangId(itemValue)}
                                                style={styles.picker}
                                                dropdownIconColor="#cbd5e1"
                                            >
                                                {filteredPenyulang.map((p) => {
                                                    const isLoaded = overlays.some((o) => o.id === `cloud_jtm_${p.file.replace('.geojson', '').toLowerCase().replace(/[^a-z0-9]/g, '_')}`);
                                                    return (
                                                        <Picker.Item
                                                            key={p.id}
                                                            label={`${p.nama} (${p.ulp})${isLoaded ? ' ✓ [Aktif]' : ''}`}
                                                            value={p.id}
                                                            color="#f8fafc"
                                                        />
                                                    );
                                                })}
                                            </Picker>
                                        </View>

                                        <TouchableOpacity
                                            style={styles.actionBtnPrimary}
                                            onPress={handleLoadJtm}
                                            disabled={!selectedPenyulangId || loadingAction?.startsWith('jtm-')}
                                        >
                                            {loadingAction?.startsWith('jtm-') ? (
                                                <ActivityIndicator size="small" color="white" />
                                            ) : (
                                                <Ionicons name="eye-outline" size={16} color="white" />
                                            )}
                                            <Text style={styles.actionBtnText}>
                                                {loadingAction?.startsWith('jtm-') ? 'Memuat JTM...' : 'Tampilkan JTM'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {/* CARD 2: JTR PER GARDU */}
                                {catalog && (
                                    <View style={[styles.featureCard, styles.jtrCard]}>
                                        <View style={styles.cardHeaderRow}>
                                            <View style={styles.cardTitleWithIcon}>
                                                <Ionicons name="git-network-outline" size={16} color="#ea580c" />
                                                <Text style={[styles.cardTitle, { color: '#ea580c' }]}>
                                                    JTR & Tiang TR (Per Gardu)
                                                </Text>
                                            </View>
                                            <View style={styles.colorPillOrange}>
                                                <Text style={styles.colorPillText}>Oren Menyala</Text>
                                            </View>
                                        </View>

                                        {/* Search Input */}
                                        <View style={styles.searchBar}>
                                            <Ionicons name="search-outline" size={16} color="#64748b" style={styles.searchIcon} />
                                            <TextInput
                                                style={styles.searchInput}
                                                placeholder="Cari Gardu (contoh: TGP240, AAP, TELUK)..."
                                                placeholderTextColor="#64748b"
                                                value={garduSearch}
                                                onChangeText={setGarduSearch}
                                            />
                                            {garduSearch.length > 0 && (
                                                <TouchableOpacity onPress={() => setGarduSearch('')} style={styles.clearSearchBtn}>
                                                    <Ionicons name="close-circle" size={18} color="#94a3b8" />
                                                </TouchableOpacity>
                                            )}
                                        </View>

                                        {/* Gardu Results */}
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
                                                            >
                                                                {isLoading ? (
                                                                    <ActivityIndicator size="small" color="white" />
                                                                ) : (
                                                                    <>
                                                                        <Ionicons
                                                                            name={isLoaded ? 'checkmark-outline' : 'flash-outline'}
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
                                        >
                                            {loadingAction?.startsWith('gardu-') ? (
                                                <ActivityIndicator size="small" color="white" />
                                            ) : (
                                                <Ionicons name="location-outline" size={16} color="#38bdf8" />
                                            )}
                                            <Text style={styles.bulkButtonText}>
                                                Titik Gardu ({selectedUlp === 'ALL' ? 'LABUAN' : selectedUlp})
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.bulkButton}
                                            disabled={loadingAction?.startsWith('pro-')}
                                            onPress={() => handleLoadProteksiUlp(selectedUlp)}
                                        >
                                            {loadingAction?.startsWith('pro-') ? (
                                                <ActivityIndicator size="small" color="white" />
                                            ) : (
                                                <Ionicons name="shield-outline" size={16} color="#fb7185" />
                                            )}
                                            <Text style={styles.bulkButtonText}>
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
                                    activeOpacity={0.7}
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

                                        {/* Layer Name */}
                                        <Text style={styles.inputLabel}>Nama Layer</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={pendingName}
                                            onChangeText={setPendingName}
                                            placeholder="Nama layer"
                                            placeholderTextColor="#64748b"
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
                                    <Ionicons name="trash-outline" size={13} color="#ef4444" />
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
                                                        { backgroundColor: ol.color || (isJtr ? '#FF6600' : '#0284c7') },
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
                                                    <Ionicons name="locate-outline" size={18} color="#0284c7" />
                                                </TouchableOpacity>
                                            )}

                                            {/* Toggle Visibility */}
                                            <TouchableOpacity
                                                style={styles.actionIconBtn}
                                                onPress={() => toggleVisibility(ol.id)}
                                            >
                                                <Ionicons
                                                    name={ol.visible ? 'eye-outline' : 'eye-off-outline'}
                                                    size={18}
                                                    color={ol.visible ? '#0284c7' : '#94a3b8'}
                                                />
                                            </TouchableOpacity>

                                            {/* Delete */}
                                            <TouchableOpacity
                                                style={styles.actionIconBtn}
                                                onPress={() => handleDelete(ol.id, ol.name)}
                                            >
                                                <Ionicons name="trash-outline" size={18} color="#ef4444" />
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
                                                    minimumTrackTintColor="#0284c7"
                                                    maximumTrackTintColor="#334155"
                                                    thumbTintColor="#0284c7"
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

                        {overlays.length === 0 && importStep === 'idle' && (
                            <View style={styles.emptyState}>
                                <Ionicons name="layers-outline" size={44} color="#475569" />
                                <Text style={styles.emptyText}>Belum ada data eksisting dimuat</Text>
                                <Text style={styles.emptySubtext}>
                                    Pilih penyulang atau cari gardu di tab Cloud GIS di atas untuk memuat jaringan langsung ke peta!
                                </Text>
                            </View>
                        )}
                    </ScrollView>

                    {/* Footer */}
                    <TouchableOpacity style={styles.footerBtn} onPress={onClose}>
                        <Text style={styles.footerBtnText}>Tutup</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#0f172a',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '92%',
        minHeight: '60%',
        borderWidth: 1,
        borderColor: '#334155',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#1e293b',
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerIconBadge: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#ea580c',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#f8fafc',
    },
    subtitle: {
        fontSize: 11,
        color: '#94a3b8',
        marginTop: 1,
    },
    closeBtn: {
        padding: 4,
    },

    // Tab Bar
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#1e293b',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabButtonActiveCloud: {
        borderBottomColor: '#ea580c',
        backgroundColor: '#0f172a',
    },
    tabButtonActiveLocal: {
        borderBottomColor: '#0284c7',
        backgroundColor: '#0f172a',
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#94a3b8',
    },
    tabTextActiveCloud: {
        color: '#ea580c',
        fontWeight: 'bold',
    },
    tabTextActiveLocal: {
        color: '#0284c7',
        fontWeight: 'bold',
    },
    badgeRecommend: {
        backgroundColor: '#334155',
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 4,
    },
    badgeActive: {
        backgroundColor: '#ea580c',
    },
    badgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: 'white',
    },

    content: {
        paddingHorizontal: 16,
        paddingTop: 14,
    },

    // Server Status Card
    serverStatusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1e293b',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 12,
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
        backgroundColor: '#10b981',
    },
    dotOrange: {
        backgroundColor: '#ea580c',
    },
    serverStatusText: {
        fontSize: 11.5,
        color: '#cbd5e1',
        fontWeight: '500',
    },
    refreshButton: {
        padding: 5,
        backgroundColor: '#334155',
        borderRadius: 6,
    },

    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(239,68,68,0.15)',
        borderWidth: 1,
        borderColor: '#ef4444',
        borderRadius: 8,
        padding: 10,
        marginBottom: 12,
    },
    errorText: {
        fontSize: 12,
        color: '#fca5a5',
        flex: 1,
    },

    // ULP Filter
    filterSection: {
        marginBottom: 14,
    },
    filterLabel: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#94a3b8',
        marginBottom: 6,
        letterSpacing: 0.5,
    },
    ulpScroll: {
        flexDirection: 'row',
    },
    ulpPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: '#1e293b',
        borderWidth: 1,
        borderColor: '#334155',
        marginRight: 6,
    },
    ulpPillActive: {
        backgroundColor: '#ea580c',
        borderColor: '#ea580c',
    },
    ulpPillText: {
        fontSize: 11.5,
        color: '#94a3b8',
        fontWeight: '500',
    },
    ulpPillTextActive: {
        color: 'white',
        fontWeight: 'bold',
    },

    // Feature Cards
    featureCard: {
        backgroundColor: '#1e293b',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#334155',
        padding: 12,
        marginBottom: 12,
    },
    jtrCard: {
        borderColor: 'rgba(234, 88, 12, 0.5)',
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    cardTitleWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    cardTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#f8fafc',
    },
    cardBadgeCount: {
        fontSize: 11,
        color: '#94a3b8',
    },
    colorPillOrange: {
        backgroundColor: 'rgba(234, 88, 12, 0.2)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    colorPillText: {
        fontSize: 9.5,
        color: '#ea580c',
        fontWeight: 'bold',
    },

    pickerWrapper: {
        backgroundColor: '#0f172a',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 10,
        overflow: 'hidden',
    },
    picker: {
        color: '#f8fafc',
        height: 48,
    },

    actionBtnPrimary: {
        backgroundColor: '#0284c7',
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
    },
    actionBtnText: {
        color: 'white',
        fontSize: 12.5,
        fontWeight: 'bold',
    },

    // JTR Search
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#334155',
        paddingHorizontal: 10,
        marginBottom: 8,
    },
    searchIcon: {
        marginRight: 6,
    },
    searchInput: {
        flex: 1,
        height: 38,
        color: '#f8fafc',
        fontSize: 12.5,
    },
    clearSearchBtn: {
        padding: 4,
    },

    garduListContainer: {
        maxHeight: 160,
        backgroundColor: '#0f172a',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#334155',
        padding: 4,
    },
    garduEmptyText: {
        textAlign: 'center',
        paddingVertical: 16,
        color: '#64748b',
        fontSize: 12,
    },
    garduRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 6,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(51, 65, 85, 0.4)',
    },
    garduRowActive: {
        backgroundColor: 'rgba(234, 88, 12, 0.12)',
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
        color: '#f8fafc',
    },
    badgeJtr: {
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
    },
    badgeJtrGreen: {
        backgroundColor: '#065f46',
    },
    badgeJtrGray: {
        backgroundColor: '#334155',
    },
    badgeJtrText: {
        fontSize: 9.5,
        fontWeight: 'bold',
    },
    textGreen: {
        color: '#6ee7b7',
    },
    textGray: {
        color: '#94a3b8',
    },
    garduFeederText: {
        fontSize: 11,
        color: '#64748b',
    },
    garduNameText: {
        fontSize: 11,
        color: '#94a3b8',
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
        backgroundColor: '#ea580c',
    },
    loadJtrBtnActive: {
        backgroundColor: '#15803d',
    },
    loadJtrBtnDisabled: {
        backgroundColor: '#334155',
        opacity: 0.5,
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
        marginBottom: 16,
    },
    bulkButton: {
        flex: 1,
        backgroundColor: '#1e293b',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
    },
    bulkButtonText: {
        color: '#f8fafc',
        fontSize: 11.5,
        fontWeight: '600',
    },

    // Local Import Styles
    importButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#0284c7',
        paddingVertical: 14,
        borderRadius: 10,
        marginBottom: 16,
    },
    importButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },

    confirmBox: {
        backgroundColor: '#1e293b',
        borderRadius: 10,
        padding: 14,
        borderWidth: 1,
        borderColor: '#0284c7',
        marginBottom: 16,
    },
    confirmTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#38bdf8',
        marginBottom: 10,
    },
    previewBox: {
        backgroundColor: '#0f172a',
        borderRadius: 8,
        padding: 10,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#334155',
    },
    previewText: {
        fontSize: 12,
        color: '#cbd5e1',
        lineHeight: 18,
    },
    inputLabel: {
        fontSize: 11.5,
        fontWeight: '600',
        color: '#94a3b8',
        marginBottom: 4,
    },
    input: {
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 13,
        color: '#f8fafc',
        marginBottom: 10,
    },
    typeOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 12,
    },
    typeBtn: {
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#334155',
        backgroundColor: '#0f172a',
    },
    typeBtnActive: {
        backgroundColor: '#0284c7',
        borderColor: '#0284c7',
    },
    typeBtnText: {
        fontSize: 11.5,
        color: '#94a3b8',
        fontWeight: '600',
    },
    typeBtnTextActive: {
        color: 'white',
    },
    colorSection: {
        marginBottom: 14,
    },
    colorPresets: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    colorDot: {
        width: 30,
        height: 30,
        borderRadius: 6,
        backgroundColor: '#334155',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#475569',
    },
    colorDotActive: {
        borderColor: 'white',
        borderWidth: 2.5,
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
        backgroundColor: '#334155',
    },
    cancelBtnText: {
        color: '#cbd5e1',
        fontSize: 12,
    },
    confirmBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
        backgroundColor: '#10b981',
    },
    confirmBtnText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },

    // Active Layers Section
    activeSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#f59e0b',
        letterSpacing: 0.5,
    },
    clearAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    clearAllText: {
        fontSize: 11,
        color: '#ef4444',
        fontWeight: '600',
    },

    overlayItem: {
        backgroundColor: '#1e293b',
        borderRadius: 10,
        padding: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#334155',
    },
    overlayItemJtr: {
        borderColor: 'rgba(234, 88, 12, 0.4)',
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
        width: 8,
        height: 8,
        borderRadius: 2,
    },
    overlayName: {
        fontSize: 13,
        fontWeight: '600',
        color: '#f8fafc',
    },
    overlayMeta: {
        fontSize: 11,
        color: '#94a3b8',
        marginTop: 2,
    },
    overlayActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    actionIconBtn: {
        padding: 5,
        backgroundColor: '#334155',
        borderRadius: 6,
    },

    opacityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: '#334155',
    },
    opacityLabel: {
        fontSize: 10.5,
        color: '#94a3b8',
        width: 65,
    },
    sliderContainer: {
        flex: 1,
        marginHorizontal: 4,
    },
    slider: {
        height: 24,
    },
    opacityValue: {
        fontSize: 10.5,
        color: '#cbd5e1',
        width: 32,
        textAlign: 'right',
    },

    emptyState: {
        alignItems: 'center',
        paddingVertical: 28,
        backgroundColor: '#1e293b',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#334155',
        borderStyle: 'dashed',
        marginTop: 8,
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 13,
        color: '#94a3b8',
        marginTop: 8,
        fontWeight: 'bold',
    },
    emptySubtext: {
        fontSize: 11,
        color: '#64748b',
        marginTop: 4,
        textAlign: 'center',
        paddingHorizontal: 24,
        lineHeight: 16,
    },

    footerBtn: {
        backgroundColor: '#1e293b',
        paddingVertical: 14,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#334155',
    },
    footerBtnText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#f8fafc',
    },
});
