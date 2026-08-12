import { useEffect, useRef } from "react";
import { REALTIME_SYNC_ENABLED } from "@/contexts/RealtimeSyncContext";
import { supabase } from "@/integrations/supabase/client";

type Options = {
  userId: string | undefined;
  weekStartISO?: string;
  monthYearISO?: string;
  onWeeklyUpdate?: () => void;
  onMonthlyUpdate?: () => void;
  onDailyActivityUpdate?: () => void;
  enabled?: boolean;
};

/**
 * Subscribes to DB-maintained weekly_reports / monthly_goals changes for the current user.
 * Aggregates are updated by sync_reports_from_activity() on daily_activities changes.
 */
export function useReportAggregatesRealtime({
  userId,
  weekStartISO,
  monthYearISO,
  onWeeklyUpdate,
  onMonthlyUpdate,
  onDailyActivityUpdate,
  enabled = true,
}: Options) {
  const onWeeklyRef = useRef(onWeeklyUpdate);
  const onMonthlyRef = useRef(onMonthlyUpdate);
  const onDailyRef = useRef(onDailyActivityUpdate);
  onWeeklyRef.current = onWeeklyUpdate;
  onMonthlyRef.current = onMonthlyUpdate;
  onDailyRef.current = onDailyActivityUpdate;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedule = (fn: (() => void) | undefined) => {
    if (!fn) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      fn();
    }, 400);
  };

  useEffect(() => {
    if (!REALTIME_SYNC_ENABLED || !enabled || !userId) return;

    const channel = supabase
      .channel(`report-aggregates:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_activities",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          schedule(() => onDailyRef.current?.());
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "weekly_reports",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as { week_start_date?: string } | null;
          if (!weekStartISO || row?.week_start_date === weekStartISO) {
            schedule(() => onWeeklyRef.current?.());
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "monthly_goals",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as { month_year?: string } | null;
          const monthKey = row?.month_year?.toString().slice(0, 10);
          if (!monthYearISO || monthKey === monthYearISO) {
            schedule(() => onMonthlyRef.current?.());
          }
        },
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [userId, weekStartISO, monthYearISO, enabled]);
}
