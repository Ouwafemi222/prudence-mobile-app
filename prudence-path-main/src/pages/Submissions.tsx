import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRealtimeRefresh } from "@/contexts/RealtimeSyncContext";
import {
  ActivityProofSectionsDisplay,
  countActivityProofImages,
} from "@/components/reports/ActivityProofSectionsDisplay";
import {
  accountLinksFrom,
  gigLinksFrom,
} from "@/lib/activityTypes";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { notifyUser, toastAfterAction } from "@/lib/notifyUser";
import { scopeToUserOffice } from "@/lib/tenantScope";
import { useAuth } from "@/contexts/AuthContext";
import { useAppBranding } from "@/hooks/useAppBranding";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import {
  Eye,
  Loader2,
  Search,
  BookOpen,
  Briefcase,
  DollarSign,
  Users,
  GraduationCap,
  Image as ImageIcon,
  Send,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Calendar as DayPickerCalendar } from "@/components/ui/calendar";
import { formatISODateInNigeria, addDaysISODate } from "@/lib/nigeriaTime";
import { canVerifySubmission, fetchUserIsSuperAdmin } from "@/lib/submissionRules";
import { fetchTodoSubmissionData } from "@/lib/fetchTodoSubmissionData";
import { TodoLogEntry, TodoUpdateHistory } from "@/components/todos/TodoUpdateHistory";

type ActivityRow = {
  id: string;
  user_id: string;
  activity_date: string;
  is_verified: boolean | null;
  verified_at: string | null;
  verification_feedback: string | null;
  pages_read: number | null;
  reading_notes: string | null;
  reading_proof_image: string | null;
  reading_proof_images: string[] | null;
  gigs_created: number | null;
  gig_platform: string | null;
  gig_service: string | null;
  gig_link: string | null;
  gig_links: string[] | null;
  gig_notes: string | null;
  gig_proof_images: string[] | null;
  accounts_created: number | null;
  account_platform: string | null;
  account_service: string | null;
  account_country: string | null;
  account_links: string[] | null;
  account_notes: string | null;
  account_proof_images: string[] | null;
  gross_income: number | null;
  net_income: number | null;
  income_platform: string | null;
  order_type: string | null;
  delivery_days: number | null;
  work_type: string | null;
  daily_contacts: number | null;
  follow_ups: number | null;
  expected_conversions: number | null;
  skill_learned: string | null;
  skill_description: string | null;
  skill_proof_image: string | null;
  skill_proof_images: string[] | null;
  skill_taught: string | null;
  is_theory: boolean | null;
  is_practical: boolean | null;
  students_trained: number | null;
  training_duration_minutes: number | null;
  submissions_reviewed: number | null;
  submitted_at: string | null;
  other_activities: string | null;
  other_activities_proof_image: string | null;
  other_activities_proof_images: string[] | null;
  payment_type: string | null;
  outside_payment_method: string | null;
  outside_payment_method_other: string | null;
  fiverr_fee: number | null;
  cancelled_orders_count: number | null;
  cancelled_order_amount_received: number | null;
  submission_tags: string[] | null;
  prospecting_proof_images: string[] | null;
};

type GroupOption = {
  id: string;
  name: string;
  trainer_ids: string[] | null;
};

type ProfileMini = {
  user_id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  assigned_group_id: string | null;
  group_name?: string | null;
};

function activityMatchesGroup(
  userId: string,
  assignedGroupId: string | null | undefined,
  groupFilter: string,
  groups: GroupOption[],
): boolean {
  if (groupFilter === "all") return true;
  if (assignedGroupId === groupFilter) return true;
  const group = groups.find((g) => g.id === groupFilter);
  return group?.trainer_ids?.includes(userId) ?? false;
}

type ActivityWithProfile = ActivityRow & { profile?: ProfileMini };

type ActivityComment = {
  id: string;
  activity_id: string;
  author_user_id: string;
  comment: string;
  created_at: string;
  authorProfile?: ProfileMini;
};

type DailyTodoPlan = {
  plan: string;
};

function getPublicImageUrl(path: string | null): string | null {
  if (!path) return null;
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}

export default function Submissions() {
  const { user, userRole, isAdmin, profile, officeId, isSuperAdmin } = useAuth();
  const { appName } = useAppBranding();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityWithProfile[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [groupFilter, setGroupFilter] = useState("all");
  const [selectedActivity, setSelectedActivity] = useState<ActivityWithProfile | null>(null);
  const [submitterIsSuperAdmin, setSubmitterIsSuperAdmin] = useState(false);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [search, setSearch] = useState("");
  const [dateFilterMode, setDateFilterMode] = useState<"today" | "yesterday" | "date" | "all">("today");
  const [selectedDate, setSelectedDate] = useState<string>(formatISODateInNigeria());
  const [userIdFilter, setUserIdFilter] = useState<string>("");

  const showAllGroupsOption = isSuperAdmin || userRole?.role === "trainer";

  const [comments, setComments] = useState<ActivityComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [todoPlan, setTodoPlan] = useState<string>("");
  const [todoLogs, setTodoLogs] = useState<TodoLogEntry[]>([]);
  const [loadingTodoLogs, setLoadingTodoLogs] = useState(false);
  const [rejectionFeedback, setRejectionFeedback] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const todoFetchGen = useRef(0);
  const commentsFetchGen = useRef(0);

  const canComment = useMemo(() => {
    if (!userRole?.role) return false;
    if (userRole.role === "pro") return true;
    return ["super_admin", "trainer", "sponsor"].includes(userRole.role);
  }, [userRole?.role]);

  const canVerify = useMemo(() => {
    if (!userRole?.role) return false;
    return userRole.role === "super_admin" || userRole.role === "trainer";
  }, [userRole?.role]);

  const canVerifyThisSubmission = useMemo(
    () =>
      canVerifySubmission({
        verifierCanVerify: canVerify,
        submitterIsSuperAdmin,
        verifierUserId: user?.id,
        submitterUserId: selectedActivity?.user_id,
        verifierRole: userRole?.role,
      }),
    [canVerify, submitterIsSuperAdmin, user?.id, selectedActivity?.user_id, userRole?.role],
  );

  const isOwnSelectedSubmission = Boolean(
    user?.id && selectedActivity?.user_id && user.id === selectedActivity.user_id,
  );

  useEffect(() => {
    // Optional deep-linking via query params:
    // - q: search
    // - status: pending|approved|rejected|all
    // - dateMode: today|yesterday|date|all
    // - date: YYYY-MM-DD (used when dateMode=date)
    // - userId: filter to a specific user's submissions
    const q = (searchParams.get("q") || "").trim();
    const status = (searchParams.get("status") || "").trim();
    const dateMode = (searchParams.get("dateMode") || "").trim();
    const date = (searchParams.get("date") || "").trim();
    const userId = (searchParams.get("userId") || "").trim();
    const group = (searchParams.get("group") || "").trim();

    if (q) setSearch(q);
    if (status === "pending" || status === "approved" || status === "rejected" || status === "all") setFilter(status);
    if (dateMode === "today" || dateMode === "yesterday" || dateMode === "date" || dateMode === "all") {
      setDateFilterMode(dateMode);
    } else if (date) {
      setDateFilterMode("date");
    }
    if (date) setSelectedDate(date);
    if (userId) setUserIdFilter(userId);
    if (group) setGroupFilter(group);

    fetchActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!userRole) return;
    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole?.role, profile?.assigned_group_id]);

  const fetchGroups = async () => {
    try {
      let query = supabase.from("groups").select("id, name, trainer_ids").order("name");

      const isProOnly = userRole?.role === "pro";
      if (isProOnly) {
        if (profile?.assigned_group_id) {
          query = query.eq("id", profile.assigned_group_id);
        } else {
          setGroups([]);
          return;
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data || []) as GroupOption[];
      setGroups(rows);

      const groupParam = (searchParams.get("group") || "").trim();
      if (groupParam === "all" && showAllGroupsOption) {
        setGroupFilter("all");
      } else if (groupParam && rows.some((g) => g.id === groupParam)) {
        setGroupFilter(groupParam);
      } else if (showAllGroupsOption) {
        setGroupFilter("all");
      } else if (rows.length > 0) {
        setGroupFilter(rows[0].id);
      }
    } catch (e: unknown) {
      console.error(e);
      toast.error("Failed to load groups", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  };

  const setSelectedDateFromCalendar = (d: Date | undefined) => {
    if (!d) return;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    setSelectedDate(`${y}-${m}-${day}`);
    setDateFilterMode("date");
  };

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      let activityQuery = supabase
        .from("daily_activities")
        .select("*")
        .order("submitted_at", { ascending: false })
        .limit(300);
      activityQuery = scopeToUserOffice(activityQuery, officeId, isSuperAdmin);
      const { data, error } = await activityQuery;

      if (error) throw error;

      const rows = (data || []) as ActivityRow[];
      const userIds = Array.from(new Set(rows.map((r) => r.user_id)));

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, username, avatar_url, assigned_group_id")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      const groupIds = Array.from(
        new Set((profilesData || []).map((p) => p.assigned_group_id).filter(Boolean)),
      ) as string[];
      const groupNameById = new Map<string, string>();
      if (groupIds.length > 0) {
        const { data: groupsData } = await supabase
          .from("groups")
          .select("id, name")
          .in("id", groupIds);
        (groupsData || []).forEach((g) => groupNameById.set(g.id, g.name));
      }

      const profileByUserId = new Map<string, ProfileMini>();
      (profilesData || []).forEach((p) => {
        profileByUserId.set(p.user_id, {
          ...(p as ProfileMini),
          group_name: p.assigned_group_id ? groupNameById.get(p.assigned_group_id) ?? null : null,
        });
      });

      setActivities(rows.map((a) => ({ ...a, profile: profileByUserId.get(a.user_id) })));
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to load submissions", { description: e.message });
    } finally {
      setLoading(false);
    }
  }, [officeId, isSuperAdmin]);

  useRealtimeRefresh(() => {
    fetchActivities();
  }, ["daily_activities", "profiles"]);

  const fetchComments = async (activityId: string) => {
    const gen = ++commentsFetchGen.current;
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from("activity_comments")
        .select("*")
        .eq("activity_id", activityId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (gen !== commentsFetchGen.current) return;
      const rows = (data || []) as ActivityComment[];

      const authorIds = Array.from(new Set(rows.map((c) => c.author_user_id)));
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name, username, avatar_url")
        .in("user_id", authorIds);

      if (gen !== commentsFetchGen.current) return;

      const profileByUserId = new Map<string, ProfileMini>();
      (profilesData || []).forEach((p) => profileByUserId.set(p.user_id, p as ProfileMini));

      setComments(rows.map((c) => ({ ...c, authorProfile: profileByUserId.get(c.author_user_id) })));
    } catch (e: any) {
      if (gen !== commentsFetchGen.current) return;
      console.error(e);
      toast.error("Failed to load comments", { description: e.message });
    } finally {
      if (gen === commentsFetchGen.current) {
        setLoadingComments(false);
      }
    }
  };

  const openActivity = (activity: ActivityWithProfile) => {
    setSelectedActivity(activity);
    setNewComment("");
    setComments([]);
    setLoadingComments(true);
    setTodoPlan("");
    setTodoLogs([]);
    setLoadingTodoLogs(true);
    setSubmitterIsSuperAdmin(false);

    void Promise.all([
      fetchUserIsSuperAdmin(activity.user_id).then(setSubmitterIsSuperAdmin),
      fetchComments(activity.id),
      fetchTodoPlan(activity.user_id, activity.activity_date),
    ]);
  };

  const fetchTodoPlan = async (userId: string, activityDate: string) => {
    const gen = ++todoFetchGen.current;
    setLoadingTodoLogs(true);
    try {
      const data = await fetchTodoSubmissionData(userId, activityDate);
      if (gen !== todoFetchGen.current) return;
      setTodoPlan(data.plan);
      setTodoLogs(data.logs);
    } catch (e) {
      if (gen !== todoFetchGen.current) return;
      console.error("Failed to load todo plan/history:", e);
      setTodoPlan("");
      setTodoLogs([]);
    } finally {
      if (gen === todoFetchGen.current) {
        setLoadingTodoLogs(false);
      }
    }
  };

  const postComment = async () => {
    if (!user || !selectedActivity) return;
    const text = newComment.trim();
    if (!text) return;

    setPostingComment(true);
    try {
      const { error } = await supabase.from("activity_comments").insert({
        activity_id: selectedActivity.id,
        author_user_id: user.id,
        comment: text,
      });
      if (error) throw error;
      setNewComment("");
      await fetchComments(selectedActivity.id);
      toast.success("Comment posted");
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to post comment", { description: e.message });
    } finally {
      setPostingComment(false);
    }
  };

  const handleApprove = async () => {
    if (!user || !selectedActivity) return;
    if (
      !canVerifySubmission({
        verifierCanVerify: canVerify,
        submitterIsSuperAdmin,
        verifierUserId: user.id,
        submitterUserId: selectedActivity.user_id,
        verifierRole: userRole?.role,
      })
    ) {
      toast.error("You cannot approve or reject this submission");
      return;
    }

    setIsVerifying(true);
    try {
      const { error } = await supabase
        .from("daily_activities")
        .update({
          is_verified: true,
          verified_by: user.id,
          verified_at: new Date().toISOString(),
          verification_feedback: null,
        })
        .eq("id", selectedActivity.id);

      if (error) throw error;

      const notifyResult = await notifyUser({
        user_id: selectedActivity.user_id,
        title: "Submission Approved",
        message: `Your daily activity submission for ${selectedActivity.activity_date} has been approved.`,
        type: "verification",
        link: "/my-submissions",
        email_subject: `Daily submission approved — ${appName}`,
        ctaLabel: "View submissions",
        sendEmail: true,
      });

      toastAfterAction("Submission approved", notifyResult, { expectedEmail: true });
      await fetchActivities();
      setSelectedActivity(null);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to approve submission", { description: e.message });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReject = async () => {
    if (!user || !selectedActivity) return;
    if (
      !canVerifySubmission({
        verifierCanVerify: canVerify,
        submitterIsSuperAdmin,
        verifierUserId: user.id,
        submitterUserId: selectedActivity.user_id,
        verifierRole: userRole?.role,
      })
    ) {
      toast.error("You cannot approve or reject this submission");
      return;
    }

    if (!rejectionFeedback.trim()) {
      toast.error("Please provide feedback for rejection");
      return;
    }

    setIsVerifying(true);
    try {
      const { error } = await supabase
        .from("daily_activities")
        .update({
          is_verified: false,
          verified_by: user.id,
          verified_at: new Date().toISOString(),
          verification_feedback: rejectionFeedback.trim(),
        })
        .eq("id", selectedActivity.id);

      if (error) throw error;

      const notifyResult = await notifyUser({
        user_id: selectedActivity.user_id,
        title: "Submission Needs Revision",
        message: `Your daily activity for ${selectedActivity.activity_date} was not approved. Feedback: ${rejectionFeedback.trim()}`,
        type: "verification",
        link: "/daily-activity",
        email_subject: `Daily submission feedback — ${appName}`,
        ctaLabel: "Update submission",
        sendEmail: true,
      });

      toastAfterAction("Submission rejected", notifyResult, { expectedEmail: true });
      setRejectionFeedback("");
      await fetchActivities();
      setSelectedActivity(null);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to reject submission", { description: e.message });
    } finally {
      setIsVerifying(false);
    }
  };

  const scopedActivities = useMemo(() => {
    const today = formatISODateInNigeria();
    const yesterday = addDaysISODate(today, -1);
    return activities.filter((a) => {
      const matchesDate =
        dateFilterMode === "all" ||
        (dateFilterMode === "today" && a.activity_date === today) ||
        (dateFilterMode === "yesterday" && a.activity_date === yesterday) ||
        (dateFilterMode === "date" && a.activity_date === selectedDate);
      if (!matchesDate) return false;
      if (userIdFilter && a.user_id !== userIdFilter) return false;
      if (
        groups.length > 0 &&
        !activityMatchesGroup(a.user_id, a.profile?.assigned_group_id, groupFilter, groups)
      ) {
        return false;
      }
      return true;
    });
  }, [activities, dateFilterMode, selectedDate, userIdFilter, groupFilter, groups]);

  const pendingCount = useMemo(
    () => scopedActivities.filter((a) => !a.is_verified && a.verified_at === null).length,
    [scopedActivities]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scopedActivities.filter((a) => {
      const isPending = !a.is_verified && a.verified_at === null;
      const isRejected = !a.is_verified && a.verified_at !== null;
      const isApproved = !!a.is_verified;

      const matchesFilter =
        filter === "all" ||
        (filter === "pending" && isPending) ||
        (filter === "rejected" && isRejected) ||
        (filter === "approved" && isApproved);

      if (!matchesFilter) return false;
      if (!q) return true;

      const haystack = [
        a.profile?.full_name,
        a.profile?.username,
        a.activity_date,
        a.income_platform,
        a.gig_platform,
        a.skill_learned,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [scopedActivities, filter, search]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Submissions</h1>
            <p className="text-muted-foreground mt-1">
              View full daily submissions (details + images).{" "}
              {userRole?.role === "pro"
                ? "You can view and comment within your group."
                : isAdmin
                ? "You can comment on all submissions."
                : ""}
            </p>
          </div>
          <div className="w-full sm:w-96 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name, username, date..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle>Daily submissions</GlassCardTitle>
            <GlassCardDescription>
              Click any row to see the full details and comments. Pending: {pendingCount}
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="flex flex-col lg:flex-row lg:items-start gap-2 sm:gap-4 mb-4">
              <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                {groups.length > 0 && (
                  <Select
                    value={groupFilter}
                    onValueChange={(value) => {
                      setGroupFilter(value);
                      setSearchParams((prev) => {
                        const next = new URLSearchParams(prev);
                        next.set("group", value);
                        return next;
                      });
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-44 h-9">
                      <Users className="h-4 w-4 mr-2 shrink-0" />
                      <SelectValue placeholder="Filter group" />
                    </SelectTrigger>
                    <SelectContent>
                      {showAllGroupsOption && <SelectItem value="all">All groups</SelectItem>}
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  type="button"
                  variant={dateFilterMode === "today" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setDateFilterMode("today");
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set("dateMode", "today");
                      return next;
                    });
                  }}
                >
                  Today
                </Button>
                <Button
                  type="button"
                  variant={dateFilterMode === "yesterday" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setDateFilterMode("yesterday");
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set("dateMode", "yesterday");
                      return next;
                    });
                  }}
                >
                  Yesterday
                </Button>
                <Button
                  type="button"
                  variant={dateFilterMode === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setDateFilterMode("all");
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set("dateMode", "all");
                      return next;
                    });
                  }}
                >
                  All dates
                </Button>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setDateFilterMode("date");
                      setSearchParams((prev) => {
                        const next = new URLSearchParams(prev);
                        next.set("dateMode", "date");
                        next.set("date", e.target.value);
                        return next;
                      });
                    }}
                    className="h-9 w-[160px]"
                  />
                </div>
                {userIdFilter && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setUserIdFilter("");
                      setSearchParams((prev) => {
                        const next = new URLSearchParams(prev);
                        next.delete("userId");
                        return next;
                      });
                    }}
                  >
                    Clear member filter
                  </Button>
                )}
              </div>
              <div className="hidden lg:block rounded-xl border border-border/50 bg-background/40 p-2">
                <DayPickerCalendar
                  mode="single"
                  selected={new Date(`${selectedDate}T12:00:00`)}
                  onSelect={setSelectedDateFromCalendar}
                />
              </div>
            </div>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
              <TabsList className="mb-4 w-full sm:w-auto flex-wrap">
                <TabsTrigger value="pending" className="text-xs sm:text-sm">Pending{pendingCount ? ` (${pendingCount})` : ""}</TabsTrigger>
                <TabsTrigger value="approved" className="text-xs sm:text-sm">Approved</TabsTrigger>
                <TabsTrigger value="rejected" className="text-xs sm:text-sm">Rejected</TabsTrigger>
                <TabsTrigger value="all" className="text-xs sm:text-sm">All</TabsTrigger>
              </TabsList>
            </Tabs>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No submissions found.
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((a) => {
                  const status = a.is_verified
                    ? "Approved"
                    : a.verified_at
                    ? "Rejected"
                    : "Pending";
                  const statusVariant =
                    a.is_verified ? "default" : a.verified_at ? "destructive" : "secondary";

                  return (
                    <div
                      key={a.id}
                      onClick={() => openActivity(a)}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 p-3 sm:p-4 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                        <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                          <AvatarFallback className="bg-gradient-to-br from-primary to-accent-foreground text-primary-foreground text-xs sm:text-sm">
                            {(a.profile?.full_name || "?")
                              .split(" ")
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate text-sm sm:text-base">
                            {a.profile?.full_name || "Unknown User"}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            @{a.profile?.username || "unknown"} • {a.activity_date}
                            {a.profile?.group_name ? ` • ${a.profile.group_name}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        <div className="hidden sm:flex gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            {a.pages_read ?? 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            {a.gigs_created ?? 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            ${Number(a.net_income ?? 0).toFixed(0)}
                          </span>
                        </div>
                        <Badge variant={statusVariant as any} className="text-xs">{status}</Badge>
                        <Eye className="h-4 w-4 text-muted-foreground hidden sm:block" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCardContent>
        </GlassCard>
      </div>

      <Dialog
        open={!!selectedActivity}
        onOpenChange={(open) => {
          if (!open) {
            todoFetchGen.current += 1;
            commentsFetchGen.current += 1;
            setSelectedActivity(null);
            setTodoPlan("");
            setTodoLogs([]);
            setLoadingTodoLogs(false);
          }
        }}
      >
        <DialogContent className="glass-card w-[calc(100%-2rem)] max-w-[95vw] sm:max-w-3xl max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent-foreground text-primary-foreground">
                  {(selectedActivity?.profile?.full_name || "?")
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate">{selectedActivity?.profile?.full_name || "Unknown User"}</p>
                <p className="text-sm font-normal text-muted-foreground truncate">
                  @{selectedActivity?.profile?.username || "unknown"} • {selectedActivity?.activity_date}
                </p>
              </div>
            </DialogTitle>
            <DialogDescription>Full submission details</DialogDescription>
          </DialogHeader>

          {selectedActivity && (
            <div className="space-y-6 mt-4">
              <div className="p-4 rounded-xl bg-accent/30 space-y-4" key={selectedActivity.id}>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">Morning Todo (Latest)</p>
                  {loadingTodoLogs ? (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading todo…
                    </p>
                  ) : todoPlan ? (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{todoPlan}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No plan saved for this date.</p>
                  )}
                </div>
                <TodoUpdateHistory
                  logs={todoLogs}
                  loading={loadingTodoLogs}
                  emptyMessage="No todo versions logged for this date."
                />
              </div>

              <div className="space-y-4">
                <p className="text-sm font-semibold text-foreground">Daily Activity Report</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 text-center">
                <div className="p-4 rounded-xl bg-accent/30 text-center">
                  <BookOpen className="h-6 w-6 mx-auto mb-2 text-chart-1" />
                  <p className="text-lg font-bold">{selectedActivity.pages_read ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Pages Read</p>
                </div>
                <div className="p-4 rounded-xl bg-accent/30 text-center">
                  <Briefcase className="h-6 w-6 mx-auto mb-2 text-chart-2" />
                  <p className="text-lg font-bold">{selectedActivity.gigs_created ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Gigs Created</p>
                </div>
                <div className="p-4 rounded-xl bg-accent/30 text-center">
                  <DollarSign className="h-6 w-6 mx-auto mb-2 text-chart-3" />
                  <p className="text-lg font-bold">${Number(selectedActivity.net_income ?? 0).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Net Income</p>
                </div>
                <div className="p-4 rounded-xl bg-accent/30 text-center">
                  <Users className="h-6 w-6 mx-auto mb-2 text-chart-4" />
                  <p className="text-lg font-bold">{selectedActivity.daily_contacts ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Contacts</p>
                </div>
                <div className="p-4 rounded-xl bg-accent/30 text-center">
                  <GraduationCap className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-lg font-bold">{selectedActivity.skill_learned ? "Yes" : "No"}</p>
                  <p className="text-xs text-muted-foreground">Skill Learned</p>
                </div>
                <div className="p-4 rounded-xl bg-accent/30 text-center">
                  <ImageIcon className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-lg font-bold">
                    {countActivityProofImages(selectedActivity)}
                  </p>
                  <p className="text-xs text-muted-foreground">Proof Images</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-accent/30">
                <p className="text-sm font-semibold text-foreground mb-2">Income (Details)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-sm">
                  <div className="text-muted-foreground">
                    <span className="font-medium text-foreground">Payment Type:</span>{" "}
                    {selectedActivity.payment_type || selectedActivity.income_platform || "—"}
                  </div>
                  <div className="text-muted-foreground">
                    <span className="font-medium text-foreground">Gross:</span>{" "}
                    ${Number(selectedActivity.gross_income ?? 0).toFixed(2)}
                  </div>
                  <div className="text-muted-foreground">
                    <span className="font-medium text-foreground">Fee:</span>{" "}
                    {selectedActivity.fiverr_fee != null ? `$${Number(selectedActivity.fiverr_fee).toFixed(2)}` : "—"}
                  </div>
                  <div className="text-muted-foreground">
                    <span className="font-medium text-foreground">Net:</span>{" "}
                    ${Number(selectedActivity.net_income ?? 0).toFixed(2)}
                  </div>
                  {(selectedActivity.outside_payment_method || selectedActivity.outside_payment_method_other) && (
                    <div className="text-muted-foreground sm:col-span-2">
                      <span className="font-medium text-foreground">Outside Method:</span>{" "}
                      {selectedActivity.outside_payment_method === "other"
                        ? selectedActivity.outside_payment_method_other || "other"
                        : selectedActivity.outside_payment_method}
                    </div>
                  )}
                  {(selectedActivity.cancelled_orders_count || selectedActivity.cancelled_order_amount_received) ? (
                    <div className="text-muted-foreground sm:col-span-2">
                      <span className="font-medium text-foreground">Cancelled Orders:</span>{" "}
                      {selectedActivity.cancelled_orders_count || 0} • Amount received: $
                      {Number(selectedActivity.cancelled_order_amount_received || 0).toFixed(2)}
                    </div>
                  ) : null}
                </div>
              </div>

              {(selectedActivity.reading_notes || selectedActivity.skill_description) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedActivity.reading_notes && (
                    <div className="p-4 rounded-xl bg-accent/30">
                      <p className="text-sm font-medium mb-1">Reading Notes</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedActivity.reading_notes}
                      </p>
                    </div>
                  )}
                  {selectedActivity.skill_description && (
                    <div className="p-4 rounded-xl bg-accent/30">
                      <p className="text-sm font-medium mb-1">Skill Description</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedActivity.skill_description}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {selectedActivity.other_activities && (
                <div className="p-4 rounded-xl bg-accent/30">
                  <p className="text-sm font-medium mb-1">Other Activities</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedActivity.other_activities}
                  </p>
                </div>
              )}

              {(selectedActivity.gig_notes || selectedActivity.account_notes) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedActivity.gig_notes && (
                    <div className="p-4 rounded-xl bg-accent/30">
                      <p className="text-sm font-medium mb-1">Gig Notes</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedActivity.gig_notes}
                      </p>
                    </div>
                  )}
                  {selectedActivity.account_notes && (
                    <div className="p-4 rounded-xl bg-accent/30">
                      <p className="text-sm font-medium mb-1">Account Notes</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedActivity.account_notes}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <ActivityProofSectionsDisplay activity={selectedActivity} thumbnailClassName="max-h-64" />

              {(() => {
                const gigLinks = gigLinksFrom(selectedActivity);
                const accountLinks = accountLinksFrom(selectedActivity);
                
                if (gigLinks.length === 0 && accountLinks.length === 0) return null;
                
                return (
                  <div className="space-y-4">
                    {gigLinks.length > 0 && (
                      <div className="p-4 rounded-xl bg-accent/30">
                        <p className="text-sm font-semibold text-foreground mb-2">Gig Links ({gigLinks.length})</p>
                        <div className="space-y-2">
                          {gigLinks.map((link, idx) => (
                            <a
                              key={`gig-${idx}`}
                              href={link}
                              target="_blank"
                              rel="noreferrer"
                              className="block text-sm text-primary hover:underline truncate"
                            >
                              {link}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {accountLinks.length > 0 && (
                      <div className="p-4 rounded-xl bg-accent/30">
                        <p className="text-sm font-semibold text-foreground mb-2">Account Links ({accountLinks.length})</p>
                        <div className="space-y-2">
                          {accountLinks.map((link, idx) => (
                            <a
                              key={`account-${idx}`}
                              href={link}
                              target="_blank"
                              rel="noreferrer"
                              className="block text-sm text-primary hover:underline truncate"
                            >
                              {link}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {(selectedActivity.submission_tags || []).length > 0 && (
                <div className="p-4 rounded-xl bg-accent/30">
                  <p className="text-sm font-semibold text-foreground mb-2">Daily Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {(selectedActivity.submission_tags || []).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">Comments</p>
                {loadingComments ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading comments...
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No comments yet.</p>
                ) : (
                  <div className="space-y-2">
                    {comments.map((c) => (
                      <div key={c.id} className="p-3 rounded-xl bg-accent/30">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-foreground">
                            {c.authorProfile?.full_name || "Unknown"}{" "}
                            <span className="text-xs text-muted-foreground">
                              @{c.authorProfile?.username || "unknown"}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(c.created_at).toLocaleString()}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{c.comment}</p>
                      </div>
                    ))}
                  </div>
                )}

                {canComment && (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Write a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                    />
                    <div className="flex justify-end">
                      <Button onClick={postComment} disabled={postingComment || !newComment.trim()}>
                        {postingComment ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Posting...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Post Comment
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedActivity && canVerify && submitterIsSuperAdmin && !selectedActivity.is_verified && !selectedActivity.verified_at && (
            <p className="text-sm text-muted-foreground pt-4 border-t">
              Submissions from super admins cannot be approved or rejected here.
            </p>
          )}
          {selectedActivity &&
            canVerify &&
            isOwnSelectedSubmission &&
            userRole?.role === "trainer" &&
            !submitterIsSuperAdmin &&
            !selectedActivity.is_verified &&
            !selectedActivity.verified_at && (
              <p className="text-sm text-muted-foreground pt-4 border-t">
                You cannot approve or reject your own submission. A super admin must review it.
              </p>
            )}
          {selectedActivity && canVerifyThisSubmission && !selectedActivity.is_verified && !selectedActivity.verified_at && (
            <div className="space-y-3 pt-4 border-t">
              <Textarea
                placeholder="Rejection feedback (required if rejecting)..."
                value={rejectionFeedback}
                onChange={(e) => setRejectionFeedback(e.target.value)}
                className="min-h-[80px]"
              />
              <div className="flex flex-col sm:flex-row gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={handleReject}
                  disabled={isVerifying || !rejectionFeedback.trim()}
                  className="text-destructive hover:text-destructive w-full sm:w-auto"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </>
                  )}
                </Button>
                <Button onClick={handleApprove} disabled={isVerifying} className="w-full sm:w-auto">
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Approve
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectedActivity(null);
              setRejectionFeedback("");
            }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}


