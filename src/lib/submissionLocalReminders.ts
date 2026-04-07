import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { canLoadExpoNotifications, configureNotificationHandler } from "./pushNotifications";

const PREFS_KEY = "pp.submissionReminders.v1";
const ID_MORNING = "pp-submission-morning-plan";
const ID_DAILY = "pp-submission-daily-report";
const CHANNEL = "submission-reminders";

export type MinutesBeforeOption = 15 | 30 | 60;

export type SubmissionReminderPrefs = {
  /** Master switch for scheduled local notifications */
  enabled: boolean;
  morningPlan: boolean;
  dailyReport: boolean;
  minutesBeforeDeadline: MinutesBeforeOption;
};

export const DEFAULT_SUBMISSION_REMINDER_PREFS: SubmissionReminderPrefs = {
  enabled: true,
  morningPlan: true,
  dailyReport: true,
  minutesBeforeDeadline: 15,
};

export async function loadSubmissionReminderPrefs(): Promise<SubmissionReminderPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_SUBMISSION_REMINDER_PREFS;
    const p = JSON.parse(raw) as Partial<SubmissionReminderPrefs>;
    return {
      ...DEFAULT_SUBMISSION_REMINDER_PREFS,
      ...p,
      minutesBeforeDeadline: [15, 30, 60].includes(p.minutesBeforeDeadline as number)
        ? (p.minutesBeforeDeadline as MinutesBeforeOption)
        : DEFAULT_SUBMISSION_REMINDER_PREFS.minutesBeforeDeadline,
    };
  } catch {
    return DEFAULT_SUBMISSION_REMINDER_PREFS;
  }
}

export async function saveSubmissionReminderPrefs(prefs: SubmissionReminderPrefs): Promise<void> {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

/** Morning plan deadline 9:00 AM WAT — trigger = deadline minus offset (phone local clock; set device to Lagos for WAT). */
function morningHourMinute(offsetMin: MinutesBeforeOption): { hour: number; minute: number } {
  const deadlineMin = 9 * 60;
  let t = deadlineMin - offsetMin;
  if (t < 0) t = 0;
  return { hour: Math.floor(t / 60), minute: t % 60 };
}

/** Daily report deadline 11:59 PM WAT */
function dailyHourMinute(offsetMin: MinutesBeforeOption): { hour: number; minute: number } {
  const deadlineMin = 23 * 60 + 59;
  let t = deadlineMin - offsetMin;
  if (t < 0) t = 0;
  return { hour: Math.floor(t / 60), minute: t % 60 };
}

async function ensureAndroidChannel(Notifications: typeof import("expo-notifications")) {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: "Submission reminders",
    description: "Morning plan and daily report deadlines",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 220, 160, 220],
    sound: "default",
  });
}

/**
 * Free on-device reminders: repeating daily at computed local times.
 * No paid push service required. Times use the phone’s timezone — users in Nigeria should use WAT (Lagos).
 */
export async function applySubmissionLocalReminders(prefs: SubmissionReminderPrefs): Promise<void> {
  if (!canLoadExpoNotifications()) return;

  await configureNotificationHandler();
  const Notifications = await import("expo-notifications");

  await Notifications.cancelScheduledNotificationAsync(ID_MORNING).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(ID_DAILY).catch(() => {});

  if (!prefs.enabled) return;

  const { status } = await Notifications.getPermissionsAsync();
  let final = status;
  if (status !== "granted") {
    const { status: next } = await Notifications.requestPermissionsAsync();
    final = next;
  }
  if (final !== "granted") return;

  await ensureAndroidChannel(Notifications);

  const offset = prefs.minutesBeforeDeadline;

  const dailyType = Notifications.SchedulableTriggerInputTypes.DAILY;

  if (prefs.morningPlan) {
    const { hour, minute } = morningHourMinute(offset);
    await Notifications.scheduleNotificationAsync({
      identifier: ID_MORNING,
      content: {
        title: "Morning plan",
        body: `About ${offset} minutes left to submit your morning plan (by 9:00 AM WAT).`,
        sound: "default",
        data: { type: "morning_plan" },
      },
      trigger: {
        type: dailyType,
        hour,
        minute,
        channelId: Platform.OS === "android" ? CHANNEL : undefined,
      },
    });
  }

  if (prefs.dailyReport) {
    const { hour, minute } = dailyHourMinute(offset);
    await Notifications.scheduleNotificationAsync({
      identifier: ID_DAILY,
      content: {
        title: "Daily report",
        body: `About ${offset} minutes left to submit your daily report (by 11:59 PM WAT).`,
        sound: "default",
        data: { type: "daily_report" },
      },
      trigger: {
        type: dailyType,
        hour,
        minute,
        channelId: Platform.OS === "android" ? CHANNEL : undefined,
      },
    });
  }
}

export async function syncSubmissionRemindersFromStorage(): Promise<void> {
  const prefs = await loadSubmissionReminderPrefs();
  await applySubmissionLocalReminders(prefs);
}
