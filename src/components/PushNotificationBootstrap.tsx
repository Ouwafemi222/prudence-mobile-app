import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import {
  canLoadExpoNotifications,
  configureNotificationHandler,
  registerForExpoPushTokenAsync,
} from "../lib/pushNotifications";
import { upsertExpoPushTokenForCurrentUser } from "../lib/persistExpoPushToken";
import { scheduleYearProgressReminder } from "../lib/memoryReminders";

/** Registers for local/remote notification presentation and obtains an Expo push token when possible. */
export function PushNotificationBootstrap() {
  const { user } = useAuth();
  const sessionStarted = useRef(false);

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!canLoadExpoNotifications()) return;

    if (!user) {
      sessionStarted.current = false;
      return;
    }
    if (sessionStarted.current) return;
    sessionStarted.current = true;

    void (async () => {
      await configureNotificationHandler();
      const token = await registerForExpoPushTokenAsync();
      if (token) await upsertExpoPushTokenForCurrentUser(token);
      await scheduleYearProgressReminder();
    })();
  }, [user?.id]);

  return null;
}
