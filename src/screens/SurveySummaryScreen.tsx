// =============================================================================
// PLN SURVEY APP - Survey Summary Screen
// =============================================================================

import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    Modal,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Survey, JalurKabel, Tiang, Gardu } from '../types';
import { exportToPDF, exportToKML, exportToCSV } from '../utils/exportUtils';

// =============================================================================
// TYPES
// =============================================================================

interface SurveySummaryScreenProps {
    visible: boolean;
    survey: Survey;
    onClose: () => void;
    onSaveAndClose: () => void;
    onNewSurvey: () => void;
    mapScreenshot?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function SurveySummaryScreen({
    visible,
    survey,
    onClose,
    onSaveAndClose,
    onNewSurvey,
    mapScreenshot,
}: SurveySummaryScreenProps) {
    const [isExporting, setIsExporting] = useState(false);

    // Calculate statistics
    const totalTiang = survey.tiangList.length;
    const totalGardu = survey.garduList.length;
    const totalJalur = survey.jalurList.length;

    // Calculate total length
    const totalPanjangJalur = survey.jalurList.reduce((acc, jalur) => acc + jalur.panjangMeter, 0);

    // Calculate by network type
    const totalByJaringan = survey.jalurList.reduce((acc, jalur) => {
        acc[jalur.jenisJaringan] = (acc[jalur.jenisJaringan] || 0) + jalur.panjangMeter;
        return acc;
    }, {} as Record<string, number>);

    // Helper to group and count
    const groupAndCount = (data: any[], key: string) => {
        const counts = data.reduce((acc: any, item: any) => {
            const val = item[key] || 'Lainnya';
            acc[val] = (acc[val] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(counts).map(([label, count]) => ({ label, count: count as number }));
    };

    // Summaries
    const tiangSummary = groupAndCount(survey.tiangList, 'jenisTiang');
    const garduSummary = survey.garduList.map(g => ({ kapasitas: g.kapasitasKVA, jumlah: 1 }))
        .reduce((acc: any[], curr) => {
            const existing = acc.find(x => x.kapasitas === curr.kapasitas);
            if (existing) existing.jumlah++;
            else acc.push({ ...curr });
            return acc;
        }, []);

    const jalurSummary = survey.jalurList.reduce((acc: any[], curr) => {
        const key = `${curr.jenisJaringan} - ${curr.jenisPenghantar} ${curr.penampangMM}`;
        const existing = acc.find(x => x.key === key);
        if (existing) {
            existing.panjang += curr.panjangMeter;
            existing.count++;
        } else {
            acc.push({
                key,
                jenis: curr.jenisJaringan,
                penghantar: curr.jenisPenghantar,
                penampang: curr.penampangMM,
                panjang: curr.panjangMeter,
                count: 1
            });
        }
        return acc;
    }, []);

    const formatPanjang = (meter: number) => {
        if (meter >= 1000) {
            return `${(meter / 1000).toFixed(2)} km`;
        }
        return `${Math.round(meter)} m`;
    };

    // =============================================================================
    // HANDLERS
    // =============================================================================

    const handleExportPDF = async () => {
        setIsExporting(true);
        try {
            const success = await exportToPDF(survey);
            if (!success) {
                Alert.alert('Error', 'Gagal mengexport PDF');
            }
        } catch (error) {
            console.error('PDF export error:', error);
            Alert.alert('Error', 'Terjadi kesalahan saat export PDF');
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportKML = async () => {
        setIsExporting(true);
        try {
            const success = await exportToKML(survey);
            if (!success) {
                Alert.alert('Error', 'Gagal mengexport KML - Sharing tidak tersedia');
            }
        } catch (error: any) {
            console.error('KML export error:', error);
            Alert.alert('Error', `Gagal export KML: ${error?.message || 'Unknown error'}`);
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportCSV = async () => {
        setIsExporting(true);
        try {
            const success = await exportToCSV(survey);
            if (!success) {
                Alert.alert('Error', 'Gagal mengexport CSV - Sharing tidak tersedia');
            }
        } catch (error: any) {
            console.error('CSV export error:', error);
            Alert.alert('Error', `Gagal export CSV: ${error?.message || 'Unknown error'}`);
        } finally {
            setIsExporting(false);
        }
    };

    const handleSaveAndClose = () => {
        Alert.alert(
            '💾 Simpan Survey',
            'Survey akan disimpan dan bisa dibuka lagi nanti.',
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Simpan',
                    onPress: () => {
                        onSaveAndClose();
                        Alert.alert('✅ Berhasil', 'Survey berhasil disimpan!');
                    }
                },
            ]
        );
    };

    const handleNewSurvey = () => {
        Alert.alert(
            '📋 Survey Baru',
            'Simpan survey ini dulu lalu mulai survey baru?',
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Simpan & Baru',
                    onPress: () => {
                        onSaveAndClose();
                        onNewSurvey();
                    }
                },
                {
                    text: 'Baru Tanpa Simpan',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert(
                            '⚠️ Data Akan Hilang',
                            'Yakin mulai survey baru tanpa menyimpan?',
                            [
                                { text: 'Tidak', style: 'cancel' },
                                { text: 'Ya, Hapus', style: 'destructive', onPress: onNewSurvey },
                            ]
                        );
                    }
                },
            ]
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={24} color="#666" />
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="stats-chart" size={20} color="#333" style={{ marginRight: 8 }} />
                        <Text style={[styles.title, { textAlign: 'left', flex: 0 }]}>Rekap Survey</Text>
                    </View>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView style={styles.content}>
                    {/* Survey Info */}
                    <View style={styles.surveyInfoCard}>
                        <Text style={styles.surveyName}>{survey.namaSurvey}</Text>
                        <Text style={styles.surveyDate}>
                            {new Date(survey.tanggalSurvey).toLocaleDateString('id-ID', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })}
                        </Text>
                    </View>

                    {/* Quick Stats */}
                    <View style={styles.statsGrid}>
                        <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
                            <Text style={styles.statValue}>{totalTiang}</Text>
                            <Text style={styles.statLabel}>Tiang</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
                            <Text style={styles.statValue}>{totalGardu}</Text>
                            <Text style={styles.statLabel}>Gardu</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: '#FCE4EC' }]}>
                            <Text style={styles.statValue}>{totalJalur}</Text>
                            <Text style={styles.statLabel}>Jalur</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
                            <Text style={styles.statValue}>{formatPanjang(totalPanjangJalur)}</Text>
                            <Text style={styles.statLabel}>Total</Text>
                        </View>
                    </View>

                    {/* Total Panjang Per Jaringan */}
                    {(totalByJaringan.SUTM > 0 || totalByJaringan.SUTR > 0 || totalByJaringan.SKUTM > 0) && (
                        <View style={styles.section}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                <Ionicons name="resize" size={18} color="#333" style={{ marginRight: 8 }} />
                                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Total Panjang Per Jaringan</Text>
                            </View>
                            {totalByJaringan.SUTM > 0 && (
                                <View style={styles.jaringanRow}>
                                    <View style={[styles.badge, { backgroundColor: '#E91E63' }]}>
                                        <Text style={styles.badgeText}>SUTM</Text>
                                    </View>
                                    <Text style={styles.jaringanPanjang}>{formatPanjang(totalByJaringan.SUTM)}</Text>
                                </View>
                            )}
                            {totalByJaringan.SUTR > 0 && (
                                <View style={styles.jaringanRow}>
                                    <View style={[styles.badge, { backgroundColor: '#4CAF50' }]}>
                                        <Text style={styles.badgeText}>SUTR</Text>
                                    </View>
                                    <Text style={styles.jaringanPanjang}>{formatPanjang(totalByJaringan.SUTR)}</Text>
                                </View>
                            )}
                            {totalByJaringan.SKUTM > 0 && (
                                <View style={styles.jaringanRow}>
                                    <View style={[styles.badge, { backgroundColor: '#00BCD4' }]}>
                                        <Text style={styles.badgeText}>SKUTM</Text>
                                    </View>
                                    <Text style={styles.jaringanPanjang}>{formatPanjang(totalByJaringan.SKUTM)}</Text>
                                </View>
                            )}
                            {totalByJaringan.SKTM > 0 && (
                                <View style={styles.jaringanRow}>
                                    <View style={[styles.badge, { backgroundColor: '#9C27B0' }]}>
                                        <Text style={styles.badgeText}>SKTM</Text>
                                    </View>
                                    <Text style={styles.jaringanPanjang}>{formatPanjang(totalByJaringan.SKTM)}</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Rekap Jalur */}
                    {jalurSummary.length > 0 && (
                        <View style={styles.section}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                <Ionicons name="flash" size={18} color="#333" style={{ marginRight: 8 }} />
                                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Rekap Penghantar</Text>
                            </View>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.tableCell, { flex: 1.5 }]}>Jenis</Text>
                                <Text style={[styles.tableCell, { flex: 1.5 }]}>Penghantar</Text>
                                <Text style={[styles.tableCell, { flex: 1 }]}>Panjang</Text>
                            </View>
                            {jalurSummary.map((item, index) => (
                                <View key={index} style={styles.tableRow}>
                                    <View style={{ flex: 1.5 }}>
                                        <Text style={styles.tableCellText}>{item.jenis}</Text>
                                    </View>
                                    <View style={{ flex: 1.5 }}>
                                        <Text style={styles.tableCellText}>{item.penghantar}</Text>
                                        <Text style={styles.tableCellSubtext}>{item.penampang}</Text>
                                    </View>
                                    <Text style={[styles.tableCell, styles.tableCellBold, { flex: 1, textAlign: 'right' }]}>
                                        {formatPanjang(item.panjang)}
                                    </Text>
                                </View>
                            ))}
                            <View style={styles.tableTotalRow}>
                                <Text style={[styles.tableCell, styles.tableTotalLabel, { flex: 3 }]}>
                                    TOTAL PANJANG
                                </Text>
                                <Text style={[styles.tableCell, styles.tableTotalValue, { flex: 1, textAlign: 'right' }]}>
                                    {formatPanjang(jalurSummary.reduce((acc, curr) => acc + curr.panjang, 0))}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Rekap Tiang */}
                    {tiangSummary.length > 0 && (
                        <View style={styles.section}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                <Ionicons name="construct" size={18} color="#333" style={{ marginRight: 8 }} />
                                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Rekap Tiang</Text>
                            </View>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.tableCell, { flex: 2 }]}>Jenis Tiang</Text>
                                <Text style={[styles.tableCell, { flex: 1 }]}>Jumlah</Text>
                            </View>
                            {tiangSummary.map((item, index) => (
                                <View key={index} style={styles.tableRow}>
                                    <Text style={[styles.tableCell, styles.tableCellText, { flex: 2 }]}>
                                        {item.label}
                                    </Text>
                                    <Text style={[styles.tableCell, styles.tableCellBold, { flex: 1, textAlign: 'center' }]}>
                                        {item.count}
                                    </Text>
                                </View>
                            ))}
                            <View style={styles.tableTotalRow}>
                                <Text style={[styles.tableCell, styles.tableTotalLabel, { flex: 2 }]}>
                                    TOTAL TIANG
                                </Text>
                                <Text style={[styles.tableCell, styles.tableTotalValue, { flex: 1, textAlign: 'center' }]}>
                                    {totalTiang}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Rekap Gardu */}
                    {garduSummary.length > 0 && (
                        <View style={styles.section}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                <Ionicons name="business" size={18} color="#333" style={{ marginRight: 8 }} />
                                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Rekap Gardu</Text>
                            </View>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.tableCell, { flex: 2 }]}>Kapasitas</Text>
                                <Text style={[styles.tableCell, { flex: 1 }]}>Jumlah</Text>
                            </View>
                            {garduSummary.map((item, index) => (
                                <View key={index} style={styles.tableRow}>
                                    <Text style={[styles.tableCell, styles.tableCellText, { flex: 2 }]}>
                                        {item.kapasitas} kVA
                                    </Text>
                                    <Text style={[styles.tableCell, styles.tableCellBold, { flex: 1, textAlign: 'center' }]}>
                                        {item.jumlah}
                                    </Text>
                                </View>
                            ))}
                            <View style={styles.tableTotalRow}>
                                <Text style={[styles.tableCell, styles.tableTotalLabel, { flex: 2 }]}>
                                    TOTAL GARDU
                                </Text>
                                <Text style={[styles.tableCell, styles.tableTotalValue, { flex: 1, textAlign: 'center' }]}>
                                    {totalGardu}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Empty State */}
                    {totalTiang === 0 && totalGardu === 0 && totalJalur === 0 && (
                        <View style={styles.emptyState}>
                            <Ionicons name="file-tray-outline" size={64} color="#ccc" style={{ marginBottom: 10 }} />
                            <Text style={styles.emptyText}>Belum ada data survey</Text>
                            <Text style={styles.emptySubtext}>Mulai tambahkan tiang, gardu, atau jalur</Text>
                        </View>
                    )}

                    {/* Export Section */}
                    {(totalTiang > 0 || totalGardu > 0 || totalJalur > 0) && (
                        <View style={styles.section}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                <Ionicons name="share-social" size={18} color="#333" style={{ marginRight: 8 }} />
                                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Export Data</Text>
                            </View>
                            <View style={styles.exportButtons}>
                                <TouchableOpacity
                                    style={[styles.exportButton, styles.exportPDF]}
                                    onPress={handleExportPDF}
                                    disabled={isExporting}
                                >
                                    {isExporting ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <>
                                            <Ionicons name="document-text" size={24} color="#D32F2F" style={{ marginBottom: 4 }} />
                                            <Text style={styles.exportButtonText}>Export PDF</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.exportButton, styles.exportKML]}
                                    onPress={handleExportKML}
                                    disabled={isExporting}
                                >
                                    {isExporting ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <>
                                            <Ionicons name="map" size={24} color="#1976D2" style={{ marginBottom: 4 }} />
                                            <Text style={styles.exportButtonText}>Export KML (Earth)</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.exportButton, styles.exportCSV]}
                                    onPress={handleExportCSV}
                                    disabled={isExporting}
                                >
                                    {isExporting ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <>
                                            <Ionicons name="grid" size={24} color="#388E3C" style={{ marginBottom: 4 }} />
                                            <Text style={styles.exportButtonText}>Export CSV (Excel)</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.exportHint}>KML & CSV bisa dibuka di Google Earth/Maps/Excel</Text>
                        </View>
                    )}

                    {/* Spacer for bottom safety */}
                    <View style={{ height: 40 }} />
                </ScrollView>

                {/* Footer Buttons */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.footerButton, styles.saveButton]}
                        onPress={handleSaveAndClose}
                    >
                        <Ionicons name="save" size={18} color="white" style={{ marginRight: 6 }} />
                        <Text style={styles.footerButtonText}>Simpan Draft</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.footerButton, styles.newButton]}
                        onPress={handleNewSurvey}
                    >
                        <Ionicons name="add-circle" size={18} color="white" style={{ marginRight: 6 }} />
                        <Text style={styles.footerButtonText}>Survey Baru</Text>
                    </TouchableOpacity>
                </View>
            </View >
        </Modal >
    );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    closeButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
    },
    closeButtonText: {
        fontSize: 18,
        color: '#666',
        fontWeight: 'bold',
    },
    title: {
        flex: 1,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    surveyInfoCard: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    surveyName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1976D2',
        marginBottom: 4,
    },
    surveyDate: {
        fontSize: 14,
        color: '#666',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20,
        justifyContent: 'space-between',
    },
    statCard: {
        width: '23%',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 11,
        color: '#666',
    },
    section: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginRight: 8,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    jaringanRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        paddingBottom: 8,
        borderBottomWidth: 0.5,
        borderBottomColor: '#eee',
    },
    jaringanPanjang: {
        fontSize: 14,
        color: '#333',
        fontWeight: '600',
        marginLeft: 'auto',
    },
    tableHeader: {
        flexDirection: 'row',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        marginBottom: 8,
    },
    tableCell: {
        fontSize: 12,
        color: '#666',
        fontWeight: '600',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 8,
        borderBottomWidth: 0.5,
        borderBottomColor: '#f5f5f5',
    },
    tableCellText: {
        fontSize: 13,
        color: '#333',
    },
    tableCellSubtext: {
        fontSize: 11,
        color: '#888',
        marginTop: 2,
    },
    tableCellBold: {
        fontWeight: 'bold',
        color: '#333',
    },
    tableTotalRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        marginTop: 4,
    },
    tableTotalLabel: {
        fontWeight: 'bold',
        color: '#1976D2',
    },
    tableTotalValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1976D2',
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
    },
    emptyEmoji: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#666',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#999',
    },
    exportButtons: {
        flexDirection: 'column',
        gap: 12,
    },
    exportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    exportPDF: {
        backgroundColor: '#D32F2F',
    },
    exportKML: {
        backgroundColor: '#FF9800',
    },
    exportCSV: {
        backgroundColor: '#2E7D32', // Green
    },
    exportIcon: {
        fontSize: 18,
        marginRight: 8,
        color: '#fff',
    },
    exportButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    exportHint: {
        fontSize: 11,
        color: '#888',
        textAlign: 'center',
        marginTop: 8,
        fontStyle: 'italic',
    },
    footer: {
        padding: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        flexDirection: 'row',
        gap: 12,
    },
    footerButton: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#1976D2',
    },
    newButton: {
        backgroundColor: '#1976D2',
    },
    footerButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
});
