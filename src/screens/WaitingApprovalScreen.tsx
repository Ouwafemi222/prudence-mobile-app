import { StyleSheet, Text, View } from "react-native";
import { tokens } from "../theme/tokens";

export function WaitingApprovalScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Waiting for Approval</Text>
      <Text style={styles.subtitle}>Your account is pending trainer/admin approval.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: tokens.colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: tokens.colors.foreground,
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
    color: tokens.colors.mutedForeground,
  },
});
