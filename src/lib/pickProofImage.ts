import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";

export async function pickProofFromGallery(options?: { multiple?: boolean; limit?: number }): Promise<string[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert("Permission needed", "Please allow access to your photos to upload proof images.");
    return [];
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: options?.multiple ?? true,
    quality: 0.8,
    selectionLimit: options?.limit ?? 6,
  });
  if (result.canceled) return [];
  return result.assets.map((asset) => asset.uri).filter(Boolean);
}

/** Opens the device camera so the trainee can snap a live photo (e.g. the book they read). */
export async function snapLiveProofPhoto(): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert("Camera needed", "Please allow camera access to snap a live photo of the book you read.");
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: 0.8,
    cameraType: ImagePicker.CameraType.back,
  });
  if (result.canceled) return null;
  return result.assets[0]?.uri ?? null;
}
