import { useCallback, useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { AlertCircle, Loader2, Lock, Save } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { formatISODateInNigeria, formatLongDateInNigeria } from "@/lib/nigeriaTime";
import { getTodoLockMessage, isTodoDateEditable, isTodoDateToday } from "@/lib/todoRules";
import { TodoLogEntry, TodoUpdateHistory } from "@/components/todos/TodoUpdateHistory";
import { PolicyNoticeBanner } from "@/components/notices/PolicyNoticeBanner";
import { cn } from "@/lib/utils";

type DailyTodoRow = {
  id: string;
  user_id: string;
  todo_date: string;
  plan: string;
  created_at: string;
  updated_at: string;
};

export default function DailyTodo() {
  const { user } = useAuth();
  const today = formatISODateInNigeria();
  const [selectedDate, setSelectedDate] = useState(today);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [todo, setTodo] = useState<DailyTodoRow | null>(null);
  const [plan, setPlan] = useState("");
  const [logs, setLogs] = useState<TodoLogEntry[]>([]);

  const canEdit = isTodoDateEditable(selectedDate);
  const lockMessage = getTodoLockMessage(selectedDate);
  const isViewingPast = selectedDate < today;
  const isViewingFuture = selectedDate > today;
  const isViewingToday = isTodoDateToday(selectedDate);

  const fetchLogs = useCallback(async (date: string, userId: string) => {
    setLogsLoading(true);
    try {
      const { data, error } = await supabase
        .from("daily_todo_logs")
        .select("id, plan, created_at")
        .eq("user_id", userId)
        .eq("todo_date", date)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLogs((data || []) as TodoLogEntry[]);
    } catch (e: unknown) {
      console.error(e);
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const fetchTodo = useCallback(
    async (date: string) => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("daily_todos")
          .select("*")
          .eq("user_id", user.id)
          .eq("todo_date", date)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          const row = data as DailyTodoRow;
          setTodo(row);
          setPlan(row.plan || "");
        } else {
          setTodo(null);
          setPlan("");
        }
        await fetchLogs(date, user.id);
      } catch (e: unknown) {
        console.error(e);
        toast.error("Failed to load daily todo", {
          description: e instanceof Error ? e.message : undefined,
        });
      } finally {
        setLoading(false);
      }
    },
    [user, fetchLogs],
  );

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchTodo(selectedDate);
  }, [selectedDate, user?.id, fetchTodo]);

  const selectedDateObj = useMemo(() => new Date(`${selectedDate}T12:00:00`), [selectedDate]);

  const setSelectedDateFromCalendar = (d: Date | undefined) => {
    if (!d) return;
    const iso = formatISODateInNigeria(d);
    setSelectedDate(iso);
  };

  const save = async () => {
    if (!user) {
      toast.error("Please log in to save your daily todo.");
      return;
    }
    if (!canEdit) {
      toast.error(isViewingPast ? "Past todos cannot be edited." : "Today's todo is locked.");
      return;
    }
    if (!plan.trim()) {
      toast.error("Write your morning plan before saving.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("daily_todos").upsert(
        {
          user_id: user.id,
          todo_date: selectedDate,
          plan: plan.trim(),
        },
        { onConflict: "user_id,todo_date" },
      );

      if (error) throw error;
      toast.success(todo ? "Daily todo updated" : "Daily todo saved");
      await fetchTodo(selectedDate);
    } catch (e: unknown) {
      console.error(e);
      toast.error("Failed to save daily todo", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Daily Todo (Morning Plan)</h1>
          <p className="text-muted-foreground mt-1">
            Set your morning plan for today only. Past dates are read-only. Every save is logged.
          </p>
        </div>

        <PolicyNoticeBanner noticeId="todo_same_day_v1" title="Todo planning update">
          Morning plans are <strong>same-day only</strong> — set today&apos;s plan on today, before{" "}
          <strong>11:59 PM WAT</strong>. Planning future days in advance is no longer available.
        </PolicyNoticeBanner>

        {lockMessage && (
          <div
            className={cn(
              "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
              canEdit
                ? "border-primary/20 bg-primary/5 text-muted-foreground"
                : "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100",
            )}
          >
            {canEdit ? (
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
            ) : (
              <Lock className="h-4 w-4 shrink-0 mt-0.5" />
            )}
            <span>{lockMessage}</span>
          </div>
        )}

        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle>Pick a date</GlassCardTitle>
            <GlassCardDescription>
              {isViewingToday
                ? canEdit
                  ? "You're editing today's morning plan."
                  : "Today is locked — view your plan and update history below."
                : isViewingFuture
                  ? "Future dates are read-only until that day arrives."
                  : "Viewing a past date (read-only)."}
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border/50 bg-background/40 p-2">
              <Calendar
                mode="single"
                selected={selectedDateObj}
                onSelect={setSelectedDateFromCalendar}
                defaultMonth={selectedDateObj}
                disabled={(date) => {
                  const iso = formatISODateInNigeria(date);
                  return iso > today;
                }}
              />
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="todo-date">Date (Nigeria / WAT)</Label>
                <Input
                  id="todo-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v) setSelectedDate(v);
                  }}
                  disabled={!canEdit && isViewingPast}
                />
                <p className="text-xs text-muted-foreground">
                  {formatLongDateInNigeria(selectedDateObj)}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(today)}
              >
                Jump to today
              </Button>
              <p className="text-xs text-muted-foreground">
                Trainers see your latest plan and full update history when reviewing submissions.
                You can only edit today&apos;s plan.
              </p>
            </div>
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle>Morning plan</GlassCardTitle>
            <GlassCardDescription>
              {canEdit
                ? "Be specific. Each time you save, a new version is recorded."
                : "Read-only — this date cannot be edited."}
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </div>
            ) : (
              <>
                <Textarea
                  placeholder={
                    canEdit
                      ? "Example:\n- Read 7 pages\n- Create 2 gigs\n- Do 15 outreaches\n..."
                      : "No edits allowed for this date."
                  }
                  className="min-h-[220px]"
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  disabled={!canEdit}
                  readOnly={!canEdit}
                />

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div>
                    {todo ? (
                      <>Last updated: {new Date(todo.updated_at).toLocaleString()}</>
                    ) : (
                      <>Not saved yet for this date</>
                    )}
                  </div>
                  <div>{plan.length} chars</div>
                </div>

                {canEdit && (
                  <div className="flex justify-end">
                    <Button onClick={save} disabled={saving || !plan.trim()}>
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          {todo ? "Update plan" : "Save plan"}
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle>Update history</GlassCardTitle>
            <GlassCardDescription>
              Every save for {formatLongDateInNigeria(selectedDateObj)} — see what you submitted each time.
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            <TodoUpdateHistory logs={logs} loading={logsLoading} />
          </GlassCardContent>
        </GlassCard>
      </div>
    </AppLayout>
  );
}
