import type { ReactNode } from "react";
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { tokens } from "../../theme/tokens";

export function Avatar({
  uri,
  initials,
  size = 44,
  style,
}: {
  uri?: string | null;
  initials?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }, style]}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <Text style={[styles.initials, { fontSize: Math.max(12, Math.floor(size * 0.28)) }]}>{initials ?? "?"}</Text>
      )}
    </View>
  );
}

export function AvatarFallback({ children }: { children: ReactNode }) {
  return <View style={styles.fallback}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  initials: {
    fontWeight: "800",
    color: tokens.colors.primary,
  },
  fallback: {
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
});

