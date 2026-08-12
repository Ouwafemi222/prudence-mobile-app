import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Users,
  TrendingUp,
  Award,
  Eye,
  ChevronRight,
  BookOpen,
  DollarSign,
  Briefcase,
  Calendar,
  FileText,
  Loader2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  addDaysISODate,
  formatISODateInNigeria,
  getNigeriaWeekStartISO,
  getNigeriaMonthStartISO,
  NIGERIA_TIME_ZONE,
} from "@/lib/nigeriaTime";
import { Link } from "react-router-dom";
import { SubmissionReviewDialog } from "@/components/submissions/SubmissionReviewDialog";
import { WeekPicker } from "@/components/reports/WeekPicker";
import { MonthPicker } from "@/components/reports/MonthPicker";
import { MemberWeekReviewDialog } from "@/components/reports/MemberWeekReviewDialog";
import type { ActivityDayRow } from "@/components/reports/DayReportSummary";
import { ProofImageGrid } from "@/components/ui/proof-image";
import { getGoalBookImagePaths } from "@/lib/monthlyGoalWindow";
import { toast } from "sonner";

interface Downline {
  id: string;
  user_id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  approval_status: string;
  created_at: string;
  role?: string;
  depth?: number;
  metrics?: {
    pagesThisWeek: number;
    gigsCreated: number;
    netIncome: number;
    consistencyScore: number;
    submissionsThisWeek: number;
  };
}

interface DownlineStats {
  total: number;
  trainers: number;
  pros: number;
  members: number;
  active: number;
  pending: number;
}

const roleColors: Record<string, string> = {
  super_admin: "bg-destructive/10 text-destructive",
  trainer: "bg-primary/10 text-primary",
  pro: "bg-chart-3/10 text-chart-3",
  sponsor: "bg-chart-4/10 text-chart-4",
  member: "bg-muted text-muted-foreground",
};

export default function SponsorDashboard() {
  const { profile } = useAuth();
  const [downlines, setDownlines] = useState<Downline[]>([]);
  const [stats, setStats] = useState<DownlineStats>({
    total: 0,
    trainers: 0,
    pros: 0,
    members: 0,
    active: 0,
    pending: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedDownline, setSelectedDownline] = useState<Downline | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<any>(null);
  const [monthlyGoal, setMonthlyGoal] = useState<any>(null);
  const [loadingReports, setLoadingReports] = useState(false);
  const [selectedWeekStart, setSelectedWeekStart] = useState(getNigeriaWeekStartISO);
  const [selectedMonthStart, setSelectedMonthStart] = useState(getNigeriaMonthStartISO);
  const [weekReviewOpen, setWeekReviewOpen] = useState(false);
  const [weekReviewLoading, setWeekReviewLoading] = useState(false);
  const [todosByDate, setTodosByDate] = useState<Record<string, { todo_date: string; plan: string }>>({});
  const [activitiesByDate, setActivitiesByDate] = useState<Record<string, ActivityDayRow>>({});

  useEffect(() => {
    if (profile?.username) {
      fetchDownlines();
    }
  }, [profile?.username]);

  const fetchDownlines = async () => {
    if (!profile?.user_id) return;

    setLoading(true);

    try {
      // Fetch ALL downlines recursively via DB function (includes downlines of downlines)
      const { data: downlineTree, error: treeError } = await supabase.rpc("get_sponsor_downlines", {
        p_sponsor_user_id: profile.user_id,
      });
      if (treeError) throw treeError;

      const treeRows = downlineTree || [];
      const userIds = treeRows.map((r) => r.user_id);

      if (userIds.length === 0) {
        setDownlines([]);
        setStats({
          total: 0,
          trainers: 0,
          pros: 0,
          members: 0,
          active: 0,
          pending: 0,
        });
        setLoading(false);
        return;
      }

      // Fetch profiles in one query
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", userIds);
      if (profilesError) throw profilesError;

      // Fetch roles in one query
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);
      if (rolesError) throw rolesError;

      const roleByUserId = new Map<string, string>();
      (rolesData || []).forEach((r) => roleByUserId.set(r.user_id, r.role));

      // Weekly window in Nigeria time
      const weekStartStr = getNigeriaWeekStartISO();
      const weekEndStr = addDaysISODate(weekStartStr, 6);

      // Fetch all weekly activities for all downlines in one query
      const { data: activitiesData, error: activitiesError } = await supabase
        .from("daily_activities")
        .select("user_id, pages_read, gigs_created, net_income, activity_date")
        .in("user_id", userIds)
        .gte("activity_date", weekStartStr)
        .lte("activity_date", weekEndStr);
      if (activitiesError) throw activitiesError;

      const metricsByUserId = new Map<
        string,
        { pagesThisWeek: number; gigsCreated: number; netIncome: number; submissionsThisWeek: number }
      >();

      (activitiesData || []).forEach((a) => {
        const uid = a.user_id as string;
        const curr = metricsByUserId.get(uid) || { pagesThisWeek: 0, gigsCreated: 0, netIncome: 0, submissionsThisWeek: 0 };
        curr.pagesThisWeek += (a.pages_read as number) || 0;
        curr.gigsCreated += (a.gigs_created as number) || 0;
        curr.netIncome += Number(a.net_income || 0);
        curr.submissionsThisWeek += 1;
        metricsByUserId.set(uid, curr);
      });

      const depthByUserId = new Map<string, number>();
      treeRows.forEach((r) => depthByUserId.set(r.user_id, r.depth));

      const downlinesWithRoles: Downline[] = (profilesData || [])
        .map((dl: any) => {
          const m = metricsByUserId.get(dl.user_id) || { pagesThisWeek: 0, gigsCreated: 0, netIncome: 0, submissionsThisWeek: 0 };
          const consistencyScore = (m.submissionsThisWeek / 7) * 100;
          return {
            ...dl,
            role: roleByUserId.get(dl.user_id) || "member",
            depth: depthByUserId.get(dl.user_id) || 1,
            metrics: {
              ...m,
              consistencyScore,
            },
          } as Downline;
        })
        // Keep stable ordering: by depth then name
        .sort((a, b) => (a.depth || 1) - (b.depth || 1) || a.full_name.localeCompare(b.full_name));

    setDownlines(downlinesWithRoles);

    // Calculate stats
      const newStats: DownlineStats = {
      total: downlinesWithRoles.length,
      trainers: downlinesWithRoles.filter((d) => d.role === "trainer").length,
      pros: downlinesWithRoles.filter((d) => d.role === "pro").length,
      members: downlinesWithRoles.filter((d) => d.role === "member").length,
      active: downlinesWithRoles.filter((d) => d.approval_status === "approved").length,
      pending: downlinesWithRoles.filter((d) => d.approval_status === "pending").length,
    };
    setStats(newStats);
    setLoading(false);
    } catch (error) {
      console.error("Error fetching downlines:", error);
      setDownlines([]);
      setLoading(false);
    }
  };

  const fetchDownlineReports = async (
    userId: string,
    weekStartISO: string,
    monthStartISO: string,
  ) => {
    if (!userId) return;

    setLoadingReports(true);
    try {
      const { data: weeklyData, error: weeklyError } = await supabase.rpc(
        "get_or_generate_weekly_report_for_week",
        {
          p_user_id: userId,
          p_week_start_date: weekStartISO,
        },
      );
      if (weeklyError) throw weeklyError;

      if (weeklyData && Array.isArray(weeklyData) && weeklyData.length > 0) {
        setWeeklyReport(weeklyData[0]);
      } else {
        setWeeklyReport(null);
      }

      const { data: monthlyData, error: monthlyError } = await supabase.rpc(
        "get_or_generate_monthly_goal",
        { p_user_id: userId, p_month_year: monthStartISO },
      );
      if (monthlyError) throw monthlyError;

      if (monthlyData && Array.isArray(monthlyData) && monthlyData.length > 0) {
        setMonthlyGoal(monthlyData[0]);
      } else {
        setMonthlyGoal(null);
      }
    } catch (error: unknown) {
      console.error("Error fetching reports:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load member reports",
      );
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    if (selectedDownline?.user_id) {
      fetchDownlineReports(selectedDownline.user_id, selectedWeekStart, selectedMonthStart);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeekStart, selectedMonthStart, selectedDownline?.user_id]);

  const openDownlineWeekReview = async () => {
    if (!selectedDownline?.user_id || !weeklyReport) return;
    setWeekReviewOpen(true);
    setWeekReviewLoading(true);
    setTodosByDate({});
    setActivitiesByDate({});
    const weekEnd =
      weeklyReport.week_end_date || addDaysISODate(weeklyReport.week_start_date, 6);
    try {
      const [todosRes, activitiesRes] = await Promise.all([
        supabase
          .from("daily_todos")
          .select("todo_date, plan")
          .eq("user_id", selectedDownline.user_id)
          .gte("todo_date", weeklyReport.week_start_date)
          .lte("todo_date", weekEnd),
        supabase
          .from("daily_activities")
          .select("*")
          .eq("user_id", selectedDownline.user_id)
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

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewActivityId, setReviewActivityId] = useState<string | null>(null);

  const handleViewDownline = (downline: Downline) => {
    setSelectedDownline(downline);
    setWeeklyReport(null);
    setMonthlyGoal(null);
    setSelectedWeekStart(getNigeriaWeekStartISO());
    setSelectedMonthStart(getNigeriaMonthStartISO());
    if (downline.user_id) {
      fetchDownlineReports(downline.user_id, getNigeriaWeekStartISO(), getNigeriaMonthStartISO());
    }
  };

  const openTodaySubmission = async (userId: string) => {
    const today = formatISODateInNigeria();
    const { data, error } = await supabase
      .from("daily_activities")
      .select("id")
      .eq("user_id", userId)
      .eq("activity_date", today)
      .maybeSingle();
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data?.id) {
      toast.info("No submission for today yet.");
      return;
    }
    setReviewActivityId(data.id);
    setReviewOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sponsor Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Track your downlines and their performance
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          <GlassCard>
            <GlassCardContent className="py-4 text-center">
              <div className="p-3 rounded-xl bg-primary/10 mx-auto w-fit mb-2">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Downlines</p>
            </GlassCardContent>
          </GlassCard>
          <GlassCard>
            <GlassCardContent className="py-4 text-center">
              <div className="p-3 rounded-xl bg-chart-1/10 mx-auto w-fit mb-2">
                <Award className="h-6 w-6 text-chart-1" />
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.trainers}</p>
              <p className="text-xs text-muted-foreground">Trainers</p>
            </GlassCardContent>
          </GlassCard>
          <GlassCard>
            <GlassCardContent className="py-4 text-center">
              <div className="p-3 rounded-xl bg-chart-3/10 mx-auto w-fit mb-2">
                <TrendingUp className="h-6 w-6 text-chart-3" />
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.pros}</p>
              <p className="text-xs text-muted-foreground">Pros</p>
            </GlassCardContent>
          </GlassCard>
          <GlassCard>
            <GlassCardContent className="py-4 text-center">
              <div className="p-3 rounded-xl bg-chart-4/10 mx-auto w-fit mb-2">
                <Users className="h-6 w-6 text-chart-4" />
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.members}</p>
              <p className="text-xs text-muted-foreground">Members</p>
            </GlassCardContent>
          </GlassCard>
          <GlassCard>
            <GlassCardContent className="py-4 text-center">
              <div className="p-3 rounded-xl bg-green-500/10 mx-auto w-fit mb-2">
                <Users className="h-6 w-6 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.active}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </GlassCardContent>
          </GlassCard>
          <GlassCard>
            <GlassCardContent className="py-4 text-center">
              <div className="p-3 rounded-xl bg-warning/10 mx-auto w-fit mb-2">
                <Users className="h-6 w-6 text-warning" />
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </GlassCardContent>
          </GlassCard>
        </div>

        {/* Downlines Table */}
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle>My Downlines</GlassCardTitle>
            <GlassCardDescription>
              Members who joined using your sponsor username
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading downlines...
              </div>
            ) : downlines.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No downlines yet</p>
                <p className="text-sm mt-2">
                  Share your username <strong>@{profile?.username}</strong> to get downlines
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-2 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pages (Week)</TableHead>
                    <TableHead>Gigs (Week)</TableHead>
                    <TableHead>Income (Week)</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {downlines.map((downline) => (
                    <TableRow key={downline.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={downline.avatar_url || ""} />
                            <AvatarFallback className="bg-gradient-to-br from-primary to-accent-foreground text-primary-foreground text-sm">
                              {downline.full_name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">
                              {downline.full_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              @{downline.username}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={roleColors[downline.role || "member"]}>
                          {(downline.role || "member").replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-medium">
                        L{downline.depth || 1}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            downline.approval_status === "approved"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {downline.approval_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-medium">
                        {downline.metrics?.pagesThisWeek || 0}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-medium">
                        {downline.metrics?.gigsCreated || 0}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-medium">
                        ${(downline.metrics?.netIncome || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(downline.created_at).toLocaleDateString("en-US", { timeZone: NIGERIA_TIME_ZONE })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDownline(downline)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="glass-card w-[calc(100%-2rem)] max-w-2xl max-h-[85dvh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-3">
                                <Avatar className="h-12 w-12">
                                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent-foreground text-primary-foreground">
                                    {selectedDownline?.full_name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p>{selectedDownline?.full_name}</p>
                                  <p className="text-sm font-normal text-muted-foreground">
                                    @{selectedDownline?.username}
                                  </p>
                                </div>
                              </DialogTitle>
                              <DialogDescription>
                                Member performance overview
                              </DialogDescription>
                            </DialogHeader>

                            {selectedDownline?.user_id && (
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="default"
                                  size="sm"
                                  onClick={() => openTodaySubmission(selectedDownline.user_id)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Review today’s report
                                </Button>
                                <Button asChild variant="outline" size="sm">
                                  <Link
                                    to={`/submissions?userId=${encodeURIComponent(
                                      selectedDownline.user_id
                                    )}&dateMode=date&date=${formatISODateInNigeria()}`}
                                  >
                                    <FileText className="h-4 w-4 mr-2" />
                                    Open in Submissions
                                  </Link>
                                </Button>
                                <Button asChild variant="outline" size="sm">
                                  <Link
                                    to={`/submissions?userId=${encodeURIComponent(
                                      selectedDownline.user_id
                                    )}&dateMode=all`}
                                  >
                                    <FileText className="h-4 w-4 mr-2" />
                                    View all submissions
                                  </Link>
                                </Button>
                              </div>
                            )}

                            <Tabs defaultValue="overview" className="w-full">
                              <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="overview">Overview</TabsTrigger>
                                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="overview" className="space-y-4 mt-4">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-4 rounded-xl bg-accent/30 text-center">
                                  <BookOpen className="h-6 w-6 mx-auto mb-2 text-chart-1" />
                                    <p className="text-lg font-bold">
                                      {selectedDownline?.metrics?.pagesThisWeek || 0}
                                    </p>
                                  <p className="text-xs text-muted-foreground">
                                    Pages This Week
                                  </p>
                                </div>
                                <div className="p-4 rounded-xl bg-accent/30 text-center">
                                  <Briefcase className="h-6 w-6 mx-auto mb-2 text-chart-2" />
                                    <p className="text-lg font-bold">
                                      {selectedDownline?.metrics?.gigsCreated || 0}
                                    </p>
                                  <p className="text-xs text-muted-foreground">
                                    Gigs Created
                                  </p>
                                </div>
                                <div className="p-4 rounded-xl bg-accent/30 text-center">
                                  <DollarSign className="h-6 w-6 mx-auto mb-2 text-chart-3" />
                                    <p className="text-lg font-bold">
                                      ${(selectedDownline?.metrics?.netIncome || 0).toFixed(2)}
                                    </p>
                                  <p className="text-xs text-muted-foreground">
                                    Net Income
                                  </p>
                                </div>
                              </div>
                              <div className="p-4 rounded-xl bg-accent/30">
                                <p className="text-sm text-muted-foreground mb-2">
                                  Weekly Consistency
                                </p>
                                  <Progress 
                                    value={weeklyReport?.consistency_score ?? selectedDownline?.metrics?.consistencyScore ?? 0} 
                                    className="h-2" 
                                  />
                                <p className="text-xs text-muted-foreground mt-1">
                                    {(weeklyReport?.consistency_score != null
                                      ? `${Number(weeklyReport.consistency_score).toFixed(1)}% (weekly report)`
                                      : `${selectedDownline?.metrics?.submissionsThisWeek || 0}/7 days submitted`)}
                                  </p>
                                </div>
                              </TabsContent>

                              <TabsContent value="weekly" className="space-y-4 mt-4">
                                <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                                  <div className="space-y-2 flex-1">
                                    <label className="text-sm font-medium">Week</label>
                                    <WeekPicker
                                      value={selectedWeekStart}
                                      onChange={setSelectedWeekStart}
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="default"
                                    disabled={!weeklyReport || loadingReports}
                                    onClick={openDownlineWeekReview}
                                  >
                                    Day-by-day review
                                  </Button>
                                </div>
                                {loadingReports ? (
                                  <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                  </div>
                                ) : weeklyReport ? (
                                  <div className="space-y-4">
                                    <div className="p-4 rounded-xl bg-accent/30">
                                      <div className="flex items-center gap-2 mb-4">
                                        <Calendar className="h-5 w-5 text-primary" />
                                        <p className="font-semibold text-foreground">
                                          Week of {new Date(weeklyReport.week_start_date).toLocaleDateString("en-US", { timeZone: NIGERIA_TIME_ZONE })} - {new Date(weeklyReport.week_end_date).toLocaleDateString("en-US", { timeZone: NIGERIA_TIME_ZONE })}
                                        </p>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                          <p className="text-xs text-muted-foreground mb-1">Pages Read</p>
                                          <p className="text-lg font-bold text-foreground">
                                            {weeklyReport.total_pages_read || 0}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground mb-1">Gigs Created</p>
                                          <p className="text-lg font-bold text-foreground">
                                            {weeklyReport.total_gigs_created || 0}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground mb-1">Accounts Created</p>
                                          <p className="text-lg font-bold text-foreground">
                                            {weeklyReport.total_accounts_created || 0}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground mb-1">Net Income</p>
                                          <p className="text-lg font-bold text-foreground">
                                            ${(weeklyReport.total_net_income || 0).toFixed(2)}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground mb-1">Submissions</p>
                                          <p className="text-lg font-bold text-foreground">
                                            {weeklyReport.submission_count || weeklyReport.submissions_count || 0}/7
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground mb-1">Consistency</p>
                                          <p className="text-lg font-bold text-foreground">
                                            {(weeklyReport.consistency_score || 0).toFixed(1)}%
                                          </p>
                                        </div>
                                      </div>
                                      {weeklyReport.wins && (
                                        <div className="mt-4 pt-4 border-t">
                                          <p className="text-xs font-semibold text-muted-foreground mb-2">Wins</p>
                                          <p className="text-sm text-foreground">{weeklyReport.wins}</p>
                                        </div>
                                      )}
                                      {weeklyReport.trainer_feedback && (
                                        <div className="mt-4 pt-4 border-t">
                                          <p className="text-xs font-semibold text-muted-foreground mb-2">Trainer Feedback</p>
                                          <p className="text-sm text-foreground">{weeklyReport.trainer_feedback}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center py-8 text-muted-foreground">
                                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No weekly report available yet</p>
                                  </div>
                                )}
                              </TabsContent>

                              <TabsContent value="monthly" className="space-y-4 mt-4">
                                <MonthPicker
                                  value={selectedMonthStart}
                                  onChange={setSelectedMonthStart}
                                  className="w-full sm:w-56"
                                />
                                {loadingReports ? (
                                  <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                  </div>
                                ) : monthlyGoal ? (
                                  <div className="space-y-4">
                                    <div className="p-4 rounded-xl bg-accent/30">
                                      <div className="flex items-center gap-2 mb-4">
                                        <Calendar className="h-5 w-5 text-primary" />
                                        <p className="font-semibold text-foreground">
                                          {new Date(monthlyGoal.month_year).toLocaleDateString("en-US", { timeZone: NIGERIA_TIME_ZONE, month: "long", year: "numeric" })}
                                        </p>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                          <p className="text-xs text-muted-foreground mb-1">Pages</p>
                                          <p className="text-lg font-bold text-foreground">
                                            {monthlyGoal.actual_pages || 0} / {monthlyGoal.target_pages || 0}
                                          </p>
                                          <Progress 
                                            value={monthlyGoal.target_pages ? (monthlyGoal.actual_pages / monthlyGoal.target_pages) * 100 : 0} 
                                            className="h-1 mt-1" 
                                          />
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground mb-1">Gigs</p>
                                          <p className="text-lg font-bold text-foreground">
                                            {monthlyGoal.actual_gigs || 0} / {monthlyGoal.target_gigs || 0}
                                          </p>
                                          <Progress 
                                            value={monthlyGoal.target_gigs ? (monthlyGoal.actual_gigs / monthlyGoal.target_gigs) * 100 : 0} 
                                            className="h-1 mt-1" 
                                          />
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground mb-1">Accounts</p>
                                          <p className="text-lg font-bold text-foreground">
                                            {monthlyGoal.actual_accounts || 0} / {monthlyGoal.target_accounts || 0}
                                          </p>
                                          <Progress 
                                            value={monthlyGoal.target_accounts ? (monthlyGoal.actual_accounts / monthlyGoal.target_accounts) * 100 : 0} 
                                            className="h-1 mt-1" 
                                          />
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground mb-1">Income</p>
                                          <p className="text-lg font-bold text-foreground">
                                            ${(monthlyGoal.actual_income || 0).toFixed(2)} / ${(monthlyGoal.target_income || 0).toFixed(2)}
                                          </p>
                                          <Progress 
                                            value={monthlyGoal.target_income ? (monthlyGoal.actual_income / monthlyGoal.target_income) * 100 : 0} 
                                            className="h-1 mt-1" 
                                          />
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground mb-1">Consistency</p>
                                          <p className="text-lg font-bold text-foreground">
                                            {(monthlyGoal.consistency_score || 0).toFixed(1)}%
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground mb-1">Contacts</p>
                                          <p className="text-lg font-bold text-foreground">
                                            {monthlyGoal.actual_contacts || 0} / {monthlyGoal.target_contacts || 0}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground mb-1">Tags</p>
                                          <p className="text-lg font-bold text-foreground">
                                            {monthlyGoal.actual_tags || 0} / {monthlyGoal.target_tags || 0}
                                          </p>
                                          <Progress
                                            value={
                                              monthlyGoal.target_tags
                                                ? (monthlyGoal.actual_tags / monthlyGoal.target_tags) * 100
                                                : 0
                                            }
                                            className="h-1 mt-1"
                                          />
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground mb-1">Converts (expected)</p>
                                          <p className="text-lg font-bold text-foreground">
                                            {monthlyGoal.actual_conversions || 0} /{" "}
                                            {monthlyGoal.target_conversions || 0}
                                          </p>
                                          <Progress
                                            value={
                                              monthlyGoal.target_conversions
                                                ? (monthlyGoal.actual_conversions /
                                                    monthlyGoal.target_conversions) *
                                                  100
                                                : 0
                                            }
                                            className="h-1 mt-1"
                                          />
                                        </div>
                                      </div>
                                      {monthlyGoal.things_to_learn && (
                                        <div className="mt-4 pt-4 border-t">
                                          <p className="text-xs font-semibold text-muted-foreground mb-2">
                                            Things to learn / develop
                                          </p>
                                          <p className="text-sm text-foreground whitespace-pre-wrap">
                                            {monthlyGoal.things_to_learn}
                                          </p>
                                        </div>
                                      )}
                                      {monthlyGoal.actual_things_learned && (
                                        <div className="mt-4 pt-4 border-t">
                                          <p className="text-xs font-semibold text-muted-foreground mb-2">
                                            Learned this month (from daily reports)
                                          </p>
                                          <p className="text-sm text-foreground whitespace-pre-wrap">
                                            {monthlyGoal.actual_things_learned}
                                          </p>
                                        </div>
                                      )}
                                      {(() => {
                                        const bookPaths = monthlyGoal
                                          ? getGoalBookImagePaths(monthlyGoal)
                                          : [];
                                        if (!bookPaths.length) return null;
                                        return (
                                          <div className="mt-4 pt-4 border-t space-y-2">
                                            <p className="text-xs font-semibold text-muted-foreground">
                                              Goals book photos ({bookPaths.length})
                                            </p>
                                            <ProofImageGrid
                                              paths={bookPaths}
                                              altPrefix="Goals book"
                                              thumbnailClassName="max-h-48 object-contain"
                                            />
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center py-8 text-muted-foreground">
                                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No monthly goal data available yet</p>
                                  </div>
                                )}
                              </TabsContent>
                            </Tabs>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </GlassCardContent>
        </GlassCard>

        <SubmissionReviewDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          activityId={reviewActivityId}
          profile={
            selectedDownline
              ? {
                  user_id: selectedDownline.user_id,
                  full_name: selectedDownline.full_name,
                  username: selectedDownline.username,
                }
              : null
          }
        />

        <MemberWeekReviewDialog
          open={weekReviewOpen}
          onOpenChange={setWeekReviewOpen}
          title={selectedDownline ? `${selectedDownline.full_name} — week review` : "Week review"}
          subtitle={
            weeklyReport
              ? `${weeklyReport.week_start_date} to ${weeklyReport.week_end_date || addDaysISODate(weeklyReport.week_start_date, 6)}`
              : undefined
          }
          weekStart={weeklyReport?.week_start_date || selectedWeekStart}
          weekEnd={
            weeklyReport?.week_end_date ||
            addDaysISODate(weeklyReport?.week_start_date || selectedWeekStart, 6)
          }
          loading={weekReviewLoading}
          todosByDate={todosByDate}
          activitiesByDate={activitiesByDate}
          weeklyTotals={weeklyReport}
        />
      </div>
    </AppLayout>
  );
}
