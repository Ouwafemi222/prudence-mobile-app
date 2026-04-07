import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../integrations/supabase/client";
import { addDaysISODate, getNigeriaWeekStartISO } from "../lib/nigeriaTime";
import { tokens } from "../theme/tokens";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Avatar } from "../components/ui/Avatar";

type Downline = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  approval_status: string;
  role: string;
  depth: number;
  pagesThisWeek: number;
  gigsCreated: number;
  netIncome: number;
  submissionsThisWeek: number;
  consistencyScore: number;
};

export function SponsorDashboardScreen() {
  const { profile, userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [downlines, setDownlines] = useState<Downline[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, active: 0 });

  const load = useCallback(async () => {
    if (!profile?.user_id || userRole?.role !== "sponsor") {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: tree, error: treeError } = await supabase.rpc("get_sponsor_downlines", {
        p_sponsor_user_id: profile.user_id,
      });
      if (treeError) throw treeError;
      const treeRows = tree || [];
      const userIds = treeRows.map((r: { user_id: string }) => r.user_id);
      if (userIds.length === 0) {
        setDownlines([]);
        setStats({ total: 0, pending: 0, active: 0 });
        return;
      }

      const depthByUserId = new Map<string, number>();
      treeRows.forEach((r: { user_id: string; depth: number }) => depthByUserId.set(r.user_id, r.depth));

      const [{ data: profilesData }, { data: rolesData }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, username, avatar_url, approval_status").in("user_id", userIds),
        supabase.from("user_roles").select("user_id, role").in("user_id", userIds),
      ]);

      const roleByUserId = new Map<string, string>();
      (rolesData || []).forEach((r: { user_id: string; role: string }) => roleByUserId.set(r.user_id, r.role));

      const weekStart = getNigeriaWeekStartISO();
      const weekEnd = addDaysISODate(weekStart, 6);
      const { data: actData } = await supabase
        .from("daily_activities")
        .select("user_id, pages_read, gigs_created, net_income")
        .in("user_id", userIds)
        .gte("activity_date", weekStart)
        .lte("activity_date", weekEnd);

      const metrics = new Map<string, { p: number; g: number; n: number; s: number }>();
      (actData || []).forEach((a: any) => {
        const uid = a.user_id;
        const cur = metrics.get(uid) || { p: 0, g: 0, n: 0, s: 0 };
        cur.p += a.pages_read || 0;
        cur.g += a.gigs_created || 0;
        cur.n += Number(a.net_income || 0);
        cur.s += 1;
        metrics.set(uid, cur);
      });

      const rows: Downline[] = (profilesData || []).map((dl: any) => {
        const m = metrics.get(dl.user_id) || { p: 0, g: 0, n: 0, s: 0 };
        return {
          user_id: dl.user_id,
          full_name: dl.full_name,
          username: dl.username,
          avatar_url: dl.avatar_url,
          approval_status: dl.approval_status,
          role: roleByUserId.get(dl.user_id) || "member",
          depth: depthByUserId.get(dl.user_id) || 1,
          pagesThisWeek: m.p,
          gigsCreated: m.g,
          netIncome: m.n,
          submissionsThisWeek: m.s,
          consistencyScore: Math.round((m.s / 7) * 100),
        };
      });

      rows.sort((a, b) => a.depth - b.depth || (a.full_name || "").localeCompare(b.full_name || ""));
      setDownlines(rows);
      setStats({
        total: rows.length,
        pending: rows.filter((r) => r.approval_status === "pending").length,
        active: rows.filter((r) => r.approval_status === "approved").length,
      });
    } catch (e) {
      console.error(e);
      setDownlines([]);
    } finally {
      setLoading(false);
    }
  }, [profile?.user_id, userRole?.role]);

  useEffect(() => {
    load();
  }, [load]);

  if (userRole?.role !== "sponsor") {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Sponsor dashboard is available to sponsor accounts only.</Text>
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
      data={downlines}
      keyExtractor={(item) => item.user_id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.intro}>Downline tree from your sponsor link (same RPC as the website).</Text>
          <View style={styles.statRow}>
            <Card style={styles.statCard}>
              <Text style={styles.statNum}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statNum}>{stats.active}</Text>
              <Text style={styles.statLabel}>Approved</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statNum}>{stats.pending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </Card>
          </View>
        </View>
      }
      ListEmptyComponent={<Text style={styles.muted}>No downlines yet.</Text>}
      renderItem={({ item }) => {
        const uri = item.avatar_url
          ? supabase.storage.from("avatars").getPublicUrl(item.avatar_url).data.publicUrl
          : null;
        const initials = (item.full_name || item.username || "?")
          .split(" ")
          .map((s) => s[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        return (
          <Card style={styles.rowCard}>
            <View style={styles.rowTop}>
              <Avatar uri={uri} initials={initials} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.full_name || item.username}</Text>
                <Text style={styles.sub}>@{item.username} · depth {item.depth}</Text>
                <View style={styles.badgeRow}>
                  <Badge variant="outline">{item.role}</Badge>
                  <Badge variant={item.approval_status === "approved" ? "success" : "warning"}>
                    {item.approval_status}
                  </Badge>
                </View>
              </View>
            </View>
            <Text style={styles.metrics}>
              This week: {item.pagesThisWeek} pages · {item.gigsCreated} gigs · ${item.netIncome.toFixed(0)} net ·{" "}
              {item.submissionsThisWeek} submissions · {item.consistencyScore}% consistency
            </Text>
          </Card>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", padding: 24 },
  list: { padding: 18, paddingBottom: 32, gap: 12 },
  header: { gap: 14, marginBottom: 8 },
  intro: { fontSize: 14, color: tokens.colors.mutedForeground },
  statRow: { flexDirection: "row", gap: 8 },
  statCard: { flex: 1, padding: 12, alignItems: "center" },
  statNum: { fontSize: 22, fontWeight: "800", color: tokens.colors.primary },
  statLabel: { fontSize: 11, color: tokens.colors.mutedForeground },
  rowCard: { padding: 14, gap: 10 },
  rowTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  name: { fontSize: 16, fontWeight: "800" },
  sub: { fontSize: 12, color: tokens.colors.mutedForeground, marginTop: 2 },
  badgeRow: { flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" },
  metrics: { fontSize: 12, color: tokens.colors.mutedForeground },
  muted: { textAlign: "center", color: tokens.colors.mutedForeground, marginTop: 24 },
});
