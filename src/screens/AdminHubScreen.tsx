import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useMainAppNavigation } from "../hooks/useMainAppNavigation";
import { useAppTheme } from "../contexts/ThemeContext";
import { openSitePath } from "../lib/openSite";

export function AdminHubScreen() {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  const { isAdmin, isTrainer, isSuperAdmin, isOfficeAdmin } = useAuth();
  const nav = useMainAppNavigation();

  if (!isAdmin && !isTrainer && !isOfficeAdmin) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Admin tools are for trainers, office admins, and super admins.</Text>
      </View>
    );
  }

  const items: { title: string; sub: string; onPress: () => void }[] = [
    { title: "Admin dashboard", sub: "Income and member overview", onPress: () => nav.navigate("AdminDashboard") },
    { title: "Teams", sub: "Approve, roles, groups, delete", onPress: () => nav.navigate("Teams") },
    { title: "Submissions", sub: "Review daily reports", onPress: () => nav.navigate("SubmissionsReview") },
    { title: "Group weekly", sub: "Trainer week drill-down", onPress: () => nav.navigate("TrainerGroupWeekly") },
    { title: "Group todos", sub: "Per-group day view", onPress: () => nav.navigate("GroupTodosReports") },
    { title: "Admin monthly goals", sub: "Any member, any month", onPress: () => nav.navigate("AdminMonthlyGoals") },
    { title: "Manage skills", sub: "Full skill field editor", onPress: () => nav.navigate("AdminSkills") },
  ];
  if (isSuperAdmin || isOfficeAdmin) {
    items.push({ title: "Office admin", sub: "Rename, invites, CMS, pending", onPress: () => nav.navigate("OfficeAdmin") });
  }
  if (isSuperAdmin) {
    items.push({ title: "All offices", sub: "Tenant workspaces and signup links", onPress: () => nav.navigate("AdminOffices") });
    items.push({ title: "Office applications", sub: "Provision new offices", onPress: () => nav.navigate("AdminOfficeApplications") });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.lead}>Native admin tools matching the website navbar.</Text>
      {items.map((item) => (
        <Pressable key={item.title} style={styles.card} onPress={item.onPress}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.sub}>{item.sub}</Text>
          </View>
          <Text style={styles.arrow}>→</Text>
        </Pressable>
      ))}
      <Text style={styles.lead}>Marketing stays in the browser</Text>
      {[
        { label: "About", path: "/about" },
        { label: "FAQ", path: "/faq" },
        { label: "Apply", path: "/apply" },
        { label: "Pricing", path: "/pricing" },
      ].map((link) => (
        <Pressable key={link.path} style={styles.card} onPress={() => void openSitePath(link.path)}>
          <Text style={styles.title}>{link.label}</Text>
          <Text style={styles.arrow}>↗</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    centered: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: tokens.colors.background },
    container: { padding: 18, paddingBottom: 40, gap: 12, backgroundColor: tokens.colors.background },
    lead: { fontSize: 14, color: tokens.colors.mutedForeground, marginTop: 8 },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 16,
      borderRadius: tokens.radius.md,
      backgroundColor: tokens.colors.surface,
      borderWidth: 1,
      borderColor: tokens.colors.border,
    },
    title: { fontSize: 17, fontWeight: "800", color: tokens.colors.foreground },
    sub: { fontSize: 12, color: tokens.colors.mutedForeground, marginTop: 2 },
    arrow: { fontSize: 20, fontWeight: "800", color: tokens.colors.primary },
    muted: { textAlign: "center", color: tokens.colors.mutedForeground },
  });
