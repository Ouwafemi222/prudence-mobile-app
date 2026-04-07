export type PushNotificationPrefs = {
  verificationAlerts: boolean;
  weeklySummary: boolean;
  teamUpdates: boolean;
};

export const DEFAULT_PUSH_PREFS: PushNotificationPrefs = {
  verificationAlerts: true,
  weeklySummary: true,
  teamUpdates: false,
};

export function parsePushPrefs(raw: unknown): PushNotificationPrefs {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_PUSH_PREFS };
  }
  const o = raw as Record<string, unknown>;
  return {
    verificationAlerts:
      typeof o.verificationAlerts === "boolean" ? o.verificationAlerts : DEFAULT_PUSH_PREFS.verificationAlerts,
    weeklySummary: typeof o.weeklySummary === "boolean" ? o.weeklySummary : DEFAULT_PUSH_PREFS.weeklySummary,
    teamUpdates: typeof o.teamUpdates === "boolean" ? o.teamUpdates : DEFAULT_PUSH_PREFS.teamUpdates,
  };
}

export function prefsToJsonb(p: PushNotificationPrefs): PushNotificationPrefs {
  return {
    verificationAlerts: p.verificationAlerts,
    weeklySummary: p.weeklySummary,
    teamUpdates: p.teamUpdates,
  };
}
