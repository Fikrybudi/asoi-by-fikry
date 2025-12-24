// =============================================================================
// PLN SURVEY APP - Leaflet Map with Draggable Pinpoint
// =============================================================================

import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { captureRef, captureScreen } from 'react-native-view-shot';
import { Coordinate, Tiang, Gardu, JalurKabel } from '../../types';
import { formatDistance, calculatePolylineLength, formatCoordinate, calculateDistance } from '../../utils/geoUtils';

// =============================================================================
// TYPES
// =============================================================================

interface SurveyMapProps {
  tiangList: Tiang[];
  garduList: Gardu[];
  jalurList: JalurKabel[];
  onMapPress?: (coordinate: Coordinate) => void;
  onTiangPress?: (tiang: Tiang) => void;
  onGarduPress?: (gardu: Gardu) => void;
  onJalurPress?: (jalur: JalurKabel) => void;
  isAddingTiang?: boolean;
  isAddingGardu?: boolean;
  isDrawingJalur?: boolean;
  currentJalurCoords?: Coordinate[];
  lastTiangCoord?: Coordinate; // For showing distance preview
  visibleLayers?: {
    tiang: boolean;
    gardu: boolean;
    sutr: boolean;
    sutm: boolean;
    skutm: boolean;
  };
  onCenterChange?: (coordinate: Coordinate) => void;
  selectedTiangIds?: string[];
}

// =============================================================================
// LEAFLET HTML TEMPLATE
// =============================================================================

const generateMapHTML = (
  center: Coordinate,
  tiangList: Tiang[],
  garduList: Gardu[],
  jalurList: JalurKabel[],
  currentJalurCoords: Coordinate[],
  isAddingTiang: boolean,
  isAddingGardu: boolean,
  isDrawingJalur: boolean,
  lastTiangCoord: Coordinate | undefined,
  visibleLayers: {
    tiang: boolean;
    gardu: boolean;
    sutr: boolean;
    sutm: boolean;
    skutm: boolean;
  } = { tiang: true, gardu: true, sutr: true, sutm: true, skutm: true },
  selectedTiangIds: string[] = [],
  zoomLevel: number = 18
) => {
  const isAddMode = isAddingTiang || isAddingGardu || isDrawingJalur;
  // Tiang markers with labels
  const tiangMarkers = tiangList.map(t => {
    // Color based on jenis jaringan
    let bgColor = '#2196F3'; // Default SUTM
    let borderColor = '#1565C0';
    if (t.jenisJaringan === 'SUTR') {
      bgColor = '#4CAF50';
      borderColor = '#2E7D32';
    } else if (t.jenisJaringan === 'SKUTM') {
      bgColor = '#00BCD4';
      borderColor = '#00838F';
    }

    // Check if selected
    const isSelected = selectedTiangIds.includes(t.id);
    if (isSelected) {
      bgColor = '#FFEB3B'; // Yellow warning color
      borderColor = '#FF9800'; // Orange border
    }

    const labelStyle = isSelected
      ? `background:${bgColor};color:black;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:bold;white-space:nowrap;box-shadow:0 0 8px #FFC107;border:2px solid ${borderColor};transform:scale(1.1);`
      : `background:${bgColor};color:white;padding:3px 6px;border-radius:4px;font-size:10px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.3);border:2px solid ${borderColor};`;

    // Extract height and strength numbers
    const tinggiNum = t.tinggiTiang ? t.tinggiTiang.replace(/[^0-9]/g, '') : '';
    const kekuatanNum = t.kekuatanTiang ? t.kekuatanTiang.replace(/[^0-9]/g, '') : '';
    const labelText = tinggiNum && kekuatanNum
      ? `${t.konstruksi} ${tinggiNum}/${kekuatanNum}`
      : `${t.nomorUrut}. ${t.konstruksi}`;

    return `
    // Tiang marker
    L.marker([${t.koordinat.latitude}, ${t.koordinat.longitude}], {
      icon: L.divIcon({
        className: 'tiang-icon',
        html: '<div style="${labelStyle}">${labelText}</div>',
        iconSize: null,
        iconAnchor: [0, 30]
      })
    }).addTo(map).bindPopup('<b>Tiang ${t.nomorUrut}</b><br>${t.konstruksi}<br>${t.jenisTiang} ${t.tinggiTiang}/${t.kekuatanTiang}')
      .on('click', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({type: 'tiang', id: '${t.id}'}));
      });
    
    // Small dot at exact location
    L.circleMarker([${t.koordinat.latitude}, ${t.koordinat.longitude}], {
      pane: 'tiangPane',
      radius: ${isSelected ? 8 : 5},
      fillColor: '${bgColor}',
      color: '${borderColor}',
      weight: 2,
      fillOpacity: 1,
      className: 'titik-tiang'
    }).addTo(map)
      .on('click', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({type: 'tiang', id: '${t.id}'}));
      });
  `;
  }).join('\n');

  const garduMarkers = garduList.map(g => `
    // Gardu label - shifted to southwest
    L.marker([${g.koordinat.latitude}, ${g.koordinat.longitude}], {
      icon: L.divIcon({
        className: 'gardu-icon',
        html: '<div style="background:#FF9800;color:white;padding:6px 10px;border-radius:6px;font-weight:bold;font-size:11px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${g.nomorGardu}<br><span style="font-size:9px;opacity:0.9;">${g.kapasitasKVA}kVA</span></div>',
        iconSize: null,
        iconAnchor: [-5, -5]
      })
    }).addTo(map).bindPopup('<b>${g.nomorGardu}</b><br>${g.jenisGardu}<br>${g.kapasitasKVA} kVA')
      .on('click', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({type: 'gardu', id: '${g.id}'}));
      });
    
    // Gardu circle marker - slightly larger than tiang, orange color, offset to not overlap with tiang
    var garduOffset = -0.000015; // ~1.5m offset to the left
    L.circleMarker([${g.koordinat.latitude}, ${g.koordinat.longitude} + garduOffset], {
      pane: 'tiangPane',
      radius: 7,
      fillColor: '#FF9800',
      color: '#E65100',
      weight: 2,
      fillOpacity: 1,
      className: 'titik-gardu'
    }).addTo(map)
      .on('click', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({type: 'gardu', id: '${g.id}'}));
      });
  `).join('\n');

  // Jalur polylines with distance labels
  const jalurPolylines = jalurList.map(j => {
    // Calculate offset coordinates for SUTR to show side-by-side with SUTM
    const offsetMeters = j.jenisJaringan === 'SUTR' ? 0.000015 : 0; // ~1.5m offset for SUTR

    // Offset function - perpendicular to line direction
    const offsetCoords = j.koordinat.map((c, idx, arr) => {
      if (offsetMeters === 0 || arr.length < 2) {
        return `[${c.latitude}, ${c.longitude}]`;
      }

      // Get direction vector from previous or next point
      let dx, dy;
      if (idx === 0) {
        dy = arr[1].latitude - c.latitude;
        dx = arr[1].longitude - c.longitude;
      } else {
        dy = c.latitude - arr[idx - 1].latitude;
        dx = c.longitude - arr[idx - 1].longitude;
      }

      // Perpendicular offset (rotate 90 degrees)
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) return `[${c.latitude}, ${c.longitude}]`;

      const offsetLat = c.latitude + (dx / len) * offsetMeters;
      const offsetLng = c.longitude - (dy / len) * offsetMeters;

      return `[${offsetLat}, ${offsetLng}]`;
    });

    const coords = offsetCoords.join(',');
    let color = '#E91E63';
    if (j.jenisJaringan === 'SKTM') color = '#9C27B0';
    if (j.jenisJaringan === 'SKUTM') color = '#00BCD4';
    if (j.jenisJaringan === 'SUTR') color = '#4CAF50';
    const dashArray = j.status === 'planned' ? '10, 5' : '';
    const totalDistance = j.panjangMeter >= 1000
      ? (j.panjangMeter / 1000).toFixed(2) + ' km'
      : Math.round(j.panjangMeter) + 'm';

    // Generate per-segment distance labels for multi-point jalur
    let segmentLabels = '';
    if (j.koordinat.length >= 2) {
      for (let i = 0; i < j.koordinat.length - 1; i++) {
        const p1 = j.koordinat[i];
        const p2 = j.koordinat[i + 1];

        // Calculate segment distance using Haversine
        const R = 6371000;
        const dLat = (p2.latitude - p1.latitude) * Math.PI / 180;
        const dLon = (p2.longitude - p1.longitude) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(p1.latitude * Math.PI / 180) * Math.cos(p2.latitude * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const segDist = R * c;

        const segDistLabel = segDist >= 1000
          ? (segDist / 1000).toFixed(1) + 'km'
          : Math.round(segDist) + 'm';

        // Midpoint for this segment (with offset for SUTR)
        let midLat = (p1.latitude + p2.latitude) / 2;
        let midLng = (p1.longitude + p2.longitude) / 2;

        // Apply offset for SUTR labels
        if (offsetMeters > 0) {
          const dy = p2.latitude - p1.latitude;
          const dx = p2.longitude - p1.longitude;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len > 0) {
            midLat += (dx / len) * offsetMeters;
            midLng -= (dy / len) * offsetMeters;
          }
        }

        // Offset jalur label to opposite side of tiang labels (tiang labels are above, so jalur goes below)
        const jalurLabelOffset = 0.00003; // ~3m below
        const adjustedMidLat = midLat - jalurLabelOffset;

        segmentLabels += `
          L.marker([${adjustedMidLat}, ${midLng}], {
            icon: L.divIcon({
              className: 'segment-label segment-label-${j.jenisJaringan}',
              html: '<div style="background:${color};color:white;padding:2px 5px;border-radius:8px;font-size:8px;font-weight:bold;white-space:nowrap;box-shadow:0 1px 2px rgba(0,0,0,0.3);opacity:0.9;">${segDistLabel}</div>',
              iconSize: [40, 16],
              iconAnchor: [20, -4]
            }),
            interactive: false
          }).addTo(map);
        `;
      }
    }

    return `
      // Jalur polyline - ${j.jenisJaringan}
      L.polyline([${coords}], {
        color: '${color}',
        weight: 4,
        dashArray: '${dashArray}'
      }).addTo(map).bindPopup('${j.jenisJaringan}<br>${j.jenisPenghantar}<br>Total: ${totalDistance}<br>${j.koordinat.length} titik')
        .on('click', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({type: 'jalur', id: '${j.id}'}));
        });
      
      // Per-segment distance labels
      ${segmentLabels}
    `;
  }).join('\n');

  const currentJalurLine = currentJalurCoords.length >= 2
    ? `L.polyline([${currentJalurCoords.map(c => `[${c.latitude}, ${c.longitude}]`).join(',')}], {
        color: '#FF5722',
        weight: 4,
        dashArray: '5, 5'
      }).addTo(map);`
    : '';

  const currentJalurMarkers = currentJalurCoords.map((c, i) => `
    L.circleMarker([${c.latitude}, ${c.longitude}], {
      radius: 8,
      fillColor: '#FF5722',
      color: '#E64A19',
      weight: 2,
      fillOpacity: 1
    }).addTo(map);
  `).join('\n');

  // Draggable center pin for adding mode with distance preview
  const lastTiangScript = (isAddingTiang && lastTiangCoord) ? `
    // Last tiang marker for reference
    var lastTiangMarker = L.circleMarker([${lastTiangCoord.latitude}, ${lastTiangCoord.longitude}], {
      radius: 8,
      fillColor: '#FF9800',
      color: '#E65100',
      weight: 3,
      fillOpacity: 0.9
    }).addTo(map);
    
    // Distance line from last tiang to center (dashed)
    var distanceLine = L.polyline([[${lastTiangCoord.latitude}, ${lastTiangCoord.longitude}], map.getCenter()], {
      color: '#FF9800',
      weight: 3,
      dashArray: '8, 8',
      opacity: 0.8
    }).addTo(map);
    
    // Distance label
    var distanceLabel = L.marker(map.getCenter(), {
      icon: L.divIcon({
        className: 'distance-preview',
        html: '<div id="distance-preview-label" style="background:#FF9800;color:white;padding:4px 10px;border-radius:12px;font-size:12px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);">-- m</div>',
        iconSize: [80, 24],
        iconAnchor: [40, 12]
      }),
      interactive: false
    }).addTo(map);
    
    // Haversine distance calculation
    function getDistanceMeters(lat1, lon1, lat2, lon2) {
      var R = 6371000; // Earth radius in meters
      var dLat = (lat2 - lat1) * Math.PI / 180;
      var dLon = (lon2 - lon1) * Math.PI / 180;
      var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    }
    
    function updateDistanceLine() {
      var center = map.getCenter();
      var lastLat = ${lastTiangCoord.latitude};
      var lastLng = ${lastTiangCoord.longitude};
      
      // Update line
      distanceLine.setLatLngs([[lastLat, lastLng], [center.lat, center.lng]]);
      
      // Calculate midpoint for label
      var midLat = (lastLat + center.lat) / 2;
      var midLng = (lastLng + center.lng) / 2;
      distanceLabel.setLatLng([midLat, midLng]);
      
      // Calculate distance
      var dist = getDistanceMeters(lastLat, lastLng, center.lat, center.lng);
      var distText = dist >= 1000 ? (dist/1000).toFixed(2) + ' km' : Math.round(dist) + 'm';
      
      // Update label
      var labelEl = document.getElementById('distance-preview-label');
      if (labelEl) {
        labelEl.textContent = '↔ ' + distText;
      }
    }
    
    map.on('move', updateDistanceLine);
    updateDistanceLine();
  ` : '';

  const draggablePinScript = isAddMode ? `
    // Center crosshair marker
    var centerMarker = L.marker(map.getCenter(), {
      icon: L.divIcon({
        className: 'center-pin',
        html: '<div class="pin-container"><div class="pin-icon">📍</div><div class="pin-shadow"></div></div>',
        iconSize: [40, 50],
        iconAnchor: [20, 50]
      }),
      interactive: false
    }).addTo(map);

    ${lastTiangScript}

    // Update center marker on map move
    map.on('move', function() {
      centerMarker.setLatLng(map.getCenter());
      // updateCoordinateDisplay(); // Removed to prevent jitter/excessive renders
    });

    map.on('moveend', function() {
      updateCoordinateDisplay();
    });

    function updateCoordinateDisplay() {
      var center = map.getCenter();
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'centerUpdate',
        lat: center.lat,
        lng: center.lng
      }));
    }

    // Initial update
    updateCoordinateDisplay();
  ` : '';

  // Dynamic Styles Injection
  const cssInjection = `
    ${!visibleLayers?.tiang ? '.tiang-icon { display: none !important; }' : ''}
    ${!visibleLayers?.gardu ? '.gardu-icon { display: none !important; }' : ''}
    ${!visibleLayers?.sutr ? '.segment-label-SUTR { display: none !important; }' : ''}
    ${!visibleLayers?.sutm ? '.segment-label-SUTM { display: none !important; }' : ''}
    ${!visibleLayers?.skutm ? '.segment-label-SKUTM { display: none !important; }' : ''}
  `;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; }
    html, body, #map { height: 100%; width: 100%; }
    .gardu-icon { background: transparent !important; border: none !important; }
    .leaflet-control-attribution { display: none; }
    
    /* Dynamic Visibility Styles */
    ${cssInjection}
    
    .center-pin {
      background: transparent !important;
      border: none !important;
    }
    .pin-container {
      position: relative;
      animation: bounce 0.5s ease-out;
    }
    .pin-icon {
      font-size: 36px;
      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4));
    }
    .pin-shadow {
      position: absolute;
      bottom: -5px;
      left: 50%;
      transform: translateX(-50%);
      width: 20px;
      height: 6px;
      background: rgba(0,0,0,0.3);
      border-radius: 50%;
    }
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    
    .legend {
      position: fixed;
      bottom: 80px;
      left: 10px;
      background: rgba(255,255,255,0.95);
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 11px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      z-index: 1000;
    }
    .legend-item { display: flex; align-items: center; margin: 3px 0; }
    .legend-line { width: 20px; height: 3px; margin-right: 8px; border-radius: 2px; }
    
    ${isAddMode ? `
    .crosshair {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 2000;
    }
    .crosshair::before, .crosshair::after {
      content: '';
      position: absolute;
      background: rgba(33, 150, 243, 0.5);
    }
    .crosshair::before {
      width: 2px;
      height: 60px;
      left: 50%;
      top: -30px;
      transform: translateX(-50%);
    }
    .crosshair::after {
      width: 60px;
      height: 2px;
      top: 50%;
      left: -30px;
      transform: translateY(-50%);
    }
    ` : ''}
  </style>
</head>
<body>
  <div id="map"></div>
  ${isAddMode ? '<div class="crosshair"></div>' : ''}
  <div class="legend">
    <div style="font-weight:bold;margin-bottom:5px;">Legenda:</div>
    <div class="legend-item"><div class="legend-line" style="background:#E91E63;"></div>SUTM</div>
    <div class="legend-item"><div class="legend-line" style="background:#9C27B0;"></div>SKTM</div>
    <div class="legend-item"><div class="legend-line" style="background:#00BCD4;"></div>SKUTM</div>
    <div class="legend-item"><div class="legend-line" style="background:#4CAF50;"></div>SUTR</div>
  </div>
  <script>
    var map = L.map('map', {
      zoomControl: true
    }).setView([${center.latitude}, ${center.longitude}], ${zoomLevel});

    // Create custom pane for Tiang points (above lines, below labels)
    map.createPane('tiangPane');
    map.getPane('tiangPane').style.zIndex = 450;
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 21,
    }).addTo(map);

    // User location marker
    var userMarker = L.circleMarker([${center.latitude}, ${center.longitude}], {
      radius: 12,
      fillColor: '#4285F4',
      color: 'white',
      weight: 3,
      fillOpacity: 1
    }).addTo(map).bindPopup('📍 Lokasi Anda');

    // Add accuracy circle
    L.circle([${center.latitude}, ${center.longitude}], {
      radius: 20,
      fillColor: '#4285F4',
      fillOpacity: 0.15,
      stroke: false
    }).addTo(map);

    // Tiang markers
    ${tiangMarkers}

    // Gardu markers
    ${garduMarkers}

    // Jalur polylines
    ${jalurPolylines}

    // Current drawing
    ${currentJalurLine}
    ${currentJalurMarkers}

    // Draggable pin functionality
    ${draggablePinScript}

    // Map click handler (only when not in add mode)
    map.on('click', function(e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'mapClick',
        lat: e.latlng.lat,
        lng: e.latlng.lng
      }));
    });

    // Track zoom changes to persist across re-renders
    map.on('zoomend', function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'zoomChange',
        zoom: map.getZoom()
      }));
    });

    // Helper to update visibility dynamically
    window.updateLayerVisibility = function(layers) {
      var css = '';
      if (!layers.tiang) css += '.tiang-icon { display: none !important; }';
      if (!layers.gardu) css += '.gardu-icon { display: none !important; }';
      if (!layers.titikTiang) css += '.titik-tiang { display: none !important; }';
      if (!layers.titikGardu) css += '.titik-gardu { display: none !important; }';
      if (!layers.sutr) css += '.segment-label-SUTR { display: none !important; }';
      if (!layers.sutm) css += '.segment-label-SUTM { display: none !important; }';
      if (!layers.skutm) css += '.segment-label-SKUTM { display: none !important; }';
      
      
      var styleId = 'dynamic-layer-styles';
      var styleEl = document.getElementById(styleId);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      styleEl.innerHTML = css;
    };
  </script>
</body>
</html>
  `;
};

// =============================================================================
// MAP COMPONENT
// =============================================================================

export interface SurveyMapRef {
  captureMap: () => Promise<string | null>;
}

const SurveyMap = forwardRef<SurveyMapRef, SurveyMapProps>(({
  tiangList,
  garduList,
  jalurList,
  onMapPress,
  onTiangPress,
  onGarduPress,
  onJalurPress,
  isAddingTiang = false,
  isAddingGardu = false,
  isDrawingJalur = false,
  currentJalurCoords = [],
  lastTiangCoord,
  visibleLayers = { tiang: true, gardu: true, sutr: true, sutm: true, skutm: true },
  onCenterChange,
  selectedTiangIds = [],
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
      } else if (data.type === 'tiang') {
        const tiang = tiangList.find(t => t.id === data.id);
        if (tiang && onTiangPress) onTiangPress(tiang);
      } else if (data.type === 'gardu') {
        const gardu = garduList.find(g => g.id === data.id);
        if (gardu && onGarduPress) onGarduPress(gardu);
      } else if (data.type === 'jalur') {
        const jalur = jalurList.find(j => j.id === data.id);
        if (jalur && onJalurPress) onJalurPress(jalur);
      } else if (data.type === 'zoomChange') {
        setCurrentZoom(data.zoom);
      }
    } catch (error) {
      console.log('Message parse error:', error);
    }
  };

  const isAddMode = isAddingTiang || isAddingGardu || isDrawingJalur;

  const html = generateMapHTML(
    centerCoordinate || userLocation,
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
    currentZoom
  );

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
});
