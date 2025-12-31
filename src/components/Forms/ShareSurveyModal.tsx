
// =============================================================================
// SHARE SURVEY MODAL
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { supabaseSurveyService } from '../../services/supabaseService';
import { SurveyShare } from '../../types';

interface ShareSurveyModalProps {
    visible: boolean;
    surveyId: string;
    surveyName: string;
    onClose: () => void;
}

export default function ShareSurveyModal({
    visible,
    surveyId,
    surveyName,
    onClose
}: ShareSurveyModalProps) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [shares, setShares] = useState<SurveyShare[]>([]);
    const [loadingShares, setLoadingShares] = useState(false);
    const [sharing, setSharing] = useState(false);

    useEffect(() => {
        if (visible && surveyId) {
            loadShares();
            setEmail('');
        }
    }, [visible, surveyId]);

    const loadShares = async () => {
        try {
            setLoadingShares(true);
            const data = await supabaseSurveyService.getSurveyShares(surveyId);
            setShares(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingShares(false);
        }
    };

    const handleShare = async () => {
        if (!email.trim()) {
            Alert.alert('Eits', 'Masukkan email penerima dulu ya');
            return;
        }

        try {
            setSharing(true);
            const result = await supabaseSurveyService.shareSurvey(surveyId, email);

            if (result.success) {
                Alert.alert('✅ Berhasil', `Survey berhasil dibagikan ke ${email}`);
                setEmail('');
                loadShares(); // Refresh list
            } else {
                Alert.alert('Gagal', result.message || 'Terjadi kesalahan');
            }
        } catch (error) {
            Alert.alert('Error', 'Gagal membagikan survey');
        } finally {
            setSharing(false);
        }
    };

    const handleRemoveShare = (shareId: string, email: string) => {
        Alert.alert(
            'Hapus Akses',
            `Yakin ingin menghapus akses untuk ${email}?`,
            [
                { text: 'Batal', style: 'cancel' },
                {
                    text: 'Hapus',
                    style: 'destructive',
                    onPress: async () => {
                        const success = await supabaseSurveyService.removeShare(shareId);
                        if (success) {
                            loadShares();
                        } else {
                            Alert.alert('Gagal', 'Gagal menghapus akses');
                        }
                    }
                }
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
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.overlay}
            >
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Bagikan Survey</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>Survey: {surveyName}</Text>

                    {/* Input Share */}
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Masukkan email rekan..."
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                        <TouchableOpacity
                            style={[styles.shareButton, sharing && styles.disabledButton]}
                            onPress={handleShare}
                            disabled={sharing}
                        >
                            {sharing ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Text style={styles.shareText}>Invite</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* List Shares */}
                    <Text style={styles.sectionTitle}>Siapa yang punya akses?</Text>

                    {loadingShares ? (
                        <ActivityIndicator style={{ marginTop: 20 }} />
                    ) : shares.length === 0 ? (
                        <Text style={styles.emptyText}>Belum dibagikan ke siapapun.</Text>
                    ) : (
                        <FlatList
                            data={shares}
                            keyExtractor={item => item.id}
                            style={styles.list}
                            renderItem={({ item }) => (
                                <View style={styles.shareItem}>
                                    <View style={styles.avatar}>
                                        <Text style={styles.avatarText}>
                                            {item.sharedWithEmail.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 10 }}>
                                        <Text style={styles.emailText}>{item.sharedWithEmail}</Text>
                                        <Text style={styles.dateText}>
                                            Sejak {new Date(item.createdAt).toLocaleDateString()}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => handleRemoveShare(item.id, item.sharedWithEmail)}
                                        style={styles.removeButton}
                                    >
                                        <Text style={styles.removeText}>Hapus</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        />
                    )}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    container: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        maxHeight: '80%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
    },
    closeButton: {
        padding: 5,
    },
    closeText: {
        fontSize: 20,
        color: '#999',
    },
    inputContainer: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 24,
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
    },
    shareButton: {
        backgroundColor: '#2196F3',
        paddingHorizontal: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: '#90CAF9',
    },
    shareText: {
        color: 'white',
        fontWeight: 'bold',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 10,
        color: '#333',
    },
    list: {
        maxHeight: 300,
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        fontStyle: 'italic',
        marginTop: 10,
    },
    shareItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#E3F2FD',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#1565C0',
        fontWeight: 'bold',
        fontSize: 16,
    },
    emailText: {
        fontSize: 14,
        color: '#333',
    },
    dateText: {
        fontSize: 11,
        color: '#999',
    },
    removeButton: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: '#FFEBEE',
        borderRadius: 6,
    },
    removeText: {
        fontSize: 11,
        color: '#D32F2F',
        fontWeight: '600',
    },
});
