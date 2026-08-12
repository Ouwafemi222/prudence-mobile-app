import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../integrations/supabase/client";
import { formatISODateInNigeria } from "../lib/nigeriaTime";
import { fetchAccessibleGroups, fetchApprovedGroupRoster, type OfficeGroup } from "../lib/groupMembers";
import { scopeToUserOffice } from "../lib/tenantScope";
import { useAppTheme } from "../contexts/ThemeContext";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import { KeyboardSafeView } from "../components/ui/KeyboardSafe";
import { FAST_LIST } from "../lib/listPerf";
import { useMainAppNavigation } from "../hooks/useMainAppNavigation";

type Group = OfficeGroup;

type ActivityRow = Record<string, unknown>;

function formatSubmittedAt(iso: string | null | undefined): string {
  if (!iso || typeof iso !== "string") return "Time not recorded";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return String(iso);
  }
}

export function GroupTodosReportsScreen() {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => getStyles(tokens), [tokens]);
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const nav = useMainAppNavigation();
  const { user, profile, isAdmin, isTrainer, isPro, isSuperAdmin, isOfficeAdmin, officeId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState("");
  const [dateStr, setDateStr] = useState(formatISODateInNigeria());
  const [rows, setRows] = useState<
    {
      user_id: string;
      name: string;
      username?: string;
      todo: boolean;
      activity: boolean;
      verified?: boolean;
      rejected?: boolean;
      plan?: string;
      /** ISO timestamp for morning plan (updated_at, else created_at from daily_todos) */
      todoSubmittedAt: string | null;
      activityRecord: ActivityRow | null;
    }[]
  >([]);
  const [planModal, setPlanModal] = useState<{ title: string; body: string; submittedLabel: string } | null>(null);

  const allowed = isAdmin || isTrainer || isPro || isOfficeAdmin;

  const modalCardMaxW = Math.min(winW - 32, 440);

  const showAllGroups = isAdmin || isTrainer || isOfficeAdmin;
  const isProOnly = Boolean(isPro && !isAdmin && !isTrainer && !isOfficeAdmin);

  const loadGroups = useCallback(async () => {
    if (!user || !allowed) return;
    setLoading(true);
    try {
      const g = await fetchAccessibleGroups({
        officeId,
        isSuperAdmin,
        isProOnly,
        assignedGroupId: profile?.assigned_group_id,
      });
      setGroups(g);
      setGroupId((prev) => {
        if (prev === "all" && showAllGroups) return "all";
        if (prev && g.some((x) => x.id === prev)) return prev;
        if (showAllGroups) return "all";
        return g[0]?.id || "";
      });
    } catch (e) {
      console.error(e);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, allowed, officeId, isSuperAdmin, isProOnly, profile?.assigned_group_id, showAllGroups]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const fetchDay = useCallback(async () => {
    if (!groupId || !dateStr) return;
    setLoading(true);
    try {
      const roster = await fetchApprovedGroupRoster({
        officeId,
        isSuperAdmin,
        groupId,
        groups,
      });
      const memberIds = roster.map((m) => m.user_id);
      if (memberIds.length === 0) {
        setRows([]);
        return;
      }

      const [{ data: todos }, { data: acts }] = await Promise.all([
        scopeToUserOffice(
          supabase
            .from("daily_todos")
            .select("user_id, plan, created_at, updated_at")
            .eq("todo_date", dateStr)
            .in("user_id", memberIds),
          officeId,
          isSuperAdmin,
        ),
        scopeToUserOffice(
          supabase.from("daily_activities").select("*").eq("activity_date", dateStr).in("user_id", memberIds),
          officeId,
          isSuperAdmin,
        ),
      ]);

      const todoMetaByUser = new Map<string, { plan: string; submittedAt: string | null }>();
      (todos || []).forEach((t: { user_id: string; plan?: string; updated_at?: string; created_at?: string }) => {
        todoMetaByUser.set(t.user_id, {
          plan: typeof t.plan === "string" ? t.plan : "",
          submittedAt: t.updated_at || t.created_at || null,
        });
      });
      const activityByUser = new Map<string, ActivityRow>();
      (acts || []).forEach((a: ActivityRow & { user_id?: string }) => {
        if (a?.user_id) activityByUser.set(String(a.user_id), a);
      });

      const list = roster
        .map((p) => {
          const todoMeta = todoMetaByUser.get(p.user_id);
          const actRow = activityByUser.get(p.user_id) ?? null;
          return {
            user_id: p.user_id,
            name: p.full_name || p.username,
            username: p.username,
            todo: Boolean(todoMeta),
            activity: Boolean(actRow),
            verified: actRow ? Boolean(actRow.is_verified) : undefined,
            rejected: Boolean(actRow && !actRow.is_verified && actRow.verified_at),
            plan: todoMeta?.plan,
            todoSubmittedAt: todoMeta?.submittedAt ?? null,
            activityRecord: actRow,
          };
        })
        .sort((a, b) => {
          const rank = (row: { activity: boolean; verified?: boolean; rejected?: boolean; todo: boolean }) => {
            if (row.activity && !row.verified) return 3;
            if (row.verified) return 2;
            if (row.todo) return 1;
            return 0;
          };
          const diff = rank(b) - rank(a);
          if (diff !== 0) return diff;
          return a.name.localeCompare(b.name);
        });
      setRows(list);
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [groupId, dateStr, officeId, isSuperAdmin, groups]);

  useEffect(() => {
    if (groupId) fetchDay();
  }, [groupId, dateStr, fetchDay]);

  const splitModalTitle = (full: string | undefined) => {
    if (!full) return { who: "", kind: "" };
    const i = full.indexOf(" — ");
    if (i === -1) return { who: full, kind: "" };
    return { who: full.slice(0, i), kind: full.slice(i + 3) };
  };

  if (!allowed) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Trainer, pro, office admin, or admin access required.</Text>
      </View>
    );
  }

  return (
    <KeyboardSafeView style={styles.root}>
      <Text style={styles.intro}>
        One card per member. Tap Morning plan to read it. Tap Night report to review, see images, and approve.
      </Text>
      <Card style={styles.filters}>
        <Text style={styles.label}>Group (approved trainees from database)</Text>
        <View style={styles.chips}>
          {showAllGroups ? (
            <Pressable onPress={() => setGroupId("all")} style={[styles.chip, groupId === "all" && styles.chipOn]}>
              <Text style={[styles.chipText, groupId === "all" && styles.chipTextOn]}>All groups</Text>
            </Pressable>
          ) : null}
          {groups.map((g) => (
            <Pressable key={g.id} onPress={() => setGroupId(g.id)} style={[styles.chip, groupId === g.id && styles.chipOn]}>
              <Text style={[styles.chipText, groupId === g.id && styles.chipTextOn]}>{g.name}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
        <Input value={dateStr} onChangeText={setDateStr} placeholder="2026-03-30" />
      </Card>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={tokens.colors.primary} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.user_id}
          contentContainerStyle={styles.list}
          {...FAST_LIST}
          ListEmptyComponent={<Text style={styles.muted}>No members for this group/date.</Text>}
          renderItem={({ item }) => {
            const rec = item.activityRecord;
            const activityId = rec && typeof rec.id === "string" ? rec.id : "";
            const nightLabel = !item.activity
              ? "Night Report —"
              : item.verified
                ? "Night Report verified"
                : item.rejected
                  ? "Night Report rejected"
                  : "Night Report pending";
            const nightVariant = !item.activity
              ? "outline"
              : item.verified
                ? "success"
                : item.rejected
                  ? "destructive"
                  : "warning";
            return (
              <Card style={styles.row}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.hint}>
                  @{item.username || "member"}
                  {item.todo || item.activity ? " · tap a badge to open" : " · nothing submitted yet"}
                </Text>
                <View style={styles.badges}>
                  <Pressable
                    onPress={() => {
                      if (!item.todo) return;
                      setPlanModal({
                        title: `${item.name} — morning plan`,
                        body: item.plan ?? "",
                        submittedLabel: formatSubmittedAt(item.todoSubmittedAt),
                      });
                    }}
                    disabled={!item.todo}
                    style={({ pressed }) => [
                      styles.badgeHit,
                      !item.todo && styles.badgeHitDisabled,
                      pressed && item.todo && styles.badgeHitPressed,
                    ]}
                  >
                    <Badge variant={item.todo ? "success" : "outline"}>
                      Morning Plan {item.todo ? "✓" : "—"}
                    </Badge>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      if (!activityId) return;
                      nav.navigate("ActivityReview", { activityId, fullName: item.name });
                    }}
                    disabled={!item.activity}
                    style={({ pressed }) => [
                      styles.badgeHit,
                      !item.activity && styles.badgeHitDisabled,
                      pressed && item.activity && styles.badgeHitPressed,
                    ]}
                  >
                    <Badge variant={nightVariant}>{nightLabel}</Badge>
                  </Pressable>
                </View>
              </Card>
            );
          }}
        />
      )}
      <Modal visible={!!planModal} animationType="fade" transparent onRequestClose={() => setPlanModal(null)}>
        <View style={[styles.modalBackdrop, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setPlanModal(null)} accessibilityLabel="Dismiss" />
          <Pressable
            style={[styles.modalCard, { maxWidth: modalCardMaxW, width: "100%", alignSelf: "center" }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalEyebrow}>{splitModalTitle(planModal?.title).kind || "Morning plan"}</Text>
                <Text style={styles.modalTitle}>{splitModalTitle(planModal?.title).who}</Text>
                <View style={styles.modalMetaChip}>
                  <Text style={styles.modalMetaChipText}>Submitted · {planModal?.submittedLabel}</Text>
                </View>
              </View>
              <Pressable
                onPress={() => setPlanModal(null)}
                style={styles.modalIconBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Text style={styles.modalIconBtnText}>✕</Text>
              </Pressable>
            </View>
            <ScrollView
              style={{ maxHeight: winH * 0.55 }}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              <Text style={styles.modalSectionLabel}>Plan</Text>
              <Text style={styles.modalBody}>{planModal?.body || "(Empty plan)"}</Text>
            </ScrollView>
            <Pressable style={styles.modalPrimaryBtn} onPress={() => setPlanModal(null)}>
              <Text style={styles.modalPrimaryBtnText}>Done</Text>
            </Pressable>
          </Pressable>
        </View>
      </Modal>
    </KeyboardSafeView>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: tokens.colors.background },
    centered: { flex: 1, justifyContent: "center", padding: 24 },
    intro: { padding: 18, paddingBottom: 0, fontSize: 14, color: tokens.colors.mutedForeground },
    filters: { margin: 18, marginBottom: 8, gap: 10 },
    label: { fontWeight: "800", fontSize: 13, color: tokens.colors.foreground },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: tokens.colors.border },
    chipOn: { backgroundColor: tokens.colors.primary, borderColor: tokens.colors.primary },
    chipText: { fontWeight: "700", color: tokens.colors.mutedForeground },
    chipTextOn: { color: tokens.colors.primaryForeground },
    list: { padding: 18, paddingBottom: 32, gap: 10 },
    sectionTitle: {
      marginTop: 8,
      marginBottom: 2,
      fontSize: 13,
      fontWeight: "800",
      letterSpacing: 0.3,
      textTransform: "uppercase",
      color: tokens.colors.mutedForeground,
    },
    row: { padding: 14, gap: 6, borderWidth: 1, borderColor: tokens.colors.border },
    badgeHit: { borderRadius: 999 },
    badgeHitDisabled: { opacity: 0.45 },
    badgeHitPressed: { opacity: 0.85 },
    name: { fontWeight: "800", fontSize: 16, color: tokens.colors.foreground },
    hint: { fontSize: 11, color: tokens.colors.mutedForeground, minHeight: 14 },
    badges: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    muted: { textAlign: "center", color: tokens.colors.mutedForeground, marginTop: 24 },
    modalBackdrop: {
      flex: 1,
      backgroundColor: tokens.colors.overlay,
      justifyContent: "center",
      paddingHorizontal: 16,
    },
    modalCard: {
      borderRadius: tokens.radius.lg,
      padding: 20,
      backgroundColor: tokens.colors.card,
      borderWidth: 1,
      borderColor: tokens.colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 12,
    },
    modalHeaderRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      marginBottom: 14,
    },
    modalHeaderText: { flex: 1, minWidth: 0 },
    modalEyebrow: {
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.6,
      textTransform: "uppercase",
      color: tokens.colors.primary,
      marginBottom: 4,
    },
    modalTitle: { fontSize: 20, fontWeight: "800", color: tokens.colors.foreground, lineHeight: 26 },
    modalMetaChip: {
      alignSelf: "flex-start",
      marginTop: 10,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: tokens.colors.surface,
      borderWidth: 1,
      borderColor: tokens.colors.border,
    },
    modalMetaChipText: { fontSize: 12, fontWeight: "700", color: tokens.colors.mutedForeground },
    modalIconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: tokens.colors.surface,
      borderWidth: 1,
      borderColor: tokens.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    modalIconBtnText: { fontSize: 18, color: tokens.colors.foreground, fontWeight: "600" },
    modalScrollContent: { paddingBottom: 8 },
    modalSectionLabel: {
      fontSize: 12,
      fontWeight: "800",
      color: tokens.colors.mutedForeground,
      marginBottom: 8,
      letterSpacing: 0.4,
    },
    modalSectionDivider: {
      height: 1,
      backgroundColor: tokens.colors.border,
      marginVertical: 18,
    },
    modalHint: {
      fontSize: 12,
      color: tokens.colors.mutedForeground,
      marginBottom: 12,
      lineHeight: 18,
    },
    modalBody: { fontSize: 15, color: tokens.colors.foreground, lineHeight: 22 },
    proofGrid: { flexDirection: "row", flexWrap: "wrap" },
    modalPrimaryBtn: {
      marginTop: 16,
      paddingVertical: 14,
      borderRadius: tokens.radius.md,
      backgroundColor: tokens.colors.primary,
      alignItems: "center",
    },
    modalPrimaryBtnText: { color: tokens.colors.primaryForeground, fontWeight: "800", fontSize: 16 },
    lightboxRoot: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.92)",
      justifyContent: "space-between",
    },
    lightboxStage: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    lightboxImageFrame: {
      borderRadius: tokens.radius.md,
      overflow: "hidden",
      backgroundColor: "rgba(255,255,255,0.06)",
    },
    lightboxLoader: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2,
    },
    lightboxLoaderText: {
      color: "rgba(255,255,255,0.85)",
      fontSize: 14,
      fontWeight: "600",
      marginTop: 12,
    },
    lightboxFooter: { alignItems: "center", paddingHorizontal: 20, gap: 12 },
    lightboxFooterText: { color: "rgba(255,255,255,0.65)", fontSize: 13, textAlign: "center" },
    lightboxClosePill: {
      paddingVertical: 12,
      paddingHorizontal: 28,
      borderRadius: 999,
      backgroundColor: "rgba(255,255,255,0.14)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.22)",
    },
    lightboxClosePillText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  });
