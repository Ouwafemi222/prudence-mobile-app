import { Platform } from "react-native";
import { supabase } from "../integrations/supabase/client";

/** Saves the Expo push token to Supabase so Edge/cron jobs can send notifications. */
export async function upsertExpoPushTokenForCurrentUser(expoPushToken: string): Promise<void> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return;

  const platform = Platform.OS === "ios" ? "ios" : "android";

  const { error } = await supabase.from("expo_push_tokens").upsert(
    {
      user_id: user.id,
      expo_push_token: expoPushToken,
      platform,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (__DEV__ && error) {
    console.warn("[expo_push_tokens] upsert failed:", error.message);
  }
}
