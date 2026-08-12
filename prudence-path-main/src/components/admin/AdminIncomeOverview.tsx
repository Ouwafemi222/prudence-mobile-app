import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/glass-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WeekPicker } from "@/components/reports/WeekPicker";
import { supabase } from "@/integrations/supabase/client";
import { scopeToUserOffice } from "@/lib/tenantScope";
import { useAuth } from "@/contexts/AuthContext";
import {
  addDaysISODate,
  getNigeriaMonthEndISO,
  getNigeriaMonthStartISO,
  getNigeriaWeekStartISO,
  getSundayWeekNumber,
  NIGERIA_TIME_ZONE,
} from "@/lib/nigeriaTime";
import { DollarSign, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

type MemberProfile = {
  user_id: string;
  full_name: string;
  username: string;
};

type MemberIncomeRow = {
  user_id: string;
  full_name: string;
  username: string;
  weekNet: number;
  monthNet: number;
};

function sumNetInRange(
  rows: { user_id: string; activity_date: string; net_income: number | null }[],
  userId: string,
  startISO: string,
  endISO: string,
): number {
  return rows.reduce((sum, row) => {
    if (row.user_id !== userId) return sum;
    if (row.activity_date < startISO || row.activity_date > endISO) return sum;
    return sum + Number(row.net_income ?? 0);
  }, 0);
}

export function AdminIncomeOverview() {
  const { officeId, isSuperAdmin } = useAuth();
  const [selectedWeekStart, setSelectedWeekStart] = useState(getNigeriaWeekStartISO);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [activityRows, setActivityRows] = useState<
    { user_id: string; activity_date: string; net_income: number | null }[]
  >([]);

  const weekEndISO = addDaysISODate(selectedWeekStart, 6);
  const monthStartISO = getNigeriaMonthStartISO(new Date(`${selectedWeekStart}T12:00:00Z`));
  const monthEndISO = getNigeriaMonthEndISO(new Date(`${selectedWeekStart}T12:00:00Z`));

  const monthLabel = useMemo(() => {
    const d = new Date(`${monthStartISO}T12:00:00Z`);
    return d.toLocaleDateString("en-US", { timeZone: NIGERIA_TIME_ZONE, month: "long", year: "numeric" });
  }, [monthStartISO]);

  const weekLabel = `Week ${getSundayWeekNumber(selectedWeekStart)}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let profileQuery = supabase
        .from("profiles")
        .select("user_id, full_name, username")
        .eq("approval_status", "approved")
        .order("full_name");
      profileQuery = scopeToUserOffice(profileQuery, officeId, isSuperAdmin);
      const { data: profiles, error: profileError } = await profileQuery;
      if (profileError) throw profileError;

      let activityQuery = supabase
        .from("daily_activities")
        .select("user_id, activity_date, net_income")
        .gte("activity_date", monthStartISO)
        .lte("activity_date", monthEndISO)
        .not("submitted_at", "is", null);
      activityQuery = scopeToUserOffice(activityQuery, officeId, isSuperAdmin);
      const { data: activities, error: actError } = await activityQuery;
      if (actError) throw actError;

      setMembers((profiles || []) as MemberProfile[]);
      setActivityRows(
        (activities || []) as { user_id: string; activity_date: string; net_income: number | null }[],
      );
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load income data");
      setMembers([]);
      setActivityRows([]);
    } finally {
      setLoading(false);
    }
  }, [monthStartISO, monthEndISO, officeId, isSuperAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const memberRows: MemberIncomeRow[] = useMemo(() => {
    return members.map((m) => ({
      user_id: m.user_id,
      full_name: m.full_name,
      username: m.username,
      weekNet: sumNetInRange(activityRows, m.user_id, selectedWeekStart, weekEndISO),
      monthNet: sumNetInRange(activityRows, m.user_id, monthStartISO, monthEndISO),
    }));
  }, [members, activityRows, selectedWeekStart, weekEndISO, monthStartISO, monthEndISO]);

  const sortedRows = useMemo(
    () => [...memberRows].sort((a, b) => b.weekNet - a.weekNet || b.monthNet - a.monthNet),
    [memberRows],
  );

  const totalWeek = useMemo(
    () => memberRows.reduce((s, r) => s + r.weekNet, 0),
    [memberRows],
  );
  const totalMonth = useMemo(
    () => memberRows.reduce((s, r) => s + r.monthNet, 0),
    [memberRows],
  );

  const earnersWeek = memberRows.filter((r) => r.weekNet > 0).length;
  const earnersMonth = memberRows.filter((r) => r.monthNet > 0).length;

  const formatUsd = (n: number) =>
    `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <GlassCard className="border-primary/20">
      <GlassCardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <GlassCardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Organization income
            </GlassCardTitle>
            <GlassCardDescription>
              Total net income from submitted daily reports (all approved members).
            </GlassCardDescription>
          </div>
          <WeekPicker value={selectedWeekStart} onChange={setSelectedWeekStart} />
        </div>
      </GlassCardHeader>
      <GlassCardContent className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl bg-chart-3/10 border border-chart-3/20 p-4">
                <p className="text-sm text-muted-foreground">{weekLabel} total (Sun–Sat)</p>
                <p className="text-3xl font-bold text-foreground mt-1">{formatUsd(totalWeek)}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {earnersWeek} member{earnersWeek === 1 ? "" : "s"} with income this week
                </p>
              </div>
              <div className="rounded-xl bg-primary/10 border border-primary/20 p-4">
                <p className="text-sm text-muted-foreground">{monthLabel} total</p>
                <p className="text-3xl font-bold text-foreground mt-1">{formatUsd(totalMonth)}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {earnersMonth} member{earnersMonth === 1 ? "" : "s"} with income this month
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Income by member
              </p>
              <div className="rounded-lg border border-border/50 overflow-x-auto max-h-[min(420px,50vh)] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead className="text-right">{weekLabel}</TableHead>
                      <TableHead className="text-right">{monthLabel}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedRows.map((row) => (
                      <TableRow key={row.user_id}>
                        <TableCell>
                          <p className="font-medium">{row.full_name}</p>
                          <p className="text-xs text-muted-foreground">@{row.username}</p>
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {row.weekNet > 0 ? formatUsd(row.weekNet) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {row.monthNet > 0 ? formatUsd(row.monthNet) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {sortedRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                          No approved members found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </GlassCardContent>
    </GlassCard>
  );
}
