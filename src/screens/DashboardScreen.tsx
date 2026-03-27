import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { tokens } from "../theme/tokens";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Avatar } from "../components/ui/Avatar";

export function DashboardScreen() {
  const { profile, userRole, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Card style={styles.heroCard}>
        <View style={styles.heroTop}>
          <Avatar
            initials={(profile?.full_name || profile?.username || "U")
              .split(" ")
              .map((s) => s[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.heroName}>Welcome, {profile?.full_name?.split(" ")[0] || profile?.username || "User"}</Text>
            <Text style={styles.heroSub}>Let’s keep your consistency high today.</Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <Badge>{(userRole?.role || "member").replace("_", " ")}</Badge>
          <Badge variant={profile?.approval_status === "approved" ? "success" : "warning"}>
            {profile?.approval_status || "unknown"}
          </Badge>
        </View>
      </Card>

      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Weekly Consistency</Text>
          <Text style={styles.statValue}>--%</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Daily Reports</Text>
          <Text style={styles.statValue}>--</Text>
        </Card>
      </View>

      <Button title="Sign Out" variant="destructive" onPress={signOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
    padding: 20,
    gap: 14,
  },
  heroCard: {
    marginTop: 4,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroName: {
    fontSize: 20,
    fontWeight: "800",
    color: tokens.colors.foreground,
  },
  heroSub: {
    marginTop: 4,
    fontSize: 13,
    color: tokens.colors.mutedForeground,
  },
  metaRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
  },
  statLabel: {
    color: tokens.colors.mutedForeground,
    fontSize: 12,
  },
  statValue: {
    marginTop: 6,
    fontSize: 24,
    fontWeight: "800",
    color: tokens.colors.foreground,
  },
});
