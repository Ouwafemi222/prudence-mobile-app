import type { ReactNode } from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { tokens } from "../../theme/tokens";

export function Card({ children, style, subtle }: { children: ReactNode; style?: StyleProp<ViewStyle>; subtle?: boolean }) {
  return <View style={[styles.card, subtle ? styles.subtle : null, style]}>{children}</View>;
}

export function CardHeader({ children }: { children: ReactNode }) {
  return <View style={styles.header}>{children}</View>;
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function CardContent({ children }: { children: ReactNode }) {
  return <View style={styles.content}>{children}</View>;
}

export function CardDescription({ children }: { children: ReactNode }) {
  return <View style={styles.description}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.colors.card,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    padding: 14,
  },
  subtle: {
    backgroundColor: "#FFFFFF",
  },
  header: {
    marginBottom: 10,
  },
  title: {
    fontWeight: "800",
  },
  content: {},
  description: {
    marginTop: 6,
  },
});

