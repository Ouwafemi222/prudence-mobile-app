import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../integrations/supabase/client";
import { useAppTheme } from "../contexts/ThemeContext";
import { addDaysISODate, getNigeriaWeekStartISO, getSundayWeekNumber, listRecentWeekStarts } from "../lib/nigeriaTime";
import { fetchAccessibleGroups, fetchApprovedGroupRoster, type OfficeGroup } from "../lib/groupMembers";
import { fetchMemberWeekReview, type MemberWeekData } from "../lib/memberReview";
import { PeriodPicker } from "../components/reports/PeriodPicker";
import { MemberWeekReview } from "../components/reports/MemberWeekReview";
import { SubmissionReviewDialog } from "../components/submissions/SubmissionReviewDialog";
import type { ActivityRow } from "../lib/activityTypes";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { useMainAppNavigation } from "../hooks/useMainAppNavigation";

type Group = OfficeGroup;
type Member = { user_id: string; full_name: string; username: string; assigned_group_id: string | null };
type Weekly = {
  user_id: string;
  consistency_score: number | null;
  total_pages_read: number | null;
  total_gigs_created?: number | null;
  submission_count?: number | null;
};

export function TrainerGroupWeeklyScreen() {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  const nav = useMainAppNavigation();
  const { user, profile, officeId, isSuperAdmin, isTrainer, isAdmin, isOfficeAdmin, isPro } = useAuth();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState("all");
  const [weekStart, setWeekStart] = useState(getNigeriaWeekStartISO);
  const [members, setMembers] = useState<Member[]>([]);
  const [weeklyByUser, setWeeklyByUser] = useState<Record<string, Weekly>>({});
  const [selected, setSelected] = useState<Member | null>(null);
  const [weekDetail, setWeekDetail] = useState<MemberWeekData>({ todosByDate: {}, activitiesByDate: {}, weeklyTotals: null });
  const [detailLoading, setDetailLoading] = useState(false);
  const [review, setReview] = useState<ActivityRow | null>(null);
  const weekEnd = addDaysISODate(weekStart, 6);
  const weekOptions = useMemo(
    () => listRecentWeekStarts(16).map((value) => ({ value, label: `W${getSundayWeekNumber(value)} · ${value}` })),
    [],
  );

  const allowed = isSuperAdmin || isTrainer || isAdmin || isOfficeAdmin;
  const isProOnly = Boolean(isPro && !isAdmin && !isTrainer && !isOfficeAdmin);

  const load = useCallback(async () => {
    if (!user || !allowed) return;
    setLoading(true);
    try {
      const list = await fetchAccessibleGroups({
        officeId,
        isSuperAdmin,
        isProOnly,
        assignedGroupId: profile?.assigned_group_id,
      });
      setGroups(list);

      const people = await fetchApprovedGroupRoster({
        officeId,
        isSuperAdmin,
        groupId,
        groups: list,
      });
      setMembers(people);

      const userIds = people.map((m) => m.user_id);
      if (userIds.length === 0) {
        setWeeklyByUser({});
        return;
      }
      const { data: weekly } = await supabase
        .from("weekly_reports")
        .select("user_id, consistency_score, total_pages_read, total_gigs_created, submission_count")
        .eq("week_start_date", weekStart)
        .in("user_id", userIds);
      const map: Record<string, Weekly> = {};
      (weekly || []).forEach((row: Weekly) => {
        map[row.user_id] = row;
      });
      setWeeklyByUser(map);
    } finally {
      setLoading(false);
    }
  }, [user?.id, allowed, isSuperAdmin, officeId, groupId, weekStart, isProOnly, profile?.assigned_group_id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openMemberWeek = async (member: Member) => {
    setSelected(member);
    setDetailLoading(true);
    setWeekDetail({ todosByDate: {}, activitiesByDate: {}, weeklyTotals: null });
    try {
      setWeekDetail(await fetchMemberWeekReview(member.user_id, weekStart));
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  if (!allowed) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Trainer group weekly is for trainers and admins.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <PeriodPicker options={weekOptions} value={weekStart} onChange={setWeekStart} />
        <View style={styles.row}>
          <Button title="All groups" size="sm" variant={groupId === "all" ? "primary" : "outline"} onPress={() => setGroupId("all")} />
          {groups.map((g) => (
            <Button key={g.id} title={g.name} size="sm" variant={groupId === g.id ? "primary" : "outline"} onPress={() => setGroupId(g.id)} />
          ))}
        </View>
      </View>
      {loading ? (
        <ActivityIndicator color={tokens.colors.primary} />
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.user_id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.muted}>No approved trainees in this group week.</Text>}
          renderItem={({ item }) => {
            const week = weeklyByUser[item.user_id];
            return (
              <Pressable onPress={() => void openMemberWeek(item)}>
                <Card style={styles.card}>
                  <Text style={styles.name}>{item.full_name}</Text>
                  <Text style={styles.meta}>@{item.username}</Text>
                  <Text style={styles.meta}>
                    {Number(week?.consistency_score || 0).toFixed(1)}% consistency · {week?.total_pages_read ?? 0} pages ·{" "}
                    {week?.total_gigs_created ?? 0} gigs
                  </Text>
                </Card>
              </Pressable>
            );
          }}
        />
      )}

      <Modal visible={Boolean(selected)} animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modal}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Button title="Close" variant="ghost" onPress={() => setSelected(null)} />
            <Text style={styles.name}>{selected?.full_name} — weekly review</Text>
            <Text style={styles.meta}>
              @{selected?.username} · Sun–Sat {weekStart} to {weekEnd}
            </Text>
            {selected ? (
              <Button
                title="Open full member profile"
                variant="outline"
                onPress={() => {
                  const member = selected;
                  setSelected(null);
                  nav.navigate("TeamMemberDetail", { userId: member.user_id, fullName: member.full_name, weekStart });
                }}
              />
            ) : null}
            <MemberWeekReview
              weekStart={weekStart}
              loading={detailLoading}
              todosByDate={weekDetail.todosByDate}
              activitiesByDate={weekDetail.activitiesByDate}
              weeklyTotals={weekDetail.weeklyTotals}
              onOpenReport={setReview}
            />
          </ScrollView>
        </View>
      </Modal>
      <SubmissionReviewDialog
        visible={Boolean(review)}
        activity={
          review && selected
            ? { ...review, profile: { user_id: selected.user_id, full_name: selected.full_name, username: selected.username } }
            : review
        }
        onClose={() => setReview(null)}
        onChanged={() => {
          if (selected) void openMemberWeek(selected);
        }}
      />
    </View>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: tokens.colors.background },
    centered: { flex: 1, justifyContent: "center", padding: 24 },
    header: { padding: 16, gap: 10 },
    row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    list: { padding: 16, gap: 10, paddingBottom: 40 },
    card: { padding: 14, gap: 6 },
    name: { fontWeight: "800", color: tokens.colors.foreground, fontSize: 16 },
    meta: { color: tokens.colors.mutedForeground, fontSize: 13 },
    muted: { textAlign: "center", color: tokens.colors.mutedForeground, marginTop: 20 },
    modal: { flex: 1, backgroundColor: tokens.colors.background },
    modalContent: { padding: 18, gap: 12, paddingBottom: 40 },
  });
