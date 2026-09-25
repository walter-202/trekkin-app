import * as ImagePicker from "expo-image-picker";

/**
 * HU-12 — Adaptador de fotos para paradas georreferenciadas (única capa con
 * `expo-image-picker`). Devuelve URIs locales (`file://`); los bytes nunca
 * suben a la nube: viajan en el checkpoint hasta el autosave local.
 * No importa `firebase/*` ni lógica de negocio.
 */

export type PhotoSource = "camera" | "library";

export interface PhotoResult {
  uri: string;
}

async function pickFrom(
  source: PhotoSource,
): Promise<PhotoResult | null> {
  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new Error(
        "Permiso de cámara denegado. Actívalo en ajustes para fotografiar paradas.",
      );
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: false,
    });
    if (result.canceled || result.assets.length === 0) return null;
    return { uri: result.assets[0].uri };
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error(
      "Permiso de galería denegado. Actívalo en ajustes para adjuntar fotos.",
    );
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.7,
    allowsEditing: false,
  });
  if (result.canceled || result.assets.length === 0) return null;
  return { uri: result.assets[0].uri };
}

export const photoService = {
  takePhoto: (): Promise<PhotoResult | null> => pickFrom("camera"),
  pickFromLibrary: (): Promise<PhotoResult | null> => pickFrom("library"),
};
