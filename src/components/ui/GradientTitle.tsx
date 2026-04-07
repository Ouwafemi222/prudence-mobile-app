import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAppTheme } from "../../contexts/ThemeContext";

type Props = { children: ReactNode; size?: "lg" | "md" };

/** Headline with neon underline bar (gradient accent). */
export function GradientTitle({ children, size = "lg" }: Props) {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  const fontSize = size === "lg" ? 30 : 22;
  return (
    <View style={styles.block}>
      <Text
        style={[
          styles.title,
          {
            fontSize,
            textShadowColor: tokens.colors.primary,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: size === "lg" ? 20 : 12,
          },
        ]}
      >
        {children}
      </Text>
      <LinearGradient
        colors={[tokens.colors.primary, tokens.colors.accentForeground, "transparent"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.bar}
      />
    </View>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    block: { gap: 10, alignSelf: "stretch" },
    title: {
      fontWeight: "800",
      color: tokens.colors.foreground,
      letterSpacing: -0.5,
    },
    bar: {
      height: 3,
      borderRadius: 2,
      maxWidth: 200,
      opacity: 0.9,
    },
  });
