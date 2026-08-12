import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Briefcase,
  DollarSign,
  Users,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  Target,
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAppBranding } from "@/hooks/useAppBranding";
import { WEEKLY_PAGES_TARGET } from "@/lib/reportTargets";
import {
  addDaysISODate,
  getNigeriaWeekDayISOs,
  getNigeriaWeekStartISO,
  NIGERIA_WEEKDAY_LABELS_SUN_FIRST,
} from "@/lib/nigeriaTime";
import { useRealtimeRefresh } from "@/contexts/RealtimeSyncContext";

interface WeeklyStats {
  pagesRead: number;
  gigsCreated: number;
  netIncome: number;
  dailyContacts: number;
}

interface RecentActivity {
  id: string;
  title: string;
  description: string;
  time: string;
  status: "success" | "pending" | "info";
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function Dashboard() {
  const { user, profile, office } = useAuth();
  const { appName } = useAppBranding();
  const userId = user?.id;
  const [stats, setStats] = useState<WeeklyStats>({
    pagesRead: 0,
    gigsCreated: 0,
    netIncome: 0,
    dailyContacts: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [consistencyScore, setConsistencyScore] = useState(0);
  const [weeklySubmissions, setWeeklySubmissions] = useState<boolean[]>([false, false, false, false, false, false, false]);

  const weekStartISO = getNigeriaWeekStartISO();
  const weekDayLabels = NIGERIA_WEEKDAY_LABELS_SUN_FIRST.map((d) => d.slice(0, 3));

  const fetchWeeklyStats = useCallback(async () => {
    if (!userId) return;

    const weekEndISO = addDaysISODate(weekStartISO, 6);
    const weekDayISOs = getNigeriaWeekDayISOs(weekStartISO);

    const { data } = await supabase
      .from("daily_activities")
      .select("*")
      .eq("user_id", userId)
      .gte("activity_date", weekStartISO)
      .lte("activity_date", weekEndISO);

    if (data) {
      const weekStats = data.reduce(
        (acc, d) => ({
          pagesRead: acc.pagesRead + (d.pages_read || 0),
          gigsCreated: acc.gigsCreated + (d.gigs_created || 0),
          netIncome: acc.netIncome + (d.net_income || 0),
          dailyContacts: acc.dailyContacts + (d.daily_contacts || 0),
        }),
        { pagesRead: 0, gigsCreated: 0, netIncome: 0, dailyContacts: 0 },
      );
      setStats(weekStats);

      const submissions = weekDayISOs.map((date) =>
        data.some((d) => d.activity_date === date && d.submitted_at != null),
      );
      setWeeklySubmissions(submissions);
      setConsistencyScore(Math.round((submissions.filter(Boolean).length / 7) * 100));
    }
  }, [userId, weekStartISO]);

  const fetchRecentActivities = useCallback(async () => {
    if (!userId) return;

    const { data: activities } = await supabase
      .from("daily_activities")
      .select("*")
      .eq("user_id", userId)
      .order("submitted_at", { ascending: false })
      .limit(3);

    const { data: notifications } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(2);

    const recent: RecentActivity[] = [];

    activities?.forEach((a) => {
      recent.push({
        id: a.id,
        title: "Daily Report Submitted",
        description: `${a.activity_date} - ${a.pages_read} pages, $${a.net_income} income`,
        time: formatTimeAgo(a.submitted_at),
        status: a.is_verified ? "success" : "pending",
      });
    });

    notifications?.forEach((n) => {
      recent.push({
        id: n.id,
        title: n.title,
        description: n.message,
        time: formatTimeAgo(n.created_at),
        status: "info",
      });
    });

    setRecentActivities(recent.slice(0, 3));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchWeeklyStats();
    fetchRecentActivities();
  }, [userId, weekStartISO, fetchWeeklyStats, fetchRecentActivities]);

  useRealtimeRefresh(() => {
    fetchWeeklyStats();
    fetchRecentActivities();
  }, ["daily_activities", "weekly_reports", "notifications"]);

  const statsConfig = [
    { label: "Pages Read This Week", value: stats.pagesRead.toString(), target: String(WEEKLY_PAGES_TARGET), progress: Math.min((stats.pagesRead / WEEKLY_PAGES_TARGET) * 100, 100), icon: BookOpen, color: "text-chart-1", bgColor: "bg-chart-1/10" },
    { label: "Gigs Created", value: stats.gigsCreated.toString(), target: "10", progress: Math.min((stats.gigsCreated / 10) * 100, 100), icon: Briefcase, color: "text-chart-2", bgColor: "bg-chart-2/10" },
    { label: "Net Income", value: `$${stats.netIncome.toFixed(0)}`, target: "$2,000", progress: Math.min((stats.netIncome / 2000) * 100, 100), icon: DollarSign, color: "text-chart-3", bgColor: "bg-chart-3/10" },
    { label: "Daily Contacts", value: stats.dailyContacts.toString(), target: "15", progress: Math.min((stats.dailyContacts / 15) * 100, 100), icon: Users, color: "text-chart-4", bgColor: "bg-chart-4/10" },
  ];

  const quickActions = [
    { title: "Submit Daily Report", description: "Log your activities for today", href: "/daily-activity", icon: Target },
    { title: "View Monthly Report", description: "Review your monthly targets and progress", href: "/monthly-goals", icon: Target },
    { title: "View Weekly Summary", description: "Review your weekly progress", href: "/weekly-reports", icon: TrendingUp },
    { title: "Skills Hub", description: "Learn new skills and techniques", href: "/skills-hub", icon: BookOpen },
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {profile?.full_name?.split(' ')[0] || 'User'}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              {office ? `${appName} · ` : ""}Here's your performance overview for this week
            </p>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link to="/daily-activity">
              Submit Today's Report
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsConfig.map((stat) => (
            <GlassCard key={stat.label} className="hover:shadow-lg transition-shadow">
              <GlassCardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">Target: {stat.target}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Progress value={stat.progress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-right">
                    {Math.round(stat.progress)}% of target
                  </p>
                </div>
              </GlassCardContent>
            </GlassCard>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <GlassCard className="lg:col-span-1">
            <GlassCardHeader>
              <GlassCardTitle>Quick Actions</GlassCardTitle>
              <GlassCardDescription>Common tasks you can perform</GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent className="space-y-3">
              {quickActions.map((action) => (
                <Link
                  key={action.title}
                  to={action.href}
                  className="flex items-center gap-4 p-4 rounded-xl bg-accent/50 hover:bg-accent transition-colors group"
                >
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <action.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{action.title}</p>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </Link>
              ))}
            </GlassCardContent>
          </GlassCard>

          {/* Recent Activity */}
          <GlassCard className="lg:col-span-2">
            <GlassCardHeader>
              <GlassCardTitle>Recent Activity</GlassCardTitle>
              <GlassCardDescription>Your latest submissions and updates</GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent>
              <div className="space-y-4">
                {recentActivities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No recent activity</p>
                    <p className="text-sm mt-2">Submit your first daily report to get started!</p>
                  </div>
                ) : (
                  recentActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 p-4 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors"
                    >
                      <div
                        className={`p-2 rounded-lg ${
                          activity.status === "success"
                            ? "bg-chart-1/10"
                            : activity.status === "pending"
                            ? "bg-warning/10"
                            : "bg-chart-4/10"
                        }`}
                      >
                        {activity.status === "success" ? (
                          <CheckCircle2 className="h-5 w-5 text-chart-1" />
                        ) : activity.status === "pending" ? (
                          <Clock className="h-5 w-5 text-warning" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-chart-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{activity.title}</p>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {activity.time}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </GlassCardContent>
          </GlassCard>
        </div>

        {/* Consistency Score */}
        <GlassCard>
          <GlassCardHeader>
            <div className="flex items-center justify-between">
              <div>
                <GlassCardTitle>Weekly Consistency Score</GlassCardTitle>
                <GlassCardDescription>
                  Your submission consistency this week (Sunday – Saturday)
                </GlassCardDescription>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-primary">{consistencyScore}%</p>
                <p className="text-sm text-muted-foreground">
                  {weeklySubmissions.filter(Boolean).length}/7 days
                </p>
              </div>
            </div>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="grid grid-cols-7 gap-2">
              {weekDayLabels.map((day, i) => (
                <div key={day} className="text-center">
                  <div
                    className={`h-16 rounded-lg mb-2 flex items-end justify-center ${
                      weeklySubmissions[i]
                        ? "bg-gradient-to-t from-primary to-primary/60"
                        : "bg-muted"
                    }`}
                    style={{ height: weeklySubmissions[i] ? "64px" : "20px" }}
                  />
                  <p className="text-xs text-muted-foreground">{day}</p>
                </div>
              ))}
            </div>
          </GlassCardContent>
        </GlassCard>
      </div>
    </AppLayout>
  );
}
