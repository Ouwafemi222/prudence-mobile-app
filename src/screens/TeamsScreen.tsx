import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRoute, type RouteProp } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { useMainAppNavigation } from "../hooks/useMainAppNavigation";
import { getNigeriaWeekStartISO } from "../lib/nigeriaTime";
import { pickPrimaryRole } from "../lib/memberReview";
import type { MainAppStackParamList } from "../navigation/types";
import { supabase } from "../integrations/supabase/client";
import { useAppTheme } from "../contexts/ThemeContext";
import { scopeToUserOffice } from "../lib/tenantScope";
import { invokeEdgeFunction } from "../lib/invokeEdgeFunction";
import { notifyUser, toastAfterAction } from "../lib/notifyUser";
import { notifyDirectSponsorOfMember, notifyRoleChanged, notifySponsorUplinesOfMember } from "../lib/teamNotifications";
import { copyOrShareText } from "../lib/copyText";
import { SITE_URL } from "../lib/siteConfig";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { KeyboardSafeScroll, KeyboardSafeView } from "../components/ui/KeyboardSafe";
import { FAST_LIST } from "../lib/listPerf";

type Member = {
  id: string;
  user_id: string;
  full_name: string;
  username: string;
  email: string | null;
  approval_status: "pending" | "approved" | "rejected";
  assigned_group_id: string | null;
  assigned_trainer_id: string | null;
  sponsor_username: string | null;
  office_id: string | null;
  role: string;
  group_name: string | null;
  trainer_name: string | null;
  submissionsThisWeek: number;
};

type Group = { id: string; name: string; trainer_ids?: string[] | null; member_count?: number; trainer_names?: string[] };

export function TeamsScreen() {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  const nav = useMainAppNavigation();
  const route = useRoute<RouteProp<MainAppStackParamList, "Teams">>();
  const { user, profile, office, officeId, isAdmin, isTrainer, isSuperAdmin, isOfficeAdmin, isSponsor } = useAuth();
  const canManage = isAdmin || isTrainer || isOfficeAdmin;
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selected, setSelected] = useState<Member | null>(null);
  const [role, setRole] = useState("member");
  const [groupId, setGroupId] = useState("");
  const [trainerId, setTrainerId] = useState("");
  const [sponsor, setSponsor] = useState("");
  const [saving, setSaving] = useState(false);
  const [newGroup, setNewGroup] = useState("");
  const [inviteSponsor, setInviteSponsor] = useState(profile?.username ?? "");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let profilesQuery = supabase
        .from("profiles")
        .select("id, user_id, full_name, username, email, approval_status, assigned_group_id, assigned_trainer_id, sponsor_username, office_id")
        .order("created_at", { ascending: false })
        .limit(300);
      profilesQuery = scopeToUserOffice(profilesQuery, officeId, isSuperAdmin);
      if (isSponsor && !canManage && profile?.user_id) {
        const { data: tree } = await supabase.rpc("get_sponsor_downlines", { p_sponsor_user_id: profile.user_id });
        const ids = (tree || []).map((r: { user_id: string }) => r.user_id);
        if (ids.length === 0) {
          setMembers([]);
          return;
        }
        profilesQuery = profilesQuery.in("user_id", ids);
      }
      const weekStart = getNigeriaWeekStartISO();
      const [{ data: profiles }, { data: groupRows }, { data: roles }] = await Promise.all([
        profilesQuery,
        scopeToUserOffice(supabase.from("groups").select("id, name, trainer_ids").order("name"), officeId, isSuperAdmin),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const roleLists = new Map<string, { role: string }[]>();
      (roles || []).forEach((r: { user_id: string; role: string }) => {
        const list = roleLists.get(r.user_id) || [];
        list.push({ role: r.role });
        roleLists.set(r.user_id, list);
      });
      const groupList = (groupRows || []) as Group[];
      const groupNameById = new Map(groupList.map((g) => [g.id, g.name]));
      const profileRows = (profiles || []) as Omit<Member, "role" | "group_name" | "trainer_name" | "submissionsThisWeek">[];
      const userIds = profileRows.map((p) => p.user_id);
      const trainerIds = [...new Set(profileRows.map((p) => p.assigned_trainer_id).filter(Boolean))] as string[];
      const groupTrainerIds = [...new Set(groupList.flatMap((g) => g.trainer_ids || []))];
      const nameLookupIds = [...new Set([...trainerIds, ...groupTrainerIds])];

      const [{ data: trainerProfiles }, { data: weekActs }] = await Promise.all([
        nameLookupIds.length
          ? supabase.from("profiles").select("user_id, full_name").in("user_id", nameLookupIds)
          : Promise.resolve({ data: [] }),
        userIds.length
          ? supabase.from("daily_activities").select("user_id").in("user_id", userIds).gte("activity_date", weekStart)
          : Promise.resolve({ data: [] }),
      ]);
      const nameById = new Map(
        ((trainerProfiles || []) as { user_id: string; full_name: string }[]).map((p) => [p.user_id, p.full_name]),
      );
      const weekCounts = new Map<string, number>();
      ((weekActs || []) as { user_id: string }[]).forEach((a) => {
        weekCounts.set(a.user_id, (weekCounts.get(a.user_id) || 0) + 1);
      });

      setGroups(
        groupList.map((g) => ({
          ...g,
          member_count: profileRows.filter((p) => p.assigned_group_id === g.id && p.approval_status === "approved").length,
          trainer_names: (g.trainer_ids || []).map((id) => nameById.get(id) || "Trainer").filter(Boolean),
        })),
      );
      const nextMembers = profileRows.map((p) => ({
        ...p,
        role: pickPrimaryRole(roleLists.get(p.user_id)),
        group_name: p.assigned_group_id ? groupNameById.get(p.assigned_group_id) ?? null : null,
        trainer_name: p.assigned_trainer_id ? nameById.get(p.assigned_trainer_id) ?? null : null,
        submissionsThisWeek: weekCounts.get(p.user_id) || 0,
      }));
      setMembers(nextMembers);

      const focusUserId = route.params?.focusUserId;
      if (focusUserId) {
        const focus = nextMembers.find((m) => m.user_id === focusUserId);
        if (focus) {
          setSelected(focus);
          setRole(focus.role);
          setGroupId(focus.assigned_group_id || "");
          setTrainerId(focus.assigned_trainer_id || "");
          setSponsor(focus.sponsor_username || "");
        }
      }
    } catch (e) {
      console.error(e);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [officeId, isSuperAdmin, isSponsor, canManage, profile?.user_id, route.params?.focusUserId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      const statusOk = statusFilter === "all" || m.approval_status === statusFilter;
      const groupOk =
        groupFilter === "all"
          ? true
          : groupFilter === "unassigned"
            ? !m.assigned_group_id
            : m.assigned_group_id === groupFilter;
      const textOk =
        !q ||
        m.full_name.toLowerCase().includes(q) ||
        m.username.toLowerCase().includes(q) ||
        (m.email || "").toLowerCase().includes(q) ||
        (m.group_name || "").toLowerCase().includes(q);
      return statusOk && groupOk && textOk;
    });
  }, [members, search, statusFilter, groupFilter]);

  const selectedGroupLabel =
    groupFilter === "all"
      ? "All groups"
      : groupFilter === "unassigned"
        ? "Unassigned"
        : groups.find((g) => g.id === groupFilter)?.name || "All groups";

  const trainers = members.filter((m) => m.role === "trainer" || m.role === "super_admin");
  const inviteLink = office?.slug
    ? `${SITE_URL}/auth?tab=signup&office=${office.slug}${inviteSponsor.trim() ? `&sponsor=${inviteSponsor.trim().toLowerCase()}` : ""}`
    : "";

  const openMember = (member: Member) => {
    setSelected(member);
    setRole(member.role);
    setGroupId(member.assigned_group_id || "");
    setTrainerId(member.assigned_trainer_id || "");
    setSponsor(member.sponsor_username || "");
  };

  const saveMember = async () => {
    if (!selected || !user || !canManage) return;
    setSaving(true);
    try {
      const previousRole = selected.role;
      const { error } = await supabase
        .from("profiles")
        .update({
          approval_status: "approved",
          assigned_group_id: groupId || null,
          assigned_trainer_id: trainerId || null,
          sponsor_username: sponsor.trim() || null,
        })
        .eq("id", selected.id);
      if (error) throw error;

      const { data: existingRoles } = await supabase.from("user_roles").select("id, role").eq("user_id", selected.user_id);
      const existing = (existingRoles || []) as { id: string; role: string }[];
      const allowed = isSuperAdmin ? ["member", "pro", "sponsor", "trainer", "office_admin", "super_admin"] : ["member", "pro", "sponsor"];
      if (!allowed.includes(role)) {
        Alert.alert("Not allowed", "You cannot assign that role.");
        return;
      }
      const hasDesired = existing.some((r) => r.role === role);
      if (!hasDesired) {
        await supabase.from("user_roles").delete().eq("user_id", selected.user_id);
        await supabase.from("user_roles").insert({
          user_id: selected.user_id,
          role,
          office_id: selected.office_id ?? officeId,
        });
      }

      if (selected.approval_status === "pending") {
        await supabase.functions.invoke("notify-admin-approved", { body: { user_id: selected.user_id } });
        const notifyResult = await notifyUser({
          user_id: selected.user_id,
          title: "Account approved",
          message: "Your account has been approved. You can now use THE PRUDENCE.",
          type: "team",
          link: "/dashboard",
          sendEmail: true,
        });
        toastAfterAction(`@${selected.username} approved`, notifyResult, { expectedEmail: true });
        await notifyDirectSponsorOfMember({
          memberUsername: selected.username,
          memberFullName: selected.full_name,
          sponsorUsername: sponsor || selected.sponsor_username,
          sendEmail: true,
        });
        await notifySponsorUplinesOfMember({
          memberUsername: selected.username,
          memberFullName: selected.full_name,
          sponsorUsername: sponsor || selected.sponsor_username,
        });
      } else {
        await notifyRoleChanged(selected.user_id, role, previousRole);
      }
      setSelected(null);
      await load();
    } catch (e) {
      Alert.alert("Save failed", e instanceof Error ? e.message : "Could not update member");
    } finally {
      setSaving(false);
    }
  };

  const rejectMember = async () => {
    if (!selected || !canManage) return;
    setSaving(true);
    try {
      await supabase.from("profiles").update({ approval_status: "rejected" }).eq("id", selected.id);
      await notifyUser({
        user_id: selected.user_id,
        title: "Account rejected",
        message: "Your account request has been rejected. Please contact your office admin for more information.",
        type: "alert",
        link: "/account-rejected",
        sendEmail: true,
      });
      setSelected(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const deactivateMember = async () => {
    if (!selected || !canManage) return;
    setSaving(true);
    try {
      await supabase
        .from("profiles")
        .update({ approval_status: "rejected", assigned_group_id: null, assigned_trainer_id: null })
        .eq("id", selected.id);
      await supabase.from("user_roles").delete().eq("user_id", selected.user_id);
      await supabase.from("user_roles").insert({
        user_id: selected.user_id,
        role: "member",
        office_id: selected.office_id ?? officeId,
      });
      await notifyUser({
        user_id: selected.user_id,
        title: "Account Deactivated",
        message: "Your account access has been revoked.",
        type: "alert",
        sendEmail: true,
      });
      setSelected(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const deleteMember = async () => {
    if (!selected || !isSuperAdmin) return;
    Alert.alert("Delete user", `Permanently delete @${selected.username}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setSaving(true);
          try {
            await invokeEdgeFunction("delete-user", { user_id: selected.user_id });
            setSelected(null);
            await load();
          } catch (e) {
            Alert.alert("Delete failed", e instanceof Error ? e.message : "Could not delete user");
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  const createGroup = async () => {
    if (!newGroup.trim() || !officeId) return;
    await supabase.from("groups").insert({ name: newGroup.trim(), office_id: officeId, trainer_ids: user ? [user.id] : [] });
    setNewGroup("");
    await load();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={tokens.colors.primary} />
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
            <Input value={search} onChangeText={setSearch} placeholder="Search name, username, email" />
            <Text style={styles.label}>Group</Text>
            <Pressable style={styles.dropdown} onPress={() => setGroupPickerOpen(true)}>
              <Text style={styles.dropdownText}>{selectedGroupLabel}</Text>
              <Text style={styles.dropdownChevron}>▼</Text>
            </Pressable>
            <Text style={styles.meta}>
              {filtered.length} member{filtered.length === 1 ? "" : "s"}
              {groupFilter !== "all" ? ` in ${selectedGroupLabel}` : ""}
            </Text>
            <View style={styles.row}>
              {(["all", "pending", "approved", "rejected"] as const).map((key) => (
                <Button key={key} title={key} size="sm" variant={statusFilter === key ? "primary" : "outline"} onPress={() => setStatusFilter(key)} />
              ))}
            </View>
            {canManage && inviteLink ? (
              <Card style={styles.card}>
                <Text style={styles.label}>Invite link</Text>
                <Input value={inviteSponsor} onChangeText={setInviteSponsor} placeholder="sponsor username" />
                <Button title="Share invite link" variant="outline" onPress={() => void copyOrShareText("Invite link", inviteLink)} />
                <View style={styles.row}>
                  <Input value={newGroup} onChangeText={setNewGroup} placeholder="New group name" style={{ flex: 1 }} />
                  <Button title="Add group" size="sm" onPress={() => void createGroup()} />
                </View>
              </Card>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Pressable onPress={() => nav.navigate("TeamMemberDetail", { userId: item.user_id, fullName: item.full_name })}>
            <Text style={styles.name}>{item.full_name}</Text>
            <Text style={styles.meta}>
              @{item.username} · {item.role.replace("_", " ")}
              {item.group_name ? ` · ${item.group_name}` : ""}
            </Text>
            <Text style={styles.meta}>
              Sponsor: {item.sponsor_username ? `@${item.sponsor_username}` : "—"} · {item.submissionsThisWeek}/7 this week
            </Text>
            <Badge variant={item.approval_status === "approved" ? "success" : item.approval_status === "rejected" ? "destructive" : "warning"}>
              {item.approval_status}
            </Badge>
            </Pressable>
            <View style={styles.row}>
              <Button
                title="View details"
                size="sm"
                onPress={() => nav.navigate("TeamMemberDetail", { userId: item.user_id, fullName: item.full_name })}
              />
              {canManage ? <Button title="Manage" variant="outline" size="sm" onPress={() => openMember(item)} /> : null}
            </View>
          </Card>
        )}
      />
      <Modal visible={groupPickerOpen} transparent animationType="fade" onRequestClose={() => setGroupPickerOpen(false)}>
        <Pressable style={styles.pickerBackdrop} onPress={() => setGroupPickerOpen(false)}>
          <Pressable style={styles.pickerCard} onPress={() => undefined}>
            <Text style={styles.label}>Choose a group</Text>
            <ScrollView style={styles.pickerList}>
              <Pressable
                style={[styles.pickerRow, groupFilter === "all" && styles.pickerRowOn]}
                onPress={() => {
                  setGroupFilter("all");
                  setGroupPickerOpen(false);
                }}
              >
                <Text style={styles.pickerRowText}>All groups</Text>
                <Text style={styles.meta}>{members.length}</Text>
              </Pressable>
              <Pressable
                style={[styles.pickerRow, groupFilter === "unassigned" && styles.pickerRowOn]}
                onPress={() => {
                  setGroupFilter("unassigned");
                  setGroupPickerOpen(false);
                }}
              >
                <Text style={styles.pickerRowText}>Unassigned</Text>
                <Text style={styles.meta}>{members.filter((m) => !m.assigned_group_id).length}</Text>
              </Pressable>
              {groups.map((g) => (
                <Pressable
                  key={g.id}
                  style={[styles.pickerRow, groupFilter === g.id && styles.pickerRowOn]}
                  onPress={() => {
                    setGroupFilter(g.id);
                    setGroupPickerOpen(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerRowText}>{g.name}</Text>
                    <Text style={styles.meta}>
                      {g.member_count ?? 0} approved
                      {g.trainer_names?.length ? ` · ${g.trainer_names.join(", ")}` : ""}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={Boolean(selected)} animationType="slide" onRequestClose={() => setSelected(null)}>
        <KeyboardSafeScroll inModal style={styles.modal} contentContainerStyle={styles.modalContent}>
          <Button title="Close" variant="ghost" onPress={() => setSelected(null)} />
          <Text style={styles.name}>{selected?.full_name}</Text>
          <Text style={styles.label}>Role</Text>
          <Input value={role} onChangeText={setRole} placeholder="member | pro | sponsor | trainer" />
          <Text style={styles.label}>Group id</Text>
          <Input value={groupId} onChangeText={setGroupId} placeholder={groups.map((g) => `${g.name}:${g.id.slice(0, 6)}`).join(" · ") || "none"} />
          <Text style={styles.label}>Trainer user id</Text>
          <Input value={trainerId} onChangeText={setTrainerId} placeholder={trainers[0]?.user_id ?? ""} />
          <Text style={styles.label}>Sponsor username</Text>
          <Input value={sponsor} onChangeText={setSponsor} />
          <Button title={selected?.approval_status === "pending" ? "Approve" : "Update"} onPress={() => void saveMember()} loading={saving} />
          <Button title="Reject" variant="outline" onPress={() => void rejectMember()} disabled={saving} />
          <Button title="Deactivate" variant="outline" onPress={() => void deactivateMember()} disabled={saving} />
          {isSuperAdmin ? <Button title="Delete user" variant="destructive" onPress={deleteMember} disabled={saving} /> : null}
        </KeyboardSafeScroll>
      </Modal>
    </KeyboardSafeView>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: tokens.colors.background },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    list: { padding: 16, gap: 10, paddingBottom: 40 },
    header: { gap: 10, marginBottom: 8 },
    dropdown: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: tokens.colors.border,
      borderRadius: tokens.radius.md,
      backgroundColor: tokens.colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    dropdownText: { color: tokens.colors.foreground, fontWeight: "700", fontSize: 15, flex: 1 },
    dropdownChevron: { color: tokens.colors.mutedForeground, marginLeft: 8 },
    pickerBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "center",
      padding: 20,
    },
    pickerCard: {
      backgroundColor: tokens.colors.card,
      borderRadius: tokens.radius.lg,
      padding: 14,
      maxHeight: "70%",
      gap: 10,
      borderWidth: 1,
      borderColor: tokens.colors.border,
    },
    pickerList: { maxHeight: 360 },
    pickerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: tokens.colors.border,
    },
    pickerRowOn: { backgroundColor: tokens.colors.accent, borderRadius: 8 },
    pickerRowText: { color: tokens.colors.foreground, fontWeight: "700", fontSize: 15 },
    row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    card: { padding: 14, gap: 8 },
    name: { fontSize: 16, fontWeight: "800", color: tokens.colors.foreground },
    meta: { color: tokens.colors.mutedForeground, fontSize: 13 },
    label: { fontWeight: "700", color: tokens.colors.foreground },
    modal: { flex: 1, backgroundColor: tokens.colors.background },
    modalContent: { padding: 18, gap: 10, paddingBottom: 40 },
  });
