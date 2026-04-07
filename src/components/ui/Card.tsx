import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";

export function Card({ children, style, subtle }: { children: ReactNode; style?: StyleProp<ViewStyle>; subtle?: boolean }) {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  return <View style={[styles.card, subtle ? styles.subtle : null, style]}>{children}</View>;
}

export function CardHeader({ children }: { children: ReactNode }) {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  return <View style={styles.header}>{children}</View>;
}

export function CardTitle({ children }: { children: ReactNode }) {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  return <Text style={styles.title}>{children}</Text>;
}

export function CardContent({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  return <View style={[styles.content, style]}>{children}</View>;
}

export function CardDescription({ children }: { children: ReactNode }) {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  return <View style={styles.description}>{children}</View>;
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    card: {
      backgroundColor: tokens.colors.card,
      borderWidth: 1,
      borderColor: tokens.colors.border,
      borderRadius: tokens.radius.lg,
      padding: 14,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 3,
    },
    subtle: {
      backgroundColor: tokens.colors.surface,
      borderColor: tokens.colors.border,
    },
    header: {
      marginBottom: 10,
    },
    title: {
      fontWeight: "800",
      color: tokens.colors.foreground,
      letterSpacing: -0.2,
    },
    content: {},
    description: {
      marginTop: 6,
    },
  });
