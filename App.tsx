// =============================================================================
// PLN SURVEY APP - Main Application
// =============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, StatusBar, SafeAreaView, Text, Alert, TouchableOpacity, Modal, Switch, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import SurveyMap, { SurveyMapRef } from './src/components/Map/SurveyMap';
import Toolbar, { ToolMode } from './src/components/Toolbar/Toolbar';
import TiangForm from './src/components/Forms/TiangForm';
import GarduForm from './src/components/Forms/GarduForm';
import JalurForm from './src/components/Forms/JalurForm';
import SurveySummaryScreen from './src/screens/SurveySummaryScreen';
import SurveyHistoryScreen from './src/screens/SurveyHistoryScreen';
import { Coordinate, Tiang, Gardu, JalurKabel, Survey } from './src/types';
import { surveyService, tiangService, garduService, jalurService } from './src/services/database';
import { calculateDistance } from './src/utils/geoUtils';
import { generatePdfWithMap, sharePdf } from './src/utils/pdfExport';
import { Session } from '@supabase/supabase-js';
import { supabase } from './src/services/supabaseClient';
import LoginScreen from './src/screens/LoginScreen';
import BASurveyForm, { BASurveyData } from './src/components/Forms/BASurveyForm';
import { generateBASurveyPdf } from './src/utils/baSurveyPdf';

// ... other imports

export default function App() {
  // ==========================================================================
  // STATE
  // ==========================================================================

  const [session, setSession] = useState<Session | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  const [currentSurvey, setCurrentSurvey] = useState<Survey | null>(null);
  const [toolMode, setToolMode] = useState<ToolMode>('none');

  // Form states
  const [showTiangForm, setShowTiangForm] = useState(false);
  const [showGarduForm, setShowGarduForm] = useState(false);
  const [showJalurForm, setShowJalurForm] = useState(false);

  // Selected coordinate for new marker
  const [selectedCoordinate, setSelectedCoordinate] = useState<Coordinate | null>(null);

  // Drawing jalur state
  const [drawingCoords, setDrawingCoords] = useState<Coordinate[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  // Remember last jenis jaringan for next tiang
  const [lastJenisJaringan, setLastJenisJaringan] = useState<'SUTM' | 'SUTR' | 'SKUTM'>('SUTM');

  // Edit jalur state
  const [editingJalur, setEditingJalur] = useState<JalurKabel | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Edit tiang/gardu state
  const [editingTiang, setEditingTiang] = useState<Tiang | null>(null);
  const [editingGardu, setEditingGardu] = useState<Gardu | null>(null);

  // Remember last penghantar for auto-created jalur
  const [lastPenghantar, setLastPenghantar] = useState<{ jenis: string; penampang: string }>({
    jenis: 'A3CS',
    penampang: '150mm²',
  });

  // Summary screen state
  const [showSummary, setShowSummary] = useState(false);

  // History screen state
  const [showHistory, setShowHistory] = useState(false);

  // Underbuild SUTR state
  const [underbuildTiangIds, setUnderbuildTiangIds] = useState<string[]>([]);

  // Map ref for capturing screenshots
  const mapRef = useRef<SurveyMapRef>(null);

  // UI Visibility State
  const [uiHidden, setUiHidden] = useState(false);

  // Layer Visibility State
  const [showLayerControl, setShowLayerControl] = useState(false);
  const [layerVisibility, setLayerVisibility] = useState({
    tiang: true,
    gardu: true,
    titikTiang: true,
    titikGardu: true,
    sutr: true,
    sutm: true,
    skutm: true,
    sktm: true,
  });

  // Center coordinate for pin placement
  const [centerCoordinate, setCenterCoordinate] = useState<Coordinate | null>(null);

  // Menu and About modal states
  const [showMenu, setShowMenu] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  // BA Survey form state
  const [showBASurveyForm, setShowBASurveyForm] = useState(false);

  // ==========================================================================
  // EFFECTS
  // ==========================================================================

  useEffect(() => {
    // 1. Check for valid session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthInitialized(true);
      if (session) {
        initializeSurvey();
      }
    });

    // 2. Listen for auth changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session && !currentSurvey) {
        initializeSurvey();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const initializeSurvey = async () => {
    // ... logic to load survey (same as before)
    try {
      console.log('Initializing survey...');

      // Try to get existing survey or create new one
      let survey = await surveyService.getCurrent();

      if (!survey) {
        survey = await surveyService.create({
          namaSurvey: 'Survey PLN ' + new Date().toLocaleDateString('id-ID'),
          jenisSurvey: 'Survey Umum',
          lokasi: 'Lokasi Survey',
          surveyor: 'Surveyor',
          tanggalSurvey: new Date(),
          tiangList: [],
          garduList: [],
          jalurList: [],
        });
        await surveyService.setCurrent(survey.id);
      }

      setCurrentSurvey(survey);

      // Set last jenis jaringan from last tiang if exists
      if (survey.tiangList.length > 0) {
        const lastTiang = survey.tiangList[survey.tiangList.length - 1];
        setLastJenisJaringan(lastTiang.jenisJaringan);
      }

      console.log('Survey loaded successfully');
    } catch (error) {
      console.error('Error initializing survey:', error);
      Alert.alert('Error', 'Gagal memuat survey: ' + String(error));

      // Create fallback survey in memory only
      const fallbackSurvey: Survey = {
        id: 'temp-' + Date.now(),
        namaSurvey: 'Survey Temporary',
        jenisSurvey: 'Survey Umum',
        lokasi: 'Lokasi Survey',
        surveyor: 'Surveyor',
        tanggalSurvey: new Date(),
        tiangList: [],
        garduList: [],
        jalurList: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isSynced: false,
      };
      setCurrentSurvey(fallbackSurvey);
    }
  };

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleMapPress = (coordinate: Coordinate) => {
    if (toolMode === 'add-tiang') {
      setSelectedCoordinate(coordinate);
      setShowTiangForm(true);
    } else if (toolMode === 'add-gardu') {
      setSelectedCoordinate(coordinate);
      setShowGarduForm(true);
    } else if (toolMode === 'draw-jalur') {
      setDrawingCoords(prev => [...prev, coordinate]);
      setIsDrawing(true);
    }
  };

  const handleModeChange = (mode: ToolMode) => {
    // If switching away from draw mode, cancel drawing
    if (toolMode === 'draw-jalur' && mode !== 'draw-jalur') {
      setDrawingCoords([]);
      setIsDrawing(false);
    }
    setToolMode(mode);
  };

  const handleFinishDrawing = () => {
    if (drawingCoords.length >= 2) {
      setShowJalurForm(true);
    }
  };

  const handleCancelDrawing = () => {
    setDrawingCoords([]);
    setIsDrawing(false);
    setToolMode('none');
  };

  // Handler for PDF Gambar export (captures map and generates PDF)
  const handleExportPDFGambar = async () => {
    if (!mapRef.current || !currentSurvey) {
      Alert.alert('Error', 'Tidak ada survey aktif');
      return;
    }

    // Capture optimal map screenshot
    const mapBase64 = await mapRef.current.captureOptimalMap();
    if (!mapBase64) {
      Alert.alert('Error', 'Gagal capture peta');
      return;
    }

    // Generate PDF with map
    const pdfPath = await generatePdfWithMap(mapBase64, currentSurvey.namaSurvey);
    if (!pdfPath) {
      Alert.alert('Error', 'Gagal generate PDF');
      return;
    }

    // Share the PDF
    Alert.alert('✅ Berhasil', 'PDF Gambar berhasil dibuat!');
    await sharePdf(pdfPath);
  };

  // ==========================================================================
  // FORM SUBMIT HANDLERS
  // ==========================================================================

  const handleTiangSubmit = async (
    data: Omit<Tiang, 'id' | 'nomorUrut' | 'createdAt' | 'updatedAt' | 'isSynced'>,
    standarUsed: 'Nasional' | 'Lokal'
  ) => {
    try {
      if (!currentSurvey) {
        Alert.alert('Error', 'Survey belum dimuat');
        return;
      }

      // EDIT MODE: Update existing tiang
      if (editingTiang) {
        const updated = await tiangService.update(currentSurvey.id, editingTiang.id, data);
        if (updated) {
          setCurrentSurvey(prev => prev ? {
            ...prev,
            tiangList: prev.tiangList.map(t => t.id === editingTiang.id ? updated : t),
          } : null);
        }
        setEditingTiang(null);
        setShowTiangForm(false);
        setSelectedCoordinate(null);
        setToolMode('none');
        return;
      }

      // CREATE MODE: Add new tiang
      // Remember the jenis jaringan for next tiang
      setLastJenisJaringan(data.jenisJaringan);

      const previousTiangCount = currentSurvey.tiangList.length;
      const newTiang = await tiangService.add(currentSurvey.id, data);

      if (newTiang) {
        const updatedTiangList = [...currentSurvey.tiangList, newTiang];

        // Lock standarKonstruksi on first SUTM tiang
        const shouldLockStandar = !currentSurvey.standarKonstruksi && data.jenisJaringan === 'SUTM';

        setCurrentSurvey(prev => prev ? {
          ...prev,
          tiangList: updatedTiangList,
          ...(shouldLockStandar && { standarKonstruksi: standarUsed }),
        } : null);

        // If this is tiang #2 or more, offer to auto-connect with previous tiang
        if (previousTiangCount >= 1) {
          const prevTiang = currentSurvey.tiangList[previousTiangCount - 1];

          // Determine penghantar based on jaringan type or lastPenghantar
          const getPenghantar = () => {
            if (data.jenisJaringan === 'SUTR') {
              return { jenis: 'NFA2X', penampang: '3x70+1x50mm²' };
            }
            // Use remembered penghantar for SUTM/SKUTM
            return lastPenghantar;
          };
          const penghantar = getPenghantar();

          // Check if there's an existing jalur that ends at prevTiang with same penghantar
          const existingJalur = currentSurvey.jalurList.find(j =>
            j.tiangIds &&
            j.tiangIds[j.tiangIds.length - 1] === prevTiang.id &&
            j.jenisPenghantar === penghantar.jenis &&
            j.penampangMM === penghantar.penampang
          );

          const segmentDistance = calculateDistance(prevTiang.koordinat, newTiang.koordinat);
          const actionText = existingJalur
            ? `Extend jalur (total: ${existingJalur.tiangIds?.length || 1} tiang)`
            : 'Buat jalur baru';

          Alert.alert(
            '🔗 Hubungkan Jalur?',
            `Tiang ${newTiang.nomorUrut} disimpan!\n\n${actionText} dari Tiang ${prevTiang.nomorUrut} ke Tiang ${newTiang.nomorUrut}?\n\n📌 ${penghantar.jenis} ${penghantar.penampang}\n📏 +${segmentDistance.toFixed(0)}m`,
            [
              {
                text: 'Tidak',
                style: 'cancel',
              },
              {
                text: 'Ya + Lanjut',
                onPress: async () => {
                  if (existingJalur) {
                    // Extend existing jalur
                    const updatedKoordinat = [...existingJalur.koordinat, newTiang.koordinat];
                    const updatedTiangIds = [...(existingJalur.tiangIds || []), newTiang.id];
                    const totalPanjang = existingJalur.panjangMeter + segmentDistance;

                    const updated = await jalurService.update(currentSurvey.id, existingJalur.id, {
                      koordinat: updatedKoordinat,
                      tiangIds: updatedTiangIds,
                      panjangMeter: totalPanjang,
                    });

                    if (updated) {
                      setCurrentSurvey(prev => prev ? {
                        ...prev,
                        jalurList: prev.jalurList.map(j => j.id === existingJalur.id ? updated : j),
                      } : null);
                    }
                  } else {
                    // Create new jalur
                    const jalurData = {
                      koordinat: [prevTiang.koordinat, newTiang.koordinat],
                      jenisJaringan: data.jenisJaringan as any,
                      jenisPenghantar: penghantar.jenis,
                      penampangMM: penghantar.penampang,
                      panjangMeter: segmentDistance,
                      tiangIds: [prevTiang.id, newTiang.id],
                      status: 'planned' as const,
                    };

                    const newJalur = await jalurService.add(currentSurvey.id, jalurData);
                    if (newJalur) {
                      setCurrentSurvey(prev => prev ? {
                        ...prev,
                        jalurList: [...prev.jalurList, newJalur],
                      } : null);
                    }
                  }
                  // Keep add-tiang mode active
                  setToolMode('add-tiang');
                }
              },
              {
                text: 'Ya, Selesai',
                onPress: async () => {
                  if (existingJalur) {
                    // Extend existing jalur
                    const updatedKoordinat = [...existingJalur.koordinat, newTiang.koordinat];
                    const updatedTiangIds = [...(existingJalur.tiangIds || []), newTiang.id];
                    const totalPanjang = existingJalur.panjangMeter + segmentDistance;

                    const updated = await jalurService.update(currentSurvey.id, existingJalur.id, {
                      koordinat: updatedKoordinat,
                      tiangIds: updatedTiangIds,
                      panjangMeter: totalPanjang,
                    });

                    if (updated) {
                      setCurrentSurvey(prev => prev ? {
                        ...prev,
                        jalurList: prev.jalurList.map(j => j.id === existingJalur.id ? updated : j),
                      } : null);
                      Alert.alert('Sukses', `Jalur diperpanjang! Total: ${totalPanjang.toFixed(0)}m (${updatedTiangIds.length} tiang)`);
                    }
                  } else {
                    // Create new jalur
                    const jalurData = {
                      koordinat: [prevTiang.koordinat, newTiang.koordinat],
                      jenisJaringan: data.jenisJaringan as any,
                      jenisPenghantar: penghantar.jenis,
                      penampangMM: penghantar.penampang,
                      panjangMeter: segmentDistance,
                      tiangIds: [prevTiang.id, newTiang.id],
                      status: 'planned' as const,
                    };

                    const newJalur = await jalurService.add(currentSurvey.id, jalurData);
                    if (newJalur) {
                      setCurrentSurvey(prev => prev ? {
                        ...prev,
                        jalurList: [...prev.jalurList, newJalur],
                      } : null);
                      Alert.alert('Sukses', `Jalur ${segmentDistance.toFixed(0)}m berhasil dibuat!`);
                    }
                  }
                  setToolMode('none');
                }
              }
            ]
          );
        } else {
          Alert.alert('Sukses', `Tiang 1 disimpan!\n${data.konstruksi} - ${data.jenisTiang} ${data.tinggiTiang}`);
          // Stay in add-tiang mode for next tiang
          setToolMode('add-tiang');
        }
      } else {
        Alert.alert('Error', 'Gagal menyimpan tiang');
      }

      setShowTiangForm(false);
      setSelectedCoordinate(null);
    } catch (error) {
      Alert.alert('Error', 'Terjadi kesalahan: ' + String(error));
    }
  };

  const handleGarduSubmit = async (data: Omit<Gardu, 'id' | 'createdAt' | 'updatedAt' | 'isSynced'>) => {
    try {
      if (!currentSurvey) {
        Alert.alert('Error', 'Survey belum dimuat');
        return;
      }

      // EDIT MODE: Update existing gardu
      if (editingGardu) {
        const updated = await garduService.update(currentSurvey.id, editingGardu.id, data);
        if (updated) {
          setCurrentSurvey(prev => prev ? {
            ...prev,
            garduList: prev.garduList.map(g => g.id === editingGardu.id ? updated : g),
          } : null);
        }
        setEditingGardu(null);
        setShowGarduForm(false);
        setSelectedCoordinate(null);
        setToolMode('none');
        return;
      }

      // CREATE MODE: Add new gardu
      const newGardu = await garduService.add(currentSurvey.id, data);
      if (newGardu) {
        setCurrentSurvey(prev => prev ? {
          ...prev,
          garduList: [...prev.garduList, newGardu],
        } : null);
        Alert.alert('Sukses', `Gardu ${newGardu.nomorGardu} disimpan!\n${data.jenisGardu} - ${data.kapasitasKVA} kVA`);
      } else {
        Alert.alert('Error', 'Gagal menyimpan gardu');
      }

      setShowGarduForm(false);
      setSelectedCoordinate(null);
      setToolMode('none');
    } catch (error) {
      Alert.alert('Error', 'Terjadi kesalahan: ' + String(error));
    }
  };

  const handleJalurSubmit = async (data: Omit<JalurKabel, 'id' | 'createdAt' | 'updatedAt' | 'isSynced'>) => {
    try {
      if (!currentSurvey) {
        Alert.alert('Error', 'Survey belum dimuat');
        return;
      }

      console.log('Saving jalur:', data);
      const newJalur = await jalurService.add(currentSurvey.id, data);

      if (newJalur) {
        setCurrentSurvey(prev => prev ? {
          ...prev,
          jalurList: [...prev.jalurList, newJalur],
        } : null);
        Alert.alert('Sukses', `Jalur disimpan!\n${data.jenisJaringan} - ${(data.panjangMeter).toFixed(0)}m`);
      } else {
        Alert.alert('Error', 'Gagal menyimpan jalur');
      }

      setShowJalurForm(false);
      setDrawingCoords([]);
      setIsDrawing(false);
      setToolMode('none');
    } catch (error) {
      console.error('Error saving jalur:', error);
      Alert.alert('Error', 'Terjadi kesalahan: ' + String(error));
    }
  };

  // ==========================================================================
  // MARKER PRESS HANDLERS
  // ==========================================================================

  const handleTiangPress = (tiang: Tiang) => {


    // Main Renderbuild mode, add/remove tiang from underbuild list
    if (toolMode === 'underbuild-sutr') {
      if (underbuildTiangIds.includes(tiang.id)) {
        // Remove from selection
        setUnderbuildTiangIds(prev => prev.filter(id => id !== tiang.id));
      } else {
        // Add to selection
        setUnderbuildTiangIds(prev => [...prev, tiang.id]);
      }
      return;
    }

    // Normal mode - show tiang info
    Alert.alert(
      `Tiang ${tiang.nomorUrut}`,
      `${tiang.konstruksi} - ${tiang.jenisTiang}\nTinggi: ${tiang.tinggiTiang}\nKekuatan: ${tiang.kekuatanTiang}${tiang.status === 'existing' ? '\n(Existing)' : ''}`,
      [
        { text: 'OK' },
        {
          text: '✏️ Edit',
          onPress: () => {
            setEditingTiang(tiang);
            setSelectedCoordinate(tiang.koordinat);
            setShowTiangForm(true);
          }
        },
        { text: 'Hapus', style: 'destructive', onPress: () => deleteTiang(tiang.id) },
      ]
    );
  };

  const handleGarduPress = (gardu: Gardu) => {
    Alert.alert(
      gardu.nomorGardu,
      `${gardu.jenisGardu}\nKapasitas: ${gardu.kapasitasKVA} kVA`,
      [
        { text: 'OK' },
        {
          text: '✏️ Edit',
          onPress: () => {
            setEditingGardu(gardu);
            setSelectedCoordinate(gardu.koordinat);
            setShowGarduForm(true);
          }
        },
        { text: 'Hapus', style: 'destructive', onPress: () => deleteGardu(gardu.id) },
      ]
    );
  };

  const handleJalurPress = (jalur: JalurKabel) => {
    Alert.alert(
      jalur.namaJalur || jalur.jenisJaringan,
      `${jalur.jenisPenghantar} ${jalur.penampangMM}\nPanjang: ${(jalur.panjangMeter).toFixed(0)} m`,
      [
        { text: 'OK' },
        {
          text: '✏️ Edit',
          onPress: () => {
            setEditingJalur(jalur);
            setDrawingCoords(jalur.koordinat);
            setIsEditMode(true);
            setShowJalurForm(true);
          }
        },
        { text: 'Hapus', style: 'destructive', onPress: () => deleteJalur(jalur.id) },
      ]
    );
  };

  // Handle edit jalur submit
  const handleJalurEditSubmit = async (data: Omit<JalurKabel, 'id' | 'createdAt' | 'updatedAt' | 'isSynced'>) => {
    try {
      if (!currentSurvey || !editingJalur) {
        Alert.alert('Error', 'Data tidak valid');
        return;
      }

      // Remember the penghantar for future auto-created jalur
      setLastPenghantar({
        jenis: data.jenisPenghantar,
        penampang: data.penampangMM,
      });

      const updatedJalur = await jalurService.update(currentSurvey.id, editingJalur.id, data);

      if (updatedJalur) {
        setCurrentSurvey(prev => prev ? {
          ...prev,
          jalurList: prev.jalurList.map(j => j.id === editingJalur.id ? updatedJalur : j),
        } : null);
        Alert.alert('Sukses', `Jalur berhasil diupdate!\n${data.jenisPenghantar} ${data.penampangMM}`);
      } else {
        Alert.alert('Error', 'Gagal update jalur');
      }

      setShowJalurForm(false);
      setEditingJalur(null);
      setIsEditMode(false);
      setDrawingCoords([]);
    } catch (error) {
      console.error('Error updating jalur:', error);
      Alert.alert('Error', 'Terjadi kesalahan: ' + String(error));
    }
  };

  const deleteTiang = async (id: string) => {
    if (!currentSurvey) return;
    await tiangService.delete(currentSurvey.id, id);
    setCurrentSurvey(prev => prev ? {
      ...prev,
      tiangList: prev.tiangList.filter(t => t.id !== id),
    } : null);
  };

  const deleteGardu = async (id: string) => {
    if (!currentSurvey) return;
    await garduService.delete(currentSurvey.id, id);
    setCurrentSurvey(prev => prev ? {
      ...prev,
      garduList: prev.garduList.filter(g => g.id !== id),
    } : null);
  };

  const deleteJalur = async (id: string) => {
    if (!currentSurvey) return;
    await jalurService.delete(currentSurvey.id, id);
    setCurrentSurvey(prev => prev ? {
      ...prev,
      jalurList: prev.jalurList.filter(j => j.id !== id),
    } : null);
  };

  // ==========================================================================
  // UNDERBUILD HANDLERS
  // ==========================================================================

  const handleFinishUnderbuild = async () => {
    if (!currentSurvey || underbuildTiangIds.length < 2) return;

    try {
      // Get tiang objects in order
      const selectedTiang = underbuildTiangIds
        .map(id => currentSurvey.tiangList.find(t => t.id === id))
        .filter((t): t is Tiang => t !== undefined);

      if (selectedTiang.length < 2) {
        Alert.alert('Error', 'Minimal 2 tiang harus dipilih');
        return;
      }

      // Build koordinat and calculate total distance
      const koordinat = selectedTiang.map(t => t.koordinat);
      let totalPanjang = 0;
      for (let i = 0; i < koordinat.length - 1; i++) {
        totalPanjang += calculateDistance(koordinat[i], koordinat[i + 1]);
      }

      // Create SUTR jalur with standard NFA2X
      const jalurData = {
        koordinat,
        jenisJaringan: 'SUTR' as const,
        jenisPenghantar: 'NFA2X',
        penampangMM: '3x70+1x50mm²',
        panjangMeter: totalPanjang,
        tiangIds: underbuildTiangIds,
        status: 'planned' as const,
        catatan: 'Underbuild SUTR',
      };

      const newJalur = await jalurService.add(currentSurvey.id, jalurData);
      if (newJalur) {
        setCurrentSurvey(prev => prev ? {
          ...prev,
          jalurList: [...prev.jalurList, newJalur],
        } : null);
        Alert.alert(
          '✅ Underbuild SUTR Dibuat!',
          `${selectedTiang.length} tiang terhubung\nTotal: ${totalPanjang.toFixed(0)}m\nNFA2X 3x70+1x50mm²`
        );
      }

      // Reset underbuild state
      setUnderbuildTiangIds([]);
      setToolMode('none');
    } catch (error) {
      console.error('Error creating underbuild jalur:', error);
      Alert.alert('Error', 'Gagal membuat jalur underbuild');
    }
  };

  const handleCancelUnderbuild = () => {
    setUnderbuildTiangIds([]);
    setToolMode('none');
  };

  // ==========================================================================
  // SURVEY MANAGEMENT HANDLERS
  // ==========================================================================

  const handleSaveAndClose = async () => {
    if (!currentSurvey) return;

    try {
      // Survey is already saved to AsyncStorage via surveyService
      // Just close the summary screen
      setShowSummary(false);
      console.log('Survey saved:', currentSurvey.id);
    } catch (error) {
      console.error('Error saving survey:', error);
      Alert.alert('Error', 'Gagal menyimpan survey');
    }
  };

  const handleNewSurvey = async () => {
    // Show BA Survey form instead of creating survey directly
    setShowBASurveyForm(true);
    setShowSummary(false);
    setShowHistory(false);
  };

  // Handle BA Survey form submission - creates the actual survey
  const handleBASurveySubmit = async (baData: BASurveyData) => {
    try {
      // Generate survey name from BA data
      const tanggal = baData.tanggalSurvey.toLocaleDateString('id-ID');
      const surveyName = `${baData.jenisPermohonan} - ${baData.namaPelanggan} (${tanggal})`;

      const newSurvey = await surveyService.create({
        namaSurvey: surveyName,
        jenisSurvey: baData.jenisPermohonan,
        lokasi: baData.alamat,
        surveyor: session?.user?.email || 'Surveyor',
        tanggalSurvey: baData.tanggalSurvey,
        tiangList: [],
        garduList: [],
        jalurList: [],
        // BA specific fields
        idPelanggan: baData.idPelanggan,
        namaPelanggan: baData.namaPelanggan,
        alamatPelanggan: baData.alamat,
        tarifDaya: baData.tarifDaya,
        hasilSurvey: baData.hasilSurvey,
        baChecklist: baData.checklist,
      });

      await surveyService.setCurrent(newSurvey.id);
      setCurrentSurvey(newSurvey);
      setShowBASurveyForm(false);

      // Reset remembered values
      setLastJenisJaringan('SUTM');
      setLastPenghantar({ jenis: 'A3CS', penampang: '150mm²' });

      // Generate BA Survey PDF
      const pdfPath = await generateBASurveyPdf({ baData });
      if (pdfPath) {
        Alert.alert('✅ Survey Baru', `${surveyName}\n\nSurvey berhasil dibuat dan BA PDF telah di-generate!`);
      } else {
        Alert.alert('✅ Survey Baru', `${surveyName}\n\nSurvey berhasil dibuat!\n(PDF gagal di-generate)`);
      }
    } catch (error) {
      console.error('Error creating new survey:', error);
      Alert.alert('Error', 'Gagal membuat survey baru');
    }
  };

  // Handle select survey from history
  const handleSelectSurvey = async (survey: Survey) => {
    await surveyService.setCurrent(survey.id);
    setCurrentSurvey(survey);
    setShowHistory(false);

    // Set last jenis jaringan from last tiang if exists
    if (survey.tiangList.length > 0) {
      const lastTiang = survey.tiangList[survey.tiangList.length - 1];
      setLastJenisJaringan(lastTiang.jenisJaringan);
    }

    Alert.alert('📂 Survey Dibuka', `${survey.namaSurvey}`);
  };

  // ==========================================================================
  // RENDER HELPERS
  // ==========================================================================

  // Calculate distance pill content for Add Tiang mode
  const distancePill = (() => {
    if (toolMode !== 'add-tiang' || !currentSurvey?.tiangList || currentSurvey.tiangList.length === 0 || !centerCoordinate) {
      return null;
    }

    const lastTiang = currentSurvey.tiangList[currentSurvey.tiangList.length - 1];
    if (!lastTiang || !lastTiang.koordinat) return null;

    const dist = calculateDistance(lastTiang.koordinat, centerCoordinate);
    const distLabel = dist >= 1000
      ? (dist / 1000).toFixed(2) + ' km'
      : Math.round(dist) + ' m';

    return (
      <View style={styles.distancePill}>
        <Ionicons name="resize" size={14} color="white" style={{ marginRight: 4 }} />
        <Text style={styles.distanceText}>{distLabel}</Text>
      </View>
    );
  })();

  // ==========================================================================
  // RENDER
  // ==========================================================================

  if (!authInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1565C0' }}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1565C0" />

      {/* Header */}
      {!uiHidden && (
        <View style={styles.header}>
          {/* History Button */}
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => setShowHistory(true)}
          >

            <Ionicons name="folder-open" size={20} color="white" />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="location" size={16} color="white" style={{ marginRight: 4 }} />
              <Text style={styles.headerTitle}>ASOI by Fikry</Text>
            </View>
            <Text style={styles.headerSubtitle}>Aplikasi Survey Online</Text>
            <Text style={styles.headerStats}>
              {currentSurvey ?
                `${currentSurvey.tiangList.length} Tiang • ${currentSurvey.garduList.length} Gardu • ${(() => {
                  const totalM = currentSurvey.jalurList.reduce((acc, curr) => acc + curr.panjangMeter, 0);
                  return totalM >= 1000 ? (totalM / 1000).toFixed(2) + ' km' : Math.round(totalM) + 'm';
                })()
                } Jalur`
                : 'Loading...'}
            </Text>
          </View>
          {/* Cutoff Button */}
          {/* Layer Control Button */}
          <TouchableOpacity
            style={styles.screenshotButton}
            onPress={() => setShowLayerControl(true)}
          >
            <Ionicons name="layers" size={20} color="white" />
          </TouchableOpacity>

          {/* Toggle UI Button (Eye) */}
          <TouchableOpacity
            style={styles.screenshotButton}
            onPress={() => {
              setUiHidden(true);
              Alert.alert(
                'Mode Screenshot',
                'UI disembunyikan. Silakan screenshot manual.\n\nTap tombol "X" di pojok kanan atas untuk kembali.',
                [{ text: 'OK' }]
              );
            }}
          >
            <Ionicons name="eye" size={20} color="white" />
          </TouchableOpacity>

          {/* Cutoff Button */}
          <TouchableOpacity
            style={styles.cutoffButton}
            onPress={() => setShowSummary(true)}
          >
            <Ionicons name="stats-chart" size={20} color="white" />
          </TouchableOpacity>

          {/* Menu Button */}
          <TouchableOpacity
            style={styles.cutoffButton}
            onPress={() => setShowMenu(true)}
          >
            <Ionicons name="menu" size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {/* Map */}
      <View style={styles.mapContainer}>
        <SurveyMap
          ref={mapRef}
          tiangList={currentSurvey?.tiangList || []}
          garduList={currentSurvey?.garduList || []}
          jalurList={currentSurvey?.jalurList || []}
          onMapPress={handleMapPress}
          onTiangPress={handleTiangPress}
          onGarduPress={handleGarduPress}
          onJalurPress={handleJalurPress}
          isAddingTiang={toolMode === 'add-tiang'}
          isAddingGardu={toolMode === 'add-gardu'}
          isDrawingJalur={toolMode === 'draw-jalur'}
          currentJalurCoords={drawingCoords}
          lastTiangCoord={currentSurvey?.tiangList.length ? currentSurvey.tiangList[currentSurvey.tiangList.length - 1].koordinat : undefined}
          visibleLayers={layerVisibility}
          onCenterChange={setCenterCoordinate}
          selectedTiangIds={underbuildTiangIds}
        />
      </View>

      {/* Floating Action Button for Pin Placement */}
      {(toolMode === 'add-tiang' || toolMode === 'add-gardu') && centerCoordinate !== null && !uiHidden && (
        <View style={styles.placePinContainer}>
          {/* Live Distance Indicator (Only for Tiang) */}
          {distancePill}

          <TouchableOpacity
            style={styles.placePinButton}
            onPress={() => handleMapPress(centerCoordinate)}
          >
            <Ionicons name="location" size={20} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.placePinText}>
              {toolMode === 'add-tiang' ? 'Pasang Tiang Disini' : 'Pasang Gardu Disini'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Floating Action Button for Jalur Drawing */}
      {toolMode === 'draw-jalur' && centerCoordinate !== null && !uiHidden && (
        <View style={styles.placePinContainer}>
          <TouchableOpacity
            style={[styles.placePinButton, { backgroundColor: '#E91E63' }]}
            onPress={() => handleMapPress(centerCoordinate)}
          >
            <Ionicons name="add-circle" size={20} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.placePinText}>
              {drawingCoords.length === 0 ? 'Mulai Jalur Disini' : `Tambah Titik (${drawingCoords.length})`}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Toolbar */}
      {!uiHidden && (
        <Toolbar
          currentMode={toolMode}
          onModeChange={handleModeChange}
          onFinishDrawing={handleFinishDrawing}
          onCancelDrawing={handleCancelDrawing}
          isDrawing={isDrawing}
          drawingPointsCount={drawingCoords.length}
          underbuildTiangCount={underbuildTiangIds.length}
          onFinishUnderbuild={handleFinishUnderbuild}
          onCancelUnderbuild={handleCancelUnderbuild}
          onOpenSummary={() => setShowSummary(true)}
        />
      )}

      {/* Forms */}
      {selectedCoordinate && (
        <TiangForm
          visible={showTiangForm}
          koordinat={selectedCoordinate}
          onSubmit={handleTiangSubmit}
          onCancel={() => {
            setShowTiangForm(false);
            setSelectedCoordinate(null);
            setEditingTiang(null);
            setToolMode('none');
          }}
          lastJenisJaringan={lastJenisJaringan}
          lockedStandar={currentSurvey?.standarKonstruksi}
          initialData={editingTiang || undefined}
        />
      )}

      {selectedCoordinate && (
        <GarduForm
          visible={showGarduForm}
          koordinat={selectedCoordinate}
          onSubmit={handleGarduSubmit}
          onCancel={() => {
            setShowGarduForm(false);
            setSelectedCoordinate(null);
            setEditingGardu(null);
            setToolMode('none');
          }}
          initialData={editingGardu || undefined}
        />
      )}

      {(drawingCoords.length >= 2 || isEditMode) && (
        <JalurForm
          visible={showJalurForm}
          koordinat={drawingCoords}
          onSubmit={isEditMode ? handleJalurEditSubmit : handleJalurSubmit}
          onCancel={() => {
            setShowJalurForm(false);
            setEditingJalur(null);
            setIsEditMode(false);
            if (!isEditMode) {
              setDrawingCoords([]);
            }
          }}
          editMode={isEditMode}
          initialData={editingJalur || undefined}
          lastPenghantar={lastPenghantar}
        />
      )}

      {/* Survey Summary Screen */}
      {currentSurvey && (
        <SurveySummaryScreen
          visible={showSummary}
          survey={currentSurvey}
          onClose={() => setShowSummary(false)}
          onSaveAndClose={handleSaveAndClose}
          onNewSurvey={handleNewSurvey}
          onExportPDFGambar={handleExportPDFGambar}
        />
      )}

      {/* Survey History Screen */}
      <SurveyHistoryScreen
        visible={showHistory}
        onSelectSurvey={handleSelectSurvey}
        onNewSurvey={() => {
          setShowHistory(false);
          handleNewSurvey();
        }}
        onClose={() => setShowHistory(false)}
      />

      {/* BA Survey Form - New Survey Creation */}
      <BASurveyForm
        visible={showBASurveyForm}
        onClose={() => setShowBASurveyForm(false)}
        onSubmit={handleBASurveySubmit}
      />
      {/* Layer Control Modal */}
      <Modal
        visible={showLayerControl}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLayerControl(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={[styles.layerModalContent, { maxHeight: '80%' }]}>
            <Text style={styles.layerTitle}>Atur Layer Peta</Text>

            <ScrollView style={{ maxHeight: 400 }}>
              <View style={styles.layerItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="pricetag" size={18} color="#666" style={{ marginRight: 8 }} />
                  <Text style={styles.layerItemText}>Label Tiang</Text>
                </View>
                <Switch
                  value={layerVisibility.tiang}
                  onValueChange={(v) => setLayerVisibility(prev => ({ ...prev, tiang: v }))}
                  trackColor={{ false: "#767577", true: "#81b0ff" }}
                  thumbColor={layerVisibility.tiang ? "#2196F3" : "#f4f3f4"}
                />
              </View>

              <View style={styles.layerItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="flash" size={18} color="#FF9800" style={{ marginRight: 8 }} />
                  <Text style={styles.layerItemText}>Label Gardu</Text>
                </View>
                <Switch
                  value={layerVisibility.gardu}
                  onValueChange={(v) => setLayerVisibility(prev => ({ ...prev, gardu: v }))}
                  trackColor={{ false: "#767577", true: "#81b0ff" }}
                  thumbColor={layerVisibility.gardu ? "#2196F3" : "#f4f3f4"}
                />
              </View>

              <Text style={{ marginTop: 15, marginBottom: 5, fontSize: 14, color: '#666', fontWeight: 'bold' }}>Titik Marker</Text>

              <View style={styles.layerItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="ellipse" size={18} color="#2196F3" style={{ marginRight: 8 }} />
                  <Text style={styles.layerItemText}>Titik Tiang</Text>
                </View>
                <Switch
                  value={layerVisibility.titikTiang}
                  onValueChange={(v) => setLayerVisibility(prev => ({ ...prev, titikTiang: v }))}
                  trackColor={{ false: "#767577", true: "#81b0ff" }}
                  thumbColor={layerVisibility.titikTiang ? "#2196F3" : "#f4f3f4"}
                />
              </View>

              <View style={styles.layerItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="ellipse" size={18} color="#FF9800" style={{ marginRight: 8 }} />
                  <Text style={styles.layerItemText}>Titik Gardu</Text>
                </View>
                <Switch
                  value={layerVisibility.titikGardu}
                  onValueChange={(v) => setLayerVisibility(prev => ({ ...prev, titikGardu: v }))}
                  trackColor={{ false: "#767577", true: "#81b0ff" }}
                  thumbColor={layerVisibility.titikGardu ? "#FF9800" : "#f4f3f4"}
                />
              </View>

              <Text style={{ marginTop: 15, marginBottom: 5, fontSize: 14, color: '#666', fontWeight: 'bold' }}>Jalur Kabel</Text>

              <View style={styles.layerItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="radio-button-on" size={18} color="#4CAF50" style={{ marginRight: 8 }} />
                  <Text style={styles.layerItemText}>Label SUTR (TR)</Text>
                </View>
                <Switch
                  value={layerVisibility.sutr}
                  onValueChange={(v) => setLayerVisibility(prev => ({ ...prev, sutr: v }))}
                  trackColor={{ false: "#767577", true: "#81b0ff" }}
                  thumbColor={layerVisibility.sutr ? "#4CAF50" : "#f4f3f4"}
                />
              </View>

              <View style={styles.layerItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="radio-button-on" size={18} color="#E91E63" style={{ marginRight: 8 }} />
                  <Text style={styles.layerItemText}>Label SUTM (TM)</Text>
                </View>
                <Switch
                  value={layerVisibility.sutm}
                  onValueChange={(v) => setLayerVisibility(prev => ({ ...prev, sutm: v }))}
                  trackColor={{ false: "#767577", true: "#81b0ff" }}
                  thumbColor={layerVisibility.sutm ? "#E91E63" : "#f4f3f4"}
                />
              </View>

              <View style={styles.layerItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="radio-button-on" size={18} color="#00BCD4" style={{ marginRight: 8 }} />
                  <Text style={styles.layerItemText}>Label SKUTM</Text>
                </View>
                <Switch
                  value={layerVisibility.skutm}
                  onValueChange={(v) => setLayerVisibility(prev => ({ ...prev, skutm: v }))}
                  trackColor={{ false: "#767577", true: "#81b0ff" }}
                  thumbColor={layerVisibility.skutm ? "#00BCD4" : "#f4f3f4"}
                />
              </View>

              <View style={styles.layerItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="radio-button-on" size={18} color="#9C27B0" style={{ marginRight: 8 }} />
                  <Text style={styles.layerItemText}>Label SKTM</Text>
                </View>
                <Switch
                  value={layerVisibility.sktm}
                  onValueChange={(v) => setLayerVisibility(prev => ({ ...prev, sktm: v }))}
                  trackColor={{ false: "#767577", true: "#81b0ff" }}
                  thumbColor={layerVisibility.sktm ? "#9C27B0" : "#f4f3f4"}
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.layerCloseButton}
              onPress={() => setShowLayerControl(false)}
            >
              <Text style={styles.layerCloseText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Restore UI Button */}
      {uiHidden && (
        <View style={styles.restoreButtonContainer}>
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={() => setUiHidden(false)}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {/* Menu Modal */}
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={[styles.layerModalContent, { width: '80%' }]}>
            <Text style={styles.layerTitle}>Menu</Text>

            {/* User Info */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={{ backgroundColor: '#1565C0', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
                <Ionicons name="person" size={30} color="white" />
              </View>
              <Text style={{ fontSize: 14, color: '#666' }}>{session?.user?.email || 'User'}</Text>
            </View>

            {/* About Button */}
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderTopWidth: 1, borderTopColor: '#eee' }}
              onPress={() => {
                setShowMenu(false);
                setShowAbout(true);
              }}
            >
              <Ionicons name="information-circle-outline" size={24} color="#1565C0" style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 16, color: '#333' }}>Tentang Aplikasi</Text>
            </TouchableOpacity>

            {/* Logout Button */}
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderTopWidth: 1, borderTopColor: '#eee' }}
              onPress={() => {
                Alert.alert(
                  'Logout',
                  'Yakin ingin keluar dari aplikasi?',
                  [
                    { text: 'Batal', style: 'cancel' },
                    {
                      text: 'Logout',
                      style: 'destructive',
                      onPress: async () => {
                        await supabase.auth.signOut();
                        setShowMenu(false);
                      }
                    }
                  ]
                );
              }}
            >
              <Ionicons name="log-out-outline" size={24} color="#F44336" style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 16, color: '#F44336' }}>Logout</Text>
            </TouchableOpacity>

            {/* Close Button */}
            <TouchableOpacity
              style={[styles.layerCloseButton, { marginTop: 20 }]}
              onPress={() => setShowMenu(false)}
            >
              <Text style={styles.layerCloseText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* About Modal */}
      <Modal
        visible={showAbout}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAbout(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={[styles.layerModalContent, { width: '90%', maxHeight: '80%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* App Logo & Version */}
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <Ionicons name="location" size={50} color="#1565C0" />
                <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#1565C0', marginTop: 10 }}>ASOI by Fikry</Text>
                <Text style={{ fontSize: 14, color: '#666' }}>Aplikasi Survey Online</Text>
                <Text style={{ fontSize: 12, color: '#999', marginTop: 5 }}>Versi 1.0.0</Text>
              </View>

              {/* Developer Info */}
              <View style={{ backgroundColor: '#f5f5f5', padding: 15, borderRadius: 10, marginBottom: 15 }}>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 10 }}>👨‍💻 Informasi Pengembang</Text>
                <Text style={{ fontSize: 13, color: '#555', marginBottom: 5 }}>Aplikasi ini dikembangkan dan dikelola oleh:</Text>
                <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#1565C0' }}>Fikry Budi H</Text>
                <TouchableOpacity
                  onPress={() => {
                    const url = 'https://wa.me/6287773068968';
                    import('react-native').then(({ Linking }) => Linking.openURL(url));
                  }}
                  style={{ marginTop: 8 }}
                >
                  <Text style={{ fontSize: 13, color: '#25D366', textDecorationLine: 'underline' }}>087773068968</Text>
                </TouchableOpacity>
              </View>

              {/* Legal */}
              <View style={{ backgroundColor: '#f5f5f5', padding: 15, borderRadius: 10, marginBottom: 15 }}>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 10 }}>⚖️ Legalitas & Kebijakan</Text>
                <Text style={{ fontSize: 13, color: '#1565C0', marginBottom: 5 }}>• Ketentuan Layanan</Text>
                <Text style={{ fontSize: 13, color: '#1565C0', marginBottom: 5 }}>• Kebijakan Privasi</Text>
                <Text style={{ fontSize: 13, color: '#1565C0' }}>• Lisensi Pihak Ketiga</Text>
              </View>

              {/* Copyright */}
              <View style={{ alignItems: 'center', marginTop: 10, marginBottom: 20 }}>
                <Text style={{ fontSize: 12, color: '#999', textAlign: 'center' }}>© 2024 Fikry. All Rights Reserved.</Text>
                <Text style={{ fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 5, fontStyle: 'italic' }}>
                  Dibuat dengan semangat untuk memudahkan riset digital di Indonesia.
                </Text>
              </View>
            </ScrollView>

            {/* Close Button */}
            <TouchableOpacity
              style={styles.layerCloseButton}
              onPress={() => setShowAbout(false)}
            >
              <Text style={styles.layerCloseText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 16,
    paddingTop: 35,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'column',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 2,
  },
  headerStats: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  mapContainer: {
    flex: 1,
  },
  cutoffButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  screenshotButton: {
    backgroundColor: '#FF9800',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  cutoffButtonText: {
    fontSize: 18,
  },
  restoreButtonContainer: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 9999,
  },
  restoreButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restoreButtonText: {
    fontSize: 18,
    color: 'white',
  },
  historyButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  historyButtonText: {
    fontSize: 18,
  },
  layerModalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    width: '85%',
    maxHeight: '70%',
  },
  layerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  layerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  layerItemText: {
    fontSize: 16,
    color: '#333',
  },
  layerCloseButton: {
    marginTop: 20,
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  layerCloseText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  placePinContainer: {
    position: 'absolute',
    bottom: 90, // Above toolbar
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  placePinButton: {
    backgroundColor: '#4CAF50', // Changed to Green (user preference)
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  placePinText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  distancePill: {
    backgroundColor: 'rgba(33, 33, 33, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
