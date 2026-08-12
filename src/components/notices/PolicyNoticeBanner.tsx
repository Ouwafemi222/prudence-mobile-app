import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ReactNode } from "react";
import { useDismissedNotice } from "../../hooks/useDismissedNotice";
import { useAppTheme } from "../../contexts/ThemeContext";

type PolicyNoticeBannerProps = {
  noticeId: string;
  title: string;
  children: ReactNode;
};

export function PolicyNoticeBanner({ noticeId, title, children }: PolicyNoticeBannerProps) {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  const { dismissed, dismiss } = useDismissedNotice(noticeId);

  if (dismissed) return null;

  return (
    <View style={styles.banner}>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{children}</Text>
      </View>
      <Pressable onPress={dismiss} accessibilityRole="button" accessibilityLabel="Dismiss notice">
        <Text style={styles.dismiss}>Dismiss</Text>
      </Pressable>
    </View>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    banner: {
      flexDirection: "row",
      gap: 10,
      alignItems: "flex-start",
      borderWidth: 1,
      borderColor: tokens.colors.borderGlow,
      backgroundColor: tokens.colors.accent,
      borderRadius: tokens.radius.md,
      padding: 12,
    },
    copy: { flex: 1, gap: 4 },
    title: { fontWeight: "800", color: tokens.colors.foreground, fontSize: 14 },
    body: { color: tokens.colors.mutedForeground, fontSize: 13, lineHeight: 18 },
    dismiss: { color: tokens.colors.primary, fontWeight: "700", fontSize: 12 },
  });
