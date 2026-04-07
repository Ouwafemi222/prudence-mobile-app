import type { ReactNode } from "react";
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";

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
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
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
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  return <View style={styles.fallback}>{children}</View>;
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    container: {
      backgroundColor: tokens.colors.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: tokens.colors.borderGlow,
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
