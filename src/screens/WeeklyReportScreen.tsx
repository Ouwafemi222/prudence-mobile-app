import { type ReactNode, useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../integrations/supabase/client";
import {
  addDaysISODate,
  getNigeriaWeekStartISO,
  getSundayWeekNumber,
  listRecentWeekStarts,
  NIGERIA_TIME_ZONE,
} from "../lib/nigeriaTime";
import { WEEKLY_PAGES_TARGET } from "../lib/reportTargets";
import { notifyUser } from "../lib/notifyUser";
import { PeriodPicker } from "../components/reports/PeriodPicker";
import { SubmissionReviewDialog } from "../components/submissions/SubmissionReviewDialog";
import type { ActivityRow } from "../lib/activityTypes";
import type { ThemeTokens } from "../theme/themes";
import { useAppTheme } from "../contexts/ThemeContext";
import { useTabBarContentPaddingBottom } from "../hooks/useTabBarContentPaddingBottom";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Textarea } from "../components/ui/Textarea";
import { showAndroidToast } from "../lib/androidToast";

function showToast(message: string) {
  if (Platform.OS === "android") showAndroidToast(message);
}

export interface WeeklyReport {
  id: string;
  user_id: string;
  week_start_date: string;
  week_end_date: string;
  total_pages_read: number;
  total_gigs_created: number;
  total_accounts_created: number;
  total_gross_income: number;
  total_net_income: number;
  total_contacts: number;
  total_follow_ups: number;
  submission_count: number;
  consistency_score: number;
  wins: string | null;
  challenges: string | null;
  lessons_learned: string | null;
  goals_next_week: string | null;
  trainer_feedback: string | null;
  trainer_id: string | null;
  created_at: string;
  updated_at: string;
}

interface DailySubmission {
  day: string;
  date: string;
  submitted: boolean;
  verified: boolean;
  activity_id: string | null;
}

function formatWeekRange(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return `${start.toLocaleDateString("en-US", { timeZone: NIGERIA_TIME_ZONE, month: "long", day: "numeric" })} - ${end.toLocaleDateString("en-US", { timeZone: NIGERIA_TIME_ZONE, month: "long", day: "numeric", year: "numeric" })}`;
}

function getWeekNumber(dateStr: string) {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
  );
}

const WEEKLY_STAT_TARGETS = { pages: WEEKLY_PAGES_TARGET, gigs: 10, income: 2000, contacts: 75 };

export function WeeklyReportScreen() {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => getStyles(tokens), [tokens]);
  const tabBarClearance = useTabBarContentPaddingBottom();
  const { user, isTrainer } = useAuth();
  const weekOptions = useMemo(
    () =>
      listRecentWeekStarts(16).map((value) => ({
        value,
        label: `W${getSundayWeekNumber(value)} · ${value}`,
      })),
    [],
  );
  const [selectedWeekStart, setSelectedWeekStart] = useState(getNigeriaWeekStartISO);
  const [reviewDay, setReviewDay] = useState<(Partial<ActivityRow> & { activity_date: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [dailySubmissions, setDailySubmissions] = useState<DailySubmission[]>([]);
  const [trainerName, setTrainerName] = useState<string | null>(null);
  const [trainerFeedbackInput, setTrainerFeedbackInput] = useState("");
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [reflection, setReflection] = useState({
    wins: "",
    challenges: "",
    lessons_learned: "",
    goals_next_week: "",
  });

  const Field = ({ label, children }: { label: string; children: ReactNode }) => (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );

  const fetchDailySubmissions = useCallback(
    async (weekStart: string, _weekEnd: string, uid: string) => {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const submissions: DailySubmission[] = [];

      for (let i = 0; i < 7; i++) {
        const dateStr = addDaysISODate(weekStart, i);
        const dayIdx = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
        const dayName = days[dayIdx];

        const { data: activity } = await supabase
          .from("daily_activities")
          .select("id, is_verified")
          .eq("user_id", uid)
          .eq("activity_date", dateStr)
          .maybeSingle();

        submissions.push({
          day: dayName,
          date: dateStr,
          submitted: !!activity,
          verified: activity?.is_verified || false,
          activity_id: activity?.id || null,
        });
      }

      setDailySubmissions(submissions);
    },
    [],
  );

  const fetchWeeklyReport = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_or_generate_weekly_report_for_week", {
        p_user_id: user.id,
        p_week_start_date: selectedWeekStart,
      });

      if (error) throw error;

      if (data && Array.isArray(data) && data.length > 0) {
        const report = data[0] as WeeklyReport;
        setWeeklyReport(report);
        setReflection({
          wins: report.wins || "",
          challenges: report.challenges || "",
          lessons_learned: report.lessons_learned || "",
          goals_next_week: report.goals_next_week || "",
        });

        if (report.trainer_id) {
          const { data: trainerData } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", report.trainer_id)
            .maybeSingle();
          if (trainerData) setTrainerName((trainerData as { full_name: string | null }).full_name);
          else setTrainerName(null);
        } else {
          setTrainerName(null);
        }

        if (isTrainer) {
          setTrainerFeedbackInput(report.trainer_feedback || "");
        }

        await fetchDailySubmissions(report.week_start_date, report.week_end_date, user.id);
      } else {
        const weekStartISO = selectedWeekStart;

        const { error: genError } = await supabase.rpc("generate_weekly_report", {
          p_user_id: user.id,
          p_week_start_date: weekStartISO,
        });

        if (genError) throw genError;

        const { data: reportData, error: fetchError } = await supabase
          .from("weekly_reports")
          .select("*")
          .eq("user_id", user.id)
          .eq("week_start_date", weekStartISO)
          .maybeSingle();

        if (!fetchError && reportData) {
          const report = reportData as WeeklyReport;
          setWeeklyReport(report);
          setReflection({
            wins: report.wins || "",
            challenges: report.challenges || "",
            lessons_learned: report.lessons_learned || "",
            goals_next_week: report.goals_next_week || "",
          });
          if (isTrainer) setTrainerFeedbackInput(report.trainer_feedback || "");
          await fetchDailySubmissions(report.week_start_date, report.week_end_date, user.id);
        }
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to load weekly report");
    } finally {
      setLoading(false);
    }
  }, [user, isTrainer, fetchDailySubmissions, selectedWeekStart]);

  useFocusEffect(
    useCallback(() => {
      if (user) fetchWeeklyReport();
    }, [user, fetchWeeklyReport]),
  );

  const handleSaveReflection = async () => {
    if (!weeklyReport || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("weekly_reports")
        .update({
          wins: reflection.wins || null,
          challenges: reflection.challenges || null,
          lessons_learned: reflection.lessons_learned || null,
          goals_next_week: reflection.goals_next_week || null,
        })
        .eq("id", weeklyReport.id);

      if (error) throw error;
      showToast("Reflection saved");
      await fetchWeeklyReport();
    } catch (e) {
      console.error(e);
      showToast("Failed to save reflection");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTrainerFeedback = async () => {
    if (!weeklyReport || !user || !isTrainer) return;
    setSavingFeedback(true);
    try {
      const { error } = await supabase
        .from("weekly_reports")
        .update({
          trainer_feedback: trainerFeedbackInput || null,
          trainer_id: user.id,
        })
        .eq("id", weeklyReport.id);

      if (error) throw error;

      await notifyUser({
        user_id: weeklyReport.user_id,
        title: "Weekly Report Feedback",
        message: `Your trainer has provided feedback on your weekly report for the week of ${formatWeekRange(weeklyReport.week_start_date, weeklyReport.week_end_date)}.`,
        type: "feedback",
        link: "/weekly-reports",
        sendEmail: false,
      });

      showToast("Trainer feedback saved");
      await fetchWeeklyReport();
    } catch (e) {
      console.error(e);
      showToast("Failed to save trainer feedback");
    } finally {
      setSavingFeedback(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.tabLoading}>
        <ActivityIndicator size="large" color={tokens.colors.primary} />
        <Text style={styles.muted}>Loading weekly report…</Text>
      </View>
    );
  }

  if (!weeklyReport) {
    return (
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarClearance }]}
        style={styles.scroll}
      >
        <PeriodPicker options={weekOptions} value={selectedWeekStart} onChange={setSelectedWeekStart} />
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No weekly report yet</Text>
          <Text style={styles.mutedCenter}>Submit daily activities to generate your weekly report.</Text>
        </Card>
      </ScrollView>
    );
  }

  const weeklyStats: {
    label: string;
    current: number;
    target: number;
    trend: "up" | "down";
    isMoney?: boolean;
  }[] = [
    {
      label: "Pages Read",
      current: weeklyReport.total_pages_read || 0,
      target: WEEKLY_STAT_TARGETS.pages,
      trend: (weeklyReport.total_pages_read || 0) >= WEEKLY_STAT_TARGETS.pages ? "up" : "down",
    },
    {
      label: "Gigs Created",
      current: weeklyReport.total_gigs_created || 0,
      target: WEEKLY_STAT_TARGETS.gigs,
      trend: (weeklyReport.total_gigs_created || 0) >= WEEKLY_STAT_TARGETS.gigs ? "up" : "down",
    },
    {
      label: "Net Income",
      current: Number(weeklyReport.total_net_income || 0),
      target: WEEKLY_STAT_TARGETS.income,
      trend: Number(weeklyReport.total_net_income || 0) >= WEEKLY_STAT_TARGETS.income ? "up" : "down",
      isMoney: true,
    },
    {
      label: "Prospects Contacted",
      current: weeklyReport.total_contacts || 0,
      target: WEEKLY_STAT_TARGETS.contacts,
      trend: (weeklyReport.total_contacts || 0) >= WEEKLY_STAT_TARGETS.contacts ? "up" : "down",
    },
  ];

  const verifiedCount = dailySubmissions.filter((d) => d.verified).length;
  const consistencyScore = Number(weeklyReport.consistency_score || 0);

  return (
    <>
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarClearance }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <PeriodPicker options={weekOptions} value={selectedWeekStart} onChange={setSelectedWeekStart} />

      <View style={styles.weekHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.muted}>📅 Week of {formatWeekRange(weeklyReport.week_start_date, weeklyReport.week_end_date)}</Text>
        </View>
        <Badge variant="outline">
          Week {getWeekNumber(weeklyReport.week_start_date)} of {new Date(weeklyReport.week_start_date).getFullYear()}
        </Badge>
      </View>

      {weeklyStats.map((stat) => {
        const pct = Math.min((stat.current / stat.target) * 100, 100);
        const isMoney = stat.isMoney;
        return (
          <Card key={stat.label} style={styles.statCard}>
            <View style={styles.statTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.statLabel}>{stat.label}</Text>
                <Text style={styles.statValue}>
                  {isMoney ? `$${stat.current}` : stat.current}
                </Text>
                <Text style={styles.statTarget}>
                  Target: {isMoney ? `$${stat.target}` : stat.target}
                </Text>
              </View>
              <Text style={[styles.trendMark, stat.trend === "up" ? styles.trendUp : styles.trendDown]}>
                {stat.trend === "up" ? "▲" : "▼"}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct}%` }]} />
            </View>
          </Card>
        );
      })}

      <Card style={styles.sectionCard}>
        <CardHeader>
          <CardTitle>
            <Text style={styles.cardTitleText}>Daily submission overview</Text>
          </CardTitle>
          <CardDescription>
            <Text style={styles.cardDescText}>Your submission history for this week</Text>
          </CardDescription>
        </CardHeader>
        <CardContent style={{ gap: 10 }}>
          {dailySubmissions.map((day) => (
            <Pressable
              key={day.date}
              style={styles.dayRow}
              onPress={async () => {
                if (!day.activity_id || !user) return;
                const { data } = await supabase.from("daily_activities").select("*").eq("id", day.activity_id).maybeSingle();
                setReviewDay((data as ActivityRow) ?? { id: day.activity_id, user_id: user.id, activity_date: day.date });
              }}
            >
              <View style={styles.dayRowLeft}>
                <View
                  style={[
                    styles.dayIcon,
                    day.submitted
                      ? day.verified
                        ? styles.dayIconOk
                        : styles.dayIconPending
                      : styles.dayIconMiss,
                  ]}
                >
                  <Text style={styles.dayIconChar}>
                    {day.submitted ? (day.verified ? "✓" : "⏱") : "✗"}
                  </Text>
                </View>
                <View>
                  <Text style={styles.dayName}>{day.day}</Text>
                  <Text style={styles.mutedSmall}>
                    {day.submitted
                      ? new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : "No submission"}
                  </Text>
                </View>
              </View>
              <Badge variant={day.submitted ? (day.verified ? "success" : "warning") : "outline"}>
                {day.submitted ? (day.verified ? "Verified" : "Pending") : "Missed"}
              </Badge>
            </Pressable>
          ))}
        </CardContent>
      </Card>

      <Card style={styles.sectionCard}>
        <CardHeader>
          <CardTitle>
            <Text style={styles.cardTitleText}>Weekly score</Text>
          </CardTitle>
          <CardDescription>
            <Text style={styles.cardDescText}>Your overall performance this week</Text>
          </CardDescription>
        </CardHeader>
        <CardContent style={styles.scoreBlock}>
          <Text style={styles.scoreBig}>{Math.round(consistencyScore)}%</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(consistencyScore, 100)}%` }]} />
          </View>
          <Text style={styles.mutedCenter}>
            {weeklyReport.submission_count} of 7 days submitted{"\n"}
            {verifiedCount} of {weeklyReport.submission_count} reports verified
          </Text>
        </CardContent>
      </Card>

      <Card style={styles.sectionCard}>
        <CardHeader>
          <CardTitle>
            <Text style={styles.cardTitleText}>💬 Trainer feedback</Text>
          </CardTitle>
          <CardDescription>
            <Text style={styles.cardDescText}>
              {isTrainer
                ? "Provide feedback and guidance for this weekly report"
                : "Comments and guidance from your trainer"}
            </Text>
          </CardDescription>
        </CardHeader>
        <CardContent style={{ gap: 12 }}>
          {isTrainer ? (
            <>
              <Text style={styles.label}>Your feedback</Text>
              <Textarea
                placeholder="Provide constructive feedback…"
                value={trainerFeedbackInput}
                onChangeText={setTrainerFeedbackInput}
                style={{ minHeight: 120 }}
              />
              {!!weeklyReport.trainer_feedback && weeklyReport.trainer_id !== user?.id && (
                <View style={styles.quoteBox}>
                  <Text style={styles.quoteMeta}>{trainerName || "Previous trainer"}</Text>
                  <Text style={styles.mutedSmall}>{weeklyReport.trainer_feedback}</Text>
                </View>
              )}
              <Button
                title={savingFeedback ? "Saving…" : weeklyReport.trainer_feedback ? "Update feedback" : "Save feedback"}
                onPress={handleSaveTrainerFeedback}
                disabled={savingFeedback}
              />
            </>
          ) : weeklyReport.trainer_feedback ? (
            <View style={styles.quoteBox}>
              <View style={styles.quoteHeader}>
                <Text style={styles.quoteMeta}>{trainerName || "Trainer"}</Text>
                <Text style={styles.mutedSmall}>
                  {new Date(weeklyReport.updated_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              </View>
              <Text style={styles.bodyText}>{weeklyReport.trainer_feedback}</Text>
            </View>
          ) : (
            <Text style={styles.mutedCenter}>
              No trainer feedback yet. Your trainer will provide feedback after reviewing your weekly report.
            </Text>
          )}
        </CardContent>
      </Card>

      <Card style={styles.sectionCard}>
        <CardHeader>
          <CardTitle>
            <Text style={styles.cardTitleText}>Weekly reflection</Text>
          </CardTitle>
          <CardDescription>
            <Text style={styles.cardDescText}>Reflect on your progress and set intentions for next week</Text>
          </CardDescription>
        </CardHeader>
        <CardContent style={{ gap: 12 }}>
          <Field label="What went well this week?">
            <Textarea
              placeholder="Describe your wins…"
              value={reflection.wins}
              onChangeText={(t) => setReflection((r) => ({ ...r, wins: t }))}
              style={{ minHeight: 90 }}
            />
          </Field>
          <Field label="What could be improved?">
            <Textarea
              placeholder="Areas for growth…"
              value={reflection.challenges}
              onChangeText={(t) => setReflection((r) => ({ ...r, challenges: t }))}
              style={{ minHeight: 90 }}
            />
          </Field>
          <Field label="Lessons learned">
            <Textarea
              placeholder="What did you learn?"
              value={reflection.lessons_learned}
              onChangeText={(t) => setReflection((r) => ({ ...r, lessons_learned: t }))}
              style={{ minHeight: 90 }}
            />
          </Field>
          <Field label="Goals for next week">
            <Textarea
              placeholder="Specific, achievable goals…"
              value={reflection.goals_next_week}
              onChangeText={(t) => setReflection((r) => ({ ...r, goals_next_week: t }))}
              style={{ minHeight: 90 }}
            />
          </Field>
          <Button title={saving ? "Saving…" : "Save reflection"} onPress={handleSaveReflection} disabled={saving} />
        </CardContent>
      </Card>
    </ScrollView>
    <SubmissionReviewDialog
      visible={Boolean(reviewDay)}
      activity={reviewDay}
      onClose={() => setReviewDay(null)}
    />
    </>
  );
}

function getStyles(tokens: ThemeTokens) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: tokens.colors.background },
    scrollContent: { padding: 18, gap: 14 },
    tabLoading: { flex: 1, paddingVertical: 48, alignItems: "center", justifyContent: "center", gap: 10 },
    muted: { fontSize: 13, color: tokens.colors.mutedForeground },
    mutedCenter: {
      fontSize: 13,
      color: tokens.colors.mutedForeground,
      textAlign: "center",
    },
    mutedSmall: { fontSize: 12, color: tokens.colors.mutedForeground },
    weekHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      marginBottom: 4,
      paddingBottom: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: tokens.colors.border,
    },
    statCard: { padding: 14, gap: 8 },
    statTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
    statLabel: { fontSize: 12, color: tokens.colors.mutedForeground },
    statValue: { fontSize: 24, fontWeight: "800", color: tokens.colors.foreground },
    statTarget: { fontSize: 11, color: tokens.colors.mutedForeground, marginTop: 2 },
    trendMark: { fontSize: 18, fontWeight: "800" },
    trendUp: { color: tokens.colors.success },
    trendDown: { color: tokens.colors.destructive },
    progressTrack: {
      height: 6,
      borderRadius: 999,
      backgroundColor: tokens.colors.border,
      overflow: "hidden",
      marginTop: 4,
    },
    progressFill: { height: "100%", backgroundColor: tokens.colors.primary, borderRadius: 999 },
    sectionCard: { padding: 14 },
    cardTitleText: { fontSize: 17, fontWeight: "800", color: tokens.colors.foreground },
    cardDescText: { fontSize: 13, color: tokens.colors.mutedForeground, marginTop: 4 },
    dayRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 12,
      borderRadius: tokens.radius.md,
      backgroundColor: tokens.colors.accent,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: tokens.colors.border,
    },
    dayRowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
    dayIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    dayIconOk: {
      backgroundColor: tokens.colors.accentStrong,
      borderWidth: 1,
      borderColor: tokens.colors.success,
    },
    dayIconPending: {
      backgroundColor: tokens.colors.accent,
      borderWidth: 1,
      borderColor: tokens.colors.warning,
    },
    dayIconMiss: {
      backgroundColor: tokens.colors.cardMuted,
      borderWidth: 1,
      borderColor: tokens.colors.border,
    },
    dayIconChar: { fontSize: 16, fontWeight: "700", color: tokens.colors.foreground },
    dayName: { fontWeight: "700", color: tokens.colors.foreground },
    scoreBlock: { alignItems: "center", gap: 10 },
    scoreBig: { fontSize: 36, fontWeight: "800", color: tokens.colors.primary },
    quoteBox: {
      padding: 12,
      borderRadius: tokens.radius.md,
      backgroundColor: tokens.colors.accent,
      borderLeftWidth: 4,
      borderLeftColor: tokens.colors.primary,
      gap: 6,
    },
    quoteHeader: { flexDirection: "row", justifyContent: "space-between" },
    quoteMeta: { fontWeight: "700", color: tokens.colors.foreground },
    bodyText: { fontSize: 14, color: tokens.colors.foreground },
    label: { fontSize: 13, fontWeight: "700", color: tokens.colors.foreground },
    emptyCard: { padding: 24, alignItems: "center" },
    emptyTitle: { fontSize: 17, fontWeight: "800", marginBottom: 8, color: tokens.colors.foreground },
  });
}
