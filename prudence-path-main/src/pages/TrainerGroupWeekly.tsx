import { useCallback, useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/glass-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Briefcase, ChevronRight, Loader2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { scopeToUserOffice } from "@/lib/tenantScope";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeRefresh } from "@/contexts/RealtimeSyncContext";
import {
  addDaysISODate,
  formatLongDateInNigeria,
  getNigeriaWeekEndISO,
  getNigeriaWeekStartISO,
} from "@/lib/nigeriaTime";
import { toast } from "sonner";
import { WeekPicker } from "@/components/reports/WeekPicker";
import { MemberWeekReviewDialog } from "@/components/reports/MemberWeekReviewDialog";
import type { ActivityDayRow } from "@/components/reports/DayReportSummary";

const ALL_GROUPS = "__all__";

type GroupRow = { id: string; name: string };
type MemberRow = {
  user_id: string;
  full_name: string;
  username: string;
  assigned_group_id: string | null;
};
type WeeklyRow = {
  user_id: string;
  consistency_score: number | null;
  total_pages_read: number | null;
  total_gigs_created: number | null;
  total_accounts_created: number | null;
  submission_count?: number | null;
  things_learned_summary?: string | null;
  total_tags?: number | null;
  total_expected_conversions?: number | null;
};
type TodoRow = { todo_date: string; plan: string };

export default function TrainerGroupWeekly() {
  const { user, userRole, officeId, isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [groupId, setGroupId] = useState<string>(ALL_GROUPS);
  const [selectedWeekStart, setSelectedWeekStart] = useState(getNigeriaWeekStartISO);
  const weekEnd = addDaysISODate(selectedWeekStart, 6);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [weeklyByUser, setWeeklyByUser] = useState<Record<string, WeeklyRow>>({});

  const [selectedMember, setSelectedMember] = useState<MemberRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [todosByDate, setTodosByDate] = useState<Record<string, TodoRow>>({});
  const [activitiesByDate, setActivitiesByDate] = useState<Record<string, ActivityDayRow>>({});

  useEffect(() => {
    const loadGroups = async () => {
      if (!user) return;
      setLoading(true);
      try {
        let query = supabase.from("groups").select("id, name").order("name");
        if (!isSuperAdmin) {
          query = query.contains("trainer_ids", [user.id]);
        }
        const { data, error } = await query;
        if (error) throw error;
        const list = (data || []) as GroupRow[];
        setGroups(list);
        if (!groupId && list.length) setGroupId(ALL_GROUPS);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to load groups");
      } finally {
        setLoading(false);
      }
    };
    loadGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isSuperAdmin]);

  const loadMembersAndReports = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!user) return;
      if (!options?.silent) setLoading(true);
      try {
        let memberQuery = supabase
          .from("profiles")
          .select("user_id, full_name, username, assigned_group_id")
          .eq("approval_status", "approved");

        if (groupId !== ALL_GROUPS) {
          memberQuery = memberQuery.eq("assigned_group_id", groupId);
        } else if (!isSuperAdmin) {
          const groupIds = groups.map((g) => g.id);
          if (!groupIds.length) {
            setMembers([]);
            setWeeklyByUser({});
            return;
          }
          memberQuery = memberQuery.in("assigned_group_id", groupIds);
        }

        memberQuery = scopeToUserOffice(memberQuery, officeId, isSuperAdmin);

        const { data: memberData, error: memberError } = await memberQuery;
        if (memberError) throw memberError;
        const list = (memberData || []) as MemberRow[];
        setMembers(list);

        if (!list.length) {
          setWeeklyByUser({});
          return;
        }

        const { data: reportRows, error: reportsError } = await supabase
          .from("weekly_reports")
          .select(
            "user_id, consistency_score, total_pages_read, total_gigs_created, total_accounts_created, submission_count, things_learned_summary, total_tags, total_expected_conversions",
          )
          .eq("week_start_date", selectedWeekStart)
          .in(
            "user_id",
            list.map((m) => m.user_id),
          );
        if (reportsError) throw reportsError;

        const map: Record<string, WeeklyRow> = {};
        for (const row of reportRows || []) {
          map[row.user_id] = row as WeeklyRow;
        }
        setWeeklyByUser(map);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to load weekly overview");
      } finally {
        if (!options?.silent) setLoading(false);
      }
    },
    [groupId, selectedWeekStart, groups, user, isSuperAdmin, officeId],
  );

  useEffect(() => {
    if (groups.length > 0 || groupId !== ALL_GROUPS || isSuperAdmin) {
      loadMembersAndReports();
    }
  }, [groupId, selectedWeekStart, groups, user, isSuperAdmin, loadMembersAndReports]);

  useRealtimeRefresh(
    () => loadMembersAndReports({ silent: true }),
    ["profiles", "daily_activities"],
  );

  const averages = useMemo(() => {
    const rows = members.map((m) => weeklyByUser[m.user_id]).filter(Boolean);
    if (!rows.length) return { consistency: 0, pages: 0, gigs: 0, accounts: 0 };
    const n = rows.length;
    return {
      consistency: rows.reduce((s, r) => s + (r.consistency_score || 0), 0) / n,
      pages: rows.reduce((s, r) => s + (r.total_pages_read || 0), 0) / n,
      gigs: rows.reduce((s, r) => s + (r.total_gigs_created || 0), 0) / n,
      accounts: rows.reduce((s, r) => s + (r.total_accounts_created || 0), 0) / n,
    };
  }, [members, weeklyByUser]);

  const openMemberWeek = async (member: MemberRow) => {
    setSelectedMember(member);
    setDetailOpen(true);
    setDetailLoading(true);
    setTodosByDate({});
    setActivitiesByDate({});
    try {
      const [todosRes, activitiesRes] = await Promise.all([
        supabase
          .from("daily_todos")
          .select("todo_date, plan")
          .eq("user_id", member.user_id)
          .gte("todo_date", selectedWeekStart)
          .lte("todo_date", weekEnd),
        supabase
          .from("daily_activities")
          .select("*")
          .eq("user_id", member.user_id)
          .gte("activity_date", selectedWeekStart)
          .lte("activity_date", weekEnd),
      ]);

      if (todosRes.error) throw todosRes.error;
      if (activitiesRes.error) throw activitiesRes.error;

      const todoMap: Record<string, TodoRow> = {};
      (todosRes.data || []).forEach((t) => {
        todoMap[t.todo_date] = t as TodoRow;
      });
      setTodosByDate(todoMap);

      const actMap: Record<string, ActivityDayRow> = {};
      (activitiesRes.data || []).forEach((a) => {
        actMap[a.activity_date] = a as ActivityDayRow;
      });
      setActivitiesByDate(actMap);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load week details");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const selectedWeekly = selectedMember ? weeklyByUser[selectedMember.user_id] : null;
  const showAllGroups = isSuperAdmin || groups.length > 1;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-8 w-8 text-primary" />
              Group Weekly Overview
            </h1>
            <p className="text-muted-foreground mt-1">
              Week: Sun {formatLongDateInNigeria(new Date(`${selectedWeekStart}T12:00:00`))} – Sat{" "}
              {formatLongDateInNigeria(new Date(`${weekEnd}T12:00:00`))}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <WeekPicker value={selectedWeekStart} onChange={setSelectedWeekStart} />
            {groups.length > 0 && (
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  {showAllGroups && (
                    <SelectItem value={ALL_GROUPS}>All groups</SelectItem>
                  )}
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : groups.length === 0 ? (
          <GlassCard>
            <GlassCardContent className="py-8 text-center text-muted-foreground">
              No groups assigned to you yet.
            </GlassCardContent>
          </GlassCard>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <GlassCard>
                <GlassCardContent className="pt-6">
                  <p className="text-xs text-muted-foreground">Avg consistency</p>
                  <p className="text-2xl font-bold">{averages.consistency.toFixed(1)}%</p>
                </GlassCardContent>
              </GlassCard>
              <GlassCard>
                <GlassCardContent className="pt-6">
                  <p className="text-xs text-muted-foreground">Avg pages read</p>
                  <p className="text-2xl font-bold">{averages.pages.toFixed(1)}</p>
                </GlassCardContent>
              </GlassCard>
              <GlassCard>
                <GlassCardContent className="pt-6">
                  <p className="text-xs text-muted-foreground">Avg gigs</p>
                  <p className="text-2xl font-bold">{averages.gigs.toFixed(1)}</p>
                </GlassCardContent>
              </GlassCard>
              <GlassCard>
                <GlassCardContent className="pt-6">
                  <p className="text-xs text-muted-foreground">Avg accounts</p>
                  <p className="text-2xl font-bold">{averages.accounts.toFixed(1)}</p>
                </GlassCardContent>
              </GlassCard>
            </div>

            <GlassCard>
              <GlassCardHeader>
                <GlassCardTitle>Members</GlassCardTitle>
                <GlassCardDescription>
                  Click a member to review their week day by day (Sunday → Saturday)
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent className="space-y-3">
                {members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No approved members in this group.</p>
                ) : (
                  members.map((m) => {
                    const w = weeklyByUser[m.user_id];
                    return (
                      <button
                        key={m.user_id}
                        type="button"
                        onClick={() => openMemberWeek(m)}
                        className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="min-w-0">
                            <p className="font-medium">{m.full_name}</p>
                            <p className="text-sm text-muted-foreground">@{m.username}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 sm:ml-2" />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">
                            {(w?.consistency_score ?? 0).toFixed(1)}% consistency
                          </Badge>
                          <Badge variant="secondary">{w?.total_pages_read ?? 0} pages</Badge>
                          <Badge variant="secondary">{w?.total_gigs_created ?? 0} gigs</Badge>
                        </div>
                      </button>
                    );
                  })
                )}
              </GlassCardContent>
            </GlassCard>
          </>
        )}
      </div>

      <MemberWeekReviewDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title={`${selectedMember?.full_name || "Member"} — weekly review`}
        subtitle={
          selectedMember
            ? `@${selectedMember.username} • Sun–Sat ${selectedWeekStart} to ${weekEnd}`
            : undefined
        }
        weekStart={selectedWeekStart}
        weekEnd={weekEnd}
        loading={detailLoading}
        todosByDate={todosByDate}
        activitiesByDate={activitiesByDate}
        weeklyTotals={selectedWeekly}
      />
    </AppLayout>
  );
}
