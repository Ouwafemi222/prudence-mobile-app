import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { useMainAppNavigation } from "../hooks/useMainAppNavigation";
import { supabase } from "../integrations/supabase/client";
import { useAppTheme } from "../contexts/ThemeContext";
import { scopeToUserOffice } from "../lib/tenantScope";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

export function AdminDashboardScreen() {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  const nav = useMainAppNavigation();
  const { isAdmin, isTrainer, isSuperAdmin, isOfficeAdmin, officeId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ members: 0, pending: 0, income: 0, pages: 0 });

  const allowed = isAdmin || isTrainer || isOfficeAdmin;

  const load = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    try {
      let profileQuery = supabase.from("profiles").select("approval_status");
      profileQuery = scopeToUserOffice(profileQuery, officeId, isSuperAdmin);
      let activityQuery = supabase.from("daily_activities").select("net_income, pages_read");
      activityQuery = scopeToUserOffice(activityQuery, officeId, isSuperAdmin);
      const [{ data: profiles }, { data: activities }] = await Promise.all([profileQuery, activityQuery]);
      setStats({
        members: profiles?.length ?? 0,
        pending: (profiles || []).filter((p: { approval_status: string }) => p.approval_status === "pending").length,
        income: (activities || []).reduce((sum: number, a: { net_income: number | null }) => sum + Number(a.net_income || 0), 0),
        pages: (activities || []).reduce((sum: number, a: { pages_read: number | null }) => sum + Number(a.pages_read || 0), 0),
      });
    } finally {
      setLoading(false);
    }
  }, [allowed, officeId, isSuperAdmin]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!allowed) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Admin dashboard is for trainers and admins.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {loading ? <ActivityIndicator color={tokens.colors.primary} /> : null}
      <View style={styles.grid}>
        <Card style={styles.stat}><Text style={styles.value}>{stats.members}</Text><Text style={styles.label}>Members</Text></Card>
        <Card style={styles.stat}><Text style={styles.value}>{stats.pending}</Text><Text style={styles.label}>Pending</Text></Card>
        <Card style={styles.stat}><Text style={styles.value}>${stats.income.toFixed(0)}</Text><Text style={styles.label}>Income</Text></Card>
        <Card style={styles.stat}><Text style={styles.value}>{stats.pages}</Text><Text style={styles.label}>Pages</Text></Card>
      </View>
      <Button title="Teams" onPress={() => nav.navigate("Teams")} />
      <Button title="Submissions" variant="outline" onPress={() => nav.navigate("SubmissionsReview")} />
      <Button title="Group weekly" variant="outline" onPress={() => nav.navigate("TrainerGroupWeekly")} />
      <Button title="Monthly goals (admin)" variant="outline" onPress={() => nav.navigate("AdminMonthlyGoals")} />
      <Button title="Manage skills" variant="outline" onPress={() => nav.navigate("AdminSkills")} />
      {(isSuperAdmin || isOfficeAdmin) ? (
        <Button title="Office admin" variant="outline" onPress={() => nav.navigate("OfficeAdmin")} />
      ) : null}
      {isSuperAdmin ? (
        <>
          <Button title="All offices" variant="outline" onPress={() => nav.navigate("AdminOffices")} />
          <Button title="Office applications" variant="outline" onPress={() => nav.navigate("AdminOfficeApplications")} />
        </>
      ) : null}
    </ScrollView>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    container: { padding: 18, gap: 10, paddingBottom: 40 },
    centered: { flex: 1, justifyContent: "center", padding: 24 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    stat: { width: "47%", padding: 14, alignItems: "center" },
    value: { fontSize: 22, fontWeight: "800", color: tokens.colors.foreground },
    label: { color: tokens.colors.mutedForeground, marginTop: 4 },
    muted: { textAlign: "center", color: tokens.colors.mutedForeground },
  });
