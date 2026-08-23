// =============================================================================
// PLN SURVEY APP - Main Application
// =============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, StatusBar, SafeAreaView, Text, Alert, TouchableOpacity, Modal, Switch, ActivityIndicator, ScrollView, TextInput, Image, Animated } from 'react-native';
import LayerControlModal from './src/components/Modals/LayerControlModal';
import MenuModal from './src/components/Modals/MenuModal';
import AboutModal from './src/components/Modals/AboutModal';
import TiangActionModal from './src/components/Modals/TiangActionModal';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import SurveyMap, { SurveyMapRef, BoundaryMarker } from './src/components/Map/SurveyMap';
import Toolbar, { ToolMode } from './src/components/Toolbar/Toolbar';
import TiangForm from './src/components/Forms/TiangForm';
import GarduForm from './src/components/Forms/GarduForm';
import JalurForm from './src/components/Forms/JalurForm';
import JembatanKabelForm from './src/components/Forms/JembatanKabelForm';
import SurveySummaryScreen from './src/screens/SurveySummaryScreen';
import SurveyHistoryScreen from './src/screens/SurveyHistoryScreen';
import { Coordinate, Tiang, Gardu, JalurKabel, JembatanKabel, Survey, PersilPelanggan } from './src/types';
import { surveyService, tiangService, garduService, jalurService, jembatanKabelService, persilService } from './src/services/database';
import { calculateDistance, generatePointsAlongPolyline, groupTiangBySegment, calculateBoundsForGroup, SegmentMode, getNumericScaleString } from './src/utils/geoUtils';
import { generatePdfWithMap, generateMultiPagePdf, sharePdf, PageMeta, SurveyInfo } from './src/utils/pdfExport';
import { buildRincianPekerjaan } from './src/utils/rincianPekerjaan';
import { Session } from '@supabase/supabase-js';
import { supabase } from './src/services/supabaseClient';
import LoginScreen from './src/screens/LoginScreen';
import BASurveyForm, { BASurveyData } from './src/components/Forms/BASurveyForm';
import { generateBASurveyPdf } from './src/utils/baSurveyPdf';
import PersilForm, { PersilFormData } from './src/components/Forms/PersilForm';
import OverlayManager from './src/components/Forms/OverlayManager';
import { OverlayFile } from './src/types/overlayTypes';
import { overlayStorage } from './src/services/overlayStorage';
import { trafoLoadService } from './src/services/trafoLoadService';
import { BebanTrafoItem } from './src/types';
import {
  getTiangDisplayCode,
  generateNextBranchCode,
  getBranchModeBannerLabel,
} from './src/utils/branchUtils';

// ... other imports

export default function App() {
  // ==========================================================================
  // STATE
  // ==========================================================================

  // Fast Startup Splash Screen state
  const [showSplashScreen, setShowSplashScreen] = useState(true);
  const splashFadeAnim = useRef(new Animated.Value(1)).current;
  const splashScaleAnim = useRef(new Animated.Value(0.9)).current;

  const [session, setSession] = useState<Session | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  const [currentSurvey, setCurrentSurvey] = useState<Survey | null>(null);
  const [toolMode, setToolMode] = useState<ToolMode>('none');

  // Form states
  const [showTiangForm, setShowTiangForm] = useState(false);
  const [showGarduForm, setShowGarduForm] = useState(false);
  const [showJalurForm, setShowJalurForm] = useState(false);
  const [showJembatanForm, setShowJembatanForm] = useState(false);
  const [showPersilForm, setShowPersilForm] = useState(false);

  // Persil drawing state
  const [drawingPersilCorners, setDrawingPersilCorners] = useState<Coordinate[]>([]);
  const [editingPersil, setEditingPersil] = useState<PersilPelanggan | null>(null);

  // Selected coordinate for new marker
  const [selectedCoordinate, setSelectedCoordinate] = useState<Coordinate | null>(null);

  // Drawing jalur state
  const [drawingCoords, setDrawingCoords] = useState<Coordinate[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  // Move Tiang state
  const [movingTiangId, setMovingTiangId] = useState<string | null>(null);

  // Branching states
  const [activeBranchParentId, setActiveBranchParentId] = useState<string | null>(null);
  const [activeBranchDirection, setActiveBranchDirection] = useState<'R' | 'L' | null>(null);
  const [lastBranchTiangId, setLastBranchTiangId] = useState<string | null>(null);

  // Custom Tiang Action Modal state
  const [selectedTiangForAction, setSelectedTiangForAction] = useState<Tiang | null>(null);

  // Remember last jenis jaringan for next tiang
  const [lastJenisJaringan, setLastJenisJaringan] = useState<'SUTM' | 'SKTM' | 'SKUTM' | 'SUTR' | 'SKTR'>('SUTM');

  // Edit jalur state
  const [editingJalur, setEditingJalur] = useState<JalurKabel | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Active map zoom tracked live from SurveyMap WebView
  const [currentZoom, setCurrentZoom] = useState<number>(18);

  // Modal Export PDF & Kop PLN Metadata State
  const [showExportPdfModal, setShowExportPdfModal] = useState(false);
  const [pdfUidName, setPdfUidName] = useState('UID Banten');
  const [pdfUp3Name, setPdfUp3Name] = useState('UP3 Banten Selatan');
  const [pdfUlpName, setPdfUlpName] = useState('ULP Labuan');
  const [pdfSurveyorName, setPdfSurveyorName] = useState('');
  const [pdfPemeriksaTitle, setPdfPemeriksaTitle] = useState('TL HAR');
  const [pdfPemeriksaName, setPdfPemeriksaName] = useState('');
  const [pdfManagerName, setPdfManagerName] = useState('');
  const [selectedSegmentMode, setSelectedSegmentMode] = useState<SegmentMode | 'single'>('scale');
  const [includeBebanTrafo, setIncludeBebanTrafo] = useState(true);
  const [pdfCustomGarduSearch, setPdfCustomGarduSearch] = useState('');
  const [isUpratingTrafo, setIsUpratingTrafo] = useState(false);
  const [upratingKva, setUpratingKva] = useState('250 kVA');

  const CONFIG_PATH = `${FileSystem.documentDirectory}pln_pdf_config.json`;

  const loadPdfConfig = async () => {
    try {
      const exists = await FileSystem.getInfoAsync(CONFIG_PATH);
      if (exists.exists) {
        const json = await FileSystem.readAsStringAsync(CONFIG_PATH);
        const data = JSON.parse(json);
        if (data.uidName !== undefined) setPdfUidName(data.uidName);
        if (data.up3Name !== undefined) setPdfUp3Name(data.up3Name);
        if (data.ulpName !== undefined) setPdfUlpName(data.ulpName);
        if (data.surveyorName !== undefined) setPdfSurveyorName(data.surveyorName);
        if (data.pemeriksaTitle !== undefined) setPdfPemeriksaTitle(data.pemeriksaTitle);
        if (data.pemeriksaName !== undefined) setPdfPemeriksaName(data.pemeriksaName);
        if (data.managerName !== undefined) setPdfManagerName(data.managerName);
      }
    } catch (e) {}
  };

  const savePdfConfig = async (configData: any) => {
    try {
      await FileSystem.writeAsStringAsync(CONFIG_PATH, JSON.stringify(configData));
    } catch (e) {}
  };

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

  // Export progress state (null = not exporting)
  const [exportProgress, setExportProgress] = useState<string | null>(null);
  const [exportProgressPercent, setExportProgressPercent] = useState<number>(0);

  const updateProgress = (text: string | null, percent: number = 0) => {
    setExportProgress(text);
    setExportProgressPercent(percent);
  };

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
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);

  // Overlay layers state
  const [overlayLayers, setOverlayLayers] = useState<OverlayFile[]>([]);
  const [showOverlayManager, setShowOverlayManager] = useState(false);

  // Undo history stack (max 20 actions)
  type UndoAction =
    | { type: 'add-tiang'; data: Tiang }
    | { type: 'delete-tiang'; data: Tiang }
    | { type: 'edit-tiang'; oldData: Tiang; newData: Tiang }
    | { type: 'add-gardu'; data: Gardu }
    | { type: 'delete-gardu'; data: Gardu }
    | { type: 'edit-gardu'; oldData: Gardu; newData: Gardu }
    | { type: 'add-jalur'; data: JalurKabel }
    | { type: 'delete-jalur'; data: JalurKabel }
    | { type: 'edit-jalur'; oldData: JalurKabel; newData: JalurKabel };
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);

  // ==========================================================================
  // Fast Startup Splashscreen animation
  useEffect(() => {
    Animated.spring(splashScaleAnim, {
      toValue: 1,
      friction: 7,
      tension: 40,
      useNativeDriver: true,
    }).start();

    const splashTimer = setTimeout(() => {
      Animated.timing(splashFadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setShowSplashScreen(false);
      });
    }, 2400);

    return () => clearTimeout(splashTimer);
  }, []);

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

  // Load overlay layers from storage on startup
  useEffect(() => {
    overlayStorage.getAllOverlays().then(setOverlayLayers).catch(console.error);
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
    } else if (toolMode === 'draw-jalur' || toolMode === 'draw-jembatan') {
      setDrawingCoords(prev => [...prev, coordinate]);
      setIsDrawing(true);
    } else if (toolMode === 'draw-persil') {
      // Tap 1 = sudut pertama, tap 2 = sudut kedua → buka form
      if (drawingPersilCorners.length === 0) {
        setDrawingPersilCorners([coordinate]);
      } else {
        // Sudut kedua tapped → buka form
        const corner1 = drawingPersilCorners[0];
        const corner2 = coordinate;
        // Normalisasi: SW = min coords, NE = max coords
        const sw: Coordinate = {
          latitude: Math.min(corner1.latitude, corner2.latitude),
          longitude: Math.min(corner1.longitude, corner2.longitude),
        };
        const ne: Coordinate = {
          latitude: Math.max(corner1.latitude, corner2.latitude),
          longitude: Math.max(corner1.longitude, corner2.longitude),
        };
        setDrawingPersilCorners([sw, ne]);
        setEditingPersil(null);
        setShowPersilForm(true);
      }
    }
  };

  const handleModeChange = (mode: ToolMode) => {
    // If switching away from draw mode, cancel drawing
    if ((toolMode === 'draw-jalur' || toolMode === 'draw-jembatan') &&
      mode !== 'draw-jalur' && mode !== 'draw-jembatan') {
      setDrawingCoords([]);
      setIsDrawing(false);
    }
    // If switching away from persil mode, reset corners
    if (toolMode === 'draw-persil' && mode !== 'draw-persil') {
      setDrawingPersilCorners([]);
    }
    setToolMode(mode);
  };

  // Handler: Persil form selesai
  const handlePersilSubmit = async (data: PersilFormData) => {
    if (!currentSurvey) return;
    const koordinatSudut = data.koordinatSudut;

    if (editingPersil) {
      // Edit mode
      const updated = await persilService.update(currentSurvey.id, editingPersil.id, {
        namaPersil: data.namaPersil,
        warnaBorder: data.warnaBorder,
        catatan: data.catatan,
      });
      if (updated) {
        const newPersilList = (currentSurvey.persilList || []).map(p =>
          p.id === editingPersil.id ? updated : p
        );
        setCurrentSurvey(prev => prev ? { ...prev, persilList: newPersilList } : prev);
      }
    } else {
      // Add new
      const newPersil = await persilService.add(currentSurvey.id, {
        namaPersil: data.namaPersil,
        warnaBorder: data.warnaBorder,
        catatan: data.catatan,
        koordinatSudut,
      });
      if (newPersil) {
        setCurrentSurvey(prev => prev ? {
          ...prev,
          persilList: [...(prev.persilList || []), newPersil]
        } : prev);
      }
    }

    setShowPersilForm(false);
    setDrawingPersilCorners([]);
    setEditingPersil(null);
    setToolMode('none');
  };

  // Handler: Tap kotak persil di peta
  const handlePersilPress = (persil: PersilPelanggan) => {
    Alert.alert(
      persil.namaPersil,
      persil.catatan ? `📝 ${persil.catatan}` : 'Tap untuk aksi',
      [
        {
          text: '✏️ Edit',
          onPress: () => {
            setEditingPersil(persil);
            setDrawingPersilCorners([persil.koordinatSudut[0], persil.koordinatSudut[1]]);
            setShowPersilForm(true);
          }
        },
        {
          text: '🗑️ Hapus',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Hapus Persil',
              `Hapus "${persil.namaPersil}"?`,
              [
                { text: 'Batal', style: 'cancel' },
                {
                  text: 'Hapus',
                  style: 'destructive',
                  onPress: async () => {
                    if (!currentSurvey) return;
                    await persilService.delete(currentSurvey.id, persil.id);
                    setCurrentSurvey(prev => prev ? {
                      ...prev,
                      persilList: (prev.persilList || []).filter(p => p.id !== persil.id)
                    } : prev);
                  }
                }
              ]
            );
          }
        },
        { text: 'Tutup', style: 'cancel' },
      ]
    );
  };

  const handleFinishDrawing = async () => {
    if (toolMode === 'move-tiang') {
      if (movingTiangId && centerCoordinate && currentSurvey) {
        try {
          // 1. Update Tiang Coordinate
          const updatedTiang = await tiangService.update(currentSurvey.id, movingTiangId, {
            koordinat: centerCoordinate
          });

          if (updatedTiang) {
            // 2. Find and update connected Jalur
            const connectedJalurs = currentSurvey.jalurList.filter(j => j.tiangIds?.includes(movingTiangId));
            
            const updatedJalurPromises = connectedJalurs.map(async (jalur) => {
              const newKoordinat = [...jalur.koordinat];
              // Update the specific point(s) matching this tiang's ID
              jalur.tiangIds.forEach((id, index) => {
                if (id === movingTiangId) {
                  newKoordinat[index] = centerCoordinate;
                }
              });

              // Recalculate length
              let newPanjang = 0;
              for (let i = 0; i < newKoordinat.length - 1; i++) {
                newPanjang += calculateDistance(newKoordinat[i], newKoordinat[i+1]);
              }

              return await jalurService.update(currentSurvey.id, jalur.id, {
                koordinat: newKoordinat,
                panjangMeter: newPanjang
              });
            });

            const resolvedJalurs = (await Promise.all(updatedJalurPromises)).filter(Boolean) as JalurKabel[];

            // 3. Update React State
            setCurrentSurvey(prev => {
              if (!prev) return null;
              
              const newTiangList = prev.tiangList.map(t => t.id === movingTiangId ? updatedTiang : t);
              
              let newJalurList = [...prev.jalurList];
              resolvedJalurs.forEach(updatedJ => {
                newJalurList = newJalurList.map(j => j.id === updatedJ.id ? updatedJ : j);
              });

              return {
                ...prev,
                tiangList: newTiangList,
                jalurList: newJalurList
              };
            });

            Alert.alert('Sukses', 'Posisi tiang dan jalur berhasil digeser!');
          }
        } catch (error) {
          console.error("Error moving tiang:", error);
          Alert.alert('Error', 'Gagal memindahkan tiang');
        }
      }
      setMovingTiangId(null);
      setToolMode('none');
      return;
    }

    if (drawingCoords.length >= 2) {
      if (toolMode === 'draw-jembatan') {
        setShowJembatanForm(true);
      } else {
        setShowJalurForm(true);
      }
    }
  };

  const handleCancelDrawing = () => {
    setDrawingCoords([]);
    setIsDrawing(false);
    setMovingTiangId(null);
    setToolMode('none');
  };

  // Handle klik tombol Export PDF -> Buka Modal Form Metadata Kop PLN
  const handleExportPdf = async () => {
    if (!currentSurvey) {
      Alert.alert('Info', 'Buka atau buat survey terlebih dahulu');
      return;
    }
    // Close summary modal so map is ready for capture
    setShowSummary(false);
    await loadPdfConfig();
    setShowExportPdfModal(true);
  };

  // Proses utama setelah user mengisi form di Modal PDF
  const doProcessExportPdf = async () => {
    if (!currentSurvey) return;

    let bebanTrafoMap: Record<string, BebanTrafoItem> = {};
    let bebanTrafoList: BebanTrafoItem[] = [];

    if (includeBebanTrafo) {
      updateProgress('Menarik database Beban Trafo Web...', 8);
      try {
        const allBeban = await trafoLoadService.fetchBebanTrafoData();

        // 1. Match from survey garduList
        if (currentSurvey.garduList && currentSurvey.garduList.length > 0) {
          for (const g of currentSurvey.garduList) {
            const match = trafoLoadService.findBebanTrafoForGardu(g, allBeban);
            if (match) {
              bebanTrafoMap[g.id] = match;
            }
          }
        }

        // 2. Match from custom typed search (e.g. STG, STG240)
        if (pdfCustomGarduSearch.trim()) {
          const customMatches = trafoLoadService.findBebanTrafoBySearchText(pdfCustomGarduSearch.trim(), allBeban);
          if (customMatches.length > 0) {
            bebanTrafoList = customMatches;
          }
        }
      } catch (e) {
        console.warn('Could not fetch Beban Trafo data for PDF:', e);
      }
    }

    const fullSurveyInfo: SurveyInfo = {
      name: currentSurvey.namaSurvey,
      location: currentSurvey.lokasi || '',
      uidName: pdfUidName.trim() || 'UID Banten',
      up3Name: pdfUp3Name.trim() || 'UP3 Banten Selatan',
      ulpName: pdfUlpName.trim() || 'ULP Labuan',
      surveyorName: pdfSurveyorName.trim(),
      pemeriksaTitle: pdfPemeriksaTitle.trim() || 'TL HAR',
      pemeriksaName: pdfPemeriksaName.trim(),
      managerName: pdfManagerName.trim(),
      rincianLines: buildRincianPekerjaan(currentSurvey, {
        bebanTrafoMap: includeBebanTrafo ? bebanTrafoMap : undefined,
        bebanTrafoList: includeBebanTrafo ? bebanTrafoList : undefined,
        isUpratingTrafo,
        upratingKva: upratingKva.trim(),
        targetGarduName: pdfCustomGarduSearch.trim() || (currentSurvey.garduList?.[0]?.namaGardu || currentSurvey.garduList?.[0]?.nomorGardu),
      }),
    };

    // Auto-save remembered inputs
    await savePdfConfig({
      uidName: pdfUidName.trim(),
      up3Name: pdfUp3Name.trim(),
      ulpName: pdfUlpName.trim(),
      surveyorName: pdfSurveyorName.trim(),
      pemeriksaTitle: pdfPemeriksaTitle.trim(),
      pemeriksaName: pdfPemeriksaName.trim(),
      managerName: pdfManagerName.trim(),
    });

    setShowExportPdfModal(false);

    if (selectedSegmentMode === 'single') {
      await doExportSinglePage(fullSurveyInfo);
    } else {
      await doExportMultiPage(selectedSegmentMode as SegmentMode, fullSurveyInfo);
    }
  };

  // Export single-page PDF
  const doExportSinglePage = async (surveyInfo: SurveyInfo) => {
    if (!mapRef.current || !currentSurvey) return;
    updateProgress('Mempersiapkan peta & lapisan data...', 15);
    try {
      updateProgress('Mengambil gambar peta skala tinggi...', 45);
      const mapBase64 = await mapRef.current.captureOptimalMap();
      if (!mapBase64) {
        Alert.alert('Error', 'Gagal capture peta');
        return;
      }
      updateProgress('Membuat PDF Kop Resmi PLN...', 80);
      const pdfPath = await generatePdfWithMap(mapBase64, surveyInfo);
      if (!pdfPath) {
        Alert.alert('Error', 'Gagal generate PDF');
        return;
      }
      updateProgress('Menyelesaikan dokumen PDF...', 100);
      Alert.alert('✅ Berhasil', 'PDF Gambar Resmi PLN berhasil dibuat!');
      await sharePdf(pdfPath);
    } finally {
      updateProgress(null, 0);
    }
  };

  // Export multi-page PDF (segmented)
  const doExportMultiPage = async (mode: SegmentMode, surveyInfo: SurveyInfo) => {
    if (!mapRef.current || !currentSurvey) return;

    const tiangList = currentSurvey.tiangList;
    if (tiangList.length === 0) {
      Alert.alert('Error', 'Tidak ada tiang dalam survey ini');
      return;
    }

    try {
      updateProgress('Menganalisis segmen halaman PDF...', 10);
      const currentLat = centerCoordinate?.latitude ?? tiangList[0]?.koordinat.latitude ?? -6.8;
      // Segmentasi tiang berdasarkan mode (termasuk mode 'scale' menggunakan live currentZoom)
      const segments = groupTiangBySegment(tiangList, mode, currentZoom, currentLat);
      const totalPages = segments.length;

      const mapBase64s: string[] = [];
      const pageMetas: PageMeta[] = [];

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const pagePercent = Math.min(85, Math.round(15 + ((i + 0.5) / totalPages) * 70));
        updateProgress(`Mengambil gambar halaman ${i + 1} dari ${totalPages}...`, pagePercent);

        // Titik batas kiri halaman ini = tiang pertama segmen ini (yang merupakan tiang pembatas dari halaman sebelumnya)
        const prevAnchor = i > 0 ? seg.tiangList[0].koordinat : undefined;
        // Titik batas kanan halaman ini = tiang terakhir segmen ini (yang akan menjadi tiang pembatas untuk halaman berikutnya)
        const nextAnchor = i < segments.length - 1 ? seg.tiangList[seg.tiangList.length - 1].koordinat : undefined;

        const bounds = calculateBoundsForGroup(seg.tiangList, prevAnchor, nextAnchor);

        // Fungsi untuk generate A, B, C... Z, AA, AB, dll
        const getMarkerLabel = (index: number) => {
          let label = '';
          while (index >= 0) {
            label = String.fromCharCode((index % 26) + 65) + label;
            index = Math.floor(index / 26) - 1;
          }
          return label;
        };

        const boundaryMarkers: BoundaryMarker[] = [];
        if (prevAnchor) {
          // Titik batas kiri halaman ini = huruf ke-(i-1)
          const label = getMarkerLabel(i - 1);
          boundaryMarkers.push({
            label,
            lat: prevAnchor.latitude,
            lng: prevAnchor.longitude,
          });
        }
        if (nextAnchor) {
          // Titik batas kanan halaman ini = huruf ke-i
          const label = getMarkerLabel(i);
          boundaryMarkers.push({
            label,
            lat: nextAnchor.latitude,
            lng: nextAnchor.longitude,
          });
        }

        // Hitung titik tengah segmen agar peta bisa di-set ke zoom/skala LOCKED yang 100% konsisten di setiap halaman
        // Hitung titik tengah dari tiang awal dan tiang akhir segmen ini
        // Menjamin tiang awal terletak di UJUNG KIRI halaman dan tiang pembatas di UJUNG KANAN halaman (100% efisien tanpa buang space)
        const firstCoord = seg.tiangList[0].koordinat;
        const lastCoord = seg.tiangList[seg.tiangList.length - 1].koordinat;
        const centerLat = (firstCoord.latitude + lastCoord.latitude) / 2;
        const centerLng = (firstCoord.longitude + lastCoord.longitude) / 2;
        const centerCoords = { lat: centerLat, lng: centerLng };

        const base64 = await mapRef.current.captureSegment(bounds, boundaryMarkers, currentZoom, centerCoords);

        if (!base64) {
          Alert.alert('Error', `Gagal capture halaman ${i + 1}`);
          updateProgress(null, 0);
          return;
        }

        mapBase64s.push(base64);
        pageMetas.push({
          pageNumber: seg.pageNumber,
          totalPages: seg.totalPages,
          firstNomor: seg.firstNomor,
          lastNomor: seg.lastNomor,
          panjangMeter: seg.panjangMeter,
        });

        // Delay minim agar WebView reset state sebelum capture berikutnya
        if (i < segments.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 400));
        }
      }

      updateProgress(`Menyusun PDF ${totalPages} halaman...`, 90);
      const pdfPath = await generateMultiPagePdf(mapBase64s, surveyInfo, pageMetas);

      if (!pdfPath) {
        Alert.alert('Error', 'Gagal generate PDF multi-halaman');
        return;
      }

      updateProgress('Menyelesaikan file PDF...', 100);
      Alert.alert('✅ Berhasil', `PDF Gambar Resmi PLN (${totalPages} hal) berhasil dibuat!`);
      await sharePdf(pdfPath);
    } catch (error) {
      console.error('doExportMultiPage error:', error);
      Alert.alert('Error', 'Terjadi kesalahan: ' + String(error));
    } finally {
      updateProgress(null, 0);
    }
  };


  // ==========================================================================
  // FORM SUBMIT HANDLERS
  // ==========================================================================

  const handleTiangSubmit = async (
    data: Omit<Tiang, 'id' | 'nomorUrut' | 'createdAt' | 'updatedAt' | 'isSynced'>
  ) => {
    try {
      if (!currentSurvey) {
        Alert.alert('Error', 'Survey belum dimuat');
        return;
      }

      // EDIT MODE: Update existing tiang
      if (editingTiang) {
        // Save old data for undo before updating
        setUndoStack(prev => [...prev.slice(-19), {
          type: 'edit-tiang',
          oldData: editingTiang,
          newData: { ...editingTiang, ...data } as Tiang
        }]);
        const updated = await tiangService.update(currentSurvey.id, editingTiang.id, {
          ...data,
          labelPosition: editingTiang.labelPosition,
        });
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

      // Determine kodeTiang & branch metadata if in Branching Mode
      let tiangDataToSave = { ...data };
      const activeParent = activeBranchParentId ? currentSurvey.tiangList.find(t => t.id === activeBranchParentId) : null;
      if (activeBranchParentId && activeBranchDirection && activeParent) {
        const branchInfo = generateNextBranchCode(activeParent, activeBranchDirection, currentSurvey.tiangList);
        tiangDataToSave = {
          ...tiangDataToSave,
          kodeTiang: branchInfo.kodeTiang,
          parentTiangId: activeParent.id,
          branchDirection: activeBranchDirection,
          branchPath: branchInfo.branchPath,
        };
      } else if (!tiangDataToSave.kodeTiang) {
        tiangDataToSave = {
          ...tiangDataToSave,
          kodeTiang: `T${previousTiangCount + 1}`,
        };
      }

      const newTiang = await tiangService.add(currentSurvey.id, tiangDataToSave);

      if (newTiang) {
        const updatedTiangList = [...currentSurvey.tiangList, newTiang];

        // Push to undo stack (limit to 20 actions)
        setUndoStack(prev => [...prev.slice(-19), { type: 'add-tiang', data: newTiang }]);

        setCurrentSurvey(prev => prev ? {
          ...prev,
          tiangList: updatedTiangList,
        } : null);

        // Determine connecting previous tiang (branch mode vs main line)
        let prevTiang: Tiang | null = null;
        if (activeBranchParentId) {
          const prevId = lastBranchTiangId || activeBranchParentId;
          prevTiang = currentSurvey.tiangList.find(t => t.id === prevId) || null;
        } else if (previousTiangCount >= 1) {
          prevTiang = currentSurvey.tiangList[previousTiangCount - 1];
        }

        if (prevTiang) {
          const prevCode = getTiangDisplayCode(prevTiang);
          const newCode = getTiangDisplayCode(newTiang);

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
            j.tiangIds[j.tiangIds.length - 1] === prevTiang!.id &&
            j.jenisPenghantar === penghantar.jenis &&
            j.penampangMM === penghantar.penampang
          );

          const segmentDistance = calculateDistance(prevTiang.koordinat, newTiang.koordinat);
          const actionText = existingJalur
            ? `Extend jalur (total: ${existingJalur.tiangIds?.length || 1} tiang)`
            : 'Buat jalur baru';

          // Helper: connect jalur (shared by "Ya + Lanjut" and "Ya, Selesai")
          const connectJalur = async (keepAddMode: boolean) => {
            if (existingJalur) {
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
                if (!keepAddMode) {
                  Alert.alert('Sukses', `Jalur diperpanjang! Total: ${totalPanjang.toFixed(0)}m (${updatedTiangIds.length} tiang)`);
                }
              }
            } else {
              const jalurData = {
                koordinat: [prevTiang!.koordinat, newTiang.koordinat],
                jenisJaringan: data.jenisJaringan as any,
                jenisPenghantar: penghantar.jenis,
                penampangMM: penghantar.penampang,
                panjangMeter: segmentDistance,
                tiangIds: [prevTiang!.id, newTiang.id],
                status: 'planned' as const,
              };

              const newJalur = await jalurService.add(currentSurvey.id, jalurData);
              if (newJalur) {
                setCurrentSurvey(prev => prev ? {
                  ...prev,
                  jalurList: [...prev.jalurList, newJalur],
                } : null);
                if (!keepAddMode) {
                  Alert.alert('Sukses', `Jalur ${segmentDistance.toFixed(0)}m berhasil dibuat!`);
                }
              }
            }

            if (activeBranchParentId) {
              setLastBranchTiangId(newTiang.id);
            }

            setToolMode(keepAddMode ? 'add-tiang' : 'none');
          };

          Alert.alert(
            '🔗 Hubungkan Jalur?',
            `Tiang ${newCode} disimpan!\n\n${actionText} dari Tiang ${prevCode} ke Tiang ${newCode}?\n\n📌 ${penghantar.jenis} ${penghantar.penampang}\n📏 +${segmentDistance.toFixed(0)}m`,
            [
              { text: 'Tidak', style: 'cancel' },
              { text: 'Ya + Lanjut', onPress: () => connectJalur(true) },
              { text: 'Ya, Selesai', onPress: () => connectJalur(false) },
            ]
          );
        } else {
          const displayCode = getTiangDisplayCode(newTiang);
          Alert.alert('Sukses', `Tiang ${displayCode} disimpan!\n${data.konstruksi} - ${data.jenisTiang} ${data.tinggiTiang}`);
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
        // Save old data for undo before updating
        setUndoStack(prev => [...prev.slice(-19), {
          type: 'edit-gardu',
          oldData: editingGardu,
          newData: { ...editingGardu, ...data } as Gardu
        }]);
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
        // Push to undo stack
        setUndoStack(prev => [...prev.slice(-19), { type: 'add-gardu', data: newGardu }]);
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
        // Push to undo stack
        setUndoStack(prev => [...prev.slice(-19), { type: 'add-jalur', data: newJalur }]);

        let updatedTiangList = [...currentSurvey.tiangList];
        let jointingCount = 0;

        // Auto-generate jointing points for SKTM jalur every 240m
        if (data.jenisJaringan === 'SKTM' && data.panjangMeter >= 240) {
          const jointingPoints = generatePointsAlongPolyline(data.koordinat, 240);

          // Create Tiang markers for each jointing point
          for (let i = 0; i < jointingPoints.length; i++) {
            const point = jointingPoints[i];
            const jointingTiang: Omit<Tiang, 'id' | 'nomorUrut' | 'createdAt' | 'updatedAt' | 'isSynced'> = {
              koordinat: point.coordinate,
              jenisTiang: 'Beton', // Jointing tidak butuh tiang fisik, ini hanya marker
              tinggiTiang: '0m',
              jenisJaringan: 'SKUTM', // Use SKUTM for jointing marker
              konstruksi: `JOINTING-${i + 1}`, // Special marker
              status: 'planned',
              perlengkapan: ['Jointing SKTM'],
              catatan: `Titik Jointing SKTM @ ${point.distanceFromStart.toFixed(0)}m`,
            };

            const newTiang = await tiangService.add(currentSurvey.id, jointingTiang);
            if (newTiang) {
              updatedTiangList.push(newTiang);
              jointingCount++;
            }
          }
        }

        setCurrentSurvey(prev => prev ? {
          ...prev,
          jalurList: [...prev.jalurList, newJalur],
          tiangList: updatedTiangList,
        } : null);

        // Show success message with jointing count if applicable
        if (jointingCount > 0) {
          Alert.alert('Sukses', `Jalur SKTM disimpan!\n${(data.panjangMeter).toFixed(0)}m\n\n🔗 ${jointingCount} titik jointing otomatis dibuat (@ 240m interval)`);
        } else {
          Alert.alert('Sukses', `Jalur disimpan!\n${data.jenisJaringan} - ${(data.panjangMeter).toFixed(0)}m`);
        }
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

  // Handle jembatan kabel form submission
  const handleJembatanSubmit = async (data: Omit<JembatanKabel, 'id' | 'createdAt' | 'updatedAt' | 'isSynced'>) => {
    try {
      if (!currentSurvey) {
        Alert.alert('Error', 'Survey belum dimuat');
        return;
      }

      console.log('Saving jembatan kabel:', data);
      const newJembatan = await jembatanKabelService.add(currentSurvey.id, data);

      if (newJembatan) {
        const existingList = currentSurvey.jembatanKabelList || [];
        setCurrentSurvey(prev => prev ? {
          ...prev,
          jembatanKabelList: [...existingList, newJembatan],
        } : null);
        Alert.alert('Sukses', `Jembatan Kabel disimpan!\n${data.jenisJaringan} - ${(data.panjangMeter).toFixed(0)}m`);
      } else {
        Alert.alert('Error', 'Gagal menyimpan jembatan kabel');
      }

      setShowJembatanForm(false);
      setDrawingCoords([]);
      setIsDrawing(false);
      setToolMode('none');
    } catch (error) {
      console.error('Error saving jembatan kabel:', error);
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

    // Open custom Tiang Action Modal (Bottom Sheet)
    setSelectedTiangForAction(tiang);
  };

  // Handle tiang label shift (drag to position 0..7)
  // CRITICAL: Do NOT update currentSurvey state here!
  // Updating tiangList triggers useMemo in SurveyMap → HTML regeneration → WebView reload → all markers reset.
  // Instead, persist to AsyncStorage only. The label position is already visually correct in WebView (Leaflet).
  // We store pending updates in a ref so the next real state change picks them up.
  const pendingLabelPositions = useRef<Record<string, number>>({});

  const handleTiangLabelShift = async (tiangId: string, newPosition: number, newDistance?: number) => {
    if (!currentSurvey) return;

    try {
      // Update state immediately so labelPosition & labelDistance are preserved across renders/zooms
      setCurrentSurvey(prev => {
        if (!prev) return null;
        return {
          ...prev,
          tiangList: prev.tiangList.map(t =>
            t.id === tiangId ? { ...t, labelPosition: newPosition, labelDistance: newDistance } : t
          ),
        };
      });

      // Track in ref
      pendingLabelPositions.current[tiangId] = newPosition;

      // Persist to AsyncStorage in background
      await tiangService.update(currentSurvey.id, tiangId, {
        labelPosition: newPosition,
        ...(newDistance !== undefined ? { labelDistance: newDistance } : {}),
      });

      // Show brief feedback
      const tiang = currentSurvey.tiangList.find(t => t.id === tiangId);
      const directions = ['↑ Atas', '↗ Kanan Atas', '→ Kanan', '↘ Kanan Bawah', '↓ Bawah', '↙ Kiri Bawah', '← Kiri', '↖ Kiri Atas'];
      console.log(`Label Tiang ${tiang?.nomorUrut || '?'} → ${directions[newPosition]}`);
    } catch (error) {
      console.error('Error shifting tiang label:', error);
    }
  };

  // Flush pending label positions into currentSurvey state.
  // Call this before any operation that reads tiangList (save, export, etc.)
  const flushPendingLabelPositions = () => {
    const pending = pendingLabelPositions.current;
    if (Object.keys(pending).length === 0) return;

    setCurrentSurvey(prev => {
      if (!prev) return null;
      return {
        ...prev,
        tiangList: prev.tiangList.map(t =>
          pending[t.id] !== undefined ? { ...t, labelPosition: pending[t.id] } : t
        ),
      };
    });
    pendingLabelPositions.current = {};
  };

  const handleGarduPress = async (gardu: Gardu) => {
    let trafoInfoText = '';
    try {
      const trafoList = await trafoLoadService.fetchBebanTrafoData();
      const match = trafoLoadService.findBebanTrafoForGardu(gardu, trafoList);
      if (match) {
        const statusEmoji = match.statusBeban === 'Overload' ? '⚠️ OVERLOAD' : match.statusBeban === 'Underload' ? '📉 Underload' : '✅ Normal';
        trafoInfoText = `\n\n⚡ Live Beban Trafo (Web):\n• Daya Trafo: ${match.persenDayaTrafo}% (${statusEmoji})\n• Arus: R:${match.bebanR}A S:${match.bebanS}A T:${match.bebanT}A\n• Ukur: ${match.tanggalUkur} (${match.waktuUkur})`;
      }
    } catch (e) {}

    Alert.alert(
      `${gardu.nomorGardu}${gardu.namaGardu ? ' - ' + gardu.namaGardu : ''}`,
      `${gardu.jenisGardu} (${gardu.kapasitasKVA} kVA)${trafoInfoText}`,
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

      // Save old data for undo before updating
      setUndoStack(prev => [...prev.slice(-19), {
        type: 'edit-jalur',
        oldData: editingJalur,
        newData: { ...editingJalur, ...data } as JalurKabel
      }]);

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
    // Save to undo stack before deleting
    const tiangToDelete = currentSurvey.tiangList.find(t => t.id === id);
    if (tiangToDelete) {
      setUndoStack(prev => [...prev.slice(-19), { type: 'delete-tiang', data: tiangToDelete }]);
    }
    await tiangService.delete(currentSurvey.id, id);
    setCurrentSurvey(prev => prev ? {
      ...prev,
      tiangList: prev.tiangList.filter(t => t.id !== id),
    } : null);
  };

  const deleteGardu = async (id: string) => {
    if (!currentSurvey) return;
    // Save to undo stack before deleting
    const garduToDelete = currentSurvey.garduList.find(g => g.id === id);
    if (garduToDelete) {
      setUndoStack(prev => [...prev.slice(-19), { type: 'delete-gardu', data: garduToDelete }]);
    }
    await garduService.delete(currentSurvey.id, id);
    setCurrentSurvey(prev => prev ? {
      ...prev,
      garduList: prev.garduList.filter(g => g.id !== id),
    } : null);
  };

  const deleteJalur = async (id: string) => {
    if (!currentSurvey) return;
    // Save to undo stack before deleting
    const jalurToDelete = currentSurvey.jalurList.find(j => j.id === id);
    if (jalurToDelete) {
      setUndoStack(prev => [...prev.slice(-19), { type: 'delete-jalur', data: jalurToDelete }]);
    }
    await jalurService.delete(currentSurvey.id, id);
    setCurrentSurvey(prev => prev ? {
      ...prev,
      jalurList: prev.jalurList.filter(j => j.id !== id),
    } : null);
  };

  // Handle undo action
  const handleUndo = async () => {
    if (!currentSurvey || undoStack.length === 0) return;

    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));

    try {
      switch (lastAction.type) {
        case 'add-tiang':
          // Undo adding = delete the tiang (no re-push to undo stack)
          await tiangService.delete(currentSurvey.id, lastAction.data.id);
          setCurrentSurvey(prev => prev ? {
            ...prev,
            tiangList: prev.tiangList.filter(t => t.id !== lastAction.data.id),
          } : null);
          break;
        case 'delete-tiang':
          // Undo deleting = re-add the tiang
          const restoredTiang = await tiangService.add(currentSurvey.id, lastAction.data);
          if (restoredTiang) {
            setCurrentSurvey(prev => prev ? {
              ...prev,
              tiangList: [...prev.tiangList, { ...lastAction.data, id: restoredTiang.id }],
            } : null);
          }
          break;
        case 'add-gardu':
          await garduService.delete(currentSurvey.id, lastAction.data.id);
          setCurrentSurvey(prev => prev ? {
            ...prev,
            garduList: prev.garduList.filter(g => g.id !== lastAction.data.id),
          } : null);
          break;
        case 'delete-gardu':
          const restoredGardu = await garduService.add(currentSurvey.id, lastAction.data);
          if (restoredGardu) {
            setCurrentSurvey(prev => prev ? {
              ...prev,
              garduList: [...prev.garduList, { ...lastAction.data, id: restoredGardu.id }],
            } : null);
          }
          break;
        case 'add-jalur':
          await jalurService.delete(currentSurvey.id, lastAction.data.id);
          setCurrentSurvey(prev => prev ? {
            ...prev,
            jalurList: prev.jalurList.filter(j => j.id !== lastAction.data.id),
          } : null);
          break;
        case 'delete-jalur':
          const restoredJalur = await jalurService.add(currentSurvey.id, lastAction.data);
          if (restoredJalur) {
            setCurrentSurvey(prev => prev ? {
              ...prev,
              jalurList: [...prev.jalurList, { ...lastAction.data, id: restoredJalur.id }],
            } : null);
          }
          break;
        case 'edit-tiang':
          // Undo editing = restore old data
          await tiangService.update(currentSurvey.id, lastAction.oldData.id, lastAction.oldData);
          setCurrentSurvey(prev => prev ? {
            ...prev,
            tiangList: prev.tiangList.map(t => t.id === lastAction.oldData.id ? lastAction.oldData : t),
          } : null);
          break;
        case 'edit-gardu':
          // Undo editing = restore old data
          await garduService.update(currentSurvey.id, lastAction.oldData.id, lastAction.oldData);
          setCurrentSurvey(prev => prev ? {
            ...prev,
            garduList: prev.garduList.map(g => g.id === lastAction.oldData.id ? lastAction.oldData : g),
          } : null);
          break;
        case 'edit-jalur':
          // Undo editing = restore old data
          await jalurService.update(currentSurvey.id, lastAction.oldData.id, lastAction.oldData);
          setCurrentSurvey(prev => prev ? {
            ...prev,
            jalurList: prev.jalurList.map(j => j.id === lastAction.oldData.id ? lastAction.oldData : j),
          } : null);
          break;
      }
    } catch (error) {
      console.error('Undo failed:', error);
      Alert.alert('Error', 'Gagal melakukan undo');
    }
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
      // Merge any pending label position changes from drag gestures
      const pending = pendingLabelPositions.current;
      const mergedTiangList = Object.keys(pending).length > 0
        ? currentSurvey.tiangList.map(t =>
            pending[t.id] !== undefined ? { ...t, labelPosition: pending[t.id] } : t
          )
        : currentSurvey.tiangList;
      pendingLabelPositions.current = {};

      // Explicitly persist latest tiangList (with labelPosition) and all survey data to AsyncStorage & Database!
      await surveyService.update(currentSurvey.id, {
        tiangList: mergedTiangList,
        garduList: currentSurvey.garduList,
        jalurList: currentSurvey.jalurList,
        jembatanKabelList: currentSurvey.jembatanKabelList,
        persilList: currentSurvey.persilList,
      });

      // Update React state with merged data
      setCurrentSurvey(prev => prev ? { ...prev, tiangList: mergedTiangList } : null);

      setShowSummary(false);
      console.log('Survey saved cleanly with label positions preserved:', currentSurvey.id);
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
        surveyor: baData.namaSurveyor || session?.user?.email || 'Surveyor',
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
        namaPerwakilan: baData.namaPerwakilan,
        keterangan: baData.keterangan,
        appDipasang: baData.appDipasang,
        konstruksiOleh: baData.konstruksiOleh,
        baChecklist: baData.checklist,
        signaturePelanggan: baData.signaturePelanggan,
        signatureSurveyor: baData.signatureSurveyor,
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

  if (!authInitialized && showSplashScreen) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <Animated.View style={{ alignItems: 'center', transform: [{ scale: splashScaleAnim }], opacity: splashFadeAnim }}>
          <Image
            source={require('./assets/splashs.png')}
            style={styles.splashImage}
            resizeMode="contain"
          />
          <View style={{ marginTop: 24, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#0D47A1" />
            <Text style={styles.splashTaglineText}>Survey Made Easy : Mudah, Cepat, Akurat</Text>
            <Text style={styles.splashFooterText}>PLN OPTADIS GIS SYSTEM</Text>
          </View>
        </Animated.View>
      </View>
    );
  }

  if (!authInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D47A1' }}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={{ flex: 1 }}>
        <LoginScreen />
        {showSplashScreen && (
          <Animated.View
            style={[styles.splashOverlay, { opacity: splashFadeAnim }]}
            pointerEvents={showSplashScreen ? 'auto' : 'none'}
          >
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <Animated.View style={{ alignItems: 'center', transform: [{ scale: splashScaleAnim }] }}>
              <Image
                source={require('./assets/splashs.png')}
                style={styles.splashImage}
                resizeMode="contain"
              />
              <View style={{ marginTop: 24, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#0D47A1" />
                <Text style={styles.splashTaglineText}>Survey Made Easy : Mudah, Cepat, Akurat</Text>
                <Text style={styles.splashFooterText}>PLN OPTADIS GIS SYSTEM</Text>
              </View>
            </Animated.View>
          </Animated.View>
        )}
      </View>
    );
  }

  const handleCancelBranch = () => {
    setActiveBranchParentId(null);
    setActiveBranchDirection(null);
    setLastBranchTiangId(null);
    setToolMode('none');
  };

  const activeBranchParent = (currentSurvey && activeBranchParentId)
    ? currentSurvey.tiangList.find(t => t.id === activeBranchParentId) || null
    : null;
  const branchBannerText = (toolMode === 'add-tiang' && activeBranchParentId && activeBranchDirection)
    ? getBranchModeBannerLabel(activeBranchParent, activeBranchDirection)
    : '';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D47A1" />

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
              <Image
                source={require('./assets/logo_masiv_icon.png')}
                style={styles.headerLogo}
                resizeMode="contain"
              />
              <Text style={styles.headerTitle}>MASIV</Text>
            </View>
            <Text style={styles.headerSubtitle} numberOfLines={1} ellipsizeMode="tail">
              Survey Made Easy : Mudah, Cepat, Akurat
            </Text>
            <Text style={styles.headerStats} numberOfLines={1}>
              {currentSurvey ?
                `${currentSurvey.tiangList.length} Tiang • ${currentSurvey.garduList.length} Gardu • ${(() => {
                  const totalM = currentSurvey.jalurList.reduce((acc, curr) => acc + curr.panjangMeter, 0);
                  return totalM >= 1000 ? (totalM / 1000).toFixed(2) + ' km' : Math.round(totalM) + 'm';
                })()
                } Jalur`
                : 'Loading...'}
            </Text>
          </View>

          {/* Action Buttons Right */}
          <View style={styles.headerRightActions}>
            {/* Layer Control Button */}
            <TouchableOpacity
              style={[styles.headerActionButton, styles.layerActionButton]}
              onPress={() => setShowLayerControl(true)}
            >
              <Ionicons name="layers" size={19} color="white" />
            </TouchableOpacity>

            {/* Toggle UI Button (Eye) */}
            <TouchableOpacity
              style={[styles.headerActionButton, styles.screenshotActionButton]}
              onPress={() => {
                setUiHidden(true);
                Alert.alert(
                  'Mode Screenshot',
                  'UI disembunyikan. Silakan screenshot manual.\n\nTap tombol "X" di pojok kanan atas untuk kembali.',
                  [{ text: 'OK' }]
                );
              }}
            >
              <Ionicons name="eye" size={19} color="white" />
            </TouchableOpacity>

            {/* Summary Button */}
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => setShowSummary(true)}
            >
              <Ionicons name="stats-chart" size={19} color="white" />
            </TouchableOpacity>

            {/* Menu Button */}
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => setShowMenu(true)}
            >
              <Ionicons name="menu" size={19} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Map */}
      <View style={styles.mapContainer}>
        <SurveyMap
          ref={mapRef}
          tiangList={currentSurvey?.tiangList || []}
          garduList={currentSurvey?.garduList || []}
          jalurList={currentSurvey?.jalurList || []}
          jembatanKabelList={currentSurvey?.jembatanKabelList || []}
          onMapPress={handleMapPress}
          onTiangPress={handleTiangPress}
          onGarduPress={handleGarduPress}
          onJalurPress={handleJalurPress}
          isAddingTiang={toolMode === 'add-tiang' || toolMode === 'move-tiang'}
          isAddingGardu={toolMode === 'add-gardu'}
          isDrawingJalur={toolMode === 'draw-jalur' || toolMode === 'draw-jembatan'}
          isDrawingPersil={toolMode === 'draw-persil'}
          currentJalurCoords={drawingCoords}
          lastTiangCoord={
            toolMode === 'move-tiang' && movingTiangId
              ? currentSurvey?.tiangList.find(t => t.id === movingTiangId)?.koordinat
              : (currentSurvey?.tiangList.length ? currentSurvey.tiangList[currentSurvey.tiangList.length - 1].koordinat : undefined)
          }
          visibleLayers={layerVisibility}
          onCenterChange={setCenterCoordinate}
          onZoomChange={setCurrentZoom}
          selectedTiangIds={underbuildTiangIds}
          onTiangLabelShift={handleTiangLabelShift}
          persilList={currentSurvey?.persilList || []}
          onPersilPress={handlePersilPress}
          overlayLayers={overlayLayers}
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

      {/* Floating Action Button for Jembatan Kabel Drawing */}
      {toolMode === 'draw-jembatan' && centerCoordinate !== null && !uiHidden && (
        <View style={styles.placePinContainer}>
          <TouchableOpacity
            style={[styles.placePinButton, { backgroundColor: '#00BCD4' }]}
            onPress={() => handleMapPress(centerCoordinate)}
          >
            <Ionicons name="add-circle" size={20} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.placePinText}>
              {drawingCoords.length === 0 ? 'Mulai Jembatan Disini' : `Tambah Titik (${drawingCoords.length})`}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Floating Undo Button */}
      {undoStack.length > 0 && !uiHidden && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            left: 16,
            bottom: 90,
            backgroundColor: '#FF5722',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 25,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}
          onPress={handleUndo}
        >
          <Ionicons name="arrow-undo" size={20} color="white" style={{ marginRight: 6 }} />
          <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>
            Undo ({undoStack.length})
          </Text>
        </TouchableOpacity>
      )}

      {/* Floating Selesai Button */}
      {!uiHidden && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            right: 16,
            bottom: 90,
            backgroundColor: '#E8F5E9',
            borderWidth: 1,
            borderColor: '#4CAF50',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 25,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}
          onPress={async () => {
            if (currentSurvey) {
              await surveyService.update(currentSurvey.id, {
                tiangList: currentSurvey.tiangList,
                garduList: currentSurvey.garduList,
                jalurList: currentSurvey.jalurList,
                jembatanKabelList: currentSurvey.jembatanKabelList,
                persilList: currentSurvey.persilList,
              });
            }
            setShowSummary(true);
          }}
        >
          <Text style={{ fontSize: 16, marginRight: 6 }}>🏁</Text>
          <Text style={{ color: '#2E7D32', fontWeight: 'bold', fontSize: 14 }}>
            Selesai
          </Text>
        </TouchableOpacity>
      )}

      {/* Toolbar */}
      {!uiHidden && (
        <Toolbar
          currentMode={toolMode}
          onModeChange={handleModeChange}
          onFinishDrawing={handleFinishDrawing}
          onCancelDrawing={() => {
            handleCancelDrawing();
            if (toolMode === 'draw-persil') {
              setDrawingPersilCorners([]);
              setToolMode('none');
            }
          }}
          isDrawing={isDrawing}
          drawingPointsCount={toolMode === 'draw-persil' ? drawingPersilCorners.length : drawingCoords.length}
          underbuildTiangCount={underbuildTiangIds.length}
          onFinishUnderbuild={handleFinishUnderbuild}
          onCancelUnderbuild={handleCancelUnderbuild}
          onOpenSummary={() => setShowSummary(true)}
          branchBannerText={branchBannerText}
          onCancelBranch={handleCancelBranch}
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

      {/* Jembatan Kabel Form */}
      {drawingCoords.length >= 2 && (
        <JembatanKabelForm
          visible={showJembatanForm}
          koordinat={drawingCoords}
          onSubmit={handleJembatanSubmit}
          onCancel={() => {
            setShowJembatanForm(false);
            setDrawingCoords([]);
            setIsDrawing(false);
            setToolMode('none');
          }}
        />
      )}

      {/* Persil Pelanggan Form */}
      <PersilForm
        visible={showPersilForm}
        koordinatSudut={drawingPersilCorners.length === 2 ? [drawingPersilCorners[0], drawingPersilCorners[1]] : null}
        onSubmit={handlePersilSubmit}
        onCancel={() => {
          setShowPersilForm(false);
          setDrawingPersilCorners([]);
          setEditingPersil(null);
          setToolMode('none');
        }}
        initialData={editingPersil ? {
          namaPersil: editingPersil.namaPersil,
          warnaBorder: editingPersil.warnaBorder,
          catatan: editingPersil.catatan,
        } : undefined}
      />

      {/* Survey Summary Screen */}
      {currentSurvey && (
        <SurveySummaryScreen
          visible={showSummary}
          survey={currentSurvey}
          onClose={() => setShowSummary(false)}
          onSaveAndClose={handleSaveAndClose}
          onNewSurvey={handleNewSurvey}
          onExportPDFGambar={handleExportPdf}
          overlayLayers={overlayLayers}
        />
      )}

      {/* Survey History Screen */}
      <SurveyHistoryScreen
        visible={showHistory}
        onSelectSurvey={handleSelectSurvey}
        onEditSurvey={(survey) => {
          setEditingSurvey(survey);
          setShowBASurveyForm(true);
          setShowHistory(false);
        }}
        onNewSurvey={() => {
          setShowHistory(false);
          handleNewSurvey();
        }}
        onClose={() => setShowHistory(false)}
      />

      {/* BA Survey Form - New Survey Creation */}
      <BASurveyForm
        visible={showBASurveyForm}
        onClose={() => {
          setShowBASurveyForm(false);
          setEditingSurvey(null);
        }}
        onSubmit={async (baData) => {
          if (editingSurvey) {
            // Edit mode: update existing survey
            try {
              const tanggal = baData.tanggalSurvey.toLocaleDateString('id-ID');
              const surveyName = `${baData.jenisPermohonan} - ${baData.namaPelanggan} (${tanggal})`;
              await surveyService.update(editingSurvey.id, {
                namaSurvey: surveyName,
                jenisSurvey: baData.jenisPermohonan,
                lokasi: baData.alamat,
                surveyor: baData.namaSurveyor || session?.user?.email || 'Surveyor',
                tanggalSurvey: baData.tanggalSurvey,
                idPelanggan: baData.idPelanggan,
                alamatPelanggan: baData.alamat,
                tarifDaya: baData.tarifDaya,
                hasilSurvey: baData.hasilSurvey,
                namaPerwakilan: baData.namaPerwakilan,
                keterangan: baData.keterangan,
                appDipasang: baData.appDipasang,
                konstruksiOleh: baData.konstruksiOleh,
                baChecklist: baData.checklist,
                signaturePelanggan: baData.signaturePelanggan,
                signatureSurveyor: baData.signatureSurveyor,
              });
              // Reload survey if it's the current one
              if (currentSurvey?.id === editingSurvey.id) {
                const updated = await surveyService.getById(editingSurvey.id);
                if (updated) setCurrentSurvey(updated);
              }
              setShowBASurveyForm(false);
              setEditingSurvey(null);
              Alert.alert('✅ Berhasil', 'Data survey berhasil diperbarui!');
            } catch (error) {
              console.error('Error updating survey:', error);
              Alert.alert('Error', 'Gagal memperbarui survey');
            }
          } else {
            // New survey mode
            await handleBASurveySubmit(baData);
          }
        }}
        initialData={editingSurvey || undefined}
      />
      {/* Layer Control Modal */}
      <LayerControlModal
        visible={showLayerControl}
        onClose={() => setShowLayerControl(false)}
        layerVisibility={layerVisibility}
        onLayerChange={(update) => setLayerVisibility(prev => ({ ...prev, ...update }))}
        overlayLayers={overlayLayers}
        onOverlayVisibilityChange={(id, v) => {
          const updated = overlayLayers.map(o => o.id === id ? { ...o, visible: v } : o);
          setOverlayLayers(updated);
          overlayStorage.updateVisibility(id, v);
        }}
        onOverlayUpdate={(updatedFile) => {
          const updated = overlayLayers.map(o => o.id === updatedFile.id ? updatedFile : o);
          setOverlayLayers(updated);
          overlayStorage.saveAllOverlays(updated);
        }}
      />

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

      {/* Export Progress Modal Splash Screen */}
      <Modal
        visible={exportProgress !== null}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => {}}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: 20,
            padding: 24,
            width: '85%',
            maxWidth: 360,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 10,
            elevation: 12,
          }}>
            {/* Header Badge Icon */}
            <View style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: '#E3F2FD',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 12,
            }}>
              <Ionicons name="document-text" size={32} color="#1565C0" />
            </View>

            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1565C0', textAlign: 'center', marginBottom: 2 }}>
              Ekspor PDF Gambar PLN
            </Text>

            {/* Progress Header & Percentage Badge */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 16, marginBottom: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#666', letterSpacing: 0.5 }}>MEMPROSES EKSPOR</Text>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#00C853' }}>{Math.min(100, Math.max(5, exportProgressPercent))}%</Text>
            </View>

            {/* Animated Progress Bar Track */}
            <View style={{ width: '100%', height: 10, backgroundColor: '#E0E0E0', borderRadius: 5, overflow: 'hidden', marginBottom: 14 }}>
              <View style={{
                width: `${Math.min(100, Math.max(5, exportProgressPercent))}%`,
                height: '100%',
                backgroundColor: '#00C853',
                borderRadius: 5,
              }} />
            </View>

            <Text style={{ fontSize: 13, fontWeight: '600', color: '#222', textAlign: 'center', lineHeight: 19 }}>
              {exportProgress || 'Memproses...'}
            </Text>

            <Text style={{ marginTop: 8, fontSize: 11, color: '#757575', textAlign: 'center' }}>
              Harap tunggu, capture peta & penyusunan PDF sedang berlangsung
            </Text>
          </View>
        </View>
      </Modal>


      {/* Menu Modal */}
      <MenuModal
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        userEmail={session?.user?.email || 'User'}
        onOpenAbout={() => setShowAbout(true)}
        onOpenOverlayManager={() => setShowOverlayManager(true)}
      />

      {/* Overlay Manager Modal */}
      <OverlayManager
        visible={showOverlayManager}
        onClose={() => setShowOverlayManager(false)}
        overlays={overlayLayers}
        onOverlaysChange={setOverlayLayers}
      />

      {/* About Modal */}
      <AboutModal
        visible={showAbout}
        onClose={() => setShowAbout(false)}
      />

      {/* Custom Tiang Action Modal (Bottom Sheet) */}
      <TiangActionModal
        visible={selectedTiangForAction !== null}
        tiang={selectedTiangForAction}
        onClose={() => setSelectedTiangForAction(null)}
        onSelectBranch={(direction) => {
          if (selectedTiangForAction) {
            setActiveBranchParentId(selectedTiangForAction.id);
            setActiveBranchDirection(direction);
            setLastBranchTiangId(selectedTiangForAction.id);
            setToolMode('add-tiang');
          }
        }}
        onSelectMove={() => {
          if (selectedTiangForAction) {
            setMovingTiangId(selectedTiangForAction.id);
            setToolMode('move-tiang');
          }
        }}
        onSelectEdit={() => {
          if (selectedTiangForAction) {
            setEditingTiang(selectedTiangForAction);
            setSelectedCoordinate(selectedTiangForAction.koordinat);
            setShowTiangForm(true);
          }
        }}
        onSelectDelete={() => {
          if (selectedTiangForAction) {
            const targetTiang = selectedTiangForAction;
            const parentCode = getTiangDisplayCode(targetTiang);
            Alert.alert(
              'Hapus Tiang',
              `Yakin ingin menghapus Tiang ${parentCode} (${targetTiang.konstruksi})?`,
              [
                { text: 'Batal', style: 'cancel' },
                {
                  text: 'Hapus',
                  style: 'destructive',
                  onPress: () => deleteTiang(targetTiang.id)
                }
              ]
            );
          }
        }}
      />

      {/* Modal Export PDF Kop Gambar PLN */}
      <Modal
        visible={showExportPdfModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowExportPdfModal(false)}
      >
        <View style={styles.exportModalOverlay}>
          <View style={styles.exportModalContainer}>
            <View style={styles.exportModalHeader}>
              <Text style={styles.exportModalTitle}>⚡ Form Data Kop Gambar PLN</Text>
              <TouchableOpacity onPress={() => setShowExportPdfModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.exportModalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.exportSectionSubtitle}>Isi data pengesahan resmi untuk Kop Gambar PLN (Tersimpan otomatis):</Text>

              <View style={styles.exportFormRow}>
                <View style={[styles.exportFormGroup, { flex: 1, marginRight: 6 }]}>
                  <Text style={styles.exportFormLabel}>⚡ Nama UID</Text>
                  <TextInput
                    style={styles.exportFormInput}
                    value={pdfUidName}
                    onChangeText={setPdfUidName}
                    placeholder="Contoh: UID Banten"
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={[styles.exportFormGroup, { flex: 1, marginRight: 6 }]}>
                  <Text style={styles.exportFormLabel}>🏢 Nama UP3</Text>
                  <TextInput
                    style={styles.exportFormInput}
                    value={pdfUp3Name}
                    onChangeText={setPdfUp3Name}
                    placeholder="Contoh: UP3 Banten Selatan"
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={[styles.exportFormGroup, { flex: 1 }]}>
                  <Text style={styles.exportFormLabel}>📍 Nama ULP</Text>
                  <TextInput
                    style={styles.exportFormInput}
                    value={pdfUlpName}
                    onChangeText={setPdfUlpName}
                    placeholder="Contoh: ULP Labuan"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <View style={styles.exportFormGroup}>
                <Text style={styles.exportFormLabel}>👷 Disurvey Oleh (Nama Surveyor)</Text>
                <TextInput
                  style={styles.exportFormInput}
                  value={pdfSurveyorName}
                  onChangeText={setPdfSurveyorName}
                  placeholder="Nama Lengkap Surveyor / Tim Field"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.exportFormGroup}>
                <Text style={styles.exportFormLabel}>🔍 Diperiksa Oleh (Pemeriksa)</Text>
                <View style={styles.exportPillContainer}>
                  {['TL HAR', 'TL RENSIS', 'ASMAN KONS', 'TL TEKNIK'].map((title) => (
                    <TouchableOpacity
                      key={title}
                      style={[
                        styles.exportPill,
                        pdfPemeriksaTitle === title && styles.exportPillActive
                      ]}
                      onPress={() => setPdfPemeriksaTitle(title)}
                    >
                      <Text style={[
                        styles.exportPillText,
                        pdfPemeriksaTitle === title && styles.exportPillTextActive
                      ]}>
                        {title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={styles.exportFormInput}
                  value={pdfPemeriksaName}
                  onChangeText={setPdfPemeriksaName}
                  placeholder="Nama Lengkap Spv / Pemeriksa"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.exportFormGroup}>
                <Text style={styles.exportFormLabel}>👔 Disetujui Oleh (Manager ULP / UP3)</Text>
                <TextInput
                  style={styles.exportFormInput}
                  value={pdfManagerName}
                  onChangeText={setPdfManagerName}
                  placeholder="Nama Lengkap Manager PLN"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Option 1: Beban Trafo Web Database + Ketik/Pilih Gardu */}
              <View style={{
                backgroundColor: '#E3F2FD',
                padding: 12,
                borderRadius: 10,
                marginTop: 10,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: '#BBDEFB',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1565C0' }}>⚡ Sisipkan Data Beban Trafo Terupdate</Text>
                    <Text style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Tarik data beban live dari web (fikrybudi.github.io)</Text>
                  </View>
                  <Switch
                    value={includeBebanTrafo}
                    onValueChange={setIncludeBebanTrafo}
                    trackColor={{ false: '#767577', true: '#81C784' }}
                    thumbColor={includeBebanTrafo ? '#2E7D32' : '#f4f3f4'}
                  />
                </View>

                {includeBebanTrafo && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#0D47A1', marginBottom: 4 }}>
                      Pilih / Ketik Nama Gardu (Contoh: STG / STG240 / LBAN008):
                    </Text>
                    <TextInput
                      style={[styles.exportFormInput, { backgroundColor: '#fff', fontSize: 12, paddingVertical: 6 }]}
                      value={pdfCustomGarduSearch}
                      onChangeText={setPdfCustomGarduSearch}
                      placeholder="Ketik nama/kode gardu (misal: STG240)"
                      placeholderTextColor="#999"
                      autoCapitalize="characters"
                    />

                    {/* Quick selection pills from survey gardus */}
                    {currentSurvey?.garduList && currentSurvey.garduList.length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                        <Text style={{ fontSize: 10, color: '#666', width: '100%' }}>Pilih dari Gardu Survey:</Text>
                        {currentSurvey.garduList.map((g) => {
                          const label = g.namaGardu || g.nomorGardu;
                          const isSelected = pdfCustomGarduSearch.includes(label);
                          return (
                            <TouchableOpacity
                              key={g.id}
                              style={{
                                backgroundColor: isSelected ? '#1565C0' : '#E0E0E0',
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 12,
                              }}
                              onPress={() => {
                                setPdfCustomGarduSearch(prev => {
                                  if (!prev) return label;
                                  if (prev.includes(label)) return prev;
                                  return `${prev}, ${label}`;
                                });
                              }}
                            >
                              <Text style={{ fontSize: 10, fontWeight: 'bold', color: isSelected ? '#fff' : '#333' }}>
                                🏷️ {label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* Option 2: Pekerjaan Uprating Trafo */}
              <View style={{
                backgroundColor: '#FFF3E0',
                padding: 12,
                borderRadius: 10,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: '#FFE0B2',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#E65100' }}>⚡ Pekerjaan Uprating Trafo</Text>
                    <Text style={{ fontSize: 11, color: '#666', marginTop: 2 }}>Cantumkan item Uprating Trafo pada Rincian Pekerjaan</Text>
                  </View>
                  <Switch
                    value={isUpratingTrafo}
                    onValueChange={setIsUpratingTrafo}
                    trackColor={{ false: '#767577', true: '#FFB74D' }}
                    thumbColor={isUpratingTrafo ? '#EF6C00' : '#f4f3f4'}
                  />
                </View>

                {isUpratingTrafo && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#E65100', marginBottom: 4 }}>
                      Target Kapasitas Uprating (kVA):
                    </Text>
                    <TextInput
                      style={[styles.exportFormInput, { backgroundColor: '#fff', fontSize: 12, paddingVertical: 6 }]}
                      value={upratingKva}
                      onChangeText={setUpratingKva}
                      placeholder="Contoh: 250 kVA"
                      placeholderTextColor="#999"
                    />

                    {/* Quick selection pills for kVA capacity */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                      {['100 kVA', '160 kVA', '250 kVA', '400 kVA'].map((kva) => (
                        <TouchableOpacity
                          key={kva}
                          style={{
                            backgroundColor: upratingKva === kva ? '#EF6C00' : '#FFE0B2',
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 12,
                          }}
                          onPress={() => setUpratingKva(kva)}
                        >
                          <Text style={{ fontSize: 11, fontWeight: 'bold', color: upratingKva === kva ? '#fff' : '#E65100' }}>
                            {kva}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              <Text style={[styles.exportFormLabel, { marginTop: 14, fontSize: 13, color: '#0D47A1' }]}>📐 Mode Segmentasi Halaman PDF:</Text>
              <View style={styles.exportModeContainer}>
                <TouchableOpacity
                  style={[styles.exportModeCard, selectedSegmentMode === 'scale' && styles.exportModeCardActive]}
                  onPress={() => setSelectedSegmentMode('scale')}
                >
                  <Text style={styles.exportModeCardTitle}>📐 Skala Saat Ini ({getNumericScaleString(currentZoom)})</Text>
                  <Text style={styles.exportModeCardSub}>Multi-page dengan skala terkunci (Rekomendasi)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.exportModeCard, selectedSegmentMode === 'tm8' && styles.exportModeCardActive]}
                  onPress={() => setSelectedSegmentMode('tm8')}
                >
                  <Text style={styles.exportModeCardTitle}>⚡ 8 Tiang TM / Halaman</Text>
                  <Text style={styles.exportModeCardSub}>Dipotong per 8 tiang SUTM</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.exportModeCard, selectedSegmentMode === 'dist400' && styles.exportModeCardActive]}
                  onPress={() => setSelectedSegmentMode('dist400')}
                >
                  <Text style={styles.exportModeCardTitle}>📏 Per 400 Meter / Halaman</Text>
                  <Text style={styles.exportModeCardSub}>Dipotong per 400m fisik jalur</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.exportModeCard, selectedSegmentMode === 'single' && styles.exportModeCardActive]}
                  onPress={() => setSelectedSegmentMode('single')}
                >
                  <Text style={styles.exportModeCardTitle}>📄 1 Halaman Full</Text>
                  <Text style={styles.exportModeCardSub}>Seluruh jalur dalam 1 lembar PDF</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.exportModalFooter}>
              <TouchableOpacity
                style={styles.exportCancelButton}
                onPress={() => setShowExportPdfModal(false)}
              >
                <Text style={styles.exportCancelButtonText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.exportSubmitButton}
                onPress={doProcessExportPdf}
              >
                <Text style={styles.exportSubmitButtonText}>🚀 EXPORT PDF RESMI</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Fast Startup Splash Screen Overlay */}
      {showSplashScreen && (
        <Animated.View
          style={[styles.splashOverlay, { opacity: splashFadeAnim }]}
          pointerEvents={showSplashScreen ? 'auto' : 'none'}
        >
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          <Animated.View style={{ alignItems: 'center', transform: [{ scale: splashScaleAnim }] }}>
            <Image
              source={require('./assets/splashs.png')}
              style={styles.splashImage}
              resizeMode="contain"
            />
            <View style={{ marginTop: 24, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#0D47A1" />
              <Text style={styles.splashTaglineText}>Survey Made Easy : Mudah, Cepat, Akurat</Text>
              <Text style={styles.splashFooterText}>PLN OPTADIS GIS SYSTEM</Text>
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999999,
  },
  splashImage: {
    width: 220,
    height: 220,
  },
  splashTaglineText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D47A1',
    marginTop: 10,
    letterSpacing: 0.2,
  },
  splashFooterText: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: '#9E9E9E',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#0D47A1',
    paddingHorizontal: 10,
    paddingTop: 35,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  historyButton: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLogo: {
    width: 22,
    height: 22,
    marginRight: 6,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    padding: 1,
  },
  headerContent: {
    flex: 1,
    marginHorizontal: 8,
    justifyContent: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 9.5,
    marginTop: 1,
    fontWeight: '500',
  },
  headerStats: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9.5,
    marginTop: 1.5,
    fontWeight: '500',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  headerActionButton: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    width: 35,
    height: 35,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  layerActionButton: {
    backgroundColor: 'rgba(0, 172, 193, 0.38)',
    borderWidth: 1,
    borderColor: 'rgba(77, 208, 225, 0.55)',
  },
  screenshotActionButton: {
    backgroundColor: 'rgba(255, 152, 0, 0.38)',
    borderWidth: 1,
    borderColor: 'rgba(255, 183, 77, 0.55)',
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
  // Export PDF Modal Styles
  exportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  exportModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 12,
  },
  exportModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#0D47A1',
  },
  exportModalTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  exportModalBody: {
    padding: 20,
  },
  exportSectionSubtitle: {
    fontSize: 12,
    color: '#555',
    marginBottom: 14,
  },
  exportFormRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  exportFormGroup: {
    marginBottom: 12,
  },
  exportFormLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  exportFormInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#222',
    backgroundColor: '#F9FAFB',
  },
  exportPillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  exportPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
  },
  exportPillActive: {
    backgroundColor: '#0D47A1',
  },
  exportPillText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#555',
  },
  exportPillTextActive: {
    color: '#fff',
  },
  exportModeContainer: {
    gap: 8,
    marginTop: 8,
  },
  exportModeCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  exportModeCardActive: {
    borderColor: '#0D47A1',
    backgroundColor: '#E3F2FD',
  },
  exportModeCardTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0D47A1',
  },
  exportModeCardSub: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  exportModalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#EEEEEE',
    backgroundColor: '#F9FAFB',
    gap: 12,
  },
  exportCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#EEEEEE',
    alignItems: 'center',
  },
  exportCancelButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  exportSubmitButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#0D47A1',
    alignItems: 'center',
  },
  exportSubmitButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
});
