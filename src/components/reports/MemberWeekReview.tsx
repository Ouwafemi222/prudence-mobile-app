import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";
import {
  formatLongDateInNigeria,
  getNigeriaWeekDayISOs,
  NIGERIA_WEEKDAY_LABELS_SUN_FIRST,
} from "../../lib/nigeriaTime";
import type { ActivityRow } from "../../lib/activityTypes";
import type { TodoDay, WeeklyTotals } from "../../lib/memberReview";
import { DayReportSummary } from "./DayReportSummary";
import { Badge } from "../ui/Badge";

type Props = {
  weekStart: string;
  loading?: boolean;
  todosByDate: Record<string, TodoDay>;
  activitiesByDate: Record<string, ActivityRow>;
  weeklyTotals?: WeeklyTotals | null;
  onOpenReport?: (activity: ActivityRow) => void;
};

export function MemberWeekReview({
  weekStart,
  loading,
  todosByDate,
  activitiesByDate,
  weeklyTotals,
  onOpenReport,
}: Props) {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  const weekDays = getNigeriaWeekDayISOs(weekStart);

  if (loading) {
    return <Text style={styles.muted}>Loading week details…</Text>;
  }

  return (
    <View style={styles.wrap}>
      {weekDays.map((isoDate, index) => {
        const todo = todosByDate[isoDate];
        const activity = activitiesByDate[isoDate];
        const dayLabel = NIGERIA_WEEKDAY_LABELS_SUN_FIRST[index];
        return (
          <View key={isoDate} style={styles.dayCard}>
            <Text style={styles.dayTitle}>
              {dayLabel} — {formatLongDateInNigeria(new Date(`${isoDate}T12:00:00`))}
            </Text>
            <View style={styles.half}>
              <Text style={styles.sectionLabel}>Morning todo</Text>
              <Text style={styles.body}>{todo?.plan?.trim() || "No plan saved for this day."}</Text>
            </View>
            <View style={styles.half}>
              <View style={styles.reportHead}>
                <Text style={styles.sectionLabel}>Daily report</Text>
                {activity && onOpenReport ? (
                  <Pressable onPress={() => onOpenReport(activity)}>
                    <Text style={styles.previewLink}>Preview / review</Text>
                  </Pressable>
                ) : null}
              </View>
              <DayReportSummary activity={activity} />
            </View>
          </View>
        );
      })}

      {weeklyTotals?.things_learned_summary?.trim() ? (
        <View style={styles.totals}>
          <Text style={styles.sectionLabel}>Things learned this week</Text>
          <Text style={styles.body}>{weeklyTotals.things_learned_summary}</Text>
        </View>
      ) : null}

      {weeklyTotals ? (
        <View style={styles.totals}>
          <Text style={styles.sectionLabel}>Week overall (Sunday – Saturday)</Text>
          <View style={styles.badges}>
            <Badge variant="outline">{Number(weeklyTotals.consistency_score ?? 0).toFixed(1)}% consistency</Badge>
            <Badge variant="outline">{weeklyTotals.total_pages_read ?? 0} pages</Badge>
            <Badge variant="outline">${Number(weeklyTotals.total_net_income ?? 0).toLocaleString()} net</Badge>
            <Badge variant="outline">{weeklyTotals.total_gigs_created ?? 0} gigs</Badge>
            <Badge variant="outline">{weeklyTotals.total_accounts_created ?? 0} accounts</Badge>
            {(weeklyTotals.submission_count ?? 0) > 0 ? (
              <Badge variant="outline">{weeklyTotals.submission_count} submissions</Badge>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    wrap: { gap: 12 },
    muted: { color: tokens.colors.mutedForeground, textAlign: "center", paddingVertical: 16 },
    dayCard: {
      borderWidth: 1,
      borderColor: tokens.colors.border,
      borderRadius: tokens.radius.md,
      backgroundColor: tokens.colors.card,
      overflow: "hidden",
    },
    dayTitle: {
      fontWeight: "800",
      fontSize: 13,
      color: tokens.colors.foreground,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: tokens.colors.accent,
    },
    half: { padding: 12, gap: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tokens.colors.border },
    reportHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
    sectionLabel: {
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.4,
      textTransform: "uppercase",
      color: tokens.colors.mutedForeground,
    },
    previewLink: { color: tokens.colors.primary, fontWeight: "700", fontSize: 13 },
    body: { color: tokens.colors.foreground, fontSize: 14, lineHeight: 20 },
    totals: {
      borderWidth: 1,
      borderColor: tokens.colors.border,
      borderRadius: tokens.radius.md,
      padding: 12,
      gap: 8,
      backgroundColor: tokens.colors.card,
    },
    badges: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  });
