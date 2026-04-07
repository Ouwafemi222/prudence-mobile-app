import { Platform } from "react-native";

/** Avoid top-level `import "expo-constants"` so AppProviders → this module does not touch native during first bundle eval. */
function getExpoConstants() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("expo-constants").default;
}

/**
 * Never load `expo-notifications` in the Expo Go app: Android push was removed (SDK 53+), and
 * the native module surface can be incomplete, which often surfaces as
 * `Cannot read property 'getConstants' of null` during import or first use.
 * Use a dev client or EAS build to test notifications / push.
 * @see https://docs.expo.dev/develop/development-builds/introduction/
 */
export function canLoadExpoNotifications(): boolean {
  if (Platform.OS === "web") return false;
  try {
    if (getExpoConstants().appOwnership === "expo") return false;
  } catch {
    return false;
  }
  return true;
}

type ExpoNotifications = typeof import("expo-notifications");

let handlerConfigured = false;

async function loadNotifications(): Promise<ExpoNotifications> {
  return import("expo-notifications");
}

export async function configureNotificationHandler(): Promise<void> {
  if (!canLoadExpoNotifications()) return;
  if (handlerConfigured) return;
  handlerConfigured = true;
  const Notifications = await loadNotifications();
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: true,
    }),
  });
}

async function ensureAndroidChannel(Notifications: ExpoNotifications) {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "default",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Requests permission and returns an Expo push token when running on a physical device.
 * Call `upsertExpoPushTokenForCurrentUser` after a successful token to persist it (see `PushNotificationBootstrap`).
 */
export async function registerForExpoPushTokenAsync(): Promise<string | null> {
  if (!canLoadExpoNotifications()) return null;
  const { isDevice } = await import("expo-device");
  if (!isDevice) return null;

  await configureNotificationHandler();
  const Notifications = await loadNotifications();
  await ensureAndroidChannel(Notifications);

  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }
  if (final !== "granted") return null;

  const Constants = getExpoConstants();
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;

  try {
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return token.data;
  } catch {
    return null;
  }
}
