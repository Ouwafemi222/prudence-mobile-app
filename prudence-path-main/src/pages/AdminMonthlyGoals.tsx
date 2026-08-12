import { useCallback, useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Search, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { formatMonthYearLabel, getNigeriaMonthStartISO } from "@/lib/nigeriaTime";
import { MonthPicker } from "@/components/reports/MonthPicker";
import { MonthlyGoalOverview, type MonthlyGoalRow } from "@/components/monthly-goals/MonthlyGoalOverview";
import { scopeToUserOffice } from "@/lib/tenantScope";
import { TenantAppSeo } from "@/components/seo/TenantAppSeo";
import { toast } from "sonner";

type MemberRow = {
  user_id: string;
  full_name: string;
  username: string;
  approval_status: string;
};

export default function AdminMonthlyGoals() {
  const { isAdmin, officeId, isSuperAdmin } = useAuth();

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedMonthStart, setSelectedMonthStart] = useState(getNigeriaMonthStartISO);
  const [monthlyGoal, setMonthlyGoal] = useState<MonthlyGoalRow | null>(null);
  const [loadingGoal, setLoadingGoal] = useState(false);

  const monthLabel = useMemo(
    () => formatMonthYearLabel(selectedMonthStart),
    [selectedMonthStart],
  );

  const loadMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      let query = supabase
        .from("profiles")
        .select("user_id, full_name, username, approval_status")
        .eq("approval_status", "approved")
        .order("full_name");
      query = scopeToUserOffice(query, officeId, isSuperAdmin);
      const { data, error } = await query;
      if (error) throw error;
      setMembers((data || []) as MemberRow[]);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load members");
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }, [officeId, isSuperAdmin]);

  const loadGoal = useCallback(async (targetUserId: string, monthStart: string) => {
    setLoadingGoal(true);
    setMonthlyGoal(null);
    try {
      const { data, error } = await supabase.rpc("get_or_generate_monthly_goal", {
        p_user_id: targetUserId,
        p_month_year: monthStart,
      });
      if (error) throw error;
      if (data && Array.isArray(data) && data.length > 0) {
        setMonthlyGoal(data[0] as MonthlyGoalRow);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load monthly goal");
    } finally {
      setLoadingGoal(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) loadMembers();
  }, [isAdmin, loadMembers]);

  useEffect(() => {
    if (selectedUserId) loadGoal(selectedUserId, selectedMonthStart);
    else setMonthlyGoal(null);
  }, [selectedUserId, selectedMonthStart, loadGoal]);

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const filtered = members.filter((m) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      m.full_name.toLowerCase().includes(q) ||
      m.username.toLowerCase().includes(q)
    );
  });

  const selectedMember = members.find((m) => m.user_id === selectedUserId);

  return (
    <AppLayout>
      <TenantAppSeo
        title="All Members — Monthly Report & Goals"
        description="Admin view of member monthly targets and performance on THE PRUDENCE. Browse any month. Nigeria time (WAT)."
        path="/admin-monthly-goals"
        keywords="admin monthly goals, member monthly report, trainer oversight Nigeria"
        breadcrumbs={[
          { name: "Admin Dashboard", path: "/admin-dashboard" },
          { name: "Monthly Goals", path: "/admin-monthly-goals" },
        ]}
      />
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Target className="h-8 w-8 text-primary" />
              All Members — Monthly Report & Goals
            </h1>
            <p className="text-muted-foreground mt-1">
              {isSuperAdmin ? "Super admin" : "Trainer"} view — read-only monthly data for {monthLabel}.
            </p>
          </div>
          <MonthPicker value={selectedMonthStart} onChange={setSelectedMonthStart} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <GlassCard className="lg:col-span-2">
            <GlassCardHeader>
              <GlassCardTitle>Members</GlassCardTitle>
              <GlassCardDescription>{filtered.length} approved members</GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search name or username..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {loadingMembers ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="max-h-[min(520px,60vh)] overflow-y-auto rounded-lg border border-border/50">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Username</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((m) => (
                        <TableRow
                          key={m.user_id}
                          className={
                            selectedUserId === m.user_id
                              ? "bg-primary/10 cursor-pointer"
                              : "cursor-pointer hover:bg-accent/40"
                          }
                          onClick={() => setSelectedUserId(m.user_id)}
                        >
                          <TableCell className="font-medium">{m.full_name}</TableCell>
                          <TableCell className="text-muted-foreground">@{m.username}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </GlassCardContent>
          </GlassCard>

          <GlassCard className="lg:col-span-3">
            <GlassCardHeader>
              <GlassCardTitle>
                {selectedMember
                  ? `${selectedMember.full_name} (@${selectedMember.username})`
                  : "Select a member"}
              </GlassCardTitle>
              <GlassCardDescription>
                {selectedMember ? `Monthly report — ${monthLabel}` : "Choose someone from the list"}
              </GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent>
              {!selectedUserId ? (
                <p className="text-sm text-muted-foreground py-12 text-center">
                  Select a member to view their monthly report and goals.
                </p>
              ) : loadingGoal ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : monthlyGoal ? (
                <MonthlyGoalOverview goal={monthlyGoal} />
              ) : (
                <p className="text-sm text-muted-foreground py-12 text-center">
                  No monthly data for {monthLabel} yet.
                </p>
              )}
            </GlassCardContent>
          </GlassCard>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.history.back()}>
            Back
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
