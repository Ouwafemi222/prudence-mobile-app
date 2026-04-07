import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../integrations/supabase/client";
import { tokens } from "../theme/tokens";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";

type MemberRow = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  approval_status: string;
  role: string;
};

export function TeamsScreen() {
  const { isAdmin, isTrainer, isSponsor, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [members, setMembers] = useState<MemberRow[]>([]);

  const load = useCallback(async () => {
    if (!isAdmin && !isTrainer && !isSponsor) return;
    setLoading(true);
    try {
      if (isSponsor && !isAdmin && !isTrainer) {
        if (!profile?.user_id) {
          setMembers([]);
          return;
        }
        const { data: tree, error: treeError } = await supabase.rpc("get_sponsor_downlines", {
          p_sponsor_user_id: profile.user_id,
        });
        if (treeError) throw treeError;
        const ids = (tree || []).map((r: { user_id: string }) => r.user_id);
        if (ids.length === 0) {
          setMembers([]);
          return;
        }
        const [{ data: profilesData }, { data: rolesData }] = await Promise.all([
          supabase
            .from("profiles")
            .select("user_id, full_name, username, approval_status")
            .in("user_id", ids),
          supabase.from("user_roles").select("user_id, role").in("user_id", ids),
        ]);
        const roleMap = new Map<string, string>();
        (rolesData || []).forEach((r: any) => roleMap.set(r.user_id, r.role));
        const rows: MemberRow[] = (profilesData || []).map((p: any) => ({
          user_id: p.user_id,
          full_name: p.full_name,
          username: p.username,
          approval_status: p.approval_status,
          role: roleMap.get(p.user_id) || "member",
        }));
        setMembers(rows);
      } else {
        const { data: profiles, error } = await supabase
          .from("profiles")
          .select("user_id, full_name, username, approval_status")
          .order("created_at", { ascending: false })
          .limit(250);
        if (error) throw error;
        const ids = (profiles || []).map((p: any) => p.user_id);
        const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", ids);
        const roleMap = new Map<string, string>();
        (roles || []).forEach((r: any) => {
          if (!roleMap.has(r.user_id)) roleMap.set(r.user_id, r.role);
        });
        const rows: MemberRow[] = (profiles || []).map((p: any) => ({
          user_id: p.user_id,
          full_name: p.full_name,
          username: p.username,
          approval_status: p.approval_status,
          role: roleMap.get(p.user_id) || "member",
        }));
        setMembers(rows);
      }
    } catch (e) {
      console.error(e);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isTrainer, isSponsor, profile?.user_id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        (m.full_name || "").toLowerCase().includes(q) ||
        (m.username || "").toLowerCase().includes(q) ||
        m.user_id.toLowerCase().includes(q),
    );
  }, [members, search]);

  if (!isAdmin && !isTrainer && !isSponsor) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Team directory is available to sponsors, trainers, and admins.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={tokens.colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={filtered}
      keyExtractor={(item) => item.user_id}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.intro}>
            Recent members (read-only snapshot). Full approvals, groups, and roles are on the website Teams page.
          </Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search name or username"
            placeholderTextColor={tokens.colors.muted}
            style={styles.search}
          />
        </View>
      }
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <Card style={styles.card}>
          <Text style={styles.name}>{item.full_name || item.username}</Text>
          <Text style={styles.sub}>@{item.username}</Text>
          <View style={styles.row}>
            <Badge variant="outline">{item.role}</Badge>
            <Badge variant={item.approval_status === "approved" ? "success" : "warning"}>{item.approval_status}</Badge>
          </View>
        </Card>
      )}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", padding: 24 },
  header: { paddingHorizontal: 18, paddingTop: 12, gap: 10 },
  intro: { fontSize: 13, color: tokens.colors.mutedForeground },
  search: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: tokens.colors.card,
    color: tokens.colors.foreground,
  },
  list: { paddingBottom: 32, gap: 10 },
  card: { marginHorizontal: 18, padding: 14, gap: 6 },
  name: { fontSize: 16, fontWeight: "800" },
  sub: { fontSize: 13, color: tokens.colors.mutedForeground },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 6 },
  muted: { textAlign: "center", color: tokens.colors.mutedForeground },
});
