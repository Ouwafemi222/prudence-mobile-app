import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useAuth } from "../contexts/AuthContext";
import { useMainAppNavigation } from "../hooks/useMainAppNavigation";
import { supabase } from "../integrations/supabase/client";
import { useAppTheme } from "../contexts/ThemeContext";
import { getNigeriaWeekDayISOs, getNigeriaWeekStartISO } from "../lib/nigeriaTime";
import { useNigeriaTimeGreeting } from "../hooks/useNigeriaTimeGreeting";
import { WEEKLY_PAGES_TARGET } from "../lib/reportTargets";
import { useAppBranding } from "../hooks/useAppBranding";
import type { AppTabParamList } from "../navigation/AppTabs";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Avatar } from "../components/ui/Avatar";

type HomeNav = BottomTabNavigationProp<AppTabParamList, "Home">;

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

const STAT_TARGETS = {
  pages: WEEKLY_PAGES_TARGET,
  gigs: 10,
  income: 2000,
  contacts: 15,
};

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

export function DashboardScreen() {
  const { tokens, themeName } = useAppTheme();
  const styles = getStyles(tokens);
  const isCrimson = themeName === "crimson";
  const navigation = useNavigation<HomeNav>();
  const stackNav = useMainAppNavigation();
  const { user, profile, userRole, office, isAdmin, isSponsor, isTrainer, isPro } = useAuth();
  const { appName } = useAppBranding();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<WeeklyStats>({
    pagesRead: 0,
    gigsCreated: 0,
    netIncome: 0,
    dailyContacts: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [consistencyScore, setConsistencyScore] = useState(0);
  const [weeklySubmissions, setWeeklySubmissions] = useState<boolean[]>([false, false, false, false, false, false, false]);
  const [weekDayLabels, setWeekDayLabels] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  const firstLoadRef = useRef(true);

  const firstName = profile?.full_name?.split(" ")[0] || profile?.username || "there";
  const greeting = useNigeriaTimeGreeting(firstName);
  const avatarUri = profile?.avatar_url
    ? supabase.storage.from("avatars").getPublicUrl(profile.avatar_url).data.publicUrl
    : null;
  const initials =
    (profile?.full_name || profile?.username || "U")
      .split(" ")
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  const loadDashboard = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    if (firstLoadRef.current) setLoading(true);
    try {
      const weekStart = getNigeriaWeekStartISO();
      const days = getNigeriaWeekDayISOs(weekStart);

      const { data: weekRows } = await supabase
        .from("daily_activities")
        .select("*")
        .eq("user_id", user.id)
        .gte("activity_date", weekStart);

      if (weekRows) {
        const weekStats = weekRows.reduce(
          (acc, d: any) => ({
            pagesRead: acc.pagesRead + (d.pages_read || 0),
            gigsCreated: acc.gigsCreated + (d.gigs_created || 0),
            netIncome: acc.netIncome + (Number(d.net_income) || 0),
            dailyContacts: acc.dailyContacts + (d.daily_contacts || 0),
          }),
          { pagesRead: 0, gigsCreated: 0, netIncome: 0, dailyContacts: 0 },
        );
        setStats(weekStats);

        const submissions = days.map((date) => weekRows.some((d: any) => d.activity_date === date));
        setWeeklySubmissions(submissions);
        setConsistencyScore(Math.round((submissions.filter(Boolean).length / 7) * 100));

        const labels = days.map((iso) =>
          new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
            weekday: "short",
            timeZone: "Africa/Lagos",
          }),
        );
        setWeekDayLabels(labels);
      }

      const { data: activities } = await supabase
        .from("daily_activities")
        .select("*")
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false })
        .limit(3);

      let notifications: any[] = [];
      try {
        const { data: notifData } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(2);
        notifications = notifData ?? [];
      } catch {
        notifications = [];
      }

      const recent: RecentActivity[] = [];
      activities?.forEach((a: any) => {
        recent.push({
          id: a.id,
          title: "Daily Report Submitted",
          description: `${a.activity_date} — ${a.pages_read ?? 0} pages, $${Number(a.net_income ?? 0).toFixed(0)} net`,
          time: formatTimeAgo(a.submitted_at),
          status: (a as { is_verified?: boolean }).is_verified ? "success" : "pending",
        });
      });
      notifications.forEach((n) => {
        recent.push({
          id: n.id,
          title: n.title,
          description: n.message,
          time: formatTimeAgo(n.created_at),
          status: "info",
        });
      });
      setRecentActivities(recent.slice(0, 3));
    } finally {
      setLoading(false);
      firstLoadRef.current = false;
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard]),
  );

  const statCards = [
    {
      key: "pages",
      label: "Pages read this week",
      value: String(stats.pagesRead),
      target: String(STAT_TARGETS.pages),
      progress: Math.min((stats.pagesRead / STAT_TARGETS.pages) * 100, 100),
      symbol: "📘",
      iconBg: "rgba(62, 255, 168, 0.12)",
      iconColor: tokens.colors.primary,
    },
    {
      key: "gigs",
      label: "Gigs created",
      value: String(stats.gigsCreated),
      target: String(STAT_TARGETS.gigs),
      progress: Math.min((stats.gigsCreated / STAT_TARGETS.gigs) * 100, 100),
      symbol: "💼",
      iconBg: "rgba(62, 255, 168, 0.1)",
      iconColor: tokens.colors.accentForeground,
    },
    {
      key: "income",
      label: "Net income",
      value: `$${stats.netIncome.toFixed(0)}`,
      target: "$2,000",
      progress: Math.min((stats.netIncome / STAT_TARGETS.income) * 100, 100),
      symbol: "💵",
      iconBg: "rgba(74, 222, 128, 0.12)",
      iconColor: tokens.colors.success,
    },
    {
      key: "contacts",
      label: "Daily contacts",
      value: String(stats.dailyContacts),
      target: String(STAT_TARGETS.contacts),
      progress: Math.min((stats.dailyContacts / STAT_TARGETS.contacts) * 100, 100),
      symbol: "👥",
      iconBg: "rgba(251, 191, 36, 0.12)",
      iconColor: tokens.colors.warning,
    },
  ];

  const quickActions: {
    title: string;
    description: string;
    onPress: () => void;
    symbol: string;
  }[] = [
    {
      title: "Submit Daily Report",
      description: "Log your activities for today",
      onPress: () => navigation.navigate("Work", { openDailyReport: true }),
      symbol: "📝",
    },
    {
      title: "My Submissions",
      description: "Past daily reports & morning plans",
      onPress: () => stackNav.navigate("MySubmissions"),
      symbol: "📂",
    },
    {
      title: "Ask Prudence",
      description: "Chat about plans, tags, goals, and rules",
      onPress: () => stackNav.navigate("AssistantChat"),
      symbol: "🤖",
    },
    {
      title: "Notifications",
      description: "In-app messages from your team",
      onPress: () => stackNav.navigate("NotificationsInbox"),
      symbol: "🔔",
    },
    {
      title: "Set Monthly Goals",
      description: "Targets for this month (Reports tab)",
      onPress: () => navigation.navigate("Reports", { tab: "monthly" }),
      symbol: "🎯",
    },
    {
      title: "View Weekly Summary",
      description: "Review your weekly progress",
      onPress: () => navigation.navigate("Reports", { tab: "weekly" }),
      symbol: "📈",
    },
    {
      title: "Skills Hub",
      description: "Learn new skills and techniques",
      onPress: () => navigation.navigate("Resources", { section: "skills" }),
      symbol: "📚",
    },
    ...(isSponsor
      ? [
          {
            title: "Sponsor Dashboard",
            description: "Downline activity overview",
            onPress: () => stackNav.navigate("SponsorDashboard"),
            symbol: "👥",
          },
          {
            title: "My Team",
            description: "View my downline members",
            onPress: () => stackNav.navigate("Teams"),
            symbol: "🧑‍🤝‍🧑",
          },
        ]
      : []),
    ...((isAdmin || isTrainer || isPro)
      ? [
          {
            title: "Group Todo List",
            description: "View group todos and reports",
            onPress: () => stackNav.navigate("GroupTodosReports"),
            symbol: "🗂️",
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            title: "Admin Hub",
            description: "Teams, submissions, skills",
            onPress: () => stackNav.navigate("AdminHub"),
            symbol: "⚙️",
          },
        ]
      : []),
    {
      title: "Suggestions",
      description: "Send feedback to leadership",
      onPress: () => stackNav.navigate("Suggestions"),
      symbol: "💬",
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={tokens.colors.primary} />
        <Text style={styles.loadingText}>Loading your dashboard…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextBlock}>
            <View style={styles.welcomeRow}>
              <Avatar uri={avatarUri} initials={initials} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={styles.welcomeTitle}>
                  {greeting.emoji} {greeting.headline}
                </Text>
                <Text style={styles.welcomeSub}>
                  {greeting.clock} WAT
                  {office?.name ? ` · ${office.name}` : ""}
                  {` · ${appName}`}
                </Text>
              </View>
            </View>
            <View style={styles.chipRow}>
              <Badge>{(userRole?.role || "member").replace("_", " ")}</Badge>
              <Badge variant={profile?.approval_status === "approved" ? "success" : "warning"}>
                {profile?.approval_status ?? "—"}
              </Badge>
            </View>
          </View>
          <Button
            title="Submit today’s report"
            onPress={() => navigation.navigate("Work", { openDailyReport: true })}
            style={styles.ctaBtn}
          />
        </View>

        <View style={styles.statsGrid}>
          {statCards.map((s) => {
            return (
              <Card key={s.key} style={[styles.statCard, isCrimson ? styles.keyCardAccent : null]}>
                <View style={styles.statTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statLabel}>{s.label}</Text>
                    <Text style={styles.statValue}>{s.value}</Text>
                    <Text style={styles.statTarget}>Target: {s.target}</Text>
                  </View>
                  <View style={[styles.statIconWrap, { backgroundColor: s.iconBg }]}>
                    <Text style={styles.statIconText}>{s.symbol}</Text>
                  </View>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.min(s.progress, 100)}%` }]} />
                </View>
                <Text style={styles.progressPct}>{Math.round(s.progress)}% of target</Text>
              </Card>
            );
          })}
        </View>

        <Card style={[styles.sectionCard, isCrimson ? styles.keyCardAccent : null]}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <Text style={styles.sectionDesc}>Common tasks — same flow as the website</Text>
          {quickActions.map((action) => {
            return (
            <Pressable key={action.title} style={styles.quickRow} onPress={action.onPress}>
              <View style={styles.quickIcon}>
                <Text style={styles.quickIconText}>{action.symbol}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.quickTitle}>{action.title}</Text>
                <Text style={styles.quickDesc}>{action.description}</Text>
              </View>
              <Text style={styles.rowArrow}>→</Text>
            </Pressable>
            );
          })}
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Recent activity</Text>
          <Text style={styles.sectionDesc}>Latest submissions and updates</Text>
          {recentActivities.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptySymbol}>🎯</Text>
              <Text style={styles.emptyTitle}>No recent activity</Text>
              <Text style={styles.emptySub}>Submit your first daily report to get started.</Text>
            </View>
          ) : (
            recentActivities.map((activity) => (
              <View key={activity.id} style={styles.activityRow}>
                <View
                  style={[
                    styles.activityIcon,
                    activity.status === "success"
                      ? styles.activityIconOk
                      : activity.status === "pending"
                        ? styles.activityIconWarn
                        : styles.activityIconInfo,
                  ]}
                >
                  {activity.status === "success" ? (
                    <Text style={styles.activityIconText}>✓</Text>
                  ) : activity.status === "pending" ? (
                    <Text style={styles.activityIconText}>⏱</Text>
                  ) : (
                    <Text style={styles.activityIconText}>i</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  <Text style={styles.activityDesc}>{activity.description}</Text>
                </View>
                <Text style={styles.activityTime}>{activity.time}</Text>
              </View>
            ))
          )}
        </Card>

        <Card style={[styles.sectionCard, isCrimson ? styles.keyCardAccent : null]}>
          <View style={styles.consistencyHeader}>
            <View>
              <Text style={styles.sectionTitle}>Weekly consistency</Text>
              <Text style={styles.sectionDesc}>Submission consistency over the past 7 days</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.consistencyPct}>{consistencyScore}%</Text>
              <Text style={styles.consistencySub}>
                {weeklySubmissions.filter(Boolean).length}/7 days
              </Text>
            </View>
          </View>
          <View style={styles.dayRow}>
            {weekDayLabels.map((label, i) => (
              <View key={`${label}-${i}`} style={styles.dayCol}>
                <View
                  style={[
                    styles.dayBar,
                    weeklySubmissions[i] ? styles.dayBarOn : styles.dayBarOff,
                    { height: weeklySubmissions[i] ? 52 : 16 },
                  ]}
                />
                <Text style={styles.dayLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.background },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.background,
    gap: 10,
  },
  loadingText: { color: tokens.colors.mutedForeground, fontSize: 14 },
  container: { padding: 18, paddingBottom: 32, gap: 14 },
  headerRow: { gap: 12 },
  headerTextBlock: { gap: 10 },
  welcomeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: tokens.colors.foreground,
    letterSpacing: -0.3,
  },
  welcomeSub: {
    marginTop: 4,
    fontSize: 14,
    color: tokens.colors.mutedForeground,
  },
  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  ctaBtn: { alignSelf: "stretch" },
  statsGrid: { gap: 10 },
  statCard: {
    padding: 14,
    gap: 8,
    shadowColor: tokens.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  statTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  statLabel: { fontSize: 12, color: tokens.colors.mutedForeground },
  statValue: { fontSize: 26, fontWeight: "800", color: tokens.colors.foreground, marginTop: 4 },
  statTarget: { fontSize: 11, color: tokens.colors.mutedForeground, marginTop: 2 },
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statIconText: { fontSize: 20 },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: tokens.colors.surface,
    overflow: "hidden",
    marginTop: 4,
  },
  progressFill: {
    height: "100%",
    backgroundColor: tokens.colors.primary,
    borderRadius: 999,
  },
  progressPct: {
    fontSize: 11,
    color: tokens.colors.mutedForeground,
    textAlign: "right",
  },
  sectionCard: {
    padding: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 2,
  },
  keyCardAccent: {
    borderColor: tokens.colors.primary,
    borderLeftWidth: 3,
  },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: tokens.colors.foreground },
  sectionDesc: { fontSize: 13, color: tokens.colors.mutedForeground, marginBottom: 4 },
  quickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.accent,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(62, 255, 168, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  quickIconText: { fontSize: 18 },
  rowArrow: { fontSize: 18, color: tokens.colors.primary, fontWeight: "700" },
  quickTitle: { fontSize: 15, fontWeight: "700", color: tokens.colors.foreground },
  quickDesc: { fontSize: 12, color: tokens.colors.mutedForeground, marginTop: 2 },
  emptyWrap: { alignItems: "center", paddingVertical: 24, gap: 8 },
  emptySymbol: { fontSize: 36, opacity: 0.5 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: tokens.colors.foreground },
  emptySub: { fontSize: 13, color: tokens.colors.mutedForeground, textAlign: "center" },
  activityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.border,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  activityIconText: { fontSize: 15, color: tokens.colors.foreground, fontWeight: "700" },
  activityIconOk: { backgroundColor: "rgba(22, 163, 74, 0.12)" },
  activityIconWarn: { backgroundColor: "rgba(245, 158, 11, 0.15)" },
  activityIconInfo: { backgroundColor: "rgba(62, 255, 168, 0.12)" },
  activityTitle: { fontSize: 14, fontWeight: "700", color: tokens.colors.foreground },
  activityDesc: { fontSize: 12, color: tokens.colors.mutedForeground, marginTop: 2 },
  activityTime: { fontSize: 11, color: tokens.colors.mutedForeground },
  consistencyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 8,
  },
  consistencyPct: { fontSize: 28, fontWeight: "800", color: tokens.colors.primary },
  consistencySub: { fontSize: 12, color: tokens.colors.mutedForeground },
  dayRow: { flexDirection: "row", justifyContent: "space-between", gap: 4, marginTop: 8 },
  dayCol: { flex: 1, alignItems: "center", gap: 6 },
  dayBar: {
    width: "100%",
    maxWidth: 40,
    borderRadius: 8,
    alignSelf: "center",
  },
  dayBarOn: { backgroundColor: tokens.colors.primary },
  dayBarOff: { backgroundColor: tokens.colors.border },
  dayLabel: { fontSize: 10, color: tokens.colors.mutedForeground },
  });
