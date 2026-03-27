import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { tokens } from "../../theme/tokens";

type BadgeVariant = "default" | "success" | "warning" | "destructive";

export function Badge({ children, variant = "default" }: { children: ReactNode; variant?: BadgeVariant }) {
  const bg = variant === "success" ? tokens.colors.success : variant === "warning" ? tokens.colors.warning : variant === "destructive" ? tokens.colors.destructive : tokens.colors.accent;
  const fg = variant === "default" ? tokens.colors.accentForeground : "#FFFFFF";

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  text: {
    fontWeight: "700",
    fontSize: 12,
  },
});

