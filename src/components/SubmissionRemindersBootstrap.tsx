import { useEffect } from "react";
import { AppState } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { syncSubmissionRemindersFromStorage } from "../lib/submissionLocalReminders";

/**
 * Re-applies saved local reminder schedules after login and when the app returns to the foreground
 * (e.g. user changed timezone or settings elsewhere).
 */
export function SubmissionRemindersBootstrap() {
  const { user, profile } = useAuth();
  const approved = Boolean(user && profile?.approval_status === "approved");

  useEffect(() => {
    if (!approved) return;
    void syncSubmissionRemindersFromStorage();
  }, [approved, user?.id]);

  useEffect(() => {
    if (!approved) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void syncSubmissionRemindersFromStorage();
    });
    return () => sub.remove();
  }, [approved]);

  return null;
}
