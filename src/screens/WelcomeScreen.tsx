import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../contexts/ThemeContext";
import { Button } from "../components/ui/Button";
import { GradientTitle } from "../components/ui/GradientTitle";

interface Props {
  onGetStarted: () => void;
}

export function WelcomeScreen({ onGetStarted }: Props) {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[tokens.gradientTop, tokens.gradientBottom]}
        locations={[0, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.center}>
          <View style={styles.orbLayer} pointerEvents="none">
            <View style={styles.pseudoOrb} />
          </View>
          <Text style={styles.caption}>Powerline Office · accountability & training</Text>
          <View style={styles.copy}>
            <GradientTitle size="lg">Prudence Path</GradientTitle>
            <Text style={styles.subtitle}>Stay consistent, verified, and aligned with your team — from your phone.</Text>
          </View>
          <View style={styles.footer}>
            <Button title="Get started" size="lg" onPress={onGetStarted} style={styles.cta} />
            <Text style={styles.keyboardHint}>Sign in with your office credentials</Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: tokens.colors.background },
    safe: { flex: 1, backgroundColor: "transparent" },
    center: {
      flex: 1,
      paddingHorizontal: 28,
      paddingTop: 12,
      paddingBottom: 24,
      justifyContent: "center",
      alignItems: "center",
      gap: 16,
    },
    orbLayer: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
    },
    pseudoOrb: {
      width: 280,
      height: 280,
      borderRadius: 140,
      borderWidth: 1,
      borderColor: tokens.colors.borderGlow,
      backgroundColor: "transparent",
      shadowColor: tokens.colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.22,
      shadowRadius: 28,
      elevation: 8,
      opacity: 0.85,
    },
    caption: {
      fontSize: 12,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      color: tokens.colors.mutedForeground,
      textAlign: "center",
    },
    copy: { gap: 12, alignItems: "center", alignSelf: "stretch" },
    subtitle: {
      fontSize: 15,
      lineHeight: 22,
      color: tokens.colors.mutedForeground,
      marginTop: 4,
      textAlign: "center",
    },
    footer: { gap: 14, alignSelf: "stretch", marginTop: 8 },
    cta: { alignSelf: "stretch" },
    keyboardHint: {
      fontSize: 12,
      color: tokens.colors.muted,
      textAlign: "center",
    },
  });
