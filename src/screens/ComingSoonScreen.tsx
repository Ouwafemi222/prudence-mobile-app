import { StyleSheet, Text, View } from "react-native";
import { tokens } from "../theme/tokens";

export function ComingSoonScreen({ title }: { title: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>Coming soon. We will add full feature parity next.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: tokens.colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: tokens.colors.foreground,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    color: tokens.colors.mutedForeground,
    fontSize: 14,
  },
});

