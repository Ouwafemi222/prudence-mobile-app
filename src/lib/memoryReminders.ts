import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { canLoadExpoNotifications, configureNotificationHandler } from "./pushNotifications";
import { notifyUser } from "./notifyUser";
import type { HighlightDay } from "./yearHighlights";

const WEEKLY_ID = "pp-year-progress-sunday";
const CHANNEL = "goal-memories";
const NOTIFIED_PREFIX = "pp.memory.notified";

export async function scheduleYearProgressReminder(): Promise<void> {
  if (!canLoadExpoNotifications()) return;
  await configureNotificationHandler();
  const Notifications = await import("expo-notifications");
  await Notifications.cancelScheduledNotificationAsync(WEEKLY_ID).catch(() => {});

  const { status } = await Notifications.getPermissionsAsync();
  let final = status;
  if (status !== "granted") {
    const { status: next } = await Notifications.requestPermissionsAsync();
    final = next;
  }
  if (final !== "granted") return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: "Goal memories",
      description: "Year progress and standout days",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Notifications.scheduleNotificationAsync({
    identifier: WEEKLY_ID,
    content: {
      title: "Your year is still being written",
      body: "Open Monthly Goals — pages, Fiverr, outside income, and the days you went huge are waiting.",
      sound: "default",
      data: { type: "year_progress", link: "/monthly-goals" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1,
      hour: 18,
      minute: 0,
      channelId: Platform.OS === "android" ? CHANNEL : undefined,
    },
  });
}

export async function maybeNotifyHighlight(options: {
  userId: string;
  todayISO: string;
  highlight: HighlightDay;
}): Promise<void> {
  const key = `${NOTIFIED_PREFIX}.${options.userId}.${options.highlight.activity_date}.${options.todayISO}`;
  const already = await AsyncStorage.getItem(key);
  if (already) return;

  await notifyUser({
    user_id: options.userId,
    title: options.highlight.heading,
    message: options.highlight.message,
    type: "summary",
    link: "/monthly-goals",
  });

  if (canLoadExpoNotifications()) {
    try {
      const Notifications = await import("expo-notifications");
      await Notifications.scheduleNotificationAsync({
        content: {
          title: options.highlight.heading,
          body: options.highlight.message,
          sound: "default",
          data: { type: "memory", link: "/monthly-goals" },
        },
        trigger: null,
      });
    } catch {
      // local banner is optional
    }
  }

  await AsyncStorage.setItem(key, "1");
}
