import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import {
  formatLongDateInNigeria,
  getNigeriaWeekDayISOs,
  NIGERIA_WEEKDAY_LABELS_SUN_FIRST,
} from "@/lib/nigeriaTime";
import { DayReportSummary } from "@/components/reports/DayReportSummary";

type TodoRow = { todo_date: string; plan: string };

type WeeklyTotals = {
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

type MemberWeekReviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  weekStart: string;
  weekEnd: string;
  loading: boolean;
  todosByDate: Record<string, TodoRow>;
  activitiesByDate: Record<string, import("@/components/reports/DayReportSummary").ActivityDayRow>;
  weeklyTotals?: WeeklyTotals | null;
};

export function MemberWeekReviewDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  weekStart,
  weekEnd,
  loading,
  todosByDate,
  activitiesByDate,
  weeklyTotals,
}: MemberWeekReviewDialogProps) {
  const weekDays = getNigeriaWeekDayISOs(weekStart);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card w-[calc(100%-2rem)] max-w-4xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {subtitle ?? `Sun–Sat ${weekStart} to ${weekEnd}`}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {weekDays.map((isoDate, index) => {
              const todo = todosByDate[isoDate];
              const activity = activitiesByDate[isoDate];
              const dayLabel = NIGERIA_WEEKDAY_LABELS_SUN_FIRST[index];

              return (
                <div
                  key={isoDate}
                  className="rounded-xl border border-border/50 bg-accent/20 overflow-hidden"
                >
                  <div className="px-4 py-2 border-b border-border/50 bg-accent/30">
                    <p className="text-sm font-semibold text-foreground">
                      {dayLabel} — {formatLongDateInNigeria(new Date(`${isoDate}T12:00:00`))}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 min-h-[140px]">
                    <div className="p-4 border-b md:border-b-0 md:border-r border-border/50 flex flex-col">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Morning Todo
                      </p>
                      <p className="text-sm text-foreground whitespace-pre-wrap flex-1">
                        {todo?.plan?.trim() || "No plan saved for this day."}
                      </p>
                    </div>
                    <div className="p-4 flex flex-col min-h-[160px]">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 shrink-0">
                        Daily Report
                      </p>
                      <div className="overflow-y-auto flex-1 min-h-0 pr-1 max-h-[min(520px,55vh)]">
                        <DayReportSummary activity={activity} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {weeklyTotals?.things_learned_summary?.trim() && (
              <GlassCard className="border-chart-2/30">
                <GlassCardHeader className="pb-2">
                  <GlassCardTitle className="text-lg">Things learned this week</GlassCardTitle>
                </GlassCardHeader>
                <GlassCardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {weeklyTotals.things_learned_summary}
                  </p>
                </GlassCardContent>
              </GlassCard>
            )}

            {weeklyTotals && (
              <GlassCard className="border-primary/30">
                <GlassCardHeader className="pb-2">
                  <GlassCardTitle className="text-lg">Week overall</GlassCardTitle>
                  <GlassCardDescription>Sunday – Saturday totals</GlassCardDescription>
                </GlassCardHeader>
                <GlassCardContent>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {(weeklyTotals.consistency_score ?? 0).toFixed(1)}% consistency
                    </Badge>
                    <Badge variant="secondary">{weeklyTotals.total_pages_read ?? 0} pages</Badge>
                    <Badge variant="secondary">
                      ${Number(weeklyTotals.total_net_income ?? 0).toLocaleString()} net income
                    </Badge>
                    <Badge variant="secondary">{weeklyTotals.total_gigs_created ?? 0} gigs</Badge>
                    <Badge variant="secondary">
                      {weeklyTotals.total_accounts_created ?? 0} accounts
                    </Badge>
                    {(weeklyTotals.total_tags ?? 0) > 0 && (
                      <Badge variant="secondary">{weeklyTotals.total_tags} tags</Badge>
                    )}
                    {(weeklyTotals.total_expected_conversions ?? 0) > 0 && (
                      <Badge variant="secondary">
                        {weeklyTotals.total_expected_conversions} converts
                      </Badge>
                    )}
                    {weeklyTotals.submission_count != null && (
                      <Badge variant="secondary">
                        {weeklyTotals.submission_count}/7 submissions
                      </Badge>
                    )}
                  </div>
                </GlassCardContent>
              </GlassCard>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
