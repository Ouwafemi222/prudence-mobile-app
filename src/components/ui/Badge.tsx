import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";

type BadgeVariant = "default" | "success" | "warning" | "destructive" | "outline";

export function Badge({ children, variant = "default" }: { children: ReactNode; variant?: BadgeVariant }) {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  const isOutline = variant === "outline";
  const bg = isOutline
    ? "transparent"
    : variant === "success"
      ? tokens.colors.success
      : variant === "warning"
        ? tokens.colors.warning
        : variant === "destructive"
          ? tokens.colors.destructive
          : tokens.colors.accentStrong;
  const fg = isOutline
    ? tokens.colors.mutedForeground
    : variant === "default"
      ? tokens.colors.accentForeground
      : "#0A0A0A";

  return (
    <View style={[styles.badge, { backgroundColor: bg }, isOutline && styles.outline]}>
      <Text style={[styles.text, { color: fg }, isOutline && styles.outlineText]}>{children}</Text>
    </View>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      alignSelf: "flex-start",
    },
    outline: {
      borderWidth: 1,
      borderColor: tokens.colors.border,
    },
    outlineText: {
      fontWeight: "600",
    },
    text: {
      fontWeight: "700",
      fontSize: 12,
      letterSpacing: 0.3,
      textTransform: "capitalize",
    },
  });
