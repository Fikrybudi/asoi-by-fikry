// =============================================================================
// PLN SURVEY APP - Leaflet Map with Draggable Pinpoint
// =============================================================================

import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Platform, PixelRatio, Modal, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { captureRef, captureScreen } from 'react-native-view-shot';
import { Coordinate, Tiang, Gardu, JalurKabel, JembatanKabel, PersilPelanggan } from '../../types';
import { OverlayFile } from '../../types/overlayTypes';
import { generateMapHTML } from '../../utils/mapHtml';

// =============================================================================
// TYPES
// =============================================================================

interface SurveyMapProps {
  tiangList: Tiang[];
  garduList: Gardu[];
  jalurList: JalurKabel[];
  jembatanKabelList?: JembatanKabel[];
  onMapPress?: (coordinate: Coordinate) => void;
  onTiangPress?: (tiang: Tiang) => void;
  onGarduPress?: (gardu: Gardu) => void;
  onJalurPress?: (jalur: JalurKabel) => void;
  isAddingTiang?: boolean;
  isAddingGardu?: boolean;
  isDrawingJalur?: boolean;
  isDrawingPersil?: boolean;
  drawingPersilCorners?: Coordinate[];  // 0 or 1 corners tapped so far
  currentJalurCoords?: Coordinate[];
  lastTiangCoord?: Coordinate; // For showing distance preview
  visibleLayers?: {
    tiang: boolean;
    gardu: boolean;
    sutr: boolean;
    sutm: boolean;
    skutm: boolean;
    sktm: boolean;
  };
  onCenterChange?: (coordinate: Coordinate) => void;
  selectedTiangIds?: string[];
  onTiangLabelShift?: (tiangId: string, newPosition: number) => void;
  persilList?: PersilPelanggan[];
  onPersilPress?: (persil: PersilPelanggan) => void;
  overlayLayers?: OverlayFile[];
}





// =============================================================================
// MAP COMPONENT
// =============================================================================

export interface SurveyMapRef {
  captureMap: () => Promise<string | null>;
  fitToBounds: () => void;
  captureOptimalMap: () => Promise<string | null>;
  /** Capture peta pada bounds tertentu (untuk multi-page PDF) */
  captureSegment: (
    bounds: [[number, number], [number, number]],
    boundaryMarkers?: BoundaryMarker[]
  ) => Promise<string | null>;
}

/** Marker huruf pembatas segmen (A, B, C...) yang ditampilkan di peta saat capture */
export interface BoundaryMarker {
  label: string;        // 'A', 'B', 'C', ...
  lat: number;
  lng: number;
}

const SurveyMap = forwardRef<SurveyMapRef, SurveyMapProps>(({
  tiangList,
  garduList,
  jalurList,
  jembatanKabelList = [],
  onMapPress,
  onTiangPress,
  onGarduPress,
  onJalurPress,
  isAddingTiang = false,
  isAddingGardu = false,
  isDrawingJalur = false,
  isDrawingPersil = false,
  drawingPersilCorners = [],
  currentJalurCoords = [],
  lastTiangCoord,
  visibleLayers = { tiang: true, gardu: true, sutr: true, sutm: true, skutm: true, sktm: true },
  onCenterChange,
  selectedTiangIds = [],
  onTiangLabelShift,
  persilList = [],
  onPersilPress,
  overlayLayers = [],
}, ref) => {
  const webviewRef = useRef<WebView>(null);
  const containerRef = useRef<View>(null);
  const [userLocation, setUserLocation] = useState<Coordinate>({
    latitude: -6.2088,
    longitude: 106.8456,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [centerCoordinate, setCenterCoordinate] = useState<Coordinate | null>(null);
  const [liveDistance, setLiveDistance] = useState<number | null>(null);
  const [currentZoom, setCurrentZoom] = useState(18); // Track current zoom level
  const [mapViewCenter, setMapViewCenter] = useState<Coordinate | null>(null); // Persist user's viewed position
  const [activeBaseMap, setActiveBaseMap] = useState<string>('streets'); // Lock active base map selection
  const captureResolverRef = useRef<((value: string | null) => void) | null>(null); // For Android WebView capture
  const [jalurModalVisible, setJalurModalVisible] = useState(false); // Jalur list modal

  // Expose captureMap method via ref
  useImperativeHandle(ref, () => ({
    captureMap: async () => {
      // Try capturing specific container first
      if (containerRef.current) {
        try {
          console.log('Attempting captureRef...');
          const base64 = await captureRef(containerRef.current, {
            format: 'png',
            quality: 0.8,
            result: 'base64',
          });
          console.log('Map captured successfully via captureRef');
          return base64;
        } catch (error) {
          console.warn('captureRef failed, falling back to captureScreen:', error);
        }
      }

      // Fallback to capturing the entire screen
      try {
        console.log('Attempting captureScreen...');
        const base64 = await captureScreen({
          format: 'png',
          quality: 0.8,
          result: 'base64',
        });
        console.log('Map captured successfully via captureScreen');
        return base64;
      } catch (error) {
        console.error('All capture methods failed:', error);
        return null;
      }
    },

    // Fit map to show all survey points
    fitToBounds: () => {
      if (!webviewRef.current) return;

      // Collect all coordinates from tiangs, gardus
      const allCoords = [
        ...tiangList.map(t => t.koordinat),
        ...garduList.map(g => g.koordinat),
      ];

      if (allCoords.length === 0) return;

      // Calculate bounding box
      const lats = allCoords.map(c => c.latitude);
      const lngs = allCoords.map(c => c.longitude);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      // Add padding (10% of range)
      const latPadding = (maxLat - minLat) * 0.15 || 0.001;
      const lngPadding = (maxLng - minLng) * 0.15 || 0.001;

      const bounds = [
        [minLat - latPadding, minLng - lngPadding],
        [maxLat + latPadding, maxLng + lngPadding]
      ];

      webviewRef.current.injectJavaScript(`
        map.fitBounds(${JSON.stringify(bounds)});
        true;
      `);
    },

    // Capture map with optimal zoom for all points
    captureOptimalMap: async () => {
      if (!webviewRef.current || !containerRef.current) return null;

      // Collect all coordinates
      const allCoords = [
        ...tiangList.map(t => t.koordinat),
        ...garduList.map(g => g.koordinat),
      ];

      if (allCoords.length === 0) return null;

      // Calculate bounding box
      const lats = allCoords.map(c => c.latitude);
      const lngs = allCoords.map(c => c.longitude);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      const latPadding = (maxLat - minLat) * 0.2 || 0.001;
      const lngPadding = (maxLng - minLng) * 0.2 || 0.001;

      const bounds = [
        [minLat - latPadding, minLng - lngPadding],
        [maxLat + latPadding, maxLng + lngPadding]
      ];

      console.log('Fitting bounds for capture:', JSON.stringify(bounds));

      // For Android, use in-WebView html2canvas capture to avoid SVG scaling issues
      if (Platform.OS === 'android') {
        return new Promise<string | null>((resolve) => {
          // Store resolver in ref so handleMessage can access it
          captureResolverRef.current = resolve;

          // Trigger capture in WebView
          webviewRef.current?.injectJavaScript(`
            if (window.captureMapToBase64) {
              window.captureMapToBase64(${JSON.stringify(bounds)});
            } else {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'mapCaptureError',
                error: 'captureMapToBase64 not available'
              }));
            }
            true;
          `);

          // Timeout after 10 seconds
          setTimeout(() => {
            if (captureResolverRef.current) {
              console.warn('WebView capture timeout');
              captureResolverRef.current(null);
              captureResolverRef.current = null;
            }
          }, 10000);
        });
      }

      // iOS: Use standard captureRef approach
      try {
        // Inject export mode CSS
        webviewRef.current.injectJavaScript(`
          var exportStyle = document.createElement('style');
          exportStyle.id = 'export-mode-style';
          exportStyle.innerHTML = \`
            .legend { display: none !important; }
            .crosshair { display: none !important; }
            .leaflet-control-zoom { display: none !important; }
          \`;
          document.head.appendChild(exportStyle);
          map.fitBounds(${JSON.stringify(bounds)}, { animate: false, padding: [30, 30] });
          map.invalidateSize();
          true;
        `);

        await new Promise(resolve => setTimeout(resolve, 2500));

        const base64 = await captureRef(containerRef.current, {
          format: 'png',
          quality: 1.0,
          result: 'base64',
        });
        console.log('Optimal map captured successfully (iOS)');

        // Remove export mode CSS
        webviewRef.current?.injectJavaScript(`
          var exportStyle = document.getElementById('export-mode-style');
          if (exportStyle) exportStyle.remove();
          true;
        `);

        return base64;
      } catch (error) {
        console.error('captureOptimalMap failed:', error);
        return null;
      }
    },

    // Capture peta pada bounds tertentu (untuk multi-page segmented PDF)
    captureSegment: async (
      bounds: [[number, number], [number, number]],
      boundaryMarkers?: BoundaryMarker[]
    ) => {
      if (!webviewRef.current || !containerRef.current) return null;

      // Inject marker huruf batas segmen (memanggil fungsi di WebView — aman dari escaping issue)
      const markersJson = JSON.stringify(boundaryMarkers ?? []);
      const injectMarkersJS = `
        if (window.addSegmentBoundaryMarkers) {
          window.addSegmentBoundaryMarkers(${markersJson});
        }
        true;
      `;
      const removeMarkersJS = `
        if (window.removeSegmentBoundaryMarkers) {
          window.removeSegmentBoundaryMarkers();
        }
        true;
      `;

      // Inject markers sebelum capture (jika ada)
      if (boundaryMarkers && boundaryMarkers.length > 0) {
        webviewRef.current.injectJavaScript(injectMarkersJS);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Android: gunakan html2canvas via WebView
      if (Platform.OS === 'android') {
        return new Promise<string | null>((resolve) => {
          let hasResolved = false; // Guard untuk mencegah timeout stale tereksekusi

          captureResolverRef.current = (result: string | null) => {
            if (hasResolved) return;
            hasResolved = true;
            webviewRef.current?.injectJavaScript(removeMarkersJS);
            resolve(result);
          };

          webviewRef.current?.injectJavaScript(`
            if (typeof isCapturing !== 'undefined') { isCapturing = false; }
            
            // Retry logic: if captureMapToBase64 not ready (WebView may have reloaded), wait and retry
            function tryCapture(attempt) {
              if (window.captureMapToBase64) {
                window.captureMapToBase64(${JSON.stringify(bounds)});
              } else if (attempt < 3) {
                setTimeout(function() { tryCapture(attempt + 1); }, 1500);
              } else {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'mapCaptureError',
                  error: 'captureMapToBase64 not available after retries'
                }));
              }
            }
            tryCapture(0);
            true;
          `);

          setTimeout(() => {
            if (hasResolved) return; // Jika sudah resolve, abaikan timeout ini
            hasResolved = true;
            console.warn('captureSegment timeout');
            webviewRef.current?.injectJavaScript(removeMarkersJS);

            // Hanya clear jika masih refer ke promise ini (untuk extra safety)
            captureResolverRef.current = null;
            resolve(null);
          }, 15000);
        });
      }

      // iOS: captureRef approach
      try {
        webviewRef.current.injectJavaScript(`
          var exportStyle = document.getElementById('export-mode-style');
          if (!exportStyle) {
            exportStyle = document.createElement('style');
            exportStyle.id = 'export-mode-style';
            document.head.appendChild(exportStyle);
          }
          exportStyle.innerHTML = \`
            .legend { display: none !important; }
            .crosshair { display: none !important; }
            .leaflet-control-zoom { display: none !important; }
          \`;
          map.fitBounds(${JSON.stringify(bounds)}, { animate: false, padding: [10, 10] });
          map.invalidateSize();
          true;
        `);
        await new Promise(resolve => setTimeout(resolve, 3500));
        const base64 = await captureRef(containerRef.current, {
          format: 'png',
          quality: 1.0,
          result: 'base64',
        });
        webviewRef.current?.injectJavaScript(removeMarkersJS);
        webviewRef.current?.injectJavaScript(`
          var s = document.getElementById('export-mode-style');
          if (s) s.remove();
          true;
        `);
        return base64;
      } catch (error) {
        console.error('captureSegment failed:', error);
        webviewRef.current?.injectJavaScript(removeMarkersJS);
        return null;
      }
    },

  }));

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        } catch (error) {
          console.log('Location error:', error);
        }
      }
      setIsLoading(false);
    })();
  }, []);

  // Dynamic Layer Visibility Update
  useEffect(() => {
    if (webviewRef.current) {
      webviewRef.current.injectJavaScript(`
        if (window.updateLayerVisibility) {
            window.updateLayerVisibility(${JSON.stringify(visibleLayers)});
        } else {
             // Fallback: update styles directly if function not defined (though we use CSS classes)
             // Simpler to rely on re-render or add a helper in HTML.
             // But since we use CSS injection in HTML generation, 
             // we need to inject new styles or toggle class.
             // Actually, the previous implementation used CSS injection string.
             // Let's create a helper in the JS block below to handle this cleanly.
        }
      `);
    }
  }, [visibleLayers]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'mapClick') {
        const coord: Coordinate = { latitude: data.lat, longitude: data.lng };
        if (onMapPress) {
          onMapPress(coord);
        }
      } else if (data.type === 'centerUpdate') {
        const newCenter = { latitude: data.lat, longitude: data.lng };
        setCenterCoordinate(newCenter);
        if (onCenterChange) onCenterChange(newCenter);

      } else if (data.type === 'centerUpdate') {
        const newCenter = { latitude: data.lat, longitude: data.lng };
        setCenterCoordinate(newCenter);
        if (onCenterChange) onCenterChange(newCenter);
      } else if (data.type === 'tiangLabelShift') {
        // Handle label shift: cycle through 8 positions
        if (onTiangLabelShift) {
          onTiangLabelShift(data.id, data.newPosition);
        }
      } else if (data.type === 'tiang') {
        const tiang = tiangList.find(t => t.id === data.id);
        if (tiang && onTiangPress) onTiangPress(tiang);
      } else if (data.type === 'gardu') {
        const gardu = garduList.find(g => g.id === data.id);
        if (gardu && onGarduPress) onGarduPress(gardu);
      } else if (data.type === 'jalur') {
        const jalur = jalurList.find(j => j.id === data.id);
        if (jalur && onJalurPress) onJalurPress(jalur);
      } else if (data.type === 'persil') {
        const persil = persilList.find(p => p.id === data.id);
        if (persil && onPersilPress) onPersilPress(persil);
      } else if (data.type === 'zoomChange') {
        setCurrentZoom(data.zoom);
      } else if (data.type === 'baseMapChange') {
        setActiveBaseMap(data.baseMap);
      } else if (data.type === 'mapCapture') {
        // Resolve pending capture promise
        if (captureResolverRef.current) {
          console.log('Received map capture from WebView');
          captureResolverRef.current(data.base64);
          captureResolverRef.current = null;
        }
      } else if (data.type === 'mapCaptureError') {
        // Resolve pending capture promise with null
        if (captureResolverRef.current) {
          console.error('WebView capture error:', data.error);
          captureResolverRef.current(null);
          captureResolverRef.current = null;
        }
      } else if (data.type === 'mapCenterChange') {
        // Persist map view position when user pans/zooms
        setMapViewCenter({ latitude: data.lat, longitude: data.lng });
      }
    } catch (error) {
      console.log('Message parse error:', error);
    }
  };

  const isAddMode = isAddingTiang || isAddingGardu || isDrawingJalur || isDrawingPersil;

  // Check if there are any survey points to navigate to (including jalur)
  const hasSurveyPoints = tiangList.length > 0 || garduList.length > 0 || jalurList.length > 0;

  // Handler: Zoom to fit all survey points (including jalur)
  const handleZoomToSurvey = () => {
    if (!webviewRef.current) return;

    // Collect all coordinates from tiang, gardu, AND jalur
    const allCoords = [
      ...tiangList.map(t => t.koordinat),
      ...garduList.map(g => g.koordinat),
      ...jalurList.flatMap(j => j.koordinat), // Flatten all jalur coordinates
    ];

    if (allCoords.length === 0) return;

    const lats = allCoords.map(c => c.latitude);
    const lngs = allCoords.map(c => c.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latPadding = (maxLat - minLat) * 0.15 || 0.001;
    const lngPadding = (maxLng - minLng) * 0.15 || 0.001;

    const bounds = [
      [minLat - latPadding, minLng - lngPadding],
      [maxLat + latPadding, maxLng + lngPadding]
    ];


    webviewRef.current.injectJavaScript(`
      map.fitBounds(${JSON.stringify(bounds)}, { animate: true });
      true;
    `);
  };

  // Handler: Go to current GPS location
  const handleGoToMyLocation = async () => {
    if (!webviewRef.current) return;

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setUserLocation(newLocation);

      webviewRef.current.injectJavaScript(`
        map.setView([${newLocation.latitude}, ${newLocation.longitude}], 18, { animate: true });
        true;
      `);
    } catch (error) {
      console.log('Location error:', error);
    }
  };

  // Determine map center priority: mapViewCenter (user's viewed position) > centerCoordinate (add mode) > userLocation (GPS)
  const mapCenter = mapViewCenter || centerCoordinate || userLocation;

  // Memoize HTML to prevent reloading on every pan/zoom
  // We exclude mapCenter and currentZoom from dependencies to avoid reloads on movement
  // We'll handle movement updates via useEffect and injectJavaScript
  const html = React.useMemo(() => {
    return generateMapHTML(
      mapCenter,
      tiangList,
      garduList,
      jalurList,
      jembatanKabelList || [],
      currentJalurCoords,
      isAddingTiang,
      isAddingGardu,
      isDrawingJalur,
      lastTiangCoord,
      visibleLayers,
      selectedTiangIds,
      currentZoom,
      persilList,
      overlayLayers,
      activeBaseMap
    );
  }, [
    // Structural changes that REQUIRE HTML regeneration:
    tiangList,
    garduList,
    jalurList,
    currentJalurCoords,
    isAddingTiang,
    isAddingGardu,
    isDrawingJalur,
    lastTiangCoord,
    visibleLayers,
    selectedTiangIds,
    persilList,
    overlayLayers,
    activeBaseMap
    // Note: mapCenter and currentZoom are EXCLUDED
  ]);

  // Effect to handle Map Center updates without reloading HTML
  useEffect(() => {
    if (webviewRef.current && mapCenter) {
      // Only update if significantly different to avoid jitter loop
      // But for now, let's rely on Leaflet's smart setView which animates
      // We pass animate: false to reduce jitter if it's just a small correction

      // However, if the user is dragging, this effect fires.
      // We should ideally NOT setView if the user is interacting.
      // But we don't know if user is interacting easily here.

      // A simple heuristic: if the update comes from App state, it might be from 'moveend'.
      // If 'moveend' just happened, we are already at that center.
      // Leaflet setView to current center is a no-op usually.

      webviewRef.current.injectJavaScript(`
        if (map) {
          var current = map.getCenter();
          var dist = Math.sqrt(Math.pow(current.lat - ${mapCenter.latitude}, 2) + Math.pow(current.lng - ${mapCenter.longitude}, 2));
           // Only move if distance is significant (> 0.000001 deg is approx 10cm)
           // OR if we are specifically in a mode that demands it
           if (dist > 0.00001) {
             map.setView([${mapCenter.latitude}, ${mapCenter.longitude}], ${currentZoom || 'map.getZoom()'}, { animate: false });
           }
        }
        true;
      `);
    }
  }, [mapCenter, currentZoom]);

  return (
    <View style={styles.container} ref={containerRef} collapsable={false}>
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html }}
        style={styles.map}
        onMessage={handleMessage}
        scrollEnabled={true}
      />



      {/* Navigation Buttons - Zoom to Survey & My Location */}
      <View style={styles.navButtons}>
        {hasSurveyPoints && (
          <TouchableOpacity
            style={styles.navButton}
            onPress={handleZoomToSurvey}
            activeOpacity={0.7}
          >
            <Text style={styles.navButtonIcon}>🗺️</Text>
            <Text style={styles.navButtonLabel}>Survey</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.navButton}
          onPress={handleGoToMyLocation}
          activeOpacity={0.7}
        >
          <Text style={styles.navButtonIcon}>📍</Text>
          <Text style={styles.navButtonLabel}>Lokasi</Text>
        </TouchableOpacity>
        {jalurList.length > 0 && (
          <TouchableOpacity
            style={[styles.navButton, { backgroundColor: 'rgba(233, 30, 99, 0.95)' }]}
            onPress={() => setJalurModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.navButtonIcon}>✏️</Text>
            <Text style={[styles.navButtonLabel, { color: '#fff' }]}>Jalur</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats Overlay (Only showing in Add Mode for context) */}
      {isAddMode && (
        <View style={styles.statsOverlay}>
          <View style={styles.statBadge}>
            <Text style={styles.statText}>📍 {tiangList.length}</Text>
          </View>
          <View style={styles.statBadge}>
            <Text style={styles.statText}>⚡ {jalurList.length}</Text>
          </View>
        </View>
      )}

      {/* Jalur List Modal */}
      <Modal
        visible={jalurModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setJalurModalVisible(false)}
      >
        <View style={styles.jalurModalOverlay}>
          <View style={styles.jalurModalContent}>
            <View style={styles.jalurModalHeader}>
              <Text style={styles.jalurModalTitle}>📋 Daftar Jalur</Text>
              <TouchableOpacity onPress={() => setJalurModalVisible(false)}>
                <Text style={styles.jalurModalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.jalurList}>
              {jalurList.map((jalur, index) => {
                const distLabel = jalur.panjangMeter >= 1000
                  ? (jalur.panjangMeter / 1000).toFixed(2) + ' km'
                  : Math.round(jalur.panjangMeter) + ' m';
                const colorMap: Record<string, string> = {
                  SUTM: '#E91E63',
                  SKTM: '#9C27B0',
                  SKUTM: '#00BCD4',
                  SUTR: '#4CAF50',
                  SKTR: '#795548',
                };
                const jalurColor = colorMap[jalur.jenisJaringan] || '#666';
                return (
                  <TouchableOpacity
                    key={jalur.id}
                    style={styles.jalurItem}
                    onPress={() => {
                      setJalurModalVisible(false);
                      if (onJalurPress) onJalurPress(jalur);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.jalurColorBar, { backgroundColor: jalurColor }]} />
                    <View style={styles.jalurItemContent}>
                      <Text style={styles.jalurItemTitle}>
                        {jalur.jenisJaringan} - {jalur.jenisPenghantar}
                      </Text>
                      <Text style={styles.jalurItemSub}>
                        {distLabel} • {jalur.koordinat.length} titik • {jalur.status}
                      </Text>
                    </View>
                    <Text style={styles.jalurItemArrow}>›</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
});

export default SurveyMap;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  drawingOverlay: {
    position: 'absolute',
    bottom: 160,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 87, 34, 0.95)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  drawingText: {
    color: 'white',
    fontWeight: 'bold',
  },
  statsOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    gap: 6,
  },
  statBadge: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
  },
  navButtons: {
    position: 'absolute',
    left: 10,
    top: 80,
    gap: 8,
  },
  navButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 56,
  },
  navButtonIcon: {
    fontSize: 20,
  },
  navButtonLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#333',
    marginTop: 2,
  },
  // Jalur Modal Styles
  jalurModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  jalurModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: 20,
  },
  jalurModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  jalurModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  jalurModalClose: {
    fontSize: 24,
    color: '#999',
    paddingHorizontal: 8,
  },
  jalurList: {
    paddingHorizontal: 16,
  },
  jalurItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  jalurColorBar: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  jalurItemContent: {
    flex: 1,
  },
  jalurItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  jalurItemSub: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  jalurItemArrow: {
    fontSize: 24,
    color: '#ccc',
  },
});
