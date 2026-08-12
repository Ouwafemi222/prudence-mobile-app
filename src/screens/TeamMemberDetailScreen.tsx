import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRoute, type RouteProp } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { useAppTheme } from "../contexts/ThemeContext";
import { addDaysISODate, getNigeriaWeekStartISO, getSundayWeekNumber, listRecentWeekStarts } from "../lib/nigeriaTime";
import { fetchMemberWeekReview, fetchTeamMemberDetail, type MemberWeekData, type TeamMemberDetail } from "../lib/memberReview";
import type { ActivityRow } from "../lib/activityTypes";
import type { MainAppStackParamList } from "../navigation/types";
import { PeriodPicker } from "../components/reports/PeriodPicker";
import { MemberWeekReview } from "../components/reports/MemberWeekReview";
import { SubmissionReviewDialog } from "../components/submissions/SubmissionReviewDialog";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { useMainAppNavigation } from "../hooks/useMainAppNavigation";

export function TeamMemberDetailScreen() {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  const nav = useMainAppNavigation();
  const route = useRoute<RouteProp<MainAppStackParamList, "TeamMemberDetail">>();
  const { userId, weekStart: initialWeek } = route.params ?? { userId: "" };
  const { isAdmin, isTrainer, isOfficeAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [weekLoading, setWeekLoading] = useState(true);
  const [member, setMember] = useState<TeamMemberDetail | null>(null);
  const [weekStart, setWeekStart] = useState(initialWeek || getNigeriaWeekStartISO());
  const [week, setWeek] = useState<MemberWeekData>({ todosByDate: {}, activitiesByDate: {}, weeklyTotals: null });
  const [review, setReview] = useState<ActivityRow | null>(null);
  const canManage = isAdmin || isTrainer || isOfficeAdmin;
  const weekEnd = addDaysISODate(weekStart, 6);
  const weekOptions = useMemo(
    () => listRecentWeekStarts(16).map((value) => ({ value, label: `W${getSundayWeekNumber(value)} · ${value}` })),
    [],
  );

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      setMember(await fetchTeamMemberDetail(userId));
    } catch (e) {
      console.error(e);
      setMember(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadWeek = useCallback(async () => {
    setWeekLoading(true);
    try {
      setWeek(await fetchMemberWeekReview(userId, weekStart));
    } catch (e) {
      console.error(e);
      setWeek({ todosByDate: {}, activitiesByDate: {}, weeklyTotals: null });
    } finally {
      setWeekLoading(false);
    }
  }, [userId, weekStart]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
      void loadWeek();
    }, [loadProfile, loadWeek]),
  );

  if (loading && !member) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={tokens.colors.primary} />
      </View>
    );
  }

  if (!member) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Could not load this member from the database.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.name}>{member.full_name}</Text>
          <Text style={styles.meta}>@{member.username}</Text>
          {member.email ? <Text style={styles.meta}>{member.email}</Text> : null}
          <View style={styles.row}>
            <Badge variant="outline">{member.role.replace("_", " ")}</Badge>
            <Badge
              variant={
                member.approval_status === "approved" ? "success" : member.approval_status === "rejected" ? "destructive" : "warning"
              }
            >
              {member.approval_status}
            </Badge>
          </View>
          <Text style={styles.line}>Group: {member.group_name || "Unassigned"}</Text>
          <Text style={styles.line}>Trainer: {member.trainer_name || "—"}</Text>
          <Text style={styles.line}>Sponsor: {member.sponsor_username ? `@${member.sponsor_username}` : "—"}</Text>
          <Text style={styles.line}>Submissions this week: {member.submissionsThisWeek}/7</Text>
          {canManage ? (
            <Button title="Manage member" variant="outline" onPress={() => nav.navigate("Teams", { focusUserId: member.user_id })} />
          ) : null}
        </Card>

        <Text style={styles.section}>Daily reports · Sun {weekStart} – Sat {weekEnd}</Text>
        <PeriodPicker options={weekOptions} value={weekStart} onChange={setWeekStart} />
        <MemberWeekReview
          weekStart={weekStart}
          loading={weekLoading}
          todosByDate={week.todosByDate}
          activitiesByDate={week.activitiesByDate}
          weeklyTotals={week.weeklyTotals}
          onOpenReport={setReview}
        />
      </ScrollView>
      <SubmissionReviewDialog
        visible={Boolean(review)}
        activity={review ? { ...review, profile: { user_id: member.user_id, full_name: member.full_name, username: member.username, avatar_url: member.avatar_url } } : null}
        onClose={() => setReview(null)}
        onChanged={() => void loadWeek()}
      />
    </View>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: tokens.colors.background },
    centered: { flex: 1, justifyContent: "center", padding: 24 },
    content: { padding: 16, gap: 12, paddingBottom: 40 },
    card: { padding: 14, gap: 6 },
    name: { fontSize: 20, fontWeight: "800", color: tokens.colors.foreground },
    meta: { color: tokens.colors.mutedForeground, fontSize: 13 },
    line: { color: tokens.colors.foreground, fontSize: 14 },
    row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
    section: { fontWeight: "800", color: tokens.colors.foreground, marginTop: 8 },
    muted: { textAlign: "center", color: tokens.colors.mutedForeground },
  });
