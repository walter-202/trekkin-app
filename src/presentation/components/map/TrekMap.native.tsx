import React, { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { AndeanTheme } from "../../theme";
import type { TrekMapProps } from "./TrekMap.types";
import { buildTrekMapScene } from "./buildTrekMapScene";
import { buildTrekMapHtml } from "./trekMapDocument";
import type { MapToHostEvent } from "../../../infrastructure/map/mapBridge";

/**
 * MapLibre GL JS en WebView — Android + iOS (Expo Go, sin Google Maps SDK).
 */
export const TrekMap: React.FC<TrekMapProps> = (props) => {
  const {
    height = 280,
    style,
    interactive = true,
    accessibilityLabel,
    children,
    onPress,
    onPressCoordinate,
    onMapReady,
    onMapError,
    mapTheme = "dark",
  } = props;

  // El documento (con su estilo online) se reconstruye si cambia el tema.
  const html = useMemo(() => buildTrekMapHtml(mapTheme), [mapTheme]);

  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const scene = useMemo(() => buildTrekMapScene(props), [props]);

  const apply = (next = scene): void => {
    webRef.current?.injectJavaScript(
      `try{window.__TREKKIN_APPLY(${JSON.stringify(next)});}catch(e){} true;`,
    );
  };

  useEffect(() => {
    if (readyRef.current) apply(scene);
  }, [scene]);

  const onMessage = (event: WebViewMessageEvent): void => {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as MapToHostEvent;
      if (msg.type === "mapReady") {
        readyRef.current = true;
        apply();
        onMapReady?.(Boolean(msg.payload?.offlinePackReady));
        return;
      }
      if (msg.type === "mapPress" && interactive) {
        onPress?.(msg.payload);
        onPressCoordinate?.(msg.payload);
        return;
      }
      if (msg.type === "error") {
        onMapError?.(new Error(msg.payload.message));
      }
    } catch (error) {
      onMapError?.(error instanceof Error ? error : new Error("Respuesta inválida del mapa."));
    }
  };

  const containerStyle: StyleProp<ViewStyle> = [
    styles.container,
    { height },
    style,
  ];

  return (
    <View
      style={containerStyle}
      accessibilityLabel={accessibilityLabel || "Mapa interactivo de la ruta"}
    >
      <WebView
        ref={webRef}
        source={{ html, baseUrl: "https://tiles.openfreemap.org" }}
        style={styles.webview}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        nestedScrollEnabled
        overScrollMode="never"
        setSupportMultipleWindows={false}
        androidLayerType="hardware"
        onMessage={onMessage}
        onLoadEnd={() => {
          if (readyRef.current) apply();
        }}
        onError={() => {
          readyRef.current = false;
          onMapError?.(new Error("No se pudo cargar el mapa offline."));
        }}
      />
      {children}
    </View>
  );
};

export default TrekMap;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: AndeanTheme.borderRadius.lg,
    overflow: "hidden",
    backgroundColor: AndeanTheme.colors.backgroundSecondary,
    position: "relative",
  },
  webview: {
    flex: 1,
    backgroundColor: AndeanTheme.colors.backgroundSecondary,
  },
});
