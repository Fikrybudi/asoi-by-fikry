import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    ScrollView,
    Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

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
}

// Dropdown options
const JENIS_PERMOHONAN_OPTIONS = [
    'Pasang Baru',
    'Perluasan Jaringan',
    'Tambah Daya',
    'Penurunan Daya',
    'Perubahan Tarif',
    'P2TL',
    'Survey Perencanaan',
];

const TARIF_DAYA_OPTIONS = [
    'R1 / 450VA',
    'R1 / 900VA',
    'R1 / 1300VA',
    'R1 / 2200VA',
    'R1M / 3500VA',
    'R1M / 4400VA',
    'R1M / 5500VA',
    'R1M / 6600VA',
    'R2 / 3500VA - 14kVA',
    'R3 / >14kVA',
    'B1 / 450VA - 5500VA',
    'B2 / 6600VA - 200kVA',
    'B3 / >200kVA',
    'P1 / 450VA - 5500VA',
    'P2 / 6600VA - 200kVA',
    'P3 / >200kVA',
    'Lainnya...',
];

const HASIL_SURVEY_OPTIONS = [
    'Survei Perencanaan',
    'Layak Pasang',
    'Tidak Layak',
    'Perlu Perluasan',
    'Pending Dokumen',
];

export default function BASurveyForm({ visible, onClose, onSubmit }: BASurveyFormProps) {
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

    const [checklist, setChecklist] = useState({
        perluasanJTM: false,
        bangunGardu: false,
        perluasanJTR: false,
        tanamTiang: false,
        dikenakanPFK: false,
    });

    const handleTarifDayaChange = (value: string) => {
        if (value === 'Lainnya...') {
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
        });

        // Reset form
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
        setChecklist({
            perluasanJTM: false,
            bangunGardu: false,
            perluasanJTR: false,
            tanamTiang: false,
            dikenakanPFK: false,
        });
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
                        <Text style={styles.title}>BERITA ACARA SURVEY</Text>
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
                                placeholder="Ketik tarif/daya manual..."
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
                            {[
                                { key: 'perluasanJTM', label: 'Perluasan JTM' },
                                { key: 'bangunGardu', label: 'Bangun Gardu' },
                                { key: 'perluasanJTR', label: 'Perluasan JTR' },
                                { key: 'tanamTiang', label: 'Tanam Tiang' },
                                { key: 'dikenakanPFK', label: 'Dikenakan PFK' },
                            ].map((item) => (
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

                        {/* Keterangan */}
                        <Text style={[styles.label, { marginTop: 15 }]}>Keterangan</Text>
                        <TextInput
                            style={[styles.input, { height: 80 }]}
                            placeholder="Contoh: Kebutuhan tiang 2 btg, gambar terlampir..."
                            value={keterangan}
                            onChangeText={setKeterangan}
                            multiline
                        />

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

                        {/* Nama Surveyor PLN */}
                        <Text style={styles.label}>Nama Surveyor PLN</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Nama surveyor PLN"
                            value={namaSurveyor}
                            onChangeText={setNamaSurveyor}
                        />
                    </ScrollView>

                    {/* Submit Button */}
                    <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                        <Ionicons name="checkmark-circle" size={20} color="white" style={{ marginRight: 8 }} />
                        <Text style={styles.submitText}>Buat Survey & Generate PDF</Text>
                    </TouchableOpacity>
                </View>
            </View>
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
