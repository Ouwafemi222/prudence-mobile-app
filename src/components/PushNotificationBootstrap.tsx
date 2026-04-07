import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import {
  canLoadExpoNotifications,
  configureNotificationHandler,
  registerForExpoPushTokenAsync,
} from "../lib/pushNotifications";
import { upsertExpoPushTokenForCurrentUser } from "../lib/persistExpoPushToken";

/** Registers for local/remote notification presentation and obtains an Expo push token when possible. */
export function PushNotificationBootstrap() {
  const { user, profile } = useAuth();
  const sessionStarted = useRef(false);

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!canLoadExpoNotifications()) return;

    const approved = Boolean(user && profile?.approval_status === "approved");
    if (!approved) {
      sessionStarted.current = false;
      return;
    }
    if (sessionStarted.current) return;
    sessionStarted.current = true;

    void (async () => {
      await configureNotificationHandler();
      const token = await registerForExpoPushTokenAsync();
      if (token) await upsertExpoPushTokenForCurrentUser(token);
    })();
  }, [user?.id, profile?.approval_status]);

  return null;
}
