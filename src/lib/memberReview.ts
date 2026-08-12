import { supabase } from "../integrations/supabase/client";
import { addDaysISODate, getNigeriaWeekStartISO } from "./nigeriaTime";
import type { ActivityRow } from "./activityTypes";

export type WeeklyTotals = {
  consistency_score?: number | null;
  total_pages_read?: number | null;
  total_gigs_created?: number | null;
  total_accounts_created?: number | null;
  total_net_income?: number | null;
  submission_count?: number | null;
  things_learned_summary?: string | null;
  total_tags?: number | null;
  total_expected_conversions?: number | null;
};

export type TodoDay = { todo_date: string; plan: string };

export type MemberWeekData = {
  todosByDate: Record<string, TodoDay>;
  activitiesByDate: Record<string, ActivityRow>;
  weeklyTotals: WeeklyTotals | null;
};

export type TeamMemberDetail = {
  id: string;
  user_id: string;
  full_name: string;
  username: string;
  email: string | null;
  avatar_url: string | null;
  approval_status: "pending" | "approved" | "rejected";
  assigned_group_id: string | null;
  assigned_trainer_id: string | null;
  sponsor_username: string | null;
  office_id: string | null;
  created_at: string | null;
  role: string;
  group_name: string | null;
  trainer_name: string | null;
  submissionsThisWeek: number;
};

const ROLE_PRIORITY = ["super_admin", "office_admin", "trainer", "pro", "sponsor", "member"] as const;

export function pickPrimaryRole(roles: { role: string }[] | null | undefined): string {
  const list = roles || [];
  for (const r of ROLE_PRIORITY) {
    if (list.some((x) => x.role === r)) return r;
  }
  return "member";
}

export async function fetchMemberWeekReview(userId: string, weekStart: string): Promise<MemberWeekData> {
  const weekEnd = addDaysISODate(weekStart, 6);
  const [todosRes, activitiesRes, weeklyRes] = await Promise.all([
    supabase
      .from("daily_todos")
      .select("todo_date, plan")
      .eq("user_id", userId)
      .gte("todo_date", weekStart)
      .lte("todo_date", weekEnd),
    supabase
      .from("daily_activities")
      .select("*")
      .eq("user_id", userId)
      .gte("activity_date", weekStart)
      .lte("activity_date", weekEnd),
    supabase
      .from("weekly_reports")
      .select(
        "consistency_score, total_pages_read, total_gigs_created, total_accounts_created, total_net_income, submission_count, things_learned_summary, total_tags, total_expected_conversions",
      )
      .eq("user_id", userId)
      .eq("week_start_date", weekStart)
      .maybeSingle(),
  ]);

  if (todosRes.error) throw todosRes.error;
  if (activitiesRes.error) throw activitiesRes.error;

  const todosByDate: Record<string, TodoDay> = {};
  (todosRes.data || []).forEach((row) => {
    todosByDate[row.todo_date] = { todo_date: row.todo_date, plan: row.plan || "" };
  });

  const activitiesByDate: Record<string, ActivityRow> = {};
  (activitiesRes.data || []).forEach((row) => {
    const act = row as ActivityRow;
    activitiesByDate[act.activity_date] = act;
  });

  return {
    todosByDate,
    activitiesByDate,
    weeklyTotals: (weeklyRes.data as WeeklyTotals | null) ?? null,
  };
}

export async function fetchTeamMemberDetail(userId: string): Promise<TeamMemberDetail | null> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id, user_id, full_name, username, email, avatar_url, approval_status, assigned_group_id, assigned_trainer_id, sponsor_username, office_id, created_at",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!profile) return null;

  const weekStart = getNigeriaWeekStartISO();
  const [{ data: roles }, { data: group }, { data: trainer }, { count }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId),
    profile.assigned_group_id
      ? supabase.from("groups").select("name").eq("id", profile.assigned_group_id).maybeSingle()
      : Promise.resolve({ data: null }),
    profile.assigned_trainer_id
      ? supabase.from("profiles").select("full_name").eq("user_id", profile.assigned_trainer_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("daily_activities")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("activity_date", weekStart),
  ]);

  return {
    ...(profile as Omit<TeamMemberDetail, "role" | "group_name" | "trainer_name" | "submissionsThisWeek">),
    role: pickPrimaryRole(roles || []),
    group_name: (group as { name?: string } | null)?.name ?? null,
    trainer_name: (trainer as { full_name?: string } | null)?.full_name ?? null,
    submissionsThisWeek: count || 0,
  };
}
