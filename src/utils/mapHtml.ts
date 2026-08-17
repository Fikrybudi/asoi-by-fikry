// =============================================================================
// PLN SURVEY APP - Leaflet Map HTML Template Generator
// =============================================================================
// Extracted from SurveyMap.tsx for maintainability

import { Coordinate, Tiang, Gardu, JalurKabel, JembatanKabel, PersilPelanggan } from '../types';
import { OverlayFile } from '../types/overlayTypes';
import { HTML2CANVAS_SOURCE } from './html2canvasSource';
const generateMapHTML = (
  center: Coordinate,
  tiangList: Tiang[],
  garduList: Gardu[],
  jalurList: JalurKabel[],
  jembatanKabelList: JembatanKabel[] = [],
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
    sktm: boolean;
  } = { tiang: true, gardu: true, sutr: true, sutm: true, skutm: true, sktm: true },
  selectedTiangIds: string[] = [],
  zoomLevel: number = 18,
  persilList: PersilPelanggan[] = [],
  overlayLayers: OverlayFile[] = [],
  activeBaseMap: string = 'streets',
  isLegendCollapsed: boolean = false
) => {
  const isAddMode = isAddingTiang || isAddingGardu || isDrawingJalur;
  const legendDisplayState = isLegendCollapsed ? 'none' : 'block';
  const legendIconState = isLegendCollapsed ? '▶' : '▼';

  // Safe string escaper for Javascript injection in WebView
  const escapeForJsString = (str: string): string => {
    return (str || '')
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\r\n/g, '<br>')
      .replace(/\n/g, '<br>')
      .replace(/\r/g, '<br>');
  };
  // Tiang markers with labels
  const tiangMarkers = tiangList.map((t, tiangIndex) => {
    // Color based on jenis jaringan
    let bgColor = '#1565C0';
    let borderColor = '#1565C0';
    let labelTextColor = '#1565C0';
    let labelBorderColor = '#1565C0';

    // Check if existing (gray out)
    if (t.status === 'existing') {
      bgColor = '#757575'; // Dark gray for existing
      borderColor = '#424242';
      labelTextColor = '#757575';
      labelBorderColor = '#424242';
    } else if (t.jenisJaringan === 'SUTR') {
      bgColor = '#00E676'; // High-contrast vivid neon green for hybrid map line/symbols
      borderColor = '#00E676';
      labelTextColor = '#2E7D32'; // Reverted to original green color for label text (konstruksi & nomor)
      labelBorderColor = '#4CAF50'; // Reverted to original green color for label badge border & dividers
    } else if (t.jenisJaringan === 'SKUTM') {
      bgColor = '#00BCD4';
      borderColor = '#00838F';
      labelTextColor = '#00BCD4';
      labelBorderColor = '#00BCD4';
    }

    // Check if selected (override all)
    const isSelected = selectedTiangIds.includes(t.id);
    if (isSelected) {
      bgColor = '#FFEB3B'; // Yellow warning color
      borderColor = '#FF9800'; // Orange border
      labelTextColor = '#FF9800';
      labelBorderColor = '#FF9800';
    }

    // Extract height and strength numbers for display
    const tinggiNum = t.tinggiTiang ? t.tinggiTiang.replace(/[^0-9]/g, '') : '-';
    const kekuatanNum = t.kekuatanTiang ? t.kekuatanTiang.replace(/[^0-9]/g, '') : '-';
    // Two-line format: tinggi on top, kekuatan below
    const ukuranLabel = tinggiNum + '/<br>' + kekuatanNum;
    const konstruksiLabel = t.konstruksi || '-';
    const nomorLabel = t.kodeTiang || (t.nomorUrut ? `T.${t.nomorUrut}` : '-');

    // Circle label size & font sizes for ultra-sharp legibility
    const circleSize = isSelected ? 52 : 46;
    const fontSize = isSelected ? 10 : 9.5;
    const ukuranFontSize = isSelected ? 8 : 7.5; // Font for ukuran tiang (9/200)

    // =========================================================================
    // IMPROVED SMART LABEL PLACEMENT
    // More accurate jalur detection + closer label positioning
    // =========================================================================

    const tiangLat = t.koordinat.latitude;
    const tiangLng = t.koordinat.longitude;

    // Tighter tolerance for more accurate jalur matching (~2m instead of 5m)
    const tolerance = 0.00002;

    // Collect all angles where jalur segments exist (directions to avoid)
    const occupiedAngles: number[] = [];

    jalurList.forEach(j => {
      // Check each coordinate in the jalur
      for (let idx = 0; idx < j.koordinat.length; idx++) {
        const coord = j.koordinat[idx];

        // Check if this jalur point matches the tiang location
        const latDiff = Math.abs(coord.latitude - tiangLat);
        const lngDiff = Math.abs(coord.longitude - tiangLng);
        const isMatch = latDiff < tolerance && lngDiff < tolerance;

        if (isMatch) {
          // Calculate angle TO the previous point (if exists)
          if (idx > 0) {
            const prev = j.koordinat[idx - 1];
            const angle = Math.atan2(
              prev.latitude - tiangLat,
              prev.longitude - tiangLng
            ) * 180 / Math.PI;
            occupiedAngles.push(angle);
          }

          // Calculate angle TO the next point (if exists)
          if (idx < j.koordinat.length - 1) {
            const next = j.koordinat[idx + 1];
            const angle = Math.atan2(
              next.latitude - tiangLat,
              next.longitude - tiangLng
            ) * 180 / Math.PI;
            occupiedAngles.push(angle);
          }
        }
      }
    });

    // Also check if any jalur segment passes NEAR this tiang (not just at vertices)
    jalurList.forEach(j => {
      for (let i = 0; i < j.koordinat.length - 1; i++) {
        const p1 = j.koordinat[i];
        const p2 = j.koordinat[i + 1];

        // Check if tiang is close to this line segment
        // Using perpendicular distance approximation
        const dx = p2.longitude - p1.longitude;
        const dy = p2.latitude - p1.latitude;
        const len = Math.sqrt(dx * dx + dy * dy);

        if (len > 0) {
          // Project tiang onto line segment
          const t_proj = Math.max(0, Math.min(1,
            ((tiangLng - p1.longitude) * dx + (tiangLat - p1.latitude) * dy) / (len * len)
          ));

          const projLng = p1.longitude + t_proj * dx;
          const projLat = p1.latitude + t_proj * dy;

          const distToLine = Math.sqrt(
            Math.pow(tiangLng - projLng, 2) + Math.pow(tiangLat - projLat, 2)
          );

          // If tiang is very close to this segment (within ~3m)
          if (distToLine < 0.00003) {
            // Add angle of the line direction
            const lineAngle = Math.atan2(dy, dx) * 180 / Math.PI;
            occupiedAngles.push(lineAngle);
            occupiedAngles.push(lineAngle + 180); // Both directions
          }
        }
      }
    });

    // Normalize all angles to -180 to 180 range
    const normalizedAngles = occupiedAngles.map(a => {
      while (a > 180) a -= 360;
      while (a < -180) a += 360;
      return a;
    });

    // Define 8 quadrants with their label offset directions
    // Position indices: 0=N, 1=NE, 2=E, 3=SE, 4=S, 5=SW, 6=W, 7=NW
    // Define 8 quadrants with unified label offset directions
    // Position indices: 0=N, 1=NE, 2=E, 3=SE, 4=S, 5=SW, 6=W, 7=NW
    const quadrants = [
      { angle: 90, offsetX: 0, offsetY: 1 },      // 0: N - Label North (+lat)
      { angle: 45, offsetX: 1, offsetY: 1 },      // 1: NE - Label NorthEast (+lat, +lng)
      { angle: 0, offsetX: 1, offsetY: 0 },       // 2: E - Label East (+lng)
      { angle: -45, offsetX: 1, offsetY: -1 },    // 3: SE - Label SouthEast (-lat, +lng)
      { angle: -90, offsetX: 0, offsetY: -1 },    // 4: S - Label South (-lat)
      { angle: -135, offsetX: -1, offsetY: -1 },  // 5: SW - Label SouthWest (-lat, -lng)
      { angle: 180, offsetX: -1, offsetY: 0 },    // 6: W - Label West (-lng)
      { angle: 135, offsetX: -1, offsetY: 1 },    // 7: NW - Label NorthWest (+lat, -lng)
    ];

    // Check if user has manually set label position (supports both number 2 and string "2")
    let bestQuadrant;
    const currentLabelPos = t.labelPosition;
    const posNum = (currentLabelPos !== undefined && currentLabelPos !== null) ? Number(currentLabelPos) : NaN;

    if (!isNaN(posNum) && posNum >= 0 && posNum <= 7) {
      // Use user-defined position
      bestQuadrant = quadrants[posNum];
    } else {
      // Auto-detect: Find best quadrant (furthest from any occupied angle)
      bestQuadrant = quadrants[0]; // Default: North (above)
      let maxMinDist = -1;

      if (normalizedAngles.length > 0) {
        let candidates: typeof quadrants = [];
        for (const q of quadrants) {
          let minDist = 180;

          for (const occAngle of normalizedAngles) {
            let diff = Math.abs(q.angle - occAngle);
            if (diff > 180) diff = 360 - diff;
            if (diff < minDist) minDist = diff;
          }

          if (minDist > maxMinDist) {
            maxMinDist = minDist;
            candidates = [q];
          } else if (minDist === maxMinDist) {
            candidates.push(q);
          }
        }

        if (candidates.length > 1) {
          // Stagger consecutive tiang labels if multiple equally good quadrants exist
          bestQuadrant = candidates[tiangIndex % candidates.length];
        } else if (candidates.length === 1) {
          bestQuadrant = candidates[0];
        }
      } else {
        // Alternate North and South if no angles detected
        bestQuadrant = (tiangIndex % 2 === 0) ? quadrants[0] : quadrants[4];
      }
    }

    // Calculate label offset position in geographic coordinates (custom distance or ~28 meters default)
    const labelOffsetDeg = (t.labelDistance !== undefined && !isNaN(Number(t.labelDistance)) && Number(t.labelDistance) > 0)
      ? Number(t.labelDistance)
      : 0.00028;
    const labelLat = t.koordinat.latitude + (bestQuadrant.offsetY * labelOffsetDeg);
    const labelLng = t.koordinat.longitude + (bestQuadrant.offsetX * labelOffsetDeg);

    // Create circular label HTML with 3 sections
    const circleLabelHtml = '<div style="width:' + circleSize + 'px;height:' + circleSize + 'px;background:white;border:2px solid ' + labelBorderColor + ';border-radius:50%;display:flex;flex-direction:column;overflow:hidden;' + (isSelected ? 'transform:scale(1.1);' : '') + '">' +
      '<div style="display:flex;flex:1;border-bottom:1px solid ' + labelBorderColor + ';">' +
      '<div style="flex:1;display:flex;align-items:center;justify-content:center;font-size:' + (fontSize + 1) + 'px;font-weight:bold;color:' + labelTextColor + ';border-right:1px solid ' + labelBorderColor + ';">' + nomorLabel + '</div>' +
      '<div style="flex:1;display:flex;align-items:center;justify-content:center;font-size:' + ukuranFontSize + 'px;font-weight:bold;color:#333;">' + ukuranLabel + '</div>' +
      '</div>' +
      '<div style="flex:1;display:flex;align-items:center;justify-content:center;font-size:' + fontSize + 'px;font-weight:bold;color:' + labelTextColor + ';">' + konstruksiLabel + '</div>' +
      '</div>';

    // Escape double quotes for embedding in JS string
    const escapedHtml = circleLabelHtml.replace(/"/g, '\\"');

    const isSatelliteMap = activeBaseMap === 'satellite' || activeBaseMap === 'hybrid';
    const leaderLineColor = isSatelliteMap ? '#FFD600' : '#333333';

    // =========================================================================
    // DYNAMIC ROTATION ANGLES FOR STAY SET (SKUR) & GROUNDING (TypeScript Math)
    // =========================================================================
    let skurRotationDeg = -90; // Default Skur pointing North
    let groundingRotationDeg = 0; // Default Grounding pointing East

    if (occupiedAngles.length === 1) {
      // TIANG UJUNG (END POLE):
      // Skur is 180 degrees away from the jalur (opposite direction to withstand tension)
      skurRotationDeg = occupiedAngles[0] + 180;
      groundingRotationDeg = occupiedAngles[0] + 90; // 90 deg perpendicular to jalur
    } else if (occupiedAngles.length >= 2) {
      // TIANG TENGAH / SUDUT (INTERMEDIATE / ANGLE POLE):
      // Skur is 60 degrees from the main jalur direction
      skurRotationDeg = occupiedAngles[0] + 60;
      groundingRotationDeg = occupiedAngles[0] + 90; // 90 deg perpendicular to jalur
    }

    return `
    // Single Leader Line (Dynamic Color: #FFD600 Gold on Satellite, #333333 Dark on Standard Map)
    var line_${t.id.replace(/[^a-zA-Z0-9_]/g, '_')} = L.polyline([[${t.koordinat.latitude}, ${t.koordinat.longitude}], [${labelLat}, ${labelLng}]], {
      color: '${leaderLineColor}',
      weight: 1.6,
      dashArray: '3, 3',
      opacity: 0.95,
      interactive: false,
      className: 'leader-line'
    }).addTo(map);

    // Draggable circular tiang label badge
    var marker_${t.id.replace(/[^a-zA-Z0-9_]/g, '_')} = L.marker([${labelLat}, ${labelLng}], {
      draggable: true,
      icon: L.divIcon({
        className: 'tiang-icon',
        html: "${escapedHtml}",
        iconSize: [${circleSize}, ${circleSize}],
        iconAnchor: [${circleSize / 2}, ${circleSize / 2}]
      }),
      zIndexOffset: 2000
    }).addTo(map);

    // Live update leader line position while dragging
    marker_${t.id.replace(/[^a-zA-Z0-9_]/g, '_')}.on('drag', function(e) {
      var pos = e.target.getLatLng();
      var lineCoords = [[${t.koordinat.latitude}, ${t.koordinat.longitude}], [pos.lat, pos.lng]];
      line_${t.id.replace(/[^a-zA-Z0-9_]/g, '_')}.setLatLngs(lineCoords);
    });

    // Snap to nearest 8-direction quadrant on drag end and set exact snapped latlng
    marker_${t.id.replace(/[^a-zA-Z0-9_]/g, '_')}.on('dragend', function(e) {
      var pos = e.target.getLatLng();
      var dy = pos.lat - ${t.koordinat.latitude};
      var dx = pos.lng - ${t.koordinat.longitude};
      var angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);

      var quadrantAngles = [90, 45, 0, -45, -90, -135, 180, 135];
      var bestIdx = 0;
      var minDiff = 360;
      quadrantAngles.forEach(function(ang, idx) {
        var diff = Math.abs(ang - angleDeg);
        if (diff > 180) diff = 360 - diff;
        if (diff < minDiff) { minDiff = diff; bestIdx = idx; }
      });

      var distDeg = Math.sqrt(dx * dx + dy * dy);
      var actualOffset = Math.max(0.00015, distDeg);

      var qOffsets = [
        { offsetX: 0, offsetY: 1 },
        { offsetX: 1, offsetY: 1 },
        { offsetX: 1, offsetY: 0 },
        { offsetX: 1, offsetY: -1 },
        { offsetX: 0, offsetY: -1 },
        { offsetX: -1, offsetY: -1 },
        { offsetX: -1, offsetY: 0 },
        { offsetX: -1, offsetY: 1 }
      ];
      var snappedLat = ${t.koordinat.latitude} + (qOffsets[bestIdx].offsetY * actualOffset);
      var snappedLng = ${t.koordinat.longitude} + (qOffsets[bestIdx].offsetX * actualOffset);

      var targetMarker = e.target;
      var lineRef = (typeof line_${t.id.replace(/[^a-zA-Z0-9_]/g, '_')} !== 'undefined') ? line_${t.id.replace(/[^a-zA-Z0-9_]/g, '_')} : null;

      // Update position cleanly and immediately without locking or disabling dragging
      targetMarker.setLatLng([snappedLat, snappedLng]);
      if (lineRef) {
        lineRef.setLatLngs([[${t.koordinat.latitude}, ${t.koordinat.longitude}], [snappedLat, snappedLng]]);
      }

      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'tiangLabelShift',
        id: '${t.id}',
        newPosition: bestIdx,
        newDistance: actualOffset
      }));
    });

    // Pondasi Tiang: Transparent square box surrounding the tiang circle marker
    ${t.penguat === 'Pondasi' ? `
    L.marker([${t.koordinat.latitude}, ${t.koordinat.longitude}], {
      pane: 'tiangPane',
      icon: L.divIcon({
        className: 'pondasi-icon',
        html: '<div style="width:22px;height:22px;border:2.6px solid ${borderColor};background:transparent;box-sizing:border-box;border-radius:2px;box-shadow:0 0 2px rgba(0,0,0,0.2);"></div>',
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      }),
      interactive: false
    }).addTo(map);
    ` : ''}

    // Stay Set / Skur: Inverted Y (⅄) symbol centered at tiang point (22,22) without clipping
    // Dynamic angle: 180 deg opposite for end poles, 60 deg for intermediate poles
    ${t.penguat === 'Stayset' ? `
    L.marker([${t.koordinat.latitude}, ${t.koordinat.longitude}], {
      pane: 'tiangPane',
      icon: L.divIcon({
        className: 'stayset-icon',
        html: '<div style="width:44px;height:44px;pointer-events:none;"><svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44"><g transform="rotate(${skurRotationDeg + 90}, 22, 22)"><path d="M22,22 L22,8 L13,1 M22,8 L31,1" stroke="${borderColor}" stroke-width="3.0" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g></svg></div>',
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      }),
      interactive: false
    }).addTo(map);
    ` : ''}

    // Grounding / Pembumian: Grounding symbol (⏚) anchored at tiang point (18,16), pointing DOWNWARDS without clipping
    ${t.grounding ? `
    L.marker([${t.koordinat.latitude}, ${t.koordinat.longitude}], {
      pane: 'tiangPane',
      icon: L.divIcon({
        className: 'grounding-icon',
        html: '<div style="width:36px;height:42px;pointer-events:none;"><svg xmlns="http://www.w3.org/2000/svg" width="36" height="42" viewBox="0 0 36 42"><line x1="18" y1="16" x2="18" y2="28" stroke="${borderColor}" stroke-width="2.4"/><line x1="8" y1="28" x2="28" y2="28" stroke="${borderColor}" stroke-width="2.6" stroke-linecap="round"/><line x1="11.5" y1="32" x2="24.5" y2="32" stroke="${borderColor}" stroke-width="2.6" stroke-linecap="round"/><line x1="15" y1="36" x2="21" y2="36" stroke="${borderColor}" stroke-width="2.6" stroke-linecap="round"/></svg></div>',
        iconSize: [36, 42],
        iconAnchor: [18, 16]
      }),
      interactive: false
    }).addTo(map);
    ` : ''}

    // Small dot at exact location (radius 4.5 for crisp export scaling)
    L.circleMarker([${t.koordinat.latitude}, ${t.koordinat.longitude}], {
      pane: 'tiangPane',
      radius: ${isSelected ? 7 : 4.5},
      fillColor: '${bgColor}',
      color: '${borderColor}',
      weight: 1.8,
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
        html: '<div style="color:#FF9800;font-weight:bold;font-size:11px;white-space:nowrap;text-shadow:1px 1px 2px white,-1px -1px 2px white,1px -1px 2px white,-1px 1px 2px white,0 0 3px white;">${g.nomorGardu}<br><span style="font-size:9px;">${g.kapasitasKVA}kVA</span></div>',
        iconSize: null,
        iconAnchor: [-5, -5]
      })
    }).addTo(map).bindPopup('<b>${g.nomorGardu}</b><br>${g.jenisGardu}<br>${g.kapasitasKVA} kVA')
      .on('click', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({type: 'gardu', id: '${g.id}'}));
      });
    
    // Gardu Baru Marker - Bright Orange Square with PLN Logo
    var garduOffset = -0.000015;
    L.marker([${g.koordinat.latitude}, ${g.koordinat.longitude} + garduOffset], {
      pane: 'tiangPane',
      icon: L.divIcon({
        className: 'gardu-baru-icon',
        html: '<div style="width:20px;height:20px;background:#FF9800;border:2px solid #E65100;border-radius:3px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 4px rgba(0,0,0,0.3);"><svg width="12" height="14" viewBox="0 0 14 18"><rect width="14" height="18" fill="#FFEB3B" stroke="#FFFFFF" stroke-width="0.8" rx="1"/><polygon points="9,2 3,9 7,9 2,16 11,8 7,8" fill="#D32F2F"/></svg></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })
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
    if (j.jenisJaringan === 'SUTR') color = '#00E676';

    const distanceLabelColor = j.jenisJaringan === 'SUTR' ? '#2E7D32' : color;

    // Dash pattern based on cable type
    let dashArray = '';
    switch (j.jenisJaringan) {
      case 'SUTR':
        dashArray = '';  // Solid line (no dashes)
        break;
      case 'SUTM':
        dashArray = '12, 4, 3, 4';  // Dash-dot pattern (garis titik garis titik)
        break;
      case 'SKTM':
        dashArray = '2, 4';  // Dotted (titik-titik rapat)
        break;
      case 'SKUTM':
        dashArray = '10, 8';  // Dashed (garis spasi garis spasi)
        break;
      default:
        dashArray = '';
    }
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
              html: '<div style="color:${distanceLabelColor};font-size:8px;font-weight:bold;white-space:nowrap;text-shadow:1px 1px 1px white,-1px -1px 1px white,1px -1px 1px white,-1px 1px 1px white,0 0 2px white;">${segDistLabel}</div>',
              iconSize: [40, 16],
              iconAnchor: [20, -4]
            }),
            interactive: false
          }).addTo(map);
        `;
      }
    }

    return `
      // Clean thin visual polyline - ${j.jenisJaringan} - weight 2.6
      L.polyline([${coords}], {
        color: '${color}',
        weight: 2.6,
        dashArray: '${dashArray}',
        interactive: true 
      }).addTo(map).bindPopup('${j.jenisJaringan}<br>${j.jenisPenghantar}<br>Total: ${totalDistance}<br>${j.koordinat.length} titik')
        .on('click', function(e) {
          L.DomEvent.stopPropagation(e);
          window.ReactNativeWebView.postMessage(JSON.stringify({type: 'jalur', id: '${j.id}'}));
        });
      
      // Per-segment distance labels
      ${segmentLabels}
    `;
  }).join('\n');

  const currentJalurLine = currentJalurCoords.length >= 2
    ? `L.polyline([${currentJalurCoords.map(c => `[${c.latitude}, ${c.longitude}]`).join(',')}], {
        color: '#FF5722',
        weight: 2.6,
        dashArray: '5, 5'
      }).addTo(map);`
    : '';

  // Jembatan Kabel polylines (cable bridges - cyan color, thick line)
  const jembatanPolylines = jembatanKabelList.map(jk => {
    const coords = jk.koordinat.map(c => `[${c.latitude}, ${c.longitude}]`).join(',');
    const totalDistance = jk.panjangMeter >= 1000
      ? (jk.panjangMeter / 1000).toFixed(2) + ' km'
      : Math.round(jk.panjangMeter) + 'm';
    const nameLabel = jk.namaJembatan ? jk.namaJembatan + ' - ' : '';

    // Calculate midpoint for label
    let midLat = 0, midLng = 0;
    if (jk.koordinat.length >= 2) {
      midLat = jk.koordinat.reduce((sum, c) => sum + c.latitude, 0) / jk.koordinat.length;
      midLng = jk.koordinat.reduce((sum, c) => sum + c.longitude, 0) / jk.koordinat.length;
    }

    return `
      // Jembatan Kabel - thick cyan line with border
      L.polyline([${coords}], {
        color: '#00838F',
        weight: 8,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);
      
      L.polyline([${coords}], {
        color: '#00BCD4',
        weight: 5,
        opacity: 1,
        dashArray: '',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map).bindPopup('Jembatan Kabel<br>${nameLabel}${totalDistance}<br>${jk.jenisJaringan}')
        .on('click', function(e) {
          L.DomEvent.stopPropagation(e);
        });
      
      // Bridge icon marker at center
      L.marker([${midLat}, ${midLng}], {
        icon: L.divIcon({
          className: 'jembatan-label',
          html: '<div style="color:#00838F;font-size:12px;font-weight:bold;white-space:nowrap;text-shadow:1px 1px 2px white,-1px -1px 2px white,1px -1px 2px white,-1px 1px 2px white,0 0 3px white;">[JK] ${totalDistance}</div>',
          iconSize: [60, 20],
          iconAnchor: [30, 10]
        }),
        interactive: false
      }).addTo(map);
    `;
  }).join('\n');

  // Persil Pelanggan rectangles
  const persilRectangles = persilList.map(p => {
    const sw = p.koordinatSudut[0];
    const ne = p.koordinatSudut[1];
    const midLat = (sw.latitude + ne.latitude) / 2;
    const midLng = (sw.longitude + ne.longitude) / 2;
    const color = p.warnaBorder || '#E91E63';
    // Escape nama untuk JS string
    const nameEscaped = p.namaPersil.replace(/'/g, "\\'").replace(/"/g, '\\"');
    const catatanEscaped = (p.catatan || '').replace(/'/g, "\\'").replace(/"/g, '\\"');
    return `
      // Persil: ${nameEscaped}
      L.rectangle(
        [[${sw.latitude}, ${sw.longitude}], [${ne.latitude}, ${ne.longitude}]],
        {
          color: '${color}',
          weight: 2,
          fillColor: '${color}',
          fillOpacity: 0.12,
          dashArray: '6, 4',
          interactive: true
        }
      ).addTo(map)
        .bindPopup('<b>${nameEscaped}</b>${catatanEscaped ? '<br><i>' + catatanEscaped + '</i>' : ''}')
        .on('click', function(e) {
          L.DomEvent.stopPropagation(e);
          window.ReactNativeWebView.postMessage(JSON.stringify({type: 'persil', id: '${p.id}'}));
        });

      // Label nama persil di tengah kotak
      L.marker([${midLat}, ${midLng}], {
        icon: L.divIcon({
          className: 'persil-label',
          html: '<div style="color:${color};font-size:10px;font-weight:bold;white-space:nowrap;text-align:center;text-shadow:1px 1px 2px white,-1px -1px 2px white,1px -1px 2px white,-1px 1px 2px white,0 0 3px white;pointer-events:none;">${nameEscaped}</div>',
          iconSize: [120, 20],
          iconAnchor: [60, 10]
        }),
        interactive: false
      }).addTo(map);
    `;
  }).join('\n');

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
        html: '<div class="pin-container"><div class="pin-icon"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 24 30"><path d="M12 0C7.6 0 4 3.6 4 8c0 5.4 8 16 8 16s8-10.6 8-16c0-4.4-3.6-8-8-8zm0 11c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z" fill="#E53935"/></svg></div><div class="pin-shadow"></div></div>',
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

  // =========================================================================
  // OVERLAY LAYERS (static imported data — read-only)
  // =========================================================================
  const overlayRendering = overlayLayers
    .filter(ol => ol.visible)
    .map(ol => {
      const opacity = ol.opacity ?? 0.7;
      let js = '';

      // --- Polylines (JTM feeders) ---
      const olNameEsc = escapeForJsString(ol.name);

      if (ol.data.polylines.length > 0) {
        // Google Maps-style distinct colors per feeder
        const feederColors = ['#FF6600','#CC00FF','#009900','#0066FF','#FF0066','#00CCCC','#996633','#FF3333','#6600CC','#339966','#CC6600','#3366FF'];
        // Group segments of the same feeder to share the same color
        const uniqueFeeders = Array.from(new Set(ol.data.polylines.map(pl => pl.name || 'Unknown')));

        ol.data.polylines.forEach((pl) => {
          if (ol.hiddenFeeders && ol.hiddenFeeders.includes(pl.name)) return;
          const feederIdx = uniqueFeeders.indexOf(pl.name || 'Unknown');
          const color = ol.color || feederColors[feederIdx % feederColors.length];
          const coords = pl.coords.map(c => `[${c.lat}, ${c.lng}]`).join(',');
          const nameEsc = escapeForJsString(pl.name);
          js += `
            L.polyline([${coords}], {
              color: '${color}',
              weight: 2.6,
              opacity: ${opacity},
              interactive: true,
              className: 'overlay-jtm overlay-layer overlay-${ol.id}'
            }).addTo(map).bindPopup('<b>${nameEsc}</b><br><i>${olNameEsc}</i>');
          `;
        });
      }

      // --- Points (Gardu / Proteksi / Custom) ---
      if (ol.data.points.length > 0) {
        // If overlay has both polylines AND points (mixed file like gardu+JTM KML),
        // treat remaining points as gardu-style markers automatically
        const effectivePointType = (ol.type === 'jtm' || ol.type === 'custom') && ol.data.polylines.length > 0
          ? 'gardu' : ol.type;

        ol.data.points.forEach(pt => {
          const nameEsc = escapeForJsString(pt.name);
          let popupExtra = '';

          // Check if this point is a tree or ROW observation
          const isObservation = pt.name.toLowerCase().includes('pohon') || 
                                pt.name.toLowerCase().includes('mangga') || 
                                pt.name.toLowerCase().includes('bambu') ||
                                pt.name.toLowerCase().includes('kelapa') ||
                                pt.name.toLowerCase().includes('tebang') ||
                                pt.name.toLowerCase().includes('row') ||
                                pt.name.toLowerCase().includes('areuy') ||
                                pt.name.toLowerCase().includes('pepohonan') ||
                                pt.name.toLowerCase().includes('rambat') ||
                                pt.name.toLowerCase().includes('jambu');

          // Determine if this is a valid Gardu point (classification containing GD, type GD, or matching Gardu code format)
          const isGarduPoint = (effectivePointType === 'gardu' || ol.type === 'gardu') && 
                               !isObservation && 
                               (pt.properties['CLASSIFICATION']?.includes('GD') || 
                                pt.properties['TYPE_GARDU'] === 'GD' || 
                                pt.name.match(/^[A-Za-z]{2,4}\d{3}[A-Za-z]?$/));

          // Determine if this is a Proteksi point (by type, name, or properties)
          const isProteksiPoint = ol.type === 'proteksi' || 
                                  /lbs|gh|pmr|sso|recloser|fuse|cutout|fco|proteksi/i.test(pt.name) ||
                                  /lbs|gh|pmr|sso|recloser|fuse|cutout|fco|proteksi/i.test(pt.properties['JENIS'] || pt.properties['jenis'] || '') ||
                                  /lbs|gh|pmr|sso|recloser|fuse|cutout|fco|proteksi/i.test(pt.properties['TYPE'] || pt.properties['type'] || '');

          const ptFeeder = pt.properties['feeder'] || pt.properties['FEEDER'] || pt.properties['PENYULANG'] || pt.properties['penyulang'] || '';

          // 1. Hide point if its parent feeder is hidden
          if (ptFeeder && ol.hiddenFeeders && ol.hiddenFeeders.includes(ptFeeder)) return;

          // 2. Hide point if its specific type or type+feeder is hidden
          if (isGarduPoint) {
            if (ol.hiddenTypes && (ol.hiddenTypes.includes('gardu') || (ptFeeder && ol.hiddenTypes.includes('gardu_' + ptFeeder)))) return;
          }
          if (isProteksiPoint) {
            if (ol.hiddenTypes && (ol.hiddenTypes.includes('proteksi') || (ptFeeder && ol.hiddenTypes.includes('proteksi_' + ptFeeder)))) return;
          }
          if (!isGarduPoint && !isProteksiPoint && !isObservation) {
            if (ol.hiddenTypes && (ol.hiddenTypes.includes('custom') || (ptFeeder && ol.hiddenTypes.includes('custom_' + ptFeeder)))) return;
          }

          if (isObservation) {
            // ── OBSERVATION POINT: Green small circle marker ──
            js += `
              L.circleMarker([${pt.lat}, ${pt.lng}], {
                radius: 4,
                fillColor: '#4CAF50',
                color: 'white',
                weight: 1.5,
                fillOpacity: ${opacity},
                opacity: ${opacity},
                className: 'overlay-observation overlay-layer overlay-${ol.id}',
                interactive: true
              }).addTo(map).bindPopup('<b>${nameEsc}</b><br><i style="color:#999">Observasi Pohon / ROW</i>');
            `;

          } else if (isGarduPoint) {
            // ── GARDU: Google Maps style blue square marker ──
            const desc = escapeForJsString(pt.properties['DESCRIPTION'] || pt.properties['ex_description']);
            const alamat = escapeForJsString(pt.properties['ALAMAT'] || pt.properties['alamat']);
            const jenisPel = escapeForJsString(pt.properties['JENIS_PEL']);
            popupExtra = (desc ? '<br>Kode: ' + desc : '') + (jenisPel ? '<br>Jenis: ' + jenisPel : '') + (alamat ? '<br>' + alamat : '');

            js += `
              L.marker([${pt.lat}, ${pt.lng}], {
                icon: L.divIcon({
                  className: 'overlay-gardu overlay-layer overlay-${ol.id}',
                  html: '<div style="width:14px;height:14px;background:#4285F4;border:2px solid white;border-radius:2px;box-shadow:0 1px 3px rgba(0,0,0,0.4);opacity:${opacity}"></div>',
                  iconSize: [18, 18],
                  iconAnchor: [9, 9]
                }),
                interactive: true
              }).addTo(map).bindPopup('<b>${nameEsc}</b>${popupExtra}<br><i style="color:#999">${olNameEsc}</i>');

              // Gardu name label
              L.marker([${pt.lat}, ${pt.lng}], {
                icon: L.divIcon({
                  className: 'overlay-gardu-label overlay-layer overlay-${ol.id}',
                  html: '<div style="color:#1a73e8;font-size:9px;font-weight:bold;white-space:nowrap;text-shadow:1px 1px 1px white,-1px -1px 1px white,1px -1px 1px white,-1px 1px 1px white,0 0 3px white;opacity:${opacity};">${nameEsc}</div>',
                  iconSize: null,
                  iconAnchor: [-10, 5]
                }),
                interactive: false
              }).addTo(map);
            `;

          } else if (isProteksiPoint) {
            // ── PROTEKSI: Distinct marker colors per type (GH, LBS, PMR, SSO) ──
            let jenis = escapeForJsString(pt.properties['JENIS'] || pt.properties['jenis'] || '').toUpperCase();
            if (!jenis) {
              const nameUpper = pt.name.toUpperCase();
              if (nameUpper.includes('GH')) jenis = 'GH';
              else if (nameUpper.includes('LBS')) jenis = 'LBS';
              else if (nameUpper.includes('PMR') || nameUpper.includes('RECLOSER')) jenis = 'PMR';
              else if (nameUpper.includes('SSO')) jenis = 'SSO';
            }

            let markerColor = '#FF6600'; // default orange
            if (jenis === 'GH') markerColor = '#D32F2F';       // Red for Gardu Hubung (GH)
            else if (jenis === 'LBS') markerColor = '#E65100';  // Dark Orange for LBS
            else if (jenis === 'PMR') markerColor = '#C2185B';  // Magenta/Red for PMR (Recloser)
            else if (jenis === 'SSO') markerColor = '#F57C00';  // Orange for SSO

            const ulp = escapeForJsString(pt.properties['ULP'] || pt.properties['ulp']);
            const pnl1 = escapeForJsString(pt.properties['PNL1'] || pt.properties['pnl1']);
            popupExtra = (jenis ? '<br>Jenis: ' + jenis : '') + (ulp ? '<br>ULP: ' + ulp : '') + (pnl1 ? '<br>PNL: ' + pnl1 : '');

            const labelText = jenis && !nameEsc.toUpperCase().startsWith(jenis) ? '[' + jenis + '] ' + nameEsc : nameEsc;

            js += `
              L.marker([${pt.lat}, ${pt.lng}], {
                icon: L.divIcon({
                  className: 'overlay-proteksi overlay-layer overlay-${ol.id}',
                  html: '<div style="width:16px;height:16px;background:${markerColor};border:2.5px solid white;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.4);opacity:${opacity}"></div>',
                  iconSize: [21, 21],
                  iconAnchor: [10, 10]
                }),
                interactive: true
              }).addTo(map).bindPopup('<b>${nameEsc}</b>${popupExtra}<br><i style="color:#999">${olNameEsc}</i>');

              // Proteksi name & type label badge on map
              L.marker([${pt.lat}, ${pt.lng}], {
                icon: L.divIcon({
                  className: 'overlay-proteksi-label overlay-layer overlay-${ol.id}',
                  html: '<div style="color:${markerColor};font-size:10px;font-weight:bold;white-space:nowrap;text-shadow:1px 1px 2px white,-1px -1px 2px white,1px -1px 2px white,-1px 1px 2px white,0 0 3px white;opacity:${opacity};">${labelText}</div>',
                  iconSize: null,
                  iconAnchor: [-12, 6]
                }),
                interactive: false
              }).addTo(map);
            `;

          } else {
            // ── CUSTOM: circle marker with name label badge ──
            js += `
              L.circleMarker([${pt.lat}, ${pt.lng}], {
                radius: 5,
                fillColor: '#607D8B',
                color: 'white',
                weight: 2,
                fillOpacity: ${opacity},
                opacity: ${opacity},
                className: 'overlay-custom overlay-layer overlay-${ol.id}',
                interactive: true
              }).addTo(map).bindPopup('<b>${nameEsc}</b><br><i style="color:#999">${olNameEsc}</i>');

              L.marker([${pt.lat}, ${pt.lng}], {
                icon: L.divIcon({
                  className: 'overlay-custom-label overlay-layer overlay-${ol.id}',
                  html: '<div style="color:#455A64;font-size:9px;font-weight:bold;white-space:nowrap;text-shadow:1px 1px 1px white,-1px -1px 1px white,1px -1px 1px white,-1px 1px 1px white,0 0 3px white;opacity:${opacity};">${nameEsc}</div>',
                  iconSize: null,
                  iconAnchor: [-10, 5]
                }),
                interactive: false
              }).addTo(map);
            `;
          }
        });
      }

      return js;
    })
    .join('\n');

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
  <script>
    ${HTML2CANVAS_SOURCE}
  </script>
  <style>
    * { margin: 0; padding: 0; }
    html, body, #map { height: 100%; width: 100%; }
    .tiang-icon, .gardu-icon, .persil-label, .segment-label { background: transparent !important; border: none !important; box-shadow: none !important; }
    .overlay-gardu, .overlay-gardu-label,
    .overlay-proteksi, .overlay-proteksi-label,
    .overlay-custom { background: transparent !important; border: none !important; box-shadow: none !important; }
    .leaflet-control-attribution { display: none; }
    
    /* Disable blue/orange tap highlight on Android/iOS */
    * { -webkit-tap-highlight-color: transparent !important; outline: none !important; }
    path.leaflet-interactive { -webkit-tap-highlight-color: transparent !important; outline: none !important; }
    
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
    
    .leaflet-div-icon, .pondasi-icon, .stayset-icon, .grounding-icon {
      background: transparent !important;
      border: none !important;
    }
    
    /* Rainbow Line Style for JTM Eksisting Overlay */
    path.overlay-jtm {
      stroke: url(#rainbowGrad) !important;
      stroke-width: 3.5px !important;
      stroke-dasharray: none !important;
    }
    
    /* Top Right Controls Side-By-Side Layout */
    .leaflet-top.leaflet-right {
      display: flex !important;
      flex-direction: row-reverse !important;
      align-items: flex-start !important;
      gap: 6px !important;
      margin-top: 10px !important;
      margin-right: 10px !important;
    }
    .leaflet-control-scale {
      margin: 0 !important;
    }
    .leaflet-control-scale-line {
      background: rgba(255, 255, 255, 0.92) !important;
      border: 2px solid #1565C0 !important;
      border-top: none !important;
      color: #0D47A1 !important;
      font-weight: bold !important;
      font-size: 11px !important;
      padding: 3px 8px !important;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3) !important;
      line-height: 1.2 !important;
      border-radius: 0 0 4px 4px !important;
    }
    
    /* Numeric Ratio Scale (1 : XXXX) Styling */
    .leaflet-control-scale-ratio {
      background: rgba(255, 255, 255, 0.92) !important;
      border: 2px solid #1565C0 !important;
      color: #0D47A1 !important;
      font-weight: bold !important;
      font-size: 11px !important;
      padding: 3px 8px !important;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3) !important;
      line-height: 1.2 !important;
      border-radius: 4px !important;
      white-space: nowrap !important;
      margin: 0 !important;
    }
    
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
  <svg style="width:0;height:0;position:absolute;">
    <defs>
      <linearGradient id="rainbowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#FF0000"/>
        <stop offset="20%" stop-color="#FF7F00"/>
        <stop offset="40%" stop-color="#FFFF00"/>
        <stop offset="60%" stop-color="#00FF00"/>
        <stop offset="80%" stop-color="#0000FF"/>
        <stop offset="100%" stop-color="#8B00FF"/>
      </linearGradient>
    </defs>
  </svg>
  <div class="legend" id="legendBox">
    <div id="legendHeader" onclick="toggleLegend()" style="display:flex;align-items:center;justify-content:space-between;font-weight:bold;cursor:pointer;user-select:none;padding:2px 0;">
      <span style="color:#333;font-size:11px;">📌 Legenda Peta</span>
      <span id="legendToggleIcon" style="margin-left:8px;font-size:11px;color:#1565C0;font-weight:bold;">${legendIconState}</span>
    </div>
    <div id="legendContent" style="display:${legendDisplayState};margin-top:4px;border-top:1px solid #eee;padding-top:4px;">
      <div class="legend-item"><svg width="24" height="6" style="margin-right:6px;"><line x1="0" y1="3" x2="24" y2="3" stroke="#E91E63" stroke-width="3" stroke-dasharray="8,2,2,2"/></svg>SUTM</div>
      <div class="legend-item"><svg width="24" height="6" style="margin-right:6px;"><line x1="0" y1="3" x2="24" y2="3" stroke="#9C27B0" stroke-width="3" stroke-dasharray="2,3"/></svg>SKTM</div>
      <div class="legend-item"><svg width="24" height="6" style="margin-right:6px;"><line x1="0" y1="3" x2="24" y2="3" stroke="#00BCD4" stroke-width="3" stroke-dasharray="6,3"/></svg>SKUTM</div>
      <div class="legend-item"><svg width="24" height="6" style="margin-right:6px;"><line x1="0" y1="3" x2="24" y2="3" stroke="#00E676" stroke-width="3"/></svg>SUTR</div>
      ${overlayLayers.some(o => o.visible && o.type === 'jtm') ? '<div class="legend-item"><svg width="24" height="6" style="margin-right:6px;"><line x1="0" y1="3" x2="24" y2="3" stroke="url(#rainbowGrad)" stroke-width="3.5"/></svg>JTM Eksisting</div>' : ''}
      <div class="legend-item"><svg width="18" height="12" style="margin-right:6px;"><circle cx="9" cy="6" r="4.5" fill="#757575" stroke="#424242" stroke-width="1.5"/></svg>Tiang Existing</div>
      <div class="legend-item"><svg width="18" height="12" style="margin-right:6px;"><circle cx="9" cy="6" r="4.5" fill="#1565C0" stroke="#0D47A1" stroke-width="1.5"/></svg>Tiang Baru TM</div>
      <div class="legend-item"><svg width="18" height="12" style="margin-right:6px;"><circle cx="9" cy="6" r="4.5" fill="#00E676" stroke="#00A844" stroke-width="1.5"/></svg>Tiang Baru TR</div>
      <div class="legend-item"><svg width="18" height="14" style="margin-right:6px;"><path d="M9,13 L9,7 L3,1 M9,7 L15,1" stroke="#1565C0" stroke-width="2" fill="none"/></svg>Stay Set (Skur)</div>
      <div class="legend-item"><svg width="18" height="12" style="margin-right:6px;"><rect x="3" y="1" width="11" height="10" rx="1" fill="none" stroke="#1565C0" stroke-width="1.8"/><circle cx="8.5" cy="6" r="3" fill="#1565C0"/></svg>Pondasi Tiang</div>
      <div class="legend-item"><svg width="18" height="12" style="margin-right:6px;"><line x1="1" y1="6" x2="5" y2="6" stroke="#1565C0" stroke-width="1.5"/><line x1="5" y1="1" x2="5" y2="11" stroke="#1565C0" stroke-width="1.8"/><line x1="8" y1="3" x2="8" y2="9" stroke="#1565C0" stroke-width="1.8"/><line x1="11" y1="5" x2="11" y2="7" stroke="#1565C0" stroke-width="1.8"/></svg>Grounding</div>
      <div class="legend-item">
        <svg width="18" height="14" style="margin-right:6px;">
          <rect x="2" y="1" width="13" height="12" rx="2" fill="#FF9800" stroke="#E65100" stroke-width="1.2"/>
          <rect x="4.5" y="2.5" width="8" height="9" fill="#FFEB3B" rx="1"/>
          <polygon points="9.5,3.5 6,7.5 8.5,7.5 5.5,10.5 11,6 8.5,6" fill="#D32F2F"/>
        </svg>
        Gardu Baru
      </div>
      <div class="legend-item"><svg width="18" height="12" style="margin-right:6px;"><rect x="3" y="1" width="11" height="10" rx="1.5" fill="#1565C0" stroke="#0D47A1" stroke-width="1.2"/></svg>Gardu Eksisting</div>
      ${overlayLayers.some(o => o.visible && o.type === 'proteksi') ? '<div class="legend-item"><div class="legend-line" style="background:#F44336;height:6px;width:6px;border-radius:50%;"></div>Proteksi</div>' : ''}
    </div>
  </div>
  <script>
    // Expand / Minimize Legend toggle function with React Native state sync
    window.toggleLegend = function(forceExpand) {
      var content = document.getElementById('legendContent');
      var icon = document.getElementById('legendToggleIcon');
      if (!content || !icon) return;

      var isCurrentlyCollapsed = content.style.display === 'none';
      var willCollapse = forceExpand === true ? false : !isCurrentlyCollapsed;

      content.style.display = willCollapse ? 'none' : 'block';
      icon.innerHTML = willCollapse ? '▶' : '▼';

      if (forceExpand !== true && window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'legendToggle',
          collapsed: willCollapse
        }));
      }
    };

    // FIX: Override default Canvas tolerance globally before map init
    // This allows us to use 'preferCanvas: true' (stable for export) 
    // while getting the improved click hit-test area.
    L.Canvas.prototype.options.tolerance = 20;

    var map = L.map('map', {
      zoomControl: true,
      maxZoom: 21,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      preferCanvas: true  // Export-safe mode
    }).setView([${center.latitude}, ${center.longitude}], ${zoomLevel});

    // Create custom pane for Tiang points (above lines, below labels)
    map.createPane('tiangPane');
    map.getPane('tiangPane').style.zIndex = 450;
    
    // Google Maps Tile Layers
    var googleStreets = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 21,
      attribution: '© Google Maps'
    });
    
    var googleSatellite = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      maxZoom: 21,
      attribution: '© Google Maps'
    });
    
    var googleHybrid = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      maxZoom: 21,
      attribution: '© Google Maps'
    });
    
    // Set active base map based on activeBaseMap parameter
    var initialBaseMap = '${activeBaseMap || 'streets'}';
    if (initialBaseMap === 'satellite') {
      googleSatellite.addTo(map);
    } else if (initialBaseMap === 'hybrid') {
      googleHybrid.addTo(map);
    } else {
      googleStreets.addTo(map);
    }
    
    // Layer control
    var baseMaps = {
      "🗺️ Peta": googleStreets,
      "🛰️ Satelit": googleSatellite,
      "🌍 Hybrid": googleHybrid
    };
    
    L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map);

    // Realtime Metric Scale Control (Graphic Bar)
    L.control.scale({
      metric: true,
      imperial: false,
      position: 'topright',
      maxWidth: 120
    }).addTo(map);

    // Numeric Scale Ratio Control (1 : XXXX)
    var scaleRatioControl = L.control({ position: 'topright' });
    scaleRatioControl.onAdd = function() {
      var div = L.DomUtil.create('div', 'leaflet-control-scale-ratio');
      div.id = 'scale-ratio-text';
      div.innerHTML = '1 : --';
      return div;
    };
    scaleRatioControl.addTo(map);

    // Calculate & update numeric scale ratio (1 : XXXX) directly from GIS math (100% reliable)
    function updateScaleRatio() {
      try {
        var ratioEl = document.getElementById('scale-ratio-text');
        if (!ratioEl) return;

        var center = map.getCenter();
        var zoom = map.getZoom();
        var latRad = center.lat * Math.PI / 180;

        // Ground resolution in meters/pixel at 96 DPI:
        // Scale Ratio N = (591657550.5 * cos(lat)) / (2 ^ zoom)
        var scaleRatio = (591657550.5 * Math.cos(latRad)) / Math.pow(2, zoom);

        // Standard cartographic rounding for clean engineering scale display (500-step precision)
        var roundedRatio;
        if (scaleRatio >= 15000) {
          roundedRatio = Math.round(scaleRatio / 5000) * 5000;
        } else if (scaleRatio >= 10000) {
          roundedRatio = Math.round(scaleRatio / 2500) * 2500;
        } else if (scaleRatio >= 750) {
          // High-precision 500-step scale increments (1:500, 1:1.000, 1:1.500, 1:2.000, 1:2.500, 1:3.000, ...)
          roundedRatio = Math.round(scaleRatio / 500) * 500;
        } else if (scaleRatio >= 350) {
          roundedRatio = Math.round(scaleRatio / 250) * 250;
        } else {
          roundedRatio = Math.round(scaleRatio / 100) * 100;
        }

        ratioEl.textContent = '1 : ' + roundedRatio.toLocaleString('id-ID');
      } catch(e) {}
    }

    map.on('zoom move zoomend moveend viewreset', updateScaleRatio);
    updateScaleRatio();

    // Notify React Native when user switches base layer in map
    map.on('baselayerchange', function(e) {
      var selectedType = 'streets';
      if (e.name && e.name.indexOf('Satelit') !== -1) selectedType = 'satellite';
      else if (e.name && e.name.indexOf('Hybrid') !== -1) selectedType = 'hybrid';

      // Dynamic Leader Line Color Switch: #FFD600 Gold on Satellite/Hybrid, #333333 Dark on Streets
      var isSat = selectedType === 'satellite' || selectedType === 'hybrid';
      var targetColor = isSat ? '#FFD600' : '#333333';
      var leaderElements = document.querySelectorAll('.leader-line');
      leaderElements.forEach(function(el) {
        el.setAttribute('stroke', targetColor);
      });

      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'baseMapChange',
        baseMap: selectedType
      }));
    });

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

    // Jembatan Kabel polylines
    ${jembatanPolylines}

    // Persil Pelanggan rectangles
    ${persilRectangles}

    // Overlay layers (imported eksisting data)
    ${overlayRendering}

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
      if (typeof isCapturing !== 'undefined' && isCapturing) return;
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'zoomChange',
        zoom: map.getZoom()
      }));
    });

    // Track map center changes to persist position across re-renders
    map.on('moveend', function() {
      if (typeof isCapturing !== 'undefined' && isCapturing) return;
      var center = map.getCenter();
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'mapCenterChange',
        lat: center.lat,
        lng: center.lng
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
      if (!layers.sktm) css += '.segment-label-SKTM { display: none !important; }';
      
      
      var styleId = 'dynamic-layer-styles';
      var styleEl = document.getElementById(styleId);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      styleEl.innerHTML = css;
    };


    // Flag to prevent double-capture
    var isCapturing = false;

    // Function to capture map as base64 image (called from React Native)
    window.captureMapToBase64 = function(bounds, lockedZoom, centerCoords) {
      // Guard: prevent concurrent captures
      if (isCapturing) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'mapCaptureError',
          error: 'capture already in progress'
        }));
        return;
      }
      isCapturing = true;

      var mapEl = document.getElementById('map');
      var origWidth = mapEl ? mapEl.style.width : '';
      var origHeight = mapEl ? mapEl.style.height : '';
      var origPos = mapEl ? mapEl.style.position : '';

      // Force fixed A4 Landscape aspect ratio (1200px x 848px) for perfectly consistent capture across all devices
      if (mapEl) {
        mapEl.style.width = '1200px';
        mapEl.style.height = '848px';
        mapEl.style.position = 'fixed';
        mapEl.style.top = '0';
        mapEl.style.left = '0';
        mapEl.style.zIndex = '99999';
      }

      // Re-evaluate container dimensions in Leaflet
      map.invalidateSize();

      // If lockedZoom and centerCoords provided, LOCK ZOOM & SCALE!
      if (lockedZoom && centerCoords && centerCoords.lat && centerCoords.lng) {
        map.setView([centerCoords.lat, centerCoords.lng], lockedZoom, { animate: false });
      } else if (bounds) {
        map.fitBounds(bounds, { animate: false, padding: [15, 15] });
      }
      
      // Helper null-safe hide/show
      function setDisplay(sel, val) {
        var el = document.querySelector(sel);
        if (el) el.style.display = val;
      }
      
      function restoreMapUI() {
        if (mapEl) {
          mapEl.style.width = origWidth || '';
          mapEl.style.height = origHeight || '';
          mapEl.style.position = origPos || '';
          mapEl.style.top = '';
          mapEl.style.left = '';
          mapEl.style.zIndex = '';
        }
        map.invalidateSize();
        setDisplay('.legend', '');
        setDisplay('.leaflet-control-zoom', '');
        setDisplay('.crosshair', '');
        setDisplay('.leaflet-control-layers', '');
        isCapturing = false;
      }

      // Hide UI elements
      setDisplay('.legend', 'none');
      setDisplay('.leaflet-control-zoom', 'none');
      setDisplay('.crosshair', 'none');
      setDisplay('.leaflet-control-layers', 'none');
      
      // Safety timeout to reset isCapturing if html2canvas locks up
      var safetyTimeout = setTimeout(function() {
        if (isCapturing) {
          restoreMapUI();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'mapCaptureError',
            error: 'html2canvas capture timeout (15s)'
          }));
        }
      }, 15000);

      // Wait for tiles & Leaflet layout to stabilize (350ms optimized)
      setTimeout(function() {
        try {
          if (typeof html2canvas === 'undefined') {
            throw new Error('html2canvas library is not loaded');
          }
          html2canvas(document.getElementById('map'), {
            useCORS: true,
            allowTaint: false, // Prevent canvas taint SecurityError
            logging: false,
            scale: 2, // 2x Ultra HD Crisp High-DPI resolution (~2400x1696px, ultra fast & sharp)
            width: 1200,
            height: 848
          }).then(function(canvas) {
            clearTimeout(safetyTimeout);
            // High-quality compressed JPEG (0.85) reduces Base64 payload by ~88% (from 8MB to ~700KB) for instant export!
            var base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
            restoreMapUI();
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'mapCapture',
              base64: base64
            }));
          }).catch(function(err) {
            clearTimeout(safetyTimeout);
            restoreMapUI();
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'mapCaptureError',
              error: err.message || 'html2canvas failed'
            }));
          });
        } catch (err) {
          clearTimeout(safetyTimeout);
          restoreMapUI();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'mapCaptureError',
            error: err.message || 'html2canvas failed'
          }));
        }
      }, 2500);
    };

    window._segBoundaryMarkers = [];

    // Tambah marker huruf (A, B, C...) di titik batas segmen PDF
    // Menggambar garis potong MERAH TERPOTONG TEGAK LURUS terhadap arah jalur kabel + pasang label A — A di ujung garis
    // Tambah marker huruf (A, B, C...) di titik batas segmen PDF
    // Menggambar garis potong MERAH TERPOTONG TEGAK LURUS terhadap arah jalur kabel + pasang label A — A di ujung garis
    window.addSegmentBoundaryMarkers = function(markers) {
      if (!markers || markers.length === 0) return;
      markers.forEach(function(m) {
        var dx = 0;
        var dy = 1; // Default jika tidak ditemukan
        var minDistToSegment = Infinity;

        try {
          map.eachLayer(function(layer) {
            // Exclude leader lines, boundary cut lines, and non-cable polylines
            if (layer instanceof L.Polyline && 
                !(layer instanceof L.Polygon) && 
                layer.options.className !== 'leader-line' && 
                layer.options.className !== 'leader-line-bg' && 
                layer.options.className !== 'tiang-label-leader-line' && 
                !window._segBoundaryMarkers.includes(layer) && 
                layer.getLatLngs) {
              var latlngs = layer.getLatLngs();
              if (Array.isArray(latlngs) && latlngs.length >= 2) {
                // Flatten if nested polyline arrays
                var pointsArray = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
                for (var i = 0; i < pointsArray.length - 1; i++) {
                  var p1 = pointsArray[i];
                  var p2 = pointsArray[i + 1];

                  // Project m onto segment (p1, p2)
                  var A = m.lng - p1.lng;
                  var B = m.lat - p1.lat;
                  var C = p2.lng - p1.lng;
                  var D = p2.lat - p1.lat;

                  var dot = A * C + B * D;
                  var len_sq = C * C + D * D;
                  var param = len_sq !== 0 ? dot / len_sq : -1;

                  var projX, projY;
                  if (param < 0) {
                    projX = p1.lng; projY = p1.lat;
                  } else if (param > 1) {
                    projX = p2.lng; projY = p2.lat;
                  } else {
                    projX = p1.lng + param * C;
                    projY = p1.lat + param * D;
                  }

                  var dist = Math.hypot(m.lat - projY, m.lng - projX);
                  if (dist < minDistToSegment) {
                    minDistToSegment = dist;
                    dx = p2.lng - p1.lng;
                    dy = p2.lat - p1.lat;
                  }
                }
              }
            }
          });
        } catch(e) {}

        var len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) { dx = 0; dy = 1; len = 1; }

        // Vektor Normal (-dy/len, dx/len) tegak lurus sempurna dengan jalur kabel!
        var normX = -dy / len;
        var normY = dx / len;

        var cutHalfLength = 0.00028; // ~28 meter ke masing-masing sisi tegak lurus (bebas overlap label tiang & pas di dalam frame A4)
        var lineP1 = [m.lat - normY * cutHalfLength, m.lng - normX * cutHalfLength];
        var lineP2 = [m.lat + normY * cutHalfLength, m.lng + normX * cutHalfLength];

        // Garis potong tegak lurus dashed merah
        var cutLine = L.polyline([lineP1, lineP2], {
          color: '#D32F2F',
          weight: 2.8,
          dashArray: '6, 4',
          opacity: 0.95,
          interactive: false
        }).addTo(map);
        window._segBoundaryMarkers.push(cutLine);

        // Label Badge Pasangan A - A / B - B di kedua ujung garis potong
        var badgeHtml = [
          '<div style="display:flex;align-items:center;justify-content:center;pointer-events:none;">',
            '<div style="background:#D32F2F;color:white;font-weight:bold;font-size:12px;',
              'padding:3px 7px;border-radius:4px;box-shadow:0 2px 6px rgba(0,0,0,0.6);',
              'border:1.5px solid white;white-space:nowrap;">',
              m.label,
            '</div>',
          '</div>'
        ].join('');

        var badgeIcon = L.divIcon({
          html: badgeHtml,
          className: '',
          iconAnchor: [12, 10],
          iconSize: [24, 20]
        });

        var badge1 = L.marker(lineP2, { icon: badgeIcon, interactive: false, zIndexOffset: 9999 }).addTo(map);
        var badge2 = L.marker(lineP1, { icon: badgeIcon, interactive: false, zIndexOffset: 9999 }).addTo(map);
        window._segBoundaryMarkers.push(badge1);
        window._segBoundaryMarkers.push(badge2);
      });
    };

    // Hapus semua marker batas segmen
    window.removeSegmentBoundaryMarkers = function() {
      window._segBoundaryMarkers.forEach(function(m) {
        try { map.removeLayer(m); } catch(e) {}
      });
      window._segBoundaryMarkers = [];
    };
  </script>
</body>
</html>
  `;
};

export { generateMapHTML };

