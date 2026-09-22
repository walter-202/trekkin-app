import {
  MAPLIBRE_GL_CSS_URL,
  MAPLIBRE_GL_JS_URL,
  PMTILES_JS_URL,
  ONLINE_STYLE_URL,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  buildOfflineVectorStyle,
} from "../../../infrastructure/map/mapStyle";
import { AndeanTheme } from "../../theme";
import { CALLOUT_CSS, MARKER_ROLE_LABEL } from "./markerCallout";

/**
 * HTML autocontenido para MapLibre GL JS dentro de react-native-webview (Expo Go).
 * El pack HU-04 (PMTiles) se enchufa al mismo documento vía scene.offlinePack.
 */
export function buildTrekMapHtml(): string {
  const bg = AndeanTheme.colors.backgroundSecondary;
  const trail = AndeanTheme.colors.primaryLight;
  const track = "#3B82F6";
  const start = AndeanTheme.colors.primary;
  const end = AndeanTheme.colors.amberLight;
  const checkpoint = AndeanTheme.colors.amber;
  const text = AndeanTheme.colors.text;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="${MAPLIBRE_GL_CSS_URL}" />
  <style>
    html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: ${bg}; }
    .maplibregl-ctrl-attrib { font-size: 10px; }
    ${CALLOUT_CSS}
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="${MAPLIBRE_GL_JS_URL}"></script>
  <script src="${PMTILES_JS_URL}"></script>
  <script>
    (function () {
      var STYLE = ${JSON.stringify(ONLINE_STYLE_URL)};
      var OFFLINE_STYLE_TEMPLATE = ${JSON.stringify(buildOfflineVectorStyle("pmtiles://__PACK__"))};
      var COLORS = {
        trail: ${JSON.stringify(trail)},
        track: ${JSON.stringify(track)},
        start: ${JSON.stringify(start)},
        end: ${JSON.stringify(end)},
        checkpoint: ${JSON.stringify(checkpoint)},
        user: ${JSON.stringify(track)},
        text: ${JSON.stringify(text)}
      };
      var ROLES = ${JSON.stringify(MARKER_ROLE_LABEL)};
      var emptyLine = { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } };
      var emptyPoints = { type: "FeatureCollection", features: [] };
      var popup = null;
      var map = new maplibregl.Map({
        container: "map",
        style: STYLE,
        center: [${DEFAULT_CENTER[0]}, ${DEFAULT_CENTER[1]}],
        zoom: ${DEFAULT_ZOOM},
        attributionControl: true
      });
      var ready = false;
      var pending = null;
      var currentPackUrl = null;
      var switchingStyle = false;
      var warnedMbtiles = false;

      try {
        if (window.pmtiles && maplibregl.addProtocol) {
          var protocol = new pmtiles.Protocol();
          maplibregl.addProtocol("pmtiles", protocol.tile);
        }
      } catch (e) {}

      function offlineStyle(url) {
        var style = JSON.parse(JSON.stringify(OFFLINE_STYLE_TEMPLATE));
        if (style.sources && style.sources.openmaptiles) {
          style.sources.openmaptiles.url = url;
        }
        return style;
      }

      function packUrlOf(scene) {
        if (!scene || !scene.offlinePack) return null;
        if (scene.offlinePack.kind !== "pmtiles") return null;
        return scene.offlinePack.protocolUrl || null;
      }

      function post(msg) {
        try {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify(msg));
          }
        } catch (e) {}
      }

      function lineData(coords) {
        if (!coords || coords.length < 2) return emptyLine;
        return { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } };
      }

      function markerData(markers) {
        if (!markers || !markers.length) return emptyPoints;
        return {
          type: "FeatureCollection",
          features: markers.map(function (m) {
            return {
              type: "Feature",
              properties: {
                kind: m.kind,
                label: m.label || "",
                notes: m.notes || "",
                id: m.id
              },
              geometry: { type: "Point", coordinates: [m.lng, m.lat] }
            };
          })
        };
      }

      function circleColor() {
        return [
          "match", ["get", "kind"],
          "start", COLORS.start,
          "end", COLORS.end,
          "user", COLORS.user,
          COLORS.checkpoint
        ];
      }

      function escapeHtml(value) {
        return String(value || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      }

      function calloutHtml(kind, name, notes) {
        var role = ROLES[kind] || ROLES.checkpoint;
        var title = (name && String(name).trim()) || role;
        var extra = notes && String(notes).trim();
        var extraHtml = extra ? '<p class="trekkin-popup-notes">' + escapeHtml(extra) + "</p>" : "";
        var roleHtml = title !== role ? '<p class="trekkin-popup-role">' + escapeHtml(role) + "</p>" : "";
        return '<div class="trekkin-popup-card">' + roleHtml +
          '<p class="trekkin-popup-title">' + escapeHtml(title) + "</p>" + extraHtml + "</div>";
      }

      function markerHits(point) {
        try {
          var pad = 18;
          return map.queryRenderedFeatures(
            [
              [point.x - pad, point.y - pad],
              [point.x + pad, point.y + pad]
            ],
            { layers: ["trekkin-markers-circle"] }
          );
        } catch (e) {
          return [];
        }
      }

      function openCallout(feature) {
        if (!feature || !feature.geometry) return;
        var coords = feature.geometry.coordinates.slice();
        var props = feature.properties || {};
        if (popup) popup.remove();
        popup = new maplibregl.Popup({
          closeButton: true,
          closeOnClick: true,
          offset: 14,
          className: "trekkin-popup",
          maxWidth: "240px"
        })
          .setLngLat(coords)
          .setHTML(calloutHtml(props.kind, props.label, props.notes))
          .addTo(map);
      }

      function addLayers() {
        if (!map.getSource("trekkin-trail")) {
          map.addSource("trekkin-trail", { type: "geojson", data: emptyLine });
          map.addLayer({
            id: "trekkin-trail-line",
            type: "line",
            source: "trekkin-trail",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": COLORS.trail, "line-width": 4 }
          });
        }
        if (!map.getSource("trekkin-track")) {
          map.addSource("trekkin-track", { type: "geojson", data: emptyLine });
          map.addLayer({
            id: "trekkin-track-line",
            type: "line",
            source: "trekkin-track",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": COLORS.track, "line-width": 4 }
          });
        }
        if (!map.getSource("trekkin-markers")) {
          map.addSource("trekkin-markers", { type: "geojson", data: emptyPoints });
          map.addLayer({
            id: "trekkin-markers-circle",
            type: "circle",
            source: "trekkin-markers",
            paint: {
              "circle-radius": 10,
              "circle-color": circleColor(),
              "circle-stroke-width": 2,
              "circle-stroke-color": "#F9FAFB"
            }
          });
        }
      }

      function paintScene(scene) {
        if (!scene) return;
        addLayers();
        map.getSource("trekkin-trail").setData(lineData(scene.trail));
        map.getSource("trekkin-track").setData(lineData(scene.track));
        map.getSource("trekkin-markers").setData(markerData(scene.markers));
        map.dragPan.enable();
        map.scrollZoom.enable();
        map.touchZoomRotate.enable();
        if (scene.interactive === false) {
          map.dragPan.disable();
          map.scrollZoom.disable();
          map.touchZoomRotate.disable();
        }
        if (scene.bounds) {
          try {
            map.fitBounds(scene.bounds, { padding: 40, duration: 400, maxZoom: 15 });
          } catch (e) {}
        }
      }

      function applyScene(scene) {
        if (!scene) return;
        pending = scene;
        if (scene.offlinePack && scene.offlinePack.kind === "mbtiles" && scene.offlinePack.message && !warnedMbtiles) {
          warnedMbtiles = true;
          post({ type: "error", payload: { message: scene.offlinePack.message } });
        }
        if (!ready || switchingStyle) return;
        var nextUrl = packUrlOf(scene);
        if (nextUrl === currentPackUrl) {
          paintScene(scene);
          return;
        }
        switchingStyle = true;
        map.once("style.load", function () {
          currentPackUrl = nextUrl;
          switchingStyle = false;
          paintScene(pending);
          post({ type: "mapReady", payload: { offlinePackReady: Boolean(nextUrl) } });
        });
        try {
          map.setStyle(nextUrl ? offlineStyle(nextUrl) : STYLE);
        } catch (e) {
          switchingStyle = false;
          paintScene(pending);
        }
      }

      map.on("load", function () {
        ready = true;
        if (pending) applyScene(pending);
        else addLayers();
        post({ type: "mapReady", payload: { offlinePackReady: Boolean(currentPackUrl) } });
      });
      map.on("error", function (e) {
        post({ type: "error", payload: { message: (e && e.error && e.error.message) || "map error" } });
      });
      map.on("click", function (e) {
        var hits = markerHits(e.point);
        if (hits.length) {
          openCallout(hits[0]);
          return;
        }
        post({ type: "mapPress", payload: { lat: e.lngLat.lat, lng: e.lngLat.lng } });
      });

      window.__TREKKIN_APPLY = function (scene) {
        if (!ready) { pending = scene; return; }
        applyScene(scene);
      };

      function onHostMessage(ev) {
        try {
          var data = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;
          if (data && data.type === "applyScene") window.__TREKKIN_APPLY(data.payload);
        } catch (e) {}
      }
      window.addEventListener("message", onHostMessage);
      document.addEventListener("message", onHostMessage);
    })();
  </script>
</body>
</html>`;
}
