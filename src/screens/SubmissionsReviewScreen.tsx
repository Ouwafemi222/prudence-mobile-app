import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../integrations/supabase/client";
import { useAppTheme } from "../contexts/ThemeContext";
import { scopeToUserOffice } from "../lib/tenantScope";
import { formatISODateInNigeria, addDaysISODate } from "../lib/nigeriaTime";
import type { ActivityRow, ProfileMini } from "../lib/activityTypes";
import { fetchAccessibleGroups, fetchApprovedGroupRoster, type OfficeGroup } from "../lib/groupMembers";
import { SubmissionReviewDialog } from "../components/submissions/SubmissionReviewDialog";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { KeyboardSafeView } from "../components/ui/KeyboardSafe";
import { FAST_LIST } from "../lib/listPerf";

type Row = ActivityRow & { profile?: ProfileMini; submitterIsSuperAdmin?: boolean; groupName?: string | null };

function canAccess(role: string | undefined) {
  return role === "super_admin" || role === "trainer" || role === "pro" || role === "sponsor" || role === "office_admin";
}

export function SubmissionsReviewScreen() {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  const { user, userRole, profile, officeId, isSuperAdmin, isTrainer, isOfficeAdmin, isPro } = useAuth();
  const today = formatISODateInNigeria();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Row[]>([]);
  const [groups, setGroups] = useState<OfficeGroup[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [status, setStatus] = useState<"pending" | "all" | "approved" | "rejected">("pending");
  const [dateFilter, setDateFilter] = useState<"today" | "yesterday" | "any">("today");
  const [search, setSearch] = useState("");
  const [groupId, setGroupId] = useState("");

  const showAllGroups = isSuperAdmin || isTrainer || isOfficeAdmin || userRole?.role === "sponsor";
  const isProOnly = Boolean(isPro && !isSuperAdmin && !isTrainer && !isOfficeAdmin);

  const loadGroups = useCallback(async () => {
    if (!user || !canAccess(userRole?.role)) return;
    try {
      const rows = await fetchAccessibleGroups({
        officeId,
        isSuperAdmin,
        isProOnly,
        assignedGroupId: profile?.assigned_group_id,
      });
      setGroups(rows);
      setGroupId((prev) => {
        if (prev === "all" && showAllGroups) return "all";
        if (prev && rows.some((g) => g.id === prev)) return prev;
        if (showAllGroups) return "all";
        return rows[0]?.id || "";
      });
    } catch {
      setGroups([]);
    }
  }, [user?.id, userRole?.role, officeId, isSuperAdmin, isProOnly, profile?.assigned_group_id, showAllGroups]);

  const load = useCallback(async () => {
    if (!user || !canAccess(userRole?.role) || !groupId) return;
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
        setActivities([]);
        return;
      }

      let query = supabase
        .from("daily_activities")
        .select("*")
        .in("user_id", memberIds)
        .order("submitted_at", { ascending: false })
        .limit(300);
      query = scopeToUserOffice(query, officeId, isSuperAdmin);
      if (dateFilter === "today") query = query.eq("activity_date", today);
      if (dateFilter === "yesterday") query = query.eq("activity_date", addDaysISODate(today, -1));
      const { data, error } = await query;
      if (error) throw error;

      const rows = (data || []) as ActivityRow[];
      const userIds = [...new Set(rows.map((r) => r.user_id))];
      const profileById = new Map(roster.map((p) => [p.user_id, p]));
      const groupNameById = new Map(groups.map((g) => [g.id, g.name]));

      const { data: roles } = userIds.length
        ? await supabase.from("user_roles").select("user_id, role").in("user_id", userIds)
        : { data: [] };
      const superIds = new Set(
        ((roles || []) as { user_id: string; role: string }[]).filter((r) => r.role === "super_admin").map((r) => r.user_id),
      );

      setActivities(
        rows.map((r) => {
          const p = profileById.get(r.user_id);
          return {
            ...r,
            profile: p,
            groupName: p?.assigned_group_id ? groupNameById.get(p.assigned_group_id) ?? null : null,
            submitterIsSuperAdmin: superIds.has(r.user_id),
          };
        }),
      );
    } catch {
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, userRole?.role, officeId, isSuperAdmin, dateFilter, today, groupId, groups]);

  useFocusEffect(
    useCallback(() => {
      void loadGroups();
    }, [loadGroups]),
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      if (status === "pending" && (a.is_verified || a.verified_at)) return false;
      if (status === "approved" && !a.is_verified) return false;
      if (status === "rejected" && !(!a.is_verified && a.verified_at)) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        (a.profile?.full_name || "").toLowerCase().includes(q) ||
        (a.profile?.username || "").toLowerCase().includes(q) ||
        (a.groupName || "").toLowerCase().includes(q) ||
        a.activity_date.includes(q)
      );
    });
  }, [activities, status, search]);

  if (!canAccess(userRole?.role)) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Submissions review is for trainers, pros, sponsors, and admins.</Text>
      </View>
    );
  }

  return (
    <KeyboardSafeView style={styles.root}>
      <View style={styles.filters}>
        <Input value={search} onChangeText={setSearch} placeholder="Search name, group, or date" />
        <Text style={styles.filterLabel}>Group (approved trainees from database)</Text>
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
        <View style={styles.row}>
          {(["pending", "approved", "rejected", "all"] as const).map((key) => (
            <Button key={key} title={key} size="sm" variant={status === key ? "primary" : "outline"} onPress={() => setStatus(key)} />
          ))}
        </View>
        <View style={styles.row}>
          {(["any", "today", "yesterday"] as const).map((key) => (
            <Button key={key} title={key} size="sm" variant={dateFilter === key ? "primary" : "outline"} onPress={() => setDateFilter(key)} />
          ))}
        </View>
      </View>
      {loading ? (
        <ActivityIndicator color={tokens.colors.primary} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          {...FAST_LIST}
          ListEmptyComponent={<Text style={styles.muted}>No submissions from approved trainees in this group.</Text>}
          renderItem={({ item }) => (
            <Pressable onPress={() => setSelected(item)}>
              <Card style={styles.card}>
                <Text style={styles.title}>{item.profile?.full_name || item.profile?.username || item.user_id}</Text>
                <Text style={styles.meta}>
                  {item.activity_date} · pages {item.pages_read ?? 0} · ${Number(item.net_income ?? 0).toFixed(0)}
                  {item.groupName ? ` · ${item.groupName}` : ""}
                </Text>
                <Badge variant={item.is_verified ? "success" : item.verified_at ? "destructive" : "warning"}>
                  {item.is_verified ? "approved" : item.verified_at ? "rejected" : "pending"}
                </Badge>
              </Card>
            </Pressable>
          )}
        />
      )}
      <SubmissionReviewDialog visible={Boolean(selected)} activity={selected} onClose={() => setSelected(null)} onChanged={() => void load()} />
    </KeyboardSafeView>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: tokens.colors.background },
    centered: { flex: 1, justifyContent: "center", padding: 24 },
    filters: { padding: 16, gap: 8 },
    filterLabel: { color: tokens.colors.mutedForeground, fontSize: 12, fontWeight: "700" },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      borderWidth: 1,
      borderColor: tokens.colors.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: tokens.colors.card,
    },
    chipOn: { backgroundColor: tokens.colors.primary, borderColor: tokens.colors.primary },
    chipText: { color: tokens.colors.foreground, fontSize: 13, fontWeight: "600" },
    chipTextOn: { color: tokens.colors.primaryForeground },
    row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    list: { padding: 16, gap: 10, paddingBottom: 40 },
    card: { padding: 14, gap: 6 },
    title: { fontWeight: "800", color: tokens.colors.foreground },
    meta: { color: tokens.colors.mutedForeground, fontSize: 13 },
    muted: { textAlign: "center", color: tokens.colors.mutedForeground, marginTop: 20 },
  });
