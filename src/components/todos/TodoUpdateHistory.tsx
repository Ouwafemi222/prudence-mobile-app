import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";
import type { TodoLogEntry } from "../../lib/fetchTodoSubmissionData";

export type { TodoLogEntry };

type TodoUpdateHistoryProps = {
  logs: TodoLogEntry[];
  loading?: boolean;
  emptyMessage?: string;
};

function formatLogTime(iso: string) {
  return new Date(iso).toLocaleString("en-NG", {
    timeZone: "Africa/Lagos",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TodoUpdateHistory({
  logs,
  loading,
  emptyMessage = "No saved versions yet. Your first save will appear here.",
}: TodoUpdateHistoryProps) {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={tokens.colors.primary} />
        <Text style={styles.muted}>Loading update history…</Text>
      </View>
    );
  }

  if (logs.length === 0) {
    return <Text style={styles.muted}>{emptyMessage}</Text>;
  }

  const ordered = [...logs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>
        Update history ({ordered.length} version{ordered.length === 1 ? "" : "s"})
      </Text>
      {ordered.map((entry, index) => {
        const versionNumber = ordered.length - index;
        const isLatest = index === 0;
        return (
          <View key={entry.id} style={[styles.item, isLatest ? styles.itemLatest : null]}>
            <View style={styles.itemHead}>
              <Text style={styles.version}>
                Version {versionNumber}
                {isLatest ? " · Latest" : ""}
              </Text>
              <Text style={styles.muted}>{formatLogTime(entry.created_at)}</Text>
            </View>
            <Text style={styles.plan}>{entry.plan.trim() || "(empty plan)"}</Text>
          </View>
        );
      })}
    </View>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    wrap: { gap: 10, marginTop: 8 },
    heading: { fontWeight: "800", color: tokens.colors.foreground, fontSize: 14 },
    loading: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12 },
    muted: { color: tokens.colors.mutedForeground, fontSize: 12 },
    item: {
      borderWidth: 1,
      borderColor: tokens.colors.border,
      borderRadius: tokens.radius.md,
      padding: 12,
      backgroundColor: tokens.colors.surface,
      gap: 6,
    },
    itemLatest: {
      borderColor: tokens.colors.borderGlow,
      backgroundColor: tokens.colors.accent,
    },
    itemHead: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
    version: { fontWeight: "700", fontSize: 12, color: tokens.colors.foreground },
    plan: { color: tokens.colors.mutedForeground, fontSize: 13, lineHeight: 18 },
  });
