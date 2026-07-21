import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    ScrollView,
    Switch,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import {
    JENIS_PERMOHONAN_OPTIONS,
    TARIF_DAYA_OPTIONS,
    HASIL_SURVEY_OPTIONS,
    DEFAULT_BA_CHECKLIST,
    CHECKLIST_ITEMS,
} from '../../constants/surveyOptions';
import { Survey } from '../../types';
import SignatureCapture from './SignatureCapture';

// Types for BA Survey form
export interface BASurveyData {
    jenisPermohonan: string;
    tarifDaya: string;
    idPelanggan: string;
    namaPelanggan: string;
    alamat: string;
    tanggalSurvey: Date;
    hasilSurvey: string;
    namaSurveyor: string;
    namaPerwakilan: string;
    keterangan: string;
    appDipasang: 'Persil' | 'Gardu';
    konstruksiOleh: 'Pelanggan' | 'PLN';
    checklist: {
        perluasanJTM: boolean;
        bangunGardu: boolean;
        perluasanJTR: boolean;
        tanamTiang: boolean;
        dikenakanPFK: boolean;
    };
    // Signatures (base64 PNG data URL)
    signaturePelanggan?: string;
    signatureSurveyor?: string;
}

interface BASurveyFormProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: BASurveyData) => void;
    onRegeneratePDF?: (data: BASurveyData) => void;
    initialData?: Survey | null;
}

export default function BASurveyForm({ visible, onClose, onSubmit, onRegeneratePDF, initialData }: BASurveyFormProps) {
    const [jenisPermohonan, setJenisPermohonan] = useState(JENIS_PERMOHONAN_OPTIONS[0]);
    const [tarifDaya, setTarifDaya] = useState(TARIF_DAYA_OPTIONS[2]); // Default R1/1300VA
    const [customTarifDaya, setCustomTarifDaya] = useState('');
    const [showCustomTarif, setShowCustomTarif] = useState(false);
    const [idPelanggan, setIdPelanggan] = useState('');
    const [namaPelanggan, setNamaPelanggan] = useState('');
    const [alamat, setAlamat] = useState('');
    const [hasilSurvey, setHasilSurvey] = useState(HASIL_SURVEY_OPTIONS[0]);
    const [namaSurveyor, setNamaSurveyor] = useState('');
    const [namaPerwakilan, setNamaPerwakilan] = useState('');
    const [keterangan, setKeterangan] = useState('');
    const [appDipasang, setAppDipasang] = useState<'Persil' | 'Gardu'>('Persil');
    const [konstruksiOleh, setKonstruksiOleh] = useState<'Pelanggan' | 'PLN'>('Pelanggan');

    const [checklist, setChecklist] = useState({ ...DEFAULT_BA_CHECKLIST });

    // Signature states
    const [signaturePelanggan, setSignaturePelanggan] = useState<string>('');
    const [signatureSurveyor, setSignatureSurveyor] = useState<string>('');
    const [showSignaturePad, setShowSignaturePad] = useState<'pelanggan' | 'surveyor' | null>(null);

    // Initialize state if initialData is provided
    useEffect(() => {
        if (visible && initialData) {
            setJenisPermohonan(initialData.jenisSurvey || JENIS_PERMOHONAN_OPTIONS[0]);
            
            // Handle Tarif / Daya mapping
            if (initialData.tarifDaya && TARIF_DAYA_OPTIONS.includes(initialData.tarifDaya)) {
                setTarifDaya(initialData.tarifDaya);
                setShowCustomTarif(false);
                setCustomTarifDaya('');
            } else if (initialData.tarifDaya) {
                setTarifDaya('Ketik Manual...');
                setShowCustomTarif(true);
                setCustomTarifDaya(initialData.tarifDaya);
            }

            setIdPelanggan(initialData.idPelanggan || '');
            setNamaPelanggan(initialData.namaSurvey.split(' - ')[1]?.split(' (')[0] || ''); // fallback attempt if original name is gone, though ideally user types it
            // Oh wait, Survey has `lokasi`, not `namaPelanggan` directly. But if they just created it, it might be recoverable.
            setAlamat(initialData.lokasi || '');
            setHasilSurvey(initialData.hasilSurvey || HASIL_SURVEY_OPTIONS[0]);
            setNamaSurveyor(initialData.surveyor || '');
            setNamaPerwakilan(initialData.namaPerwakilan || '');
            setKeterangan(initialData.keterangan || '');
            setAppDipasang(initialData.appDipasang || 'Persil');
            setKonstruksiOleh(initialData.konstruksiOleh || 'Pelanggan');
            setChecklist(initialData.baChecklist || { ...DEFAULT_BA_CHECKLIST });
            setSignaturePelanggan(initialData.signaturePelanggan || '');
            setSignatureSurveyor(initialData.signatureSurveyor || '');
        } else if (visible && !initialData) {
            // Reset to default on open as new
            resetForm();
        }
    }, [visible, initialData]);

    const resetForm = () => {
        setJenisPermohonan(JENIS_PERMOHONAN_OPTIONS[0]);
        setTarifDaya(TARIF_DAYA_OPTIONS[2]);
        setCustomTarifDaya('');
        setShowCustomTarif(false);
        setIdPelanggan('');
        setNamaPelanggan('');
        setAlamat('');
        setHasilSurvey(HASIL_SURVEY_OPTIONS[0]);
        setNamaSurveyor('');
        setNamaPerwakilan('');
        setKeterangan('');
        setAppDipasang('Persil');
        setKonstruksiOleh('Pelanggan');
        setChecklist({ ...DEFAULT_BA_CHECKLIST });
        setSignaturePelanggan('');
        setSignatureSurveyor('');
    };

    const handleTarifDayaChange = (value: string) => {
        if (value === 'Ketik Manual...') {
            setShowCustomTarif(true);
            setTarifDaya(value);
        } else {
            setShowCustomTarif(false);
            setTarifDaya(value);
        }
    };

    const handleSubmit = () => {
        const finalTarifDaya = showCustomTarif ? customTarifDaya : tarifDaya;

        if (!namaPelanggan.trim()) {
            alert('Nama Pelanggan harus diisi');
            return;
        }
        if (!alamat.trim()) {
            alert('Alamat harus diisi');
            return;
        }

        onSubmit({
            jenisPermohonan,
            tarifDaya: finalTarifDaya,
            idPelanggan,
            namaPelanggan,
            alamat,
            tanggalSurvey: new Date(),
            hasilSurvey,
            namaSurveyor,
            namaPerwakilan,
            keterangan,
            appDipasang,
            konstruksiOleh,
            checklist,
            signaturePelanggan,
            signatureSurveyor,
        });

        // We don't reset form here anymore, it's handled by visibility/initialData effect
        // Just let the parent close it.


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
                        <Text style={styles.title}>{initialData ? 'EDIT DATA SURVEY' : 'BERITA ACARA SURVEY'}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* Jenis Permohonan */}
                        <Text style={styles.label}>Jenis Permohonan</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={jenisPermohonan}
                                onValueChange={setJenisPermohonan}
                                style={styles.picker}
                            >
                                {JENIS_PERMOHONAN_OPTIONS.map((opt) => (
                                    <Picker.Item key={opt} label={opt} value={opt} />
                                ))}
                            </Picker>
                        </View>

                        {/* Tarif/Daya */}
                        <Text style={styles.label}>Tarif / Daya</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={tarifDaya}
                                onValueChange={handleTarifDayaChange}
                                style={styles.picker}
                            >
                                {TARIF_DAYA_OPTIONS.map((opt) => (
                                    <Picker.Item key={opt} label={opt} value={opt} />
                                ))}
                            </Picker>
                        </View>
                        {showCustomTarif && (
                            <TextInput
                                style={styles.input}
                                placeholder="Ketik tarif/daya manual, cth: R1 / 3500VA"
                                value={customTarifDaya}
                                onChangeText={setCustomTarifDaya}
                            />
                        )}

                        {/* ID Pelanggan */}
                        <Text style={styles.label}>ID Pelanggan (Opsional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Contoh: 12345678901"
                            value={idPelanggan}
                            onChangeText={setIdPelanggan}
                            keyboardType="numeric"
                        />

                        {/* Nama Pelanggan */}
                        <Text style={styles.label}>Nama Pelanggan / Perusahaan *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Contoh: PT. Mekarjaya Propertindo"
                            value={namaPelanggan}
                            onChangeText={setNamaPelanggan}
                        />

                        {/* Alamat */}
                        <Text style={styles.label}>Alamat *</Text>
                        <TextInput
                            style={[styles.input, { height: 60 }]}
                            placeholder="Contoh: Kp. Cihaseum Kel. Pandeglang"
                            value={alamat}
                            onChangeText={setAlamat}
                            multiline
                        />

                        {/* Hasil Survey */}
                        <Text style={styles.label}>Hasil Survey Lokasi</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={hasilSurvey}
                                onValueChange={setHasilSurvey}
                                style={styles.picker}
                            >
                                {HASIL_SURVEY_OPTIONS.map((opt) => (
                                    <Picker.Item key={opt} label={opt} value={opt} />
                                ))}
                            </Picker>
                        </View>

                        {/* Checklist */}
                        <Text style={[styles.label, { marginTop: 15 }]}>Checklist Pekerjaan</Text>
                        <View style={styles.checklistContainer}>
                            {CHECKLIST_ITEMS.map((item) => (
                                <View key={item.key} style={styles.checklistItem}>
                                    <Text style={styles.checklistLabel}>{item.label}</Text>
                                    <Switch
                                        value={checklist[item.key as keyof typeof checklist]}
                                        onValueChange={(v) =>
                                            setChecklist((prev) => ({ ...prev, [item.key]: v }))
                                        }
                                        trackColor={{ false: '#767577', true: '#81b0ff' }}
                                        thumbColor={checklist[item.key as keyof typeof checklist] ? '#1565C0' : '#f4f3f4'}
                                    />
                                </View>
                            ))}
                        </View>

                        {/* Keterangan */}
                        <Text style={[styles.label, { marginTop: 15 }]}>Keterangan</Text>
                        <TextInput
                            style={[styles.input, { height: 80 }]}
                            placeholder="Contoh: Kebutuhan tiang 2 btg, gambar terlampir..."
                            value={keterangan}
                            onChangeText={setKeterangan}
                            multiline
                        />

                        {/* Pasal 7: APP Dipasang */}
                        <Text style={styles.label}>7. APP Dipasang di</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={appDipasang}
                                onValueChange={(v) => setAppDipasang(v as 'Persil' | 'Gardu')}
                                style={styles.picker}
                            >
                                <Picker.Item label="Persil (Bagian Depan)" value="Persil" />
                                <Picker.Item label="Gardu" value="Gardu" />
                            </Picker>
                        </View>

                        {/* Pasal 8: Konstruksi Bangunan Gardu */}
                        <Text style={styles.label}>8. Konstruksi Bangunan Gardu Oleh</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={konstruksiOleh}
                                onValueChange={(v) => setKonstruksiOleh(v as 'Pelanggan' | 'PLN')}
                                style={styles.picker}
                            >
                                <Picker.Item label="Pelanggan" value="Pelanggan" />
                                <Picker.Item label="PLN" value="PLN" />
                            </Picker>
                        </View>

                        {/* Separator: Tanda Tangan */}
                        <Text style={{ marginTop: 20, marginBottom: 10, fontSize: 14, fontWeight: 'bold', color: '#1565C0' }}>
                            Tanda Tangan
                        </Text>

                        {/* Nama Perwakilan Pelanggan */}
                        <Text style={styles.label}>Nama Perwakilan Pelanggan</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Nama perwakilan yang menandatangani"
                            value={namaPerwakilan}
                            onChangeText={setNamaPerwakilan}
                        />
                        {/* Signature Pelanggan */}
                        <TouchableOpacity
                            style={{ marginTop: 8, padding: 12, backgroundColor: signaturePelanggan ? '#E8F5E9' : '#f0f0f0', borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: signaturePelanggan ? '#4CAF50' : '#ddd', borderStyle: 'dashed' }}
                            onPress={() => setShowSignaturePad('pelanggan')}
                        >
                            {signaturePelanggan ? (
                                <Image source={{ uri: signaturePelanggan }} style={{ width: 200, height: 60, resizeMode: 'contain' }} />
                            ) : (
                                <View style={{ alignItems: 'center' }}>
                                    <Ionicons name="create-outline" size={24} color="#666" />
                                    <Text style={{ color: '#666', marginTop: 4 }}>+ Tambah Tanda Tangan Pelanggan</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Nama Surveyor PLN */}
                        <Text style={styles.label}>Nama Surveyor PLN</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Nama surveyor PLN"
                            value={namaSurveyor}
                            onChangeText={setNamaSurveyor}
                        />
                        {/* Signature Surveyor */}
                        <TouchableOpacity
                            style={{ marginTop: 8, padding: 12, backgroundColor: signatureSurveyor ? '#E3F2FD' : '#f0f0f0', borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: signatureSurveyor ? '#2196F3' : '#ddd', borderStyle: 'dashed', marginBottom: 20 }}
                            onPress={() => setShowSignaturePad('surveyor')}
                        >
                            {signatureSurveyor ? (
                                <Image source={{ uri: signatureSurveyor }} style={{ width: 200, height: 60, resizeMode: 'contain' }} />
                            ) : (
                                <View style={{ alignItems: 'center' }}>
                                    <Ionicons name="create-outline" size={24} color="#666" />
                                    <Text style={{ color: '#666', marginTop: 4 }}>+ Tambah Tanda Tangan Surveyor</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </ScrollView>

                    {/* Submit Button */}
                    <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                        <Ionicons name={initialData ? "save" : "checkmark-circle"} size={20} color="white" style={{ marginRight: 8 }} />
                        <Text style={styles.submitText}>{initialData ? 'Simpan Perubahan' : 'Buat Survey & Generate PDF'}</Text>
                    </TouchableOpacity>

                    {/* Regenerate PDF Button for Edit Mode */}
                    {initialData && onRegeneratePDF && (
                        <TouchableOpacity 
                            style={[styles.submitButton, { backgroundColor: '#FF9800', marginTop: 0 }]} 
                            onPress={() => {
                                const finalTarifDaya = showCustomTarif ? customTarifDaya : tarifDaya;
                                onRegeneratePDF({
                                    jenisPermohonan,
                                    tarifDaya: finalTarifDaya,
                                    idPelanggan,
                                    namaPelanggan,
                                    alamat,
                                    tanggalSurvey: new Date(initialData.tanggalSurvey || Date.now()),
                                    hasilSurvey,
                                    namaSurveyor,
                                    namaPerwakilan,
                                    keterangan,
                                    appDipasang,
                                    konstruksiOleh,
                                    checklist,
                                    signaturePelanggan,
                                    signatureSurveyor,
                                });
                            }}
                        >
                            <Ionicons name="document-text" size={20} color="white" style={{ marginRight: 8 }} />
                            <Text style={styles.submitText}>Regenerate BA PDF</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Signature Capture Modal */}
            <SignatureCapture
                visible={showSignaturePad !== null}
                title={showSignaturePad === 'pelanggan' ? 'Tanda Tangan Perwakilan Pelanggan' : 'Tanda Tangan Surveyor PLN'}
                onSave={(signature) => {
                    if (showSignaturePad === 'pelanggan') {
                        setSignaturePelanggan(signature);
                    } else if (showSignaturePad === 'surveyor') {
                        setSignatureSurveyor(signature);
                    }
                    setShowSignaturePad(null);
                }}
                onCancel={() => setShowSignaturePad(null)}
            />
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        backgroundColor: 'white',
        borderRadius: 15,
        width: '92%',
        maxHeight: '90%',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        backgroundColor: '#1565C0',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
    },
    closeButton: {
        padding: 5,
        backgroundColor: 'white',
        borderRadius: 15,
    },
    content: {
        padding: 15,
        maxHeight: 450,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#333',
        marginBottom: 5,
        marginTop: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
        backgroundColor: '#f9f9f9',
        color: '#333',
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        backgroundColor: '#f9f9f9',
        overflow: 'hidden',
    },
    picker: {
        height: 50,
        color: '#333',
    },
    checklistContainer: {
        backgroundColor: '#f5f5f5',
        borderRadius: 10,
        padding: 10,
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
    submitButton: {
        backgroundColor: '#4CAF50',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 15,
        margin: 15,
        borderRadius: 10,
    },
    submitText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
