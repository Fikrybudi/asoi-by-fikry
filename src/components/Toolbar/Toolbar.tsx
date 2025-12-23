// =============================================================================
// PLN SURVEY APP - Toolbar Component
// =============================================================================

import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';

// =============================================================================
// TYPES
// =============================================================================

export type ToolMode = 'none' | 'add-tiang' | 'add-gardu' | 'draw-jalur' | 'underbuild-sutr';

interface ToolbarProps {
    currentMode: ToolMode;
    onModeChange: (mode: ToolMode) => void;
    onFinishDrawing?: () => void;
    onCancelDrawing?: () => void;
    isDrawing?: boolean;
    drawingPointsCount?: number;
    // Underbuild specific
    underbuildTiangCount?: number;
    onFinishUnderbuild?: () => void;
    onCancelUnderbuild?: () => void;
    onOpenSummary?: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function Toolbar({
    currentMode,
    onModeChange,
    onFinishDrawing,
    onCancelDrawing,
    isDrawing = false,
    drawingPointsCount = 0,
    underbuildTiangCount = 0,
    onFinishUnderbuild,
    onCancelUnderbuild,
    onOpenSummary,
}: ToolbarProps) {

    const toggleMode = (mode: ToolMode) => {
        onModeChange(currentMode === mode ? 'none' : mode);
    };

    // ==========================================================================
    // RENDER UNDERBUILD CONTROLS
    // ==========================================================================

    if (currentMode === 'underbuild-sutr') {
        return (
            <View style={styles.underbuildToolbar}>
                <View style={styles.drawingInfo}>
                    <Text style={styles.underbuildInfoText}>
                        🔌 Underbuild SUTR - Pilih tiang ({underbuildTiangCount} dipilih)
                    </Text>
                    <Text style={styles.underbuildSubtext}>
                        Tap tiang SUTM untuk dipasang jalur SUTR
                    </Text>
                </View>
                <View style={styles.drawingActions}>
                    <TouchableOpacity
                        style={[styles.drawingButton, styles.cancelButton]}
                        onPress={onCancelUnderbuild}
                    >
                        <Text style={styles.cancelButtonText}>Batal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.drawingButton,
                            styles.underbuildFinishButton,
                            underbuildTiangCount < 2 && styles.disabledButton
                        ]}
                        onPress={onFinishUnderbuild}
                        disabled={underbuildTiangCount < 2}
                    >
                        <Text style={styles.underbuildFinishButtonText}>
                            Buat Jalur ✓
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // ==========================================================================
    // RENDER DRAWING CONTROLS
    // ==========================================================================

    if (isDrawing && currentMode === 'draw-jalur') {
        return (
            <View style={styles.drawingToolbar}>
                <View style={styles.drawingInfo}>
                    <Text style={styles.drawingInfoText}>
                        ✏️ Menggambar jalur ({drawingPointsCount} titik)
                    </Text>
                </View>
                <View style={styles.drawingActions}>
                    <TouchableOpacity
                        style={[styles.drawingButton, styles.cancelButton]}
                        onPress={onCancelDrawing}
                    >
                        <Text style={styles.cancelButtonText}>Batal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.drawingButton,
                            styles.finishButton,
                            drawingPointsCount < 2 && styles.disabledButton
                        ]}
                        onPress={onFinishDrawing}
                        disabled={drawingPointsCount < 2}
                    >
                        <Text style={styles.finishButtonText}>
                            Selesai ✓
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // ==========================================================================
    // RENDER MAIN TOOLBAR
    // ==========================================================================

    return (
        <View style={styles.container}>
            {/* Add Tiang Button */}
            <TouchableOpacity
                style={[
                    styles.toolButton,
                    currentMode === 'add-tiang' && styles.toolButtonActive,
                ]}
                onPress={() => toggleMode('add-tiang')}
            >
                <Text style={styles.toolIcon}>📍</Text>
                <Text
                    style={[
                        styles.toolLabel,
                        currentMode === 'add-tiang' && styles.toolLabelActive,
                    ]}
                >
                    Tiang
                </Text>
            </TouchableOpacity>

            {/* Add Gardu Button */}
            <TouchableOpacity
                style={[
                    styles.toolButton,
                    currentMode === 'add-gardu' && styles.toolButtonActive,
                ]}
                onPress={() => toggleMode('add-gardu')}
            >
                <Text style={styles.toolIcon}>🏠</Text>
                <Text
                    style={[
                        styles.toolLabel,
                        currentMode === 'add-gardu' && styles.toolLabelActive,
                    ]}
                >
                    Gardu
                </Text>
            </TouchableOpacity>

            {/* Draw Jalur Button */}
            <TouchableOpacity
                style={[
                    styles.toolButton,
                    currentMode === 'draw-jalur' && styles.toolButtonActive,
                ]}
                onPress={() => toggleMode('draw-jalur')}
            >
                <Text style={styles.toolIcon}>✏️</Text>
                <Text
                    style={[
                        styles.toolLabel,
                        currentMode === 'draw-jalur' && styles.toolLabelActive,
                    ]}
                >
                    Jalur
                </Text>
            </TouchableOpacity>

            {/* Underbuild SUTR Button */}
            <TouchableOpacity
                style={[
                    styles.toolButton,
                    (currentMode as string) === 'underbuild-sutr' && styles.toolButtonActiveGreen,
                ]}
                onPress={() => toggleMode('underbuild-sutr')}
            >
                <Text style={styles.toolIcon}>🔌</Text>
                <Text
                    style={[
                        styles.toolLabel,
                        (currentMode as string) === 'underbuild-sutr' && styles.toolLabelActiveGreen,
                    ]}
                >
                    Under
                </Text>
            </TouchableOpacity>

            {/* Finish/Summary Button */}
            <TouchableOpacity
                style={[styles.toolButton, styles.finishSurveyButton]}
                onPress={onOpenSummary}
            >
                <Text style={styles.toolIcon}>🏁</Text>
                <Text style={[styles.toolLabel, styles.finishSurveyText]}>Selesai</Text>
            </TouchableOpacity>
        </View>
    );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: 'white',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        justifyContent: 'space-around',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 8,
    },
    toolButton: {
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        minWidth: 60,
    },
    toolButtonActive: {
        backgroundColor: '#E3F2FD',
    },
    toolIcon: {
        fontSize: 24,
        marginBottom: 4,
    },
    toolLabel: {
        fontSize: 11,
        color: '#666',
        fontWeight: '500',
    },
    toolLabelActive: {
        color: '#1976D2',
        fontWeight: '600',
    },
    // Drawing mode styles
    drawingToolbar: {
        backgroundColor: '#2196F3',
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    drawingInfo: {
        flex: 1,
    },
    drawingInfoText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
    },
    drawingActions: {
        flexDirection: 'row',
        gap: 8,
    },
    drawingButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
    },
    cancelButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    cancelButtonText: {
        color: 'white',
        fontWeight: '500',
    },
    finishButton: {
        backgroundColor: 'white',
    },
    finishButtonText: {
        color: '#2196F3',
        fontWeight: '600',
    },
    disabledButton: {
        opacity: 0.5,
    },
    // Underbuild mode styles
    toolButtonActiveGreen: {
        backgroundColor: '#E8F5E9',
    },
    toolLabelActiveGreen: {
        color: '#4CAF50',
        fontWeight: '600',
    },
    underbuildToolbar: {
        backgroundColor: '#4CAF50',
        paddingVertical: 10,
        paddingHorizontal: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    underbuildInfoText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '600',
    },
    underbuildSubtext: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 10,
        marginTop: 2,
    },
    underbuildFinishButton: {
        backgroundColor: 'white',
    },
    underbuildFinishButtonText: {
        color: '#4CAF50',
        fontWeight: '600',
    },
    finishSurveyButton: {
        backgroundColor: '#E8F5E9',
        borderWidth: 1,
        borderColor: '#4CAF50',
    },
    finishSurveyText: {
        color: '#2E7D32',
        fontWeight: 'bold',
    },
});
