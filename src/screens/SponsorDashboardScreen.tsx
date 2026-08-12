import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../integrations/supabase/client";
import { addDaysISODate, getNigeriaWeekStartISO, listRecentMonthStarts, formatMonthYearLabel } from "../lib/nigeriaTime";
import { useAppTheme } from "../contexts/ThemeContext";
import { SubmissionReviewDialog } from "../components/submissions/SubmissionReviewDialog";
import type { ActivityRow } from "../lib/activityTypes";
import { PeriodPicker } from "../components/reports/PeriodPicker";
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
  monthlyPages: number;
  monthlyIncome: number;
};

export function SponsorDashboardScreen() {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [downlines, setDownlines] = useState<Downline[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, active: 0 });
  const [review, setReview] = useState<Partial<ActivityRow> | null>(null);
  const [monthStart, setMonthStart] = useState(listRecentMonthStarts(1)[0]);

  const load = useCallback(async () => {
    if (!profile?.user_id) {
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
      const [{ data: actData }, { data: monthData }] = await Promise.all([
        supabase
          .from("daily_activities")
          .select("user_id, pages_read, gigs_created, net_income")
          .in("user_id", userIds)
          .gte("activity_date", weekStart)
          .lte("activity_date", weekEnd),
        supabase
          .from("monthly_goals")
          .select("user_id, actual_pages, actual_income")
          .eq("month_year", monthStart)
          .in("user_id", userIds),
      ]);
      const metrics = new Map<string, { p: number; g: number; n: number; s: number }>();
      (actData || []).forEach((a: { user_id: string; pages_read: number | null; gigs_created: number | null; net_income: number | null }) => {
        const cur = metrics.get(a.user_id) || { p: 0, g: 0, n: 0, s: 0 };
        cur.p += a.pages_read || 0;
        cur.g += a.gigs_created || 0;
        cur.n += Number(a.net_income || 0);
        cur.s += 1;
        metrics.set(a.user_id, cur);
      });
      const monthMap = new Map<string, { pages: number; income: number }>();
      (monthData || []).forEach((m: { user_id: string; actual_pages: number | null; actual_income: number | null }) => {
        monthMap.set(m.user_id, { pages: m.actual_pages || 0, income: Number(m.actual_income || 0) });
      });
      const rows: Downline[] = (profilesData || []).map((dl: { user_id: string; full_name: string | null; username: string | null; avatar_url: string | null; approval_status: string }) => {
        const m = metrics.get(dl.user_id) || { p: 0, g: 0, n: 0, s: 0 };
        const month = monthMap.get(dl.user_id) || { pages: 0, income: 0 };
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
          monthlyPages: month.pages,
          monthlyIncome: month.income,
        };
      });
      rows.sort((a, b) => a.depth - b.depth || (a.full_name || "").localeCompare(b.full_name || ""));
      setDownlines(rows);
      setStats({
        total: rows.length,
        pending: rows.filter((r) => r.approval_status === "pending").length,
        active: rows.filter((r) => r.approval_status === "approved").length,
      });
    } catch {
      setDownlines([]);
    } finally {
      setLoading(false);
    }
  }, [profile?.user_id, monthStart]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openLatest = async (userId: string) => {
    const { data } = await supabase
      .from("daily_activities")
      .select("*")
      .eq("user_id", userId)
      .order("activity_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) setReview(data as ActivityRow);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={tokens.colors.primary} />
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={downlines}
        keyExtractor={(item) => item.user_id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.intro}>Your downline tree. Empty if you have no sponsored members yet.</Text>
            <PeriodPicker
              options={listRecentMonthStarts(8).map((value) => ({ value, label: formatMonthYearLabel(value) }))}
              value={monthStart}
              onChange={setMonthStart}
            />
            <View style={styles.statRow}>
              <Card style={styles.statCard}><Text style={styles.stat}>{stats.total}</Text><Text style={styles.meta}>Total</Text></Card>
              <Card style={styles.statCard}><Text style={styles.stat}>{stats.active}</Text><Text style={styles.meta}>Active</Text></Card>
              <Card style={styles.statCard}><Text style={styles.stat}>{stats.pending}</Text><Text style={styles.meta}>Pending</Text></Card>
            </View>
          </View>
        }
        ListEmptyComponent={<Text style={styles.muted}>No downlines yet. Share your invite link from Teams.</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => void openLatest(item.user_id)}>
            <Card style={styles.card}>
              <View style={styles.row}>
                <Avatar uri={item.avatar_url} initials={(item.full_name || item.username || "U").slice(0, 2).toUpperCase()} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.full_name || item.username}</Text>
                  <Text style={styles.meta}>L{item.depth} · @{item.username} · {item.role}</Text>
                </View>
                <Badge variant={item.approval_status === "approved" ? "success" : "warning"}>{item.approval_status}</Badge>
              </View>
              <Text style={styles.meta}>
                Week: {item.pagesThisWeek} pg · {item.gigsCreated} gigs · ${item.netIncome.toFixed(0)} · {item.submissionsThisWeek}/7
              </Text>
              <Text style={styles.meta}>
                Month: {item.monthlyPages} pg · ${item.monthlyIncome.toFixed(0)}
              </Text>
            </Card>
          </Pressable>
        )}
      />
      <SubmissionReviewDialog visible={Boolean(review)} activity={review} onClose={() => setReview(null)} />
    </>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    list: { padding: 16, gap: 10, paddingBottom: 40 },
    header: { gap: 10, marginBottom: 6 },
    intro: { color: tokens.colors.mutedForeground, fontSize: 14 },
    statRow: { flexDirection: "row", gap: 8 },
    statCard: { flex: 1, padding: 12, alignItems: "center" },
    stat: { fontSize: 20, fontWeight: "800", color: tokens.colors.foreground },
    card: { padding: 14, gap: 8 },
    row: { flexDirection: "row", alignItems: "center", gap: 10 },
    name: { fontWeight: "800", color: tokens.colors.foreground },
    meta: { color: tokens.colors.mutedForeground, fontSize: 12 },
    muted: { textAlign: "center", color: tokens.colors.mutedForeground, marginTop: 16 },
  });
