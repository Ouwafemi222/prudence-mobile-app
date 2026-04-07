import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useMainAppNavigation } from "../hooks/useMainAppNavigation";
import { tokens } from "../theme/tokens";

const ITEMS: { title: string; sub: string; target: keyof import("../navigation/types").MainAppStackParamList; symbol: string }[] = [
  { title: "Teams", sub: "Member directory (trainers/admins)", target: "Teams", symbol: "👥" },
  { title: "Submissions", sub: "Review daily reports", target: "SubmissionsReview", symbol: "📋" },
  { title: "Manage skills", sub: "Edit training content", target: "AdminSkills", symbol: "📚" },
  { title: "Group todos & reports", sub: "Per-group day view", target: "GroupTodosReports", symbol: "📊" },
];

export function AdminHubScreen() {
  const { isAdmin, isTrainer } = useAuth();
  const nav = useMainAppNavigation();

  if (!isAdmin && !isTrainer) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Admin tools are for trainers and super admins.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.lead}>Shortcuts to mobile admin views (full workflows remain on the web).</Text>
      {ITEMS.map((item) => (
        <Pressable key={item.target} style={styles.card} onPress={() => nav.navigate(item.target)}>
          <Text style={styles.symbol}>{item.symbol}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.sub}>{item.sub}</Text>
          </View>
          <Text style={styles.arrow}>→</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: tokens.colors.background },
  container: { padding: 18, paddingBottom: 40, gap: 12, backgroundColor: tokens.colors.background },
  lead: { fontSize: 14, color: tokens.colors.mutedForeground, marginBottom: 8 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.borderGlow,
  },
  symbol: { fontSize: 28 },
  title: { fontSize: 18, fontWeight: "800", color: tokens.colors.foreground },
  sub: { fontSize: 12, color: tokens.colors.mutedForeground, marginTop: 2 },
  arrow: { fontSize: 20, fontWeight: "800", color: tokens.colors.primary },
  muted: { textAlign: "center", color: tokens.colors.mutedForeground },
});
