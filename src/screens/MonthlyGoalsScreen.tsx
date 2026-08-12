import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { pickProofFromGallery, snapLiveProofPhoto } from "../lib/pickProofImage";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../integrations/supabase/client";
import {
  formatISODateInNigeria,
  formatMonthYearLabel,
  getNigeriaMonthEndISO,
  getNigeriaMonthStartISO,
  listRecentMonthStarts,
  NIGERIA_TIME_ZONE,
} from "../lib/nigeriaTime";
import { getGoalBookImagePaths, isMonthlyGoalWindowOpen } from "../lib/monthlyGoalWindow";
import { getPublicImageUrl } from "../lib/activityTypes";
import { fetchYearProgress, pickHighlightDay, type HighlightDay, type YearProgress } from "../lib/yearHighlights";
import { maybeNotifyHighlight, scheduleYearProgressReminder } from "../lib/memoryReminders";
import { PeriodPicker } from "../components/reports/PeriodPicker";
import { getLocalUriAsUploadBody } from "../lib/localFileForUpload";
import { Textarea } from "../components/ui/Textarea";
import type { WeeklyReport } from "./WeeklyReportScreen";
import { tokens } from "../theme/tokens";
import { useTabBarContentPaddingBottom } from "../hooks/useTabBarContentPaddingBottom";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import { KeyboardSafeScroll } from "../components/ui/KeyboardSafe";
import { showAndroidToast } from "../lib/androidToast";

function showToast(message: string) {
  if (Platform.OS === "android") showAndroidToast(message);
}

interface MonthlyGoal {
  id: string;
  user_id: string;
  month_year: string;
  target_pages: number;
  target_gigs: number;
  target_accounts: number;
  target_income: number;
  target_contacts: number;
  target_tags?: number | null;
  target_conversions?: number | null;
  things_to_learn?: string | null;
  goal_book_image?: string | null;
  goal_book_images?: string[] | null;
  actual_pages: number;
  actual_gigs: number;
  actual_accounts: number;
  actual_income: number;
  actual_contacts: number;
  actual_tags?: number | null;
  actual_conversions?: number | null;
  actual_things_learned?: string | null;
  consistency_score: number;
  skill_progress_notes: string | null;
  income_summary: string | null;
  created_at: string;
  updated_at: string;
}

interface WeeklyBreakdown {
  week: number;
  pages: number;
  gigs: number;
  income: number;
  contacts: number;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function MiniSummary({ label, value, symbol }: { label: string; value: string; symbol: string }) {
  return (
    <Card style={styles.miniCard}>
      <Text style={styles.miniSymbol}>{symbol}</Text>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </Card>
  );
}

function MiniStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card style={styles.miniCard}>
      <Text style={[styles.miniValue, highlight && { color: tokens.colors.primary }]}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </Card>
  );
}

function MemoryCard({ memory }: { memory: HighlightDay }) {
  return (
    <Card style={styles.memoryCard}>
      <Text style={styles.memoryKicker}>{memory.isAnniversary ? "On this day" : "A day worth remembering"}</Text>
      <Text style={styles.memoryHeading}>{memory.heading}</Text>
      <Text style={styles.muted}>{memory.message}</Text>
    </Card>
  );
}

function YearCalculator({ progress, currentMonth }: { progress: YearProgress; currentMonth: string }) {
  const money = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  return (
    <Card style={styles.sectionCard}>
      <CardHeader>
        <CardTitle>
          <Text style={styles.cardTitleText}>{progress.year} auto calculator</Text>
        </CardTitle>
        <CardDescription>
          <Text style={styles.cardDescText}>January through December — live totals from your daily reports</Text>
        </CardDescription>
      </CardHeader>
      <CardContent style={{ gap: 12 }}>
        <View style={styles.summaryGrid}>
          <MiniStat label="Book pages" value={String(progress.pages)} highlight />
          <MiniStat label="Gigs written" value={String(progress.gigs)} />
          <MiniStat label="Fiverr net" value={money(progress.fiverrIncome)} />
          <MiniStat label="Outside Fiverr" value={money(progress.outsideIncome)} />
          <MiniStat label="All income" value={money(progress.totalIncome)} highlight />
        </View>
        {progress.months.map((m) => {
          const isCurrent = m.monthStart === currentMonth;
          const ahead = m.monthStart > currentMonth;
          return (
            <View key={m.monthStart} style={[styles.breakdownRow, isCurrent && styles.breakdownTotal]}>
              <Text style={styles.breakdownWeek}>
                {m.label.replace(` ${progress.year}`, "")}
                {isCurrent ? " · now" : ahead ? " · ahead" : ""}
              </Text>
              <Text style={styles.breakdownCell}>{m.pages} pg</Text>
              <Text style={styles.breakdownCell}>{m.gigs} gigs</Text>
              <Text style={styles.breakdownCell}>{money(m.fiverrIncome)} Fv</Text>
              <Text style={styles.breakdownCell}>{money(m.outsideIncome)} out</Text>
            </View>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function MonthlyGoalsScreen() {
  const tabBarClearance = useTabBarContentPaddingBottom();
  const { user, officeId } = useAuth();
  const monthOptions = useMemo(
    () => listRecentMonthStarts(12).map((value) => ({ value, label: formatMonthYearLabel(value) })),
    [],
  );
  const [selectedMonthStart, setSelectedMonthStart] = useState(getNigeriaMonthStartISO);
  const windowOpen = isMonthlyGoalWindowOpen(selectedMonthStart);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [monthlyGoal, setMonthlyGoal] = useState<MonthlyGoal | null>(null);
  const [weeklyBreakdown, setWeeklyBreakdown] = useState<WeeklyBreakdown[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bookUris, setBookUris] = useState<string[]>([]);
  const [bookPreview, setBookPreview] = useState<string | null>(null);
  const [yearProgress, setYearProgress] = useState<YearProgress | null>(null);
  const [memory, setMemory] = useState<HighlightDay | null>(null);
  const [goalInputs, setGoalInputs] = useState({
    target_pages: "",
    target_gigs: "",
    target_accounts: "",
    target_income: "",
    target_contacts: "",
    target_tags: "",
    target_conversions: "",
    things_to_learn: "",
  });
  const autoPromptedRef = useRef(false);

  const fetchWeeklyBreakdown = useCallback(
    async (monthYear: string, uid: string) => {
      const monthStartISO = monthYear;
      const d = new Date(`${monthYear}T00:00:00Z`);
      const monthEndISO = getNigeriaMonthEndISO(d);

      const { data: weeklyReports } = await supabase
        .from("weekly_reports")
        .select("*")
        .eq("user_id", uid)
        .gte("week_start_date", monthStartISO)
        .lte("week_end_date", monthEndISO)
        .order("week_start_date", { ascending: true });

      if (weeklyReports) {
        const breakdown: WeeklyBreakdown[] = weeklyReports.map((report: WeeklyReport, index: number) => ({
          week: index + 1,
          pages: report.total_pages_read || 0,
          gigs: report.total_gigs_created || 0,
          income: Number(report.total_net_income || 0),
          contacts: report.total_contacts || 0,
        }));
        setWeeklyBreakdown(breakdown);
      }
    },
    [],
  );

  const fetchMonthlyGoal = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_or_generate_monthly_goal", {
        p_user_id: user.id,
        p_month_year: selectedMonthStart,
      });

      if (error) throw error;

      if (data && Array.isArray(data) && data.length > 0) {
        const goal = data[0] as MonthlyGoal;
        setMonthlyGoal(goal);
        setGoalInputs({
          target_pages: goal.target_pages?.toString() || "",
          target_gigs: goal.target_gigs?.toString() || "",
          target_accounts: goal.target_accounts?.toString() || "",
          target_income: goal.target_income?.toString() || "",
          target_contacts: goal.target_contacts?.toString() || "",
          target_tags: goal.target_tags?.toString() || "",
          target_conversions: goal.target_conversions?.toString() || "",
          things_to_learn: goal.things_to_learn || "",
        });
        setBookUris([]);
        await fetchWeeklyBreakdown(goal.month_year, user.id);
      } else {
        setMonthlyGoal(null);
        setWeeklyBreakdown([]);
      }
      try {
        const year = Number(selectedMonthStart.slice(0, 4));
        const { progress, rows } = await fetchYearProgress(user.id, year);
        setYearProgress(progress);
        const highlight = pickHighlightDay(rows);
        setMemory(highlight);
        void scheduleYearProgressReminder();
        if (highlight) {
          void maybeNotifyHighlight({ userId: user.id, todayISO: formatISODateInNigeria(), highlight });
        }
      } catch (yearErr) {
        console.error(yearErr);
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to load monthly goals");
    } finally {
      setLoading(false);
    }
  }, [user, fetchWeeklyBreakdown, selectedMonthStart]);

  useFocusEffect(
    useCallback(() => {
      if (user) fetchMonthlyGoal();
    }, [user, fetchMonthlyGoal]),
  );

  const targetsAreEmpty = useMemo(() => {
    if (!monthlyGoal) return false;
    return (
      (monthlyGoal.target_pages || 0) === 0 &&
      (monthlyGoal.target_gigs || 0) === 0 &&
      (monthlyGoal.target_accounts || 0) === 0 &&
      Number(monthlyGoal.target_income || 0) === 0 &&
      (monthlyGoal.target_contacts || 0) === 0
    );
  }, [monthlyGoal]);

  useEffect(() => {
    if (monthlyGoal && targetsAreEmpty && windowOpen && !autoPromptedRef.current) {
      autoPromptedRef.current = true;
      setDialogOpen(true);
    }
  }, [monthlyGoal, targetsAreEmpty]);

  const handleSaveGoals = async () => {
    if (!monthlyGoal || !user) return;
    if (!windowOpen) {
      showToast("Monthly targets can only be edited from 3 days before month start through day 3.");
      return;
    }
    setSaving(true);
    try {
      const existingBooks = getGoalBookImagePaths(monthlyGoal);
      const uploaded: string[] = [];
      for (const uri of bookUris) {
        const { body, contentType } = await getLocalUriAsUploadBody(uri);
        const ext = uri.match(/\.(\w+)(\?|$)/)?.[1] ?? "jpg";
        const path = `${user.id}/goal_book_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("avatars").upload(path, body, { contentType, upsert: false });
        if (upErr) throw upErr;
        uploaded.push(path);
      }
      const books = [...existingBooks, ...uploaded];
      const { error } = await supabase
        .from("monthly_goals")
        .update({
          target_pages: parseInt(goalInputs.target_pages, 10) || 0,
          target_gigs: parseInt(goalInputs.target_gigs, 10) || 0,
          target_accounts: parseInt(goalInputs.target_accounts, 10) || 0,
          target_income: parseFloat(goalInputs.target_income) || 0,
          target_contacts: parseInt(goalInputs.target_contacts, 10) || 0,
          target_tags: parseInt(goalInputs.target_tags, 10) || 0,
          target_conversions: parseInt(goalInputs.target_conversions, 10) || 0,
          things_to_learn: goalInputs.things_to_learn.trim() || null,
          goal_book_images: books,
          office_id: officeId,
        })
        .eq("id", monthlyGoal.id);

      if (error) throw error;
      showToast("Monthly goals saved");
      setDialogOpen(false);
      await fetchMonthlyGoal();
    } catch (e) {
      console.error(e);
      showToast("Failed to save goals");
    } finally {
      setSaving(false);
    }
  };

  const formatMonthYear = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { timeZone: NIGERIA_TIME_ZONE, month: "long", year: "numeric" });
  };

  const getDaysInMonth = (dateString: string) => {
    const date = new Date(dateString);
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  if (loading) {
    return (
      <View style={styles.tabLoading}>
        <ActivityIndicator size="large" color={tokens.colors.primary} />
        <Text style={styles.muted}>Loading monthly goals…</Text>
      </View>
    );
  }

  if (!monthlyGoal) {
    return (
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarClearance }]}
        style={styles.scroll}
      >
        <PeriodPicker options={monthOptions} value={selectedMonthStart} onChange={setSelectedMonthStart} />
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No monthly goal yet</Text>
          <Text style={styles.mutedCenter}>Set your monthly goals to get started.</Text>
        </Card>
        {memory ? <MemoryCard memory={memory} /> : null}
        {yearProgress ? <YearCalculator progress={yearProgress} currentMonth={getNigeriaMonthStartISO()} /> : null}
      </ScrollView>
    );
  }

  const monthlyGoals = [
    {
      category: "Reading & Learning",
      goal: monthlyGoal.target_pages || 0,
      current: monthlyGoal.actual_pages || 0,
      unit: "pages" as const,
      status:
        (monthlyGoal.actual_pages || 0) >= (monthlyGoal.target_pages || 1)
          ? ("exceeded" as const)
          : (monthlyGoal.actual_pages || 0) >= (monthlyGoal.target_pages || 1) * 0.8
            ? ("on-track" as const)
            : ("behind" as const),
    },
    {
      category: "Gig Creation",
      goal: monthlyGoal.target_gigs || 0,
      current: monthlyGoal.actual_gigs || 0,
      unit: "gigs" as const,
      status:
        (monthlyGoal.actual_gigs || 0) >= (monthlyGoal.target_gigs || 1)
          ? ("exceeded" as const)
          : (monthlyGoal.actual_gigs || 0) >= (monthlyGoal.target_gigs || 1) * 0.8
            ? ("on-track" as const)
            : ("behind" as const),
    },
    {
      category: "Income",
      goal: Number(monthlyGoal.target_income || 0),
      current: Number(monthlyGoal.actual_income || 0),
      unit: "$" as const,
      status:
        Number(monthlyGoal.actual_income || 0) >= Number(monthlyGoal.target_income || 1)
          ? ("exceeded" as const)
          : Number(monthlyGoal.actual_income || 0) >= Number(monthlyGoal.target_income || 1) * 0.8
            ? ("on-track" as const)
            : ("behind" as const),
    },
    {
      category: "Prospecting",
      goal: monthlyGoal.target_contacts || 0,
      current: monthlyGoal.actual_contacts || 0,
      unit: "contacts" as const,
      status:
        (monthlyGoal.actual_contacts || 0) >= (monthlyGoal.target_contacts || 1)
          ? ("exceeded" as const)
          : (monthlyGoal.actual_contacts || 0) >= (monthlyGoal.target_contacts || 1) * 0.8
            ? ("on-track" as const)
            : ("behind" as const),
    },
    {
      category: "Tags",
      goal: monthlyGoal.target_tags || 0,
      current: monthlyGoal.actual_tags || 0,
      unit: "tags" as const,
      status:
        (monthlyGoal.actual_tags || 0) >= (monthlyGoal.target_tags || 1)
          ? ("exceeded" as const)
          : (monthlyGoal.actual_tags || 0) >= (monthlyGoal.target_tags || 1) * 0.8
            ? ("on-track" as const)
            : ("behind" as const),
    },
  ];
  const bookPaths = getGoalBookImagePaths(monthlyGoal);

  const goalsOnTrack = monthlyGoals.filter((g) => g.status === "exceeded" || g.status === "on-track").length;
  const totalDays = getDaysInMonth(monthlyGoal.month_year);
  const daysSubmitted = Math.round((Number(monthlyGoal.consistency_score || 0) / 100) * totalDays);
  const overallGrade =
    goalsOnTrack >= monthlyGoals.length * 0.8
      ? "A"
      : goalsOnTrack >= monthlyGoals.length * 0.6
        ? "B"
        : goalsOnTrack >= monthlyGoals.length * 0.4
          ? "C"
          : "D";

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarClearance }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <PeriodPicker options={monthOptions} value={selectedMonthStart} onChange={setSelectedMonthStart} />
        {!windowOpen ? (
          <Card style={styles.bannerCard}>
            <Text style={styles.bannerTitle}>Editing locked</Text>
            <Text style={styles.muted}>
              Monthly targets can be set from 3 days before this month starts through day 3 of the month.
            </Text>
          </Card>
        ) : null}
        {targetsAreEmpty && windowOpen && (
          <Card style={styles.bannerCard}>
            <Text style={styles.bannerTitle}>Set your monthly targets</Text>
            <Text style={styles.muted}>
              Your targets are still 0 for this month — use Set monthly targets to configure them.
            </Text>
            <Button title="Set monthly targets" onPress={() => setDialogOpen(true)} />
          </Card>
        )}

        {memory ? <MemoryCard memory={memory} /> : null}

        <View style={styles.monthHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.muted}>📅 {formatMonthYear(monthlyGoal.month_year)}</Text>
          </View>
          {windowOpen ? (
            <Pressable style={styles.outlineBtn} onPress={() => setDialogOpen(true)}>
              <Text style={styles.outlineBtnText}>{targetsAreEmpty ? "Set goals" : "Edit goals"}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.summaryGrid}>
          <MiniSummary label="Goals on track" value={`${goalsOnTrack}/${monthlyGoals.length}`} symbol="🎯" />
          <MiniSummary
            label="Consistency"
            value={`${Math.round(Number(monthlyGoal.consistency_score || 0))}%`}
            symbol="✓"
          />
          <MiniSummary
            label="Total income"
            value={`$${Number(monthlyGoal.actual_income || 0).toLocaleString()}`}
            symbol="💵"
          />
          <MiniSummary label="Days submitted" value={`${daysSubmitted}/${totalDays}`} symbol="📆" />
        </View>

        {bookPaths.length > 0 ? (
          <Card style={styles.sectionCard}>
            <CardHeader>
              <CardTitle>
                <Text style={styles.cardTitleText}>Goals book</Text>
              </CardTitle>
              <CardDescription>
                <Text style={styles.cardDescText}>
                  {bookPaths.length} uploaded photo{bookPaths.length === 1 ? "" : "s"} — tap to preview
                </Text>
              </CardDescription>
            </CardHeader>
            <CardContent style={styles.bookGrid}>
              {bookPaths.map((path) => {
                const uri = getPublicImageUrl(path);
                if (!uri) return null;
                return (
                  <Pressable key={path} onPress={() => setBookPreview(uri)}>
                    <Image source={{ uri }} style={styles.bookThumb} resizeMode="cover" />
                  </Pressable>
                );
              })}
            </CardContent>
          </Card>
        ) : null}

        {monthlyGoal.things_to_learn ? (
          <Card style={styles.sectionCard}>
            <Text style={styles.cardTitleText}>Things to learn</Text>
            <Text style={styles.muted}>{monthlyGoal.things_to_learn}</Text>
            {monthlyGoal.actual_things_learned ? (
              <Text style={styles.muted}>Logged: {monthlyGoal.actual_things_learned}</Text>
            ) : null}
          </Card>
        ) : null}

        <Card style={styles.sectionCard}>
          <CardHeader>
            <CardTitle>
              <Text style={styles.cardTitleText}>Goals progress</Text>
            </CardTitle>
            <CardDescription>
              <Text style={styles.cardDescText}>Track progress toward monthly targets</Text>
            </CardDescription>
          </CardHeader>
          <CardContent style={{ gap: 16 }}>
            {monthlyGoals.map((goal) => {
              const safeGoal = goal.goal || 1;
              const progress = Math.min((goal.current / safeGoal) * 100, 100);
              const isExceeded = goal.current >= goal.goal;
              return (
                <View key={goal.category} style={{ gap: 8 }}>
                  <View style={styles.goalRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.goalCat}>{goal.category}</Text>
                      <Text style={styles.mutedSmall}>
                        {goal.unit === "$"
                          ? `$${goal.current} / $${goal.goal}`
                          : `${goal.current} / ${goal.goal} ${goal.unit}`}
                      </Text>
                    </View>
                    <View style={styles.goalBadges}>
                      <Text style={[styles.pctText, isExceeded ? styles.trendUp : styles.muted]}>{Math.round(progress)}%</Text>
                      {goal.status === "exceeded" && <Badge variant="success">Exceeded</Badge>}
                      {goal.status === "on-track" && <Badge variant="outline">On track</Badge>}
                      {goal.status === "behind" && <Badge variant="destructive">Behind</Badge>}
                    </View>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                  </View>
                </View>
              );
            })}
          </CardContent>
        </Card>

        <Card style={styles.sectionCard}>
          <CardHeader>
            <CardTitle>
              <Text style={styles.cardTitleText}>Weekly breakdown</Text>
            </CardTitle>
            <CardDescription>
              <Text style={styles.cardDescText}>Performance by week this month</Text>
            </CardDescription>
          </CardHeader>
          <CardContent style={{ gap: 10 }}>
            {weeklyBreakdown.length === 0 ? (
              <Text style={styles.mutedCenter}>No weekly reports for this month yet.</Text>
            ) : (
              weeklyBreakdown.map((w) => (
                <View key={w.week} style={styles.breakdownRow}>
                  <Text style={styles.breakdownWeek}>Week {w.week}</Text>
                  <Text style={styles.breakdownCell}>{w.pages} pg</Text>
                  <Text style={styles.breakdownCell}>{w.gigs} gigs</Text>
                  <Text style={styles.breakdownCell}>${w.income.toLocaleString()}</Text>
                  <Text style={styles.breakdownCell}>{w.contacts} ct</Text>
                </View>
              ))
            )}
            <View style={[styles.breakdownRow, styles.breakdownTotal]}>
              <Text style={styles.breakdownWeek}>Total</Text>
              <Text style={styles.breakdownCell}>{monthlyGoal.actual_pages || 0}</Text>
              <Text style={styles.breakdownCell}>{monthlyGoal.actual_gigs || 0}</Text>
              <Text style={styles.breakdownCell}>{`$${Number(monthlyGoal.actual_income || 0).toLocaleString()}`}</Text>
              <Text style={styles.breakdownCell}>{monthlyGoal.actual_contacts || 0}</Text>
            </View>
          </CardContent>
        </Card>

        <View style={styles.summaryGrid}>
          <MiniStat label={`Days submitted (of ${totalDays})`} value={String(daysSubmitted)} />
          <MiniStat label="Weeks completed" value={String(weeklyBreakdown.length)} />
          <MiniStat label="Consistency" value={`${Math.round(Number(monthlyGoal.consistency_score || 0))}%`} />
          <MiniStat label="Overall grade" value={overallGrade} highlight />
        </View>

        {yearProgress ? <YearCalculator progress={yearProgress} currentMonth={getNigeriaMonthStartISO()} /> : null}
      </ScrollView>

      <Modal visible={Boolean(bookPreview)} transparent animationType="fade" onRequestClose={() => setBookPreview(null)}>
        <Pressable style={styles.lightbox} onPress={() => setBookPreview(null)}>
          {bookPreview ? <Image source={{ uri: bookPreview }} style={styles.lightboxImage} resizeMode="contain" /> : null}
          <Text style={styles.lightboxHint}>Tap to close</Text>
        </Pressable>
      </Modal>

      <Modal visible={dialogOpen} transparent animationType="fade" onRequestClose={() => setDialogOpen(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardSafeScroll inModal contentContainerStyle={styles.modalBox}>
            <Text style={styles.modalTitle}>Set monthly goals</Text>
            <Text style={styles.muted}>Targets for {formatMonthYear(monthlyGoal.month_year)}</Text>
            <Field label="Target pages">
              <Input
                value={goalInputs.target_pages}
                onChangeText={(t) => setGoalInputs((g) => ({ ...g, target_pages: t }))}
                keyboardType="numeric"
              />
            </Field>
            <Field label="Target gigs">
              <Input
                value={goalInputs.target_gigs}
                onChangeText={(t) => setGoalInputs((g) => ({ ...g, target_gigs: t }))}
                keyboardType="numeric"
              />
            </Field>
            <Field label="Target accounts">
              <Input
                value={goalInputs.target_accounts}
                onChangeText={(t) => setGoalInputs((g) => ({ ...g, target_accounts: t }))}
                keyboardType="numeric"
              />
            </Field>
            <Field label="Target income ($)">
              <Input
                value={goalInputs.target_income}
                onChangeText={(t) => setGoalInputs((g) => ({ ...g, target_income: t }))}
                keyboardType="decimal-pad"
              />
            </Field>
            <Field label="Target contacts">
              <Input
                value={goalInputs.target_contacts}
                onChangeText={(t) => setGoalInputs((g) => ({ ...g, target_contacts: t }))}
                keyboardType="numeric"
              />
            </Field>
            <Field label="Target tags">
              <Input
                value={goalInputs.target_tags}
                onChangeText={(t) => setGoalInputs((g) => ({ ...g, target_tags: t }))}
                keyboardType="numeric"
              />
            </Field>
            <Field label="Target conversions">
              <Input
                value={goalInputs.target_conversions}
                onChangeText={(t) => setGoalInputs((g) => ({ ...g, target_conversions: t }))}
                keyboardType="numeric"
              />
            </Field>
            <Field label="Things to learn">
              <Textarea
                value={goalInputs.things_to_learn}
                onChangeText={(t) => setGoalInputs((g) => ({ ...g, things_to_learn: t }))}
                placeholder="Books and skills you will learn this month"
                style={{ minHeight: 90 }}
              />
            </Field>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Button
                title="Snap book live"
                onPress={async () => {
                  const uri = await snapLiveProofPhoto();
                  if (uri) setBookUris((prev) => [...prev, uri]);
                }}
              />
              <Button
                title="Gallery"
                variant="outline"
                onPress={async () => {
                  const uris = await pickProofFromGallery({ multiple: false, limit: 1 });
                  if (uris[0]) setBookUris((prev) => [...prev, uris[0]]);
                }}
              />
            </View>
            {getGoalBookImagePaths(monthlyGoal).map((path) => (
              <Image
                key={path}
                source={{ uri: supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl }}
                style={{ width: "100%", height: 120, borderRadius: 8 }}
              />
            ))}
            {bookUris.map((uri) => (
              <Image key={uri} source={{ uri }} style={{ width: "100%", height: 120, borderRadius: 8 }} />
            ))}
            <View style={styles.modalActions}>
              <Pressable style={styles.outlineBtn} onPress={() => setDialogOpen(false)}>
                <Text style={styles.outlineBtnText}>Cancel</Text>
              </Pressable>
              <Button title={saving ? "Saving…" : "Save goals"} onPress={handleSaveGoals} disabled={saving} />
            </View>
          </KeyboardSafeScroll>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: tokens.colors.background },
  scrollContent: { padding: 18, paddingBottom: 32, gap: 14 },
  tabLoading: { flex: 1, paddingVertical: 48, alignItems: "center", justifyContent: "center", gap: 10 },
  muted: { fontSize: 13, color: tokens.colors.mutedForeground },
  mutedCenter: {
    fontSize: 13,
    color: tokens.colors.mutedForeground,
    textAlign: "center",
  },
  mutedSmall: { fontSize: 12, color: tokens.colors.mutedForeground },
  monthHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  label: { fontSize: 13, fontWeight: "700", color: tokens.colors.foreground },
  emptyCard: { padding: 24, alignItems: "center" },
  emptyTitle: { fontSize: 17, fontWeight: "800", marginBottom: 8 },
  bannerCard: { padding: 16, gap: 10, borderColor: tokens.colors.primary, borderWidth: 1 },
  bannerTitle: { fontSize: 16, fontWeight: "800" },
  outlineBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.card,
    justifyContent: "center",
  },
  outlineBtnText: { fontWeight: "700", fontSize: 13, color: tokens.colors.foreground },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  miniCard: {
    width: "47%",
    flexGrow: 1,
    padding: 12,
    alignItems: "center",
    gap: 4,
    minWidth: 140,
  },
  miniSymbol: { fontSize: 22 },
  miniValue: { fontSize: 20, fontWeight: "800", color: tokens.colors.foreground },
  miniLabel: { fontSize: 11, color: tokens.colors.mutedForeground, textAlign: "center" },
  sectionCard: { padding: 14 },
  cardTitleText: { fontSize: 17, fontWeight: "800" },
  cardDescText: { fontSize: 13, color: tokens.colors.mutedForeground, marginTop: 4 },
  goalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  goalCat: { fontWeight: "700", color: tokens.colors.foreground },
  goalBadges: { alignItems: "flex-end", gap: 6 },
  pctText: { fontSize: 13, fontWeight: "700" },
  trendUp: { color: tokens.colors.success },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: tokens.colors.border,
    overflow: "hidden",
    marginTop: 4,
  },
  progressFill: { height: "100%", backgroundColor: tokens.colors.primary, borderRadius: 999 },
  breakdownRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.border,
  },
  breakdownTotal: { borderBottomWidth: 0, backgroundColor: tokens.colors.accent, paddingHorizontal: 8, borderRadius: 8 },
  breakdownWeek: { fontWeight: "700", width: 72 },
  breakdownCell: { flex: 1, minWidth: 56, fontSize: 12, color: tokens.colors.mutedForeground },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 18,
  },
  modalBox: {
    backgroundColor: tokens.colors.card,
    borderRadius: tokens.radius.lg,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: "800" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 8, flexWrap: "wrap" },
  memoryCard: {
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: tokens.colors.primary,
    backgroundColor: tokens.colors.card,
  },
  memoryKicker: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: tokens.colors.primary,
  },
  memoryHeading: { fontSize: 20, fontWeight: "800", color: tokens.colors.foreground, lineHeight: 26 },
  bookGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  bookThumb: { width: 104, height: 104, borderRadius: 10, backgroundColor: tokens.colors.surface },
  lightbox: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  lightboxImage: { width: "100%", height: "80%" },
  lightboxHint: { color: "#fff", marginTop: 12, fontWeight: "700" },
});
