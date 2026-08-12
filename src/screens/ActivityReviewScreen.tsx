import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { supabase } from "../integrations/supabase/client";
import { useAppTheme } from "../contexts/ThemeContext";
import type { ActivityRow, ProfileMini } from "../lib/activityTypes";
import type { MainAppStackParamList } from "../navigation/types";
import { SubmissionReviewDialog } from "../components/submissions/SubmissionReviewDialog";

export function ActivityReviewScreen() {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  const nav = useNavigation();
  const route = useRoute<RouteProp<MainAppStackParamList, "ActivityReview">>();
  const activityId = route.params?.activityId;
  const [activity, setActivity] = useState<(ActivityRow & { profile?: ProfileMini }) | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activityId) {
      setActivity(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.from("daily_activities").select("*").eq("id", activityId).maybeSingle();
      if (error) throw error;
      if (!data) {
        setActivity(null);
        return;
      }
      const row = data as ActivityRow;
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, full_name, username, avatar_url")
        .eq("user_id", row.user_id)
        .maybeSingle();
      setActivity({
        ...row,
        profile: (profile as ProfileMini | null) ?? {
          user_id: row.user_id,
          full_name: route.params?.fullName || "Member",
          username: "",
        },
      });
    } catch {
      setActivity(null);
    } finally {
      setLoading(false);
    }
  }, [activityId, route.params?.fullName]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={tokens.colors.primary} />
      </View>
    );
  }

  if (!activity) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>This night report could not be loaded.</Text>
      </View>
    );
  }

  return (
    <SubmissionReviewDialog
      visible
      asScreen
      activity={activity}
      onClose={() => nav.goBack()}
      onChanged={() => void load()}
    />
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    centered: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: tokens.colors.background },
    muted: { textAlign: "center", color: tokens.colors.mutedForeground },
  });
