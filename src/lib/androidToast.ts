import { Alert, Platform } from "react-native";

/**
 * Do not `import { ToastAndroid } from "react-native"` in screen modules: that eagerly loads
 * ToastAndroid.android.js, which calls NativeToastAndroid.getConstants() at module scope. During
 * Expo / Metro startup that can run before the native runtime is ready →
 * "Cannot read property 'getConstants' of null". Access ToastAndroid only here, on demand.
 */
export function showAndroidToast(message: string): void {
  if (Platform.OS !== "android") return;
  const RN = require("react-native") as typeof import("react-native");
  RN.ToastAndroid.show(message, RN.ToastAndroid.SHORT);
}

/** Android: toast. iOS: simple alert (matches previous call sites that only used Toast on Android). */
export function showToastOrAlert(message: string): void {
  if (Platform.OS === "android") {
    showAndroidToast(message);
  } else {
    Alert.alert("", message);
  }
}
