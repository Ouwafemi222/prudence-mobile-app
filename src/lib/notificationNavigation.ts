import { navigationRef } from "../navigation/navigationRef";

type ReminderData = { type?: string };

/** Deep-link from notification tap into Work tab (morning plan / daily report). */
export function navigateFromSubmissionReminder(data: ReminderData | undefined): void {
  if (!data?.type || !navigationRef.isReady()) return;

  const nav = navigationRef.navigate as (
    name: string,
    params?: { screen: string; params?: Record<string, unknown> },
  ) => void;

  if (data.type === "morning_plan") {
    nav("App", {
      screen: "MainTabs",
      params: { screen: "Work", params: { openMorningPlan: true } },
    });
    return;
  }

  if (data.type === "daily_report") {
    nav("App", {
      screen: "MainTabs",
      params: { screen: "Work", params: { openDailyReport: true } },
    });
  }
}
