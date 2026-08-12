import { supabase } from "../integrations/supabase/client";

export type TodoLogEntry = {
  id: string;
  plan: string;
  created_at: string;
};

export type TodoSubmissionData = {
  plan: string;
  logs: TodoLogEntry[];
};

export async function fetchTodoSubmissionData(
  userId: string,
  activityDate: string,
): Promise<TodoSubmissionData> {
  const [todoRes, logsRes] = await Promise.all([
    supabase
      .from("daily_todos")
      .select("plan")
      .eq("user_id", userId)
      .eq("todo_date", activityDate)
      .maybeSingle(),
    supabase
      .from("daily_todo_logs")
      .select("id, plan, created_at")
      .eq("user_id", userId)
      .eq("todo_date", activityDate)
      .order("created_at", { ascending: false }),
  ]);

  if (todoRes.error) throw todoRes.error;
  if (logsRes.error) throw logsRes.error;

  return {
    plan: (todoRes.data as { plan?: string } | null)?.plan || "",
    logs: (logsRes.data || []) as TodoLogEntry[],
  };
}
