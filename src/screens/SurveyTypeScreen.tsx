// =============================================================================
// PLN SURVEY APP - Survey Type Selection Screen
// =============================================================================

import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    StatusBar,
} from 'react-native';

// =============================================================================
// TYPES
// =============================================================================

export type SurveyType =
    | 'perluasan_jtm'
    | 'perluasan_jtr'
    | 'pasang_gardu'
    | 'uprating_jtm'
    | 'uprating_jtr'
    | 'feeder_baru'
    | 'link_manuver'
    | 'rehabilitasi';

interface SurveyTypeOption {
    id: SurveyType;
    title: string;
    subtitle: string;
    icon: string;
    color: string;
}

interface SurveyTypeScreenProps {
    onSelectType: (type: SurveyType, title: string) => void;
}

// =============================================================================
// SURVEY TYPE OPTIONS
// =============================================================================

const SURVEY_TYPES: SurveyTypeOption[] = [
    {
        id: 'perluasan_jtm',
        title: 'Perluasan JTM',
        subtitle: 'Pasang baru jaringan tegangan menengah',
        icon: '⚡',
        color: '#E91E63',
    },
    {
        id: 'perluasan_jtr',
        title: 'Perluasan JTR',
        subtitle: 'Pasang baru jaringan tegangan rendah',
        icon: '🔌',
        color: '#4CAF50',
    },
    {
        id: 'pasang_gardu',
        title: 'Pasang Gardu Baru',
        subtitle: 'Instalasi gardu distribusi baru',
        icon: '🏠',
        color: '#FF9800',
    },
    {
        id: 'uprating_jtm',
        title: 'Uprating JTM',
        subtitle: 'Peningkatan kapasitas jaringan TM',
        icon: '📈',
        color: '#9C27B0',
    },
    {
        id: 'uprating_jtr',
        title: 'Uprating JTR',
        subtitle: 'Peningkatan kapasitas jaringan TR',
        icon: '📊',
        color: '#00BCD4',
    },
    {
        id: 'feeder_baru',
        title: 'Tarik Feeder Baru',
        subtitle: 'Pembangunan penyulang baru',
        icon: '🔗',
        color: '#3F51B5',
    },
    {
        id: 'link_manuver',
        title: 'Tarik Link Manuver',
        subtitle: 'Jalur interkoneksi antar penyulang',
        icon: '🔀',
        color: '#795548',
    },
    {
        id: 'rehabilitasi',
        title: 'Rehabilitasi Jaringan',
        subtitle: 'Perbaikan/penggantian jaringan existing',
        icon: '🔧',
        color: '#607D8B',
    },
];

// =============================================================================
// COMPONENT
// =============================================================================

export default function SurveyTypeScreen({ onSelectType }: SurveyTypeScreenProps) {
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#1565C0" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerIcon}>📋</Text>
                <Text style={styles.headerTitle}>PLN Survey App</Text>
                <Text style={styles.headerSubtitle}>Pilih jenis survey yang akan dilakukan</Text>
            </View>

            {/* Survey Type Options */}
            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                <Text style={styles.sectionTitle}>Jenis Survey</Text>

                <View style={styles.grid}>
                    {SURVEY_TYPES.map((type) => (
                        <TouchableOpacity
                            key={type.id}
                            style={[styles.card, { borderLeftColor: type.color }]}
                            onPress={() => onSelectType(type.id, type.title)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: type.color + '20' }]}>
                                <Text style={styles.icon}>{type.icon}</Text>
                            </View>
                            <View style={styles.cardContent}>
                                <Text style={styles.cardTitle}>{type.title}</Text>
                                <Text style={styles.cardSubtitle}>{type.subtitle}</Text>
                            </View>
                            <Text style={styles.arrow}>›</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        📍 Data survey akan tersimpan offline dan dapat di-sync kapan saja
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7fa',
    },
    header: {
        backgroundColor: '#1976D2',
        paddingHorizontal: 24,
        paddingTop: 40,
        paddingBottom: 30,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerIcon: {
        fontSize: 40,
        marginBottom: 12,
    },
    headerTitle: {
        color: 'white',
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 14,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 16,
        marginLeft: 4,
    },
    grid: {
        gap: 12,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    icon: {
        fontSize: 24,
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 2,
    },
    cardSubtitle: {
        fontSize: 12,
        color: '#666',
    },
    arrow: {
        fontSize: 24,
        color: '#ccc',
        marginLeft: 8,
    },
    footer: {
        marginTop: 24,
        padding: 16,
        backgroundColor: '#E3F2FD',
        borderRadius: 12,
    },
    footerText: {
        fontSize: 12,
        color: '#1565C0',
        textAlign: 'center',
    },
});
