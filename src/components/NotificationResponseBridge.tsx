import { useEffect } from "react";
import { canLoadExpoNotifications } from "../lib/pushNotifications";
import { navigateFromSubmissionReminder } from "../lib/notificationNavigation";

/** Handles tapping a local notification (open Work tab for morning plan / daily report). */
export function NotificationResponseBridge() {
  useEffect(() => {
    if (!canLoadExpoNotifications()) return;
    let remove: (() => void) | undefined;
    void import("expo-notifications").then((Notifications) => {
      const sub = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as { type?: string } | undefined;
        navigateFromSubmissionReminder(data);
      });
      remove = () => sub.remove();
    });
    return () => remove?.();
  }, []);
  return null;
}
