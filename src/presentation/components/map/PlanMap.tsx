import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { PlannedPoint } from '../../../core/domain/plan';

/**
 * HU-07 — Mapa de planificación (WebView + tiles OpenStreetMap, sin librerías externas).
 * Mini slippy map propio (mercator) pintado en el WebView: no depende de Google ni de CDNs.
 * Funciona en Expo Go (Android/iOS) sin API key. Tap en el mapa reporta coordenadas
 * vía postMessage; incluye marcadores para inicio provisional, destino y ubicación actual.
 */
interface PlanRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface PlanMapProps {
  start?: PlannedPoint | null;
  end?: PlannedPoint | null;
  currentLocation?: PlannedPoint | null;
  onPressCoordinate?: (coords: { lat: number; lng: number }) => void;
  initialRegion?: PlanRegion;
  height?: number;
}

interface MarkerData {
  lat: number;
  lng: number;
  color: string;
  title?: string;
}

const DEFAULT_REGION: PlanRegion = {
  latitude: -16.499,
  longitude: -68.146,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
};

function regionToZoom(region: PlanRegion): number {
  const delta = Math.max(region.latitudeDelta, 0.0001);
  return Math.max(1, Math.min(19, Math.round(Math.log2(360 / delta))));
}

function buildHtml(region: PlanRegion, points: MarkerData[]): string {
  const lat = region.latitude.toFixed(6);
  const lng = region.longitude.toFixed(6);
  const zoom = regionToZoom(region);
  const markersJs = JSON.stringify(points);

  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<style>
  * { -webkit-tap-highlight-color: transparent; -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; }
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; overscroll-behavior: none; background: #0E2E24; }
  body { font-family: system-ui, sans-serif; }
  #m { position: relative; width: 100%; height: 100%; touch-action: none; }
  #layer { position: absolute; left: 0; top: 0; pointer-events: none; }
  .zoom { position: absolute; left: 10px; z-index: 10; width: 34px; height: 34px; border: none; border-radius: 8px; background: rgba(20,50,40,.92); color: #fff; font-size: 20px; line-height: 34px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,.4); }
  .zoom:active { background: rgba(16,185,129,.9); }
  #zin { bottom: 48px; }
  #zout { bottom: 10px; }
  #attribution { position: absolute; right: 6px; bottom: 4px; font-size: 10px; background: rgba(255,255,255,.85); color: #1F2937; padding: 0 4px; border-radius: 4px; }
</style>
</head><body>
<div id="m">
  <div id="layer"></div>
  <button class="zoom" id="zin">+</button>
  <button class="zoom" id="zout">&ndash;</button>
  <div id="attribution">&copy; OpenStreetMap contributors</div>
</div>
<script>
(function () {
  document.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
  document.addEventListener('touchstart', function (e) { if (e.touches.length > 1) { e.preventDefault(); } }, { passive: false });

  var map = document.getElementById('m');
  var layer = document.getElementById('layer');
  var Z = ${zoom};
  var CX = ${lat};
  var CY = ${lng};
  var markers = ${markersJs};
  var baseTx = 0, baseTy = 0, curTx = 0, curTy = 0;

  function clampLat(v) { return Math.max(-85, Math.min(85, v)); }
  function clampLng(v) { return ((v + 180) % 360 + 360) % 360 - 180; }

  function m2p(lat, lng, z) {
    var n = Math.pow(2, z) * 256;
    var x = (lng + 180) / 360 * n;
    var latRad = lat * Math.PI / 180;
    var y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;
    return { x: x, y: y };
  }

  function p2m(x, y, z) {
    var n = Math.pow(2, z) * 256;
    var lng = x / n * 360 - 180;
    var latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)));
    return { lat: latRad * 180 / Math.PI, lng: lng };
  }

  function render() {
    var c = m2p(CX, CY, Z);
    var w = map.clientWidth, h = map.clientHeight;
    var n = Math.pow(2, Z);
    var tx = c.x / 256, ty = c.y / 256;
    var x0 = Math.floor(tx - w / 512), x1 = Math.ceil(tx + w / 512);
    var y0 = Math.floor(ty - h / 512), y1 = Math.ceil(ty + h / 512);
    var baseX = Math.floor(x0), baseY = Math.floor(y0);
    baseTx = w / 2 - c.x + baseX * 256;
    baseTy = h / 2 - c.y + baseY * 256;

    layer.innerHTML = '';
    for (var X = x0; X <= x1; X++) {
      var ix = ((X % n) + n) % n;
      for (var Y = y0; Y <= y1; Y++) {
        if (Y < 0 || Y >= n) continue;
        var img = document.createElement('img');
        img.src = 'https://tile.openstreetmap.org/' + Z + '/' + ix + '/' + Y + '.png';
        img.style.cssText = 'position:absolute;left:' + ((X - baseX) * 256) + 'px;top:' + ((Y - baseY) * 256) + 'px;width:256px;height:256px;';
        img.addEventListener('error', function () { this.style.background = '#223D33'; });
        layer.appendChild(img);
      }
    }

    for (var k = 0; k < markers.length; k++) {
      var mk = markers[k];
      var p = m2p(mk.lat, mk.lng, Z);
      var d = document.createElement('div');
      d.style.cssText = 'position:absolute;left:' + (p.x - baseX * 256) + 'px;top:' + (p.y - baseY * 256) + 'px;width:16px;height:16px;border-radius:50%;background:' + mk.color + ';border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.5);transform:translate(-8px,-8px);';
      layer.appendChild(d);
    }

    layer.style.transform = 'translate(' + baseTx + 'px,' + baseTy + 'px)';
  }

  window.__setMarkers = function (list) { markers = list; render(); };

  map.addEventListener('pointerdown', function (e) {
    if (e.target && e.target.tagName === 'BUTTON') return;
    curTx = 0;
    curTy = 0;
    if (map.setPointerCapture) { try { map.setPointerCapture(e.pointerId); } catch (err) {} }
    layer.style.transition = 'none';
    window.__down = { x: e.clientX, y: e.clientY, moved: 0, baseTx: baseTx, baseTy: baseTy };
  });

  map.addEventListener('pointermove', function (e) {
    var d = window.__down;
    if (!d) return;
    d.moved = Math.max(d.moved, Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y));
    curTx = e.clientX - d.x;
    curTy = e.clientY - d.y;
    layer.style.transform = 'translate(' + (d.baseTx + curTx) + 'px,' + (d.baseTy + curTy) + 'px)';
  });

  function handleUp(e) {
    var d = window.__down;
    if (!d) return;
    window.__down = null;
    var rect = map.getBoundingClientRect();
    var px = e.clientX - rect.left, py = e.clientY - rect.top;
    if (d.moved < 6) {
      var ll = p2m(px - (d.baseTx + curTx), py - (d.baseTy + curTy), Z);
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'press', lat: ll.lat, lng: ll.lng }));
      }
    } else {
      var nc = p2m(map.clientWidth / 2 - (d.baseTx + curTx), map.clientHeight / 2 - (d.baseTy + curTy), Z);
      CX = clampLat(nc.lat);
      CY = clampLng(nc.lng);
      render();
    }
  }
  map.addEventListener('pointerup', handleUp);
  map.addEventListener('pointercancel', handleUp);

  document.getElementById('zin').addEventListener('click', function () { Z = Math.min(19, Z + 1); render(); });
  document.getElementById('zout').addEventListener('click', function () { Z = Math.max(1, Z - 1); render(); });
  window.addEventListener('resize', render);
  render();
})();
</script>
</body></html>`;
}

export const PlanMap: React.FC<PlanMapProps> = ({
  start,
  end,
  currentLocation,
  onPressCoordinate,
  initialRegion,
  height = 300,
}) => {
  const webRef = useRef<WebView>(null);
  const region = initialRegion ?? DEFAULT_REGION;

  const points = useMemo<MarkerData[]>(() => {
    const list: MarkerData[] = [];
    if (start) {
      list.push({ lat: start.lat, lng: start.lng, color: '#10B981', title: start.name ?? 'Punto inicial' });
    }
    if (end) {
      list.push({ lat: end.lat, lng: end.lng, color: '#F59E0B', title: end.name ?? 'Destino' });
    }
    if (currentLocation) {
      list.push({ lat: currentLocation.lat, lng: currentLocation.lng, color: '#3B82F6', title: currentLocation.name ?? 'Ubicación actual' });
    }
    return list;
  }, [start, end, currentLocation]);

  const html = useMemo(() => buildHtml(region, points), []);

  useEffect(() => {
    webRef.current?.injectJavaScript(`if (window.__setMarkers) { window.__setMarkers(${JSON.stringify(points)}); } true;`);
  }, [points]);

  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    if (!onPressCoordinate) return;
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data && data.type === 'press' && typeof data.lat === 'number' && typeof data.lng === 'number') {
        onPressCoordinate({ lat: data.lat, lng: data.lng });
      }
    } catch {
      // mensajes no estructurados se ignoran
    }
  };

  return (
    <View style={[styles.wrap, { height }]}>
      <WebView
        ref={webRef}
        source={{ html }}
        style={styles.map}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        onMessage={handleMessage}
        bounces={false}
        overScrollMode="never"
        scrollEnabled={false}
        nestedScrollEnabled={false}
        allowsLinkPreview={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1A4537',
  },
  map: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0E2E24',
  },
});