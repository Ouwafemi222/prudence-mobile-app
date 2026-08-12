import { useState, useEffect, useCallback, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { WeekPicker } from "@/components/reports/WeekPicker";
import { MemberWeekReviewDialog } from "@/components/reports/MemberWeekReviewDialog";
import type { ActivityDayRow } from "@/components/reports/DayReportSummary";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Briefcase,
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Loader2,
  Save,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notifyUser } from "@/lib/notifyUser";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useReportAggregatesRealtime } from "@/hooks/useReportAggregatesRealtime";
import { WEEKLY_PAGES_TARGET } from "@/lib/reportTargets";
import { TenantAppSeo } from "@/components/seo/TenantAppSeo";
import {
  addDaysISODate,
  getNigeriaWeekEndISO,
  getNigeriaWeekStartISO,
  getSundayWeekNumber,
  NIGERIA_TIME_ZONE,
  NIGERIA_WEEKDAY_LABELS_SUN_FIRST,
} from "@/lib/nigeriaTime";

interface WeeklyReport {
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
  total_tags?: number;
  total_expected_conversions?: number;
  things_learned_summary?: string | null;
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

export default function WeeklyReports() {
  const { user, isTrainer } = useAuth();
  const userId = user?.id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [dailySubmissions, setDailySubmissions] = useState<DailySubmission[]>([]);
  const [trainerName, setTrainerName] = useState<string | null>(null);
  const [trainerFeedbackInput, setTrainerFeedbackInput] = useState("");
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [selectedWeekStart, setSelectedWeekStart] = useState(getNigeriaWeekStartISO);
  const [weekReviewOpen, setWeekReviewOpen] = useState(false);
  const [weekReviewLoading, setWeekReviewLoading] = useState(false);
  const [todosByDate, setTodosByDate] = useState<Record<string, { todo_date: string; plan: string }>>({});
  const [activitiesByDate, setActivitiesByDate] = useState<Record<string, ActivityDayRow>>({});
  
  const [reflection, setReflectionState] = useState({
    wins: "",
    challenges: "",
    lessons_learned: "",
    goals_next_week: "",
  });
  const reflectionDirtyRef = useRef(false);
  const setReflection: typeof setReflectionState = (update) => {
    reflectionDirtyRef.current = true;
    setReflectionState(update);
  };

  const fetchDailySubmissions = useCallback(async (weekStart: string) => {
    if (!userId) return;
    const submissions: DailySubmission[] = [];
    for (let i = 0; i < 7; i++) {
      const dateStr = addDaysISODate(weekStart, i);
      const dayName = NIGERIA_WEEKDAY_LABELS_SUN_FIRST[i];
      const { data: activity } = await supabase
        .from("daily_activities")
        .select("id, is_verified, verified_at")
        .eq("user_id", userId)
        .eq("activity_date", dateStr)
        .maybeSingle();
      submissions.push({
        day: dayName,
        date: dateStr,
        submitted: !!activity?.id,
        verified: activity?.is_verified === true,
        activity_id: activity?.id || null,
      });
    }
    setDailySubmissions(submissions);
  }, [userId]);

  const applyReport = useCallback(async (report: WeeklyReport, options?: { hydrateReflection?: boolean }) => {
    setWeeklyReport(report);
    const hydrateReflection = options?.hydrateReflection ?? !reflectionDirtyRef.current;
    if (hydrateReflection) {
      setReflectionState({
        wins: report.wins || "",
        challenges: report.challenges || "",
        lessons_learned: report.lessons_learned || "",
        goals_next_week: report.goals_next_week || "",
      });
      reflectionDirtyRef.current = false;
    }
    if (report.trainer_id) {
      const { data: trainerData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", report.trainer_id)
        .single();
      setTrainerName(trainerData?.full_name ?? null);
    } else {
      setTrainerName(null);
    }
    if (isTrainer) {
      setTrainerFeedbackInput(report.trainer_feedback || "");
    }
    await fetchDailySubmissions(report.week_start_date);
  }, [isTrainer, fetchDailySubmissions]);

  const fetchWeeklyReport = useCallback(
    async (weekStartISO: string, options?: { silent?: boolean; hydrateReflection?: boolean }) => {
      if (!userId) return;
      if (!options?.silent) setLoading(true);
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          "get_or_generate_weekly_report_for_week",
          {
            p_user_id: userId,
            p_week_start_date: weekStartISO,
          },
        );

        if (rpcError) throw rpcError;

        const reportData =
          rpcData && Array.isArray(rpcData) && rpcData.length > 0
            ? (rpcData[0] as WeeklyReport)
            : null;

        if (reportData) {
          await applyReport(reportData, {
            hydrateReflection: options?.hydrateReflection,
          });
        } else {
          setWeeklyReport(null);
          setDailySubmissions([]);
        }
      } catch (error: unknown) {
        console.error("Error fetching weekly report:", error);
        if (!options?.silent) toast.error("Failed to load weekly report");
      } finally {
        if (!options?.silent) setLoading(false);
      }
    },
    [userId, applyReport],
  );

  const silentWeeklyRefreshRef = useRef(() => {
    fetchWeeklyReport(selectedWeekStart, { silent: true, hydrateReflection: false });
  });
  silentWeeklyRefreshRef.current = () => {
    fetchWeeklyReport(selectedWeekStart, { silent: true, hydrateReflection: false });
  };

  useReportAggregatesRealtime({
    userId: user?.id,
    weekStartISO: selectedWeekStart,
    onWeeklyUpdate: () => silentWeeklyRefreshRef.current(),
  });

  useEffect(() => {
    if (!userId) return;
    reflectionDirtyRef.current = false;
    fetchWeeklyReport(selectedWeekStart, { hydrateReflection: true });
  }, [userId, selectedWeekStart, fetchWeeklyReport]);

  const openWeekReview = async () => {
    if (!user || !weeklyReport) return;
    setWeekReviewOpen(true);
    setWeekReviewLoading(true);
    setTodosByDate({});
    setActivitiesByDate({});
    const weekEnd = weeklyReport.week_end_date || addDaysISODate(weeklyReport.week_start_date, 6);
    try {
      const [todosRes, activitiesRes] = await Promise.all([
        supabase
          .from("daily_todos")
          .select("todo_date, plan")
          .eq("user_id", user.id)
          .gte("todo_date", weeklyReport.week_start_date)
          .lte("todo_date", weekEnd),
        supabase
          .from("daily_activities")
          .select("*")
          .eq("user_id", user.id)
          .gte("activity_date", weeklyReport.week_start_date)
          .lte("activity_date", weekEnd),
      ]);
      if (todosRes.error) throw todosRes.error;
      if (activitiesRes.error) throw activitiesRes.error;
      const todoMap: Record<string, { todo_date: string; plan: string }> = {};
      (todosRes.data || []).forEach((t) => {
        todoMap[t.todo_date] = t;
      });
      setTodosByDate(todoMap);
      const actMap: Record<string, ActivityDayRow> = {};
      (activitiesRes.data || []).forEach((a) => {
        actMap[a.activity_date] = a as ActivityDayRow;
      });
      setActivitiesByDate(actMap);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load week details");
      setWeekReviewOpen(false);
    } finally {
      setWeekReviewLoading(false);
    }
  };

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

      toast.success("Reflection saved successfully!");
      reflectionDirtyRef.current = false;
      await fetchWeeklyReport(selectedWeekStart, { hydrateReflection: true });
    } catch (error: any) {
      console.error("Error saving reflection:", error);
      toast.error("Failed to save reflection");
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

      toast.success("Trainer feedback saved successfully!");
      
      await notifyUser({
        user_id: weeklyReport.user_id,
        title: "Weekly Report Feedback",
        message: `Your trainer has provided feedback on your weekly report for the week of ${formatWeekRange(weeklyReport.week_start_date, weeklyReport.week_end_date)}.`,
        type: "feedback",
        link: "/weekly-reports",
        email_subject: "New feedback on your weekly report — THE PRUDENCE",
        ctaLabel: "View feedback",
      });

      await fetchWeeklyReport(selectedWeekStart);
    } catch (error: any) {
      console.error("Error saving trainer feedback:", error);
      toast.error("Failed to save trainer feedback");
    } finally {
      setSavingFeedback(false);
    }
  };

  const formatWeekRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${start.toLocaleDateString("en-US", { timeZone: NIGERIA_TIME_ZONE, month: "long", day: "numeric" })} - ${end.toLocaleDateString("en-US", { timeZone: NIGERIA_TIME_ZONE, month: "long", day: "numeric", year: "numeric" })}`;
  };


  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!weeklyReport) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">No weekly report available yet.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Submit daily activities to generate your weekly report.
          </p>
        </div>
      </AppLayout>
    );
  }

  const weeklyStats = [
    {
      label: "Pages Read",
      current: weeklyReport.total_pages_read || 0,
      target: WEEKLY_PAGES_TARGET,
      icon: BookOpen,
      trend: (weeklyReport.total_pages_read || 0) >= WEEKLY_PAGES_TARGET ? "up" : "down",
      change: (weeklyReport.total_pages_read || 0) >= WEEKLY_PAGES_TARGET
        ? `+${(weeklyReport.total_pages_read || 0) - WEEKLY_PAGES_TARGET} from target`
        : `${(weeklyReport.total_pages_read || 0) - WEEKLY_PAGES_TARGET} from target`,
    },
    {
      label: "Gigs Created",
      current: weeklyReport.total_gigs_created || 0,
      target: 10,
      icon: Briefcase,
      trend: (weeklyReport.total_gigs_created || 0) >= 10 ? "up" : "down",
      change: (weeklyReport.total_gigs_created || 0) >= 10
        ? `+${(weeklyReport.total_gigs_created || 0) - 10} from target`
        : `${(weeklyReport.total_gigs_created || 0) - 10} from target`,
    },
    {
      label: "Net Income",
      current: Number(weeklyReport.total_net_income || 0),
      target: 2000,
      icon: DollarSign,
      trend: Number(weeklyReport.total_net_income || 0) >= 2000 ? "up" : "down",
      change: Number(weeklyReport.total_net_income || 0) >= 2000
        ? `+${Math.round(((Number(weeklyReport.total_net_income || 0) - 2000) / 2000) * 100)}% above target`
        : `${Math.round(((Number(weeklyReport.total_net_income || 0) - 2000) / 2000) * 100)}% from target`,
    },
    {
      label: "Prospects Contacted",
      current: weeklyReport.total_contacts || 0,
      target: 75,
      icon: Users,
      trend: (weeklyReport.total_contacts || 0) >= 75 ? "up" : "down",
      change: (weeklyReport.total_contacts || 0) >= 75
        ? `+${Math.round(((weeklyReport.total_contacts || 0 - 75) / 75) * 100)}% above target`
        : `${Math.round(((weeklyReport.total_contacts || 0 - 75) / 75) * 100)}% from target`,
    },
  ];

  const verifiedCount = dailySubmissions.filter(d => d.verified).length;
  const consistencyScore = Number(weeklyReport.consistency_score || 0);
  return (
    <AppLayout>
      <TenantAppSeo
        title="Weekly Report"
        description="Review your weekly performance on THE PRUDENCE — pages read, gigs, income, and day-by-day submission history. Sunday–Saturday weeks in Nigeria time (WAT)."
        path="/weekly-reports"
        keywords="weekly report, weekly summary, day-by-day review, office accountability Nigeria"
        breadcrumbs={[
          { name: "Dashboard", path: "/dashboard" },
          { name: "Weekly Reports", path: "/weekly-reports" },
        ]}
      />
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Weekly Report</h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Week of {formatWeekRange(weeklyReport.week_start_date, weeklyReport.week_end_date)}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <WeekPicker value={selectedWeekStart} onChange={setSelectedWeekStart} />
            <Badge variant="outline" className="w-fit justify-center">
              Week {getSundayWeekNumber(weeklyReport.week_start_date)} · {weeklyReport.week_start_date.slice(0, 4)}
            </Badge>
            <Button variant="outline" onClick={openWeekReview}>
              Day-by-day review
            </Button>
          </div>
        </div>

        {weeklyReport.things_learned_summary?.trim() && (
          <GlassCard className="border-chart-2/30">
            <GlassCardHeader className="pb-2">
              <GlassCardTitle className="text-lg">Things learned this week</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {weeklyReport.things_learned_summary}
              </p>
            </GlassCardContent>
          </GlassCard>
        )}

        <MemberWeekReviewDialog
          open={weekReviewOpen}
          onOpenChange={setWeekReviewOpen}
          title="My week — day by day"
          weekStart={weeklyReport.week_start_date}
          weekEnd={weeklyReport.week_end_date || getNigeriaWeekEndISO(new Date(`${weeklyReport.week_start_date}T12:00:00`))}
          loading={weekReviewLoading}
          todosByDate={todosByDate}
          activitiesByDate={activitiesByDate}
          weeklyTotals={weeklyReport}
        />

        {/* Weekly Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {weeklyStats.map((stat) => (
            <GlassCard key={stat.label}>
              <GlassCardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div
                    className={`flex items-center gap-1 text-sm ${
                      stat.trend === "up" ? "text-chart-1" : "text-destructive"
                    }`}
                  >
                    {stat.trend === "up" ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold text-foreground">
                  {stat.label === "Net Income" ? `$${stat.current}` : stat.current}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Target: {stat.label === "Net Income" ? `$${stat.target}` : stat.target}
                </p>
                <Progress
                  value={Math.min((stat.current / stat.target) * 100, 100)}
                  className="h-2 mt-3"
                />
                <p
                  className={`text-xs mt-2 ${
                    stat.trend === "up" ? "text-chart-1" : "text-destructive"
                  }`}
                >
                  {stat.change}
                </p>
              </GlassCardContent>
            </GlassCard>
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Submission Overview */}
          <GlassCard className="lg:col-span-2">
            <GlassCardHeader>
              <GlassCardTitle>Daily Submission Overview</GlassCardTitle>
              <GlassCardDescription>
                Your submission history for this week
              </GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent>
              <div className="space-y-3">
                {dailySubmissions.map((day) => (
                  <div
                    key={day.date}
                    className="flex items-center justify-between p-4 rounded-xl bg-accent/30"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          day.submitted
                            ? day.verified
                              ? "bg-chart-1/10"
                              : "bg-warning/10"
                            : "bg-muted/50"
                        }`}
                      >
                        {day.submitted ? (
                          day.verified ? (
                            <CheckCircle2 className="h-5 w-5 text-chart-1" />
                          ) : (
                            <Calendar className="h-5 w-5 text-warning" />
                          )
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{day.day}</p>
                        <p className="text-sm text-muted-foreground">
                          {day.submitted
                            ? new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                            : "No submission"}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        day.submitted
                          ? day.verified
                            ? "default"
                            : "secondary"
                          : "outline"
                      }
                    >
                      {day.submitted
                        ? day.verified
                          ? "Verified"
                          : "Pending"
                        : "Missed"}
                    </Badge>
                  </div>
                ))}
              </div>
            </GlassCardContent>
          </GlassCard>

          {/* Consistency Score */}
          <GlassCard>
            <GlassCardHeader>
              <GlassCardTitle>Weekly Score</GlassCardTitle>
              <GlassCardDescription>
                Your overall performance this week
              </GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent>
              <div className="text-center space-y-4">
                <div className="relative inline-flex">
                  <svg className="w-32 h-32">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      className="stroke-muted"
                      strokeWidth="8"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      className="stroke-primary"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${(consistencyScore / 100) * 352} 352`}
                      transform="rotate(-90 64 64)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-foreground">{Math.round(consistencyScore)}%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {weeklyReport.submission_count} of 7 days submitted
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {verifiedCount} of {weeklyReport.submission_count} reports verified
                  </p>
                </div>
              </div>
            </GlassCardContent>
          </GlassCard>
        </div>

        {/* Trainer Feedback */}
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Trainer Feedback
            </GlassCardTitle>
            <GlassCardDescription>
              {isTrainer 
                ? "Provide feedback and guidance for this weekly report"
                : "Comments and guidance from your trainer"}
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent className="space-y-4">
            {isTrainer ? (
              // Trainer view - can add/edit feedback
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="trainer-feedback">Your Feedback</Label>
                  <Textarea
                    id="trainer-feedback"
                    placeholder="Provide constructive feedback on the member's weekly performance..."
                    className="min-h-[150px]"
                    value={trainerFeedbackInput}
                    onChange={(e) => setTrainerFeedbackInput(e.target.value)}
                  />
                </div>
                {weeklyReport.trainer_feedback && weeklyReport.trainer_id !== user?.id && (
                  <div className="p-4 rounded-xl bg-accent/30 border-l-4 border-primary">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-foreground">{trainerName || "Previous Trainer"}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(weeklyReport.updated_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">{weeklyReport.trainer_feedback}</p>
                  </div>
                )}
                <div className="flex justify-end">
                  <Button onClick={handleSaveTrainerFeedback} disabled={savingFeedback}>
                    {savingFeedback ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {weeklyReport.trainer_feedback ? "Update Feedback" : "Save Feedback"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              // Member view - read-only feedback
              <>
                {weeklyReport.trainer_feedback ? (
                  <div className="p-4 rounded-xl bg-accent/30 border-l-4 border-primary">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-foreground">{trainerName || "Trainer"}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(weeklyReport.updated_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">{weeklyReport.trainer_feedback}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No trainer feedback yet. Your trainer will provide feedback after reviewing your weekly report.
                  </p>
                )}
              </>
            )}
          </GlassCardContent>
        </GlassCard>

        {/* Reflection */}
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle>Weekly Reflection</GlassCardTitle>
            <GlassCardDescription>
              Reflect on your progress and set intentions for next week
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent className="space-y-4">
            <div className="space-y-2">
              <Label>What went well this week?</Label>
              <Textarea
                placeholder="Describe your wins and achievements..."
                className="min-h-[100px]"
                value={reflection.wins}
                onChange={(e) => setReflection({ ...reflection, wins: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>What could be improved?</Label>
              <Textarea
                placeholder="Identify areas for growth..."
                className="min-h-[100px]"
                value={reflection.challenges}
                onChange={(e) => setReflection({ ...reflection, challenges: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Lessons learned</Label>
              <Textarea
                placeholder="What did you learn this week?"
                className="min-h-[100px]"
                value={reflection.lessons_learned}
                onChange={(e) => setReflection({ ...reflection, lessons_learned: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Goals for next week</Label>
              <Textarea
                placeholder="Set specific, achievable goals..."
                className="min-h-[100px]"
                value={reflection.goals_next_week}
                onChange={(e) => setReflection({ ...reflection, goals_next_week: e.target.value })}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveReflection} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Reflection
                  </>
                )}
              </Button>
            </div>
          </GlassCardContent>
        </GlassCard>
      </div>
    </AppLayout>
  );
}
