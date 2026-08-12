import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRoute, type RouteProp } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../integrations/supabase/client";
import { useAppTheme } from "../contexts/ThemeContext";
import { useMainAppNavigation } from "../hooks/useMainAppNavigation";
import { scopeToUserOffice } from "../lib/tenantScope";
import { getNigeriaWeekStartISO } from "../lib/nigeriaTime";
import { fetchAccessibleGroups, type OfficeGroup } from "../lib/groupMembers";
import { pickPrimaryRole } from "../lib/memberReview";
import type { MainAppStackParamList } from "../navigation/types";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { KeyboardSafeView } from "../components/ui/KeyboardSafe";
import { FAST_LIST } from "../lib/listPerf";

type MemberCard = {
  id: string;
  user_id: string;
  full_name: string;
  username: string;
  approval_status: "pending" | "approved" | "rejected";
  assigned_group_id: string | null;
  sponsor_username: string | null;
  role: string;
  group_name: string | null;
  submissionsThisWeek: number;
};

export function TeamMembersScreen() {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  const nav = useMainAppNavigation();
  const route = useRoute<RouteProp<MainAppStackParamList, "TeamMembers">>();
  const initialGroupId = route.params?.groupId ?? "all";
  const { user, profile, officeId, isSuperAdmin, isTrainer, isAdmin, isOfficeAdmin, isPro } = useAuth();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [groupId, setGroupId] = useState(initialGroupId);
  const [groups, setGroups] = useState<OfficeGroup[]>([]);
  const [members, setMembers] = useState<MemberCard[]>([]);

  const canView = isAdmin || isTrainer || isOfficeAdmin || isPro;
  const showAllGroups = isAdmin || isTrainer || isOfficeAdmin;
  const isProOnly = Boolean(isPro && !isAdmin && !isTrainer && !isOfficeAdmin);

  const load = useCallback(async () => {
    if (!user || !canView) return;
    setLoading(true);
    try {
      const officeGroups = await fetchAccessibleGroups({
        officeId,
        isSuperAdmin,
        isProOnly,
        assignedGroupId: profile?.assigned_group_id,
      });
      setGroups(officeGroups);
      const groupNameById = new Map(officeGroups.map((g) => [g.id, g.name]));

      let query = supabase
        .from("profiles")
        .select("id, user_id, full_name, username, approval_status, assigned_group_id, sponsor_username")
        .order("full_name");
      query = scopeToUserOffice(query, officeId, isSuperAdmin);
      if (groupId !== "all") query = query.eq("assigned_group_id", groupId);
      const { data: profiles, error } = await query;
      if (error) throw error;
      const rows = (profiles || []) as Omit<MemberCard, "role" | "group_name" | "submissionsThisWeek">[];
      const userIds = rows.map((r) => r.user_id);
      const weekStart = getNigeriaWeekStartISO();

      const [{ data: roles }, { data: acts }] = await Promise.all([
        userIds.length ? supabase.from("user_roles").select("user_id, role").in("user_id", userIds) : Promise.resolve({ data: [] }),
        userIds.length
          ? supabase.from("daily_activities").select("user_id").in("user_id", userIds).gte("activity_date", weekStart)
          : Promise.resolve({ data: [] }),
      ]);

      const rolesByUser = new Map<string, { role: string }[]>();
      ((roles || []) as { user_id: string; role: string }[]).forEach((r) => {
        const list = rolesByUser.get(r.user_id) || [];
        list.push({ role: r.role });
        rolesByUser.set(r.user_id, list);
      });
      const counts = new Map<string, number>();
      ((acts || []) as { user_id: string }[]).forEach((a) => {
        counts.set(a.user_id, (counts.get(a.user_id) || 0) + 1);
      });

      setMembers(
        rows.map((p) => ({
          ...p,
          role: pickPrimaryRole(rolesByUser.get(p.user_id)),
          group_name: p.assigned_group_id ? groupNameById.get(p.assigned_group_id) ?? null : null,
          submissionsThisWeek: counts.get(p.user_id) || 0,
        })),
      );
    } catch (e) {
      console.error(e);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, canView, officeId, isSuperAdmin, isProOnly, profile?.assigned_group_id, groupId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.full_name.toLowerCase().includes(q) ||
        m.username.toLowerCase().includes(q) ||
        (m.group_name || "").toLowerCase().includes(q),
    );
  }, [members, search]);

  if (!canView) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Team members are for trainers, pros, and admins.</Text>
      </View>
    );
  }

  return (
    <KeyboardSafeView style={styles.root}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        {...FAST_LIST}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.lead}>
              {route.params?.groupName ? `${route.params.groupName} · ` : ""}
              {filtered.length} member{filtered.length === 1 ? "" : "s"} from the database
            </Text>
            <Input value={search} onChangeText={setSearch} placeholder="Search name or username" />
            <View style={styles.chips}>
              {showAllGroups ? (
                <Button title="All groups" size="sm" variant={groupId === "all" ? "primary" : "outline"} onPress={() => setGroupId("all")} />
              ) : null}
              {groups.map((g) => (
                <Button
                  key={g.id}
                  title={g.name}
                  size="sm"
                  variant={groupId === g.id ? "primary" : "outline"}
                  onPress={() => setGroupId(g.id)}
                />
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={loading ? <ActivityIndicator color={tokens.colors.primary} /> : <Text style={styles.muted}>No team members found.</Text>}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              nav.navigate("TeamMemberDetail", {
                userId: item.user_id,
                fullName: item.full_name,
              })
            }
          >
            <Card style={styles.card}>
              <Text style={styles.name}>{item.full_name}</Text>
              <Text style={styles.meta}>
                @{item.username} · {item.role.replace("_", " ")}
                {item.group_name ? ` · ${item.group_name}` : ""}
              </Text>
              <Text style={styles.meta}>
                Sponsor: {item.sponsor_username ? `@${item.sponsor_username}` : "—"} · {item.submissionsThisWeek}/7 this week
              </Text>
              <Badge
                variant={
                  item.approval_status === "approved" ? "success" : item.approval_status === "rejected" ? "destructive" : "warning"
                }
              >
                {item.approval_status}
              </Badge>
            </Card>
          </Pressable>
        )}
      />
    </KeyboardSafeView>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: tokens.colors.background },
    centered: { flex: 1, justifyContent: "center", padding: 24 },
    list: { padding: 16, gap: 10, paddingBottom: 40 },
    header: { gap: 10, marginBottom: 4 },
    lead: { color: tokens.colors.mutedForeground, fontSize: 13 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    card: { padding: 14, gap: 6 },
    name: { fontWeight: "800", fontSize: 16, color: tokens.colors.foreground },
    meta: { color: tokens.colors.mutedForeground, fontSize: 13 },
    muted: { textAlign: "center", color: tokens.colors.mutedForeground, marginTop: 20 },
  });
