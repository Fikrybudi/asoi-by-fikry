/**
 * Signature Capture Modal Component
 * Uses react-native-signature-canvas for capturing signatures
 */

import React, { useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    StyleSheet,
    Dimensions,
    SafeAreaView,
} from 'react-native';
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas';

interface SignatureCaptureProps {
    visible: boolean;
    title: string;
    onSave: (signature: string) => void;
    onCancel: () => void;
}

export default function SignatureCapture({
    visible,
    title,
    onSave,
    onCancel,
}: SignatureCaptureProps) {
    const signatureRef = useRef<SignatureViewRef>(null);

    const handleSave = () => {
        signatureRef.current?.readSignature();
    };

    const handleClear = () => {
        signatureRef.current?.clearSignature();
    };

    const handleOK = (signature: string) => {
        // signature is base64 PNG data URL
        onSave(signature);
    };

    const handleEmpty = () => {
        // Do nothing if empty
    };

    const style = `.m-signature-pad { box-shadow: none; border: none; }
                   .m-signature-pad--body { border: none; }
                   .m-signature-pad--footer { display: none; margin: 0px; }
                   body,html { width: 100%; height: 100%; }`;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={onCancel}
        >
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onCancel}>
                        <Text style={styles.cancelButton}>Batal</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>{title}</Text>
                    <TouchableOpacity onPress={handleSave}>
                        <Text style={styles.saveButton}>Simpan</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.instruction}>
                    Tanda tangan di area putih di bawah ini
                </Text>

                <View style={styles.signatureContainer}>
                    <SignatureScreen
                        ref={signatureRef}
                        onOK={handleOK}
                        onEmpty={handleEmpty}
                        webStyle={style}
                        backgroundColor="white"
                        penColor="black"
                    />
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
                        <Text style={styles.clearButtonText}>🗑️ Hapus</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const { width } = Dimensions.get('window');

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
    cancelButton: {
        fontSize: 16,
        color: '#666',
    },
    saveButton: {
        fontSize: 16,
        color: '#2196F3',
        fontWeight: '600',
    },
    instruction: {
        textAlign: 'center',
        padding: 16,
        fontSize: 14,
        color: '#666',
    },
    signatureContainer: {
        flex: 1,
        marginHorizontal: 16,
        marginBottom: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#ddd',
        borderStyle: 'dashed',
        overflow: 'hidden',
    },
    footer: {
        padding: 16,
        alignItems: 'center',
    },
    clearButton: {
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    clearButtonText: {
        fontSize: 16,
        color: '#666',
    },
});
