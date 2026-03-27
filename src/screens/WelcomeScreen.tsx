import { StyleSheet, Text, View } from "react-native";
import { tokens } from "../theme/tokens";
import { Button } from "../components/ui/Button";

interface Props {
  onGetStarted: () => void;
}

export function WelcomeScreen({ onGetStarted }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.brand}>PRUDENCE PATH</Text>
      <Text style={styles.subtitle}>Powerline Office Accountability & Training System</Text>
      <Button title="Get Started" onPress={onGetStarted} />
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
    gap: 12,
  },
  brand: {
    fontSize: 28,
    fontWeight: "800",
    color: tokens.colors.foreground,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    color: tokens.colors.mutedForeground,
    marginBottom: 20,
  },
});
