import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isMonthlyGoalWindowOpen, monthlyGoalIsComplete, getGoalBookImagePaths } from "@/lib/monthlyGoalWindow";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  BookOpen,
  Briefcase,
  DollarSign,
  Users,
  GraduationCap,
  Target,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowUp,
  ArrowDown,
  Loader2,
  Edit,
  Save,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getNigeriaMonthEndISO, getNigeriaMonthStartISO, NIGERIA_TIME_ZONE, formatMonthYearLabel } from "@/lib/nigeriaTime";
import { MonthPicker } from "@/components/reports/MonthPicker";
import { TenantAppSeo } from "@/components/seo/TenantAppSeo";
import { ProofImageGrid } from "@/components/ui/proof-image";
import { ImageDropzone } from "@/components/ui/image-dropzone";
import { useReportAggregatesRealtime } from "@/hooks/useReportAggregatesRealtime";

interface MonthlyGoal {
  id: string;
  user_id: string;
  month_year: string;
  target_pages: number;
  target_gigs: number;
  target_accounts: number;
  target_income: number;
  target_contacts: number;
  target_tags: number;
  target_conversions: number;
  things_to_learn: string | null;
  goal_book_image: string | null;
  goal_book_images: string[] | null;
  actual_pages: number;
  actual_gigs: number;
  actual_accounts: number;
  actual_income: number;
  actual_contacts: number;
  actual_tags: number;
  actual_conversions: number;
  actual_things_learned: string | null;
  goals_submitted_at: string | null;
  consistency_score: number;
  skill_progress_notes: string | null;
  income_summary: string | null;
  created_at: string;
  updated_at: string;
}

interface WeeklyBreakdown {
  week: number;
  pages: number;
  gigs: number;
  income: number;
  contacts: number;
}

export default function MonthlyGoals() {
  const { user } = useAuth();
  const userId = user?.id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedMonthStart, setSelectedMonthStart] = useState(getNigeriaMonthStartISO);
  const [monthlyGoal, setMonthlyGoal] = useState<MonthlyGoal | null>(null);
  const [weeklyBreakdown, setWeeklyBreakdown] = useState<WeeklyBreakdown[]>([]);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [goalInputs, setGoalInputs] = useState({
    target_pages: "",
    target_tags: "",
    target_contacts: "",
    target_conversions: "",
    target_income: "",
    things_to_learn: "",
  });
  const [goalBookFiles, setGoalBookFiles] = useState<File[]>([]);
  const [removingGoalBookPath, setRemovingGoalBookPath] = useState<string | null>(null);

  const autoPromptedRef = useRef(false);
  const goalDialogWasOpenRef = useRef(false);

  const fetchMonthlyGoal = useCallback(async (options?: { silent?: boolean }) => {
    if (!userId) return;

    if (!options?.silent) setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_or_generate_monthly_goal', {
        p_user_id: userId,
        p_month_year: selectedMonthStart,
      });

      if (error) {
        console.error("RPC error:", error);
        throw error;
      }

      if (data && Array.isArray(data) && data.length > 0) {
        const goal = data[0] as MonthlyGoal;
        setMonthlyGoal(goal);

        // Fetch weekly breakdown from weekly reports
        await fetchWeeklyBreakdown(goal.month_year);
      } else {
        setMonthlyGoal(null);
        setWeeklyBreakdown([]);
      }
    } catch (error: unknown) {
      console.error("Error fetching monthly goal:", error);
      if (!options?.silent) toast.error("Failed to load monthly goals");
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [userId, selectedMonthStart]);

  useEffect(() => {
    if (!userId) return;
    fetchMonthlyGoal();
  }, [userId, selectedMonthStart, fetchMonthlyGoal]);

  const monthYearISO = monthlyGoal?.month_year?.toString().slice(0, 10);
  const silentMonthlyRefreshRef = useRef(() => fetchMonthlyGoal({ silent: true }));
  silentMonthlyRefreshRef.current = () => fetchMonthlyGoal({ silent: true });

  useReportAggregatesRealtime({
    userId: user?.id,
    monthYearISO,
    onMonthlyUpdate: () => silentMonthlyRefreshRef.current(),
  });

  const targetsAreEmpty = useMemo(() => {
    if (!monthlyGoal) return true;
    return !monthlyGoalIsComplete(monthlyGoal);
  }, [monthlyGoal]);

  const goalsWindowOpen = useMemo(() => {
    if (!monthlyGoal) return false;
    return isMonthlyGoalWindowOpen(monthlyGoal.month_year);
  }, [monthlyGoal]);

  const goalsLocked = monthlyGoal && !goalsWindowOpen && monthlyGoal.goals_submitted_at;

  useEffect(() => {
    // Auto-prompt once per page load if targets are all zero.
    if (monthlyGoal && targetsAreEmpty && !autoPromptedRef.current) {
      autoPromptedRef.current = true;
      setIsGoalDialogOpen(true);
    }
  }, [monthlyGoal, targetsAreEmpty]);

  useEffect(() => {
    const justOpened = isGoalDialogOpen && !goalDialogWasOpenRef.current;
    goalDialogWasOpenRef.current = isGoalDialogOpen;

    if (!justOpened || !monthlyGoal) return;
    setGoalInputs({
      target_pages: monthlyGoal.target_pages > 0 ? String(monthlyGoal.target_pages) : "",
      target_tags: monthlyGoal.target_tags > 0 ? String(monthlyGoal.target_tags) : "",
      target_contacts: monthlyGoal.target_contacts > 0 ? String(monthlyGoal.target_contacts) : "",
      target_conversions:
        monthlyGoal.target_conversions > 0 ? String(monthlyGoal.target_conversions) : "",
      target_income: Number(monthlyGoal.target_income) > 0 ? String(monthlyGoal.target_income) : "",
      things_to_learn: monthlyGoal.things_to_learn || "",
    });
    setGoalBookFiles([]);
  }, [isGoalDialogOpen, monthlyGoal]);

  const fetchWeeklyBreakdown = async (monthYear: string) => {
    if (!user) return;
    const monthStartISO = monthYear;
    const monthEndISO = (() => {
      const d = new Date(`${monthYear}T00:00:00Z`);
      return getNigeriaMonthEndISO(d);
    })();

    // Get all weekly reports for this month
    const { data: weeklyReports } = await supabase
      .from("weekly_reports")
      .select("*")
      .eq("user_id", user.id)
      .gte("week_start_date", monthStartISO)
      .lte("week_end_date", monthEndISO)
      .order("week_start_date", { ascending: true });

    if (weeklyReports) {
      const breakdown: WeeklyBreakdown[] = weeklyReports.map((report, index) => ({
        week: index + 1,
        pages: report.total_pages_read || 0,
        gigs: report.total_gigs_created || 0,
        income: Number(report.total_net_income || 0),
        contacts: report.total_contacts || 0,
      }));
      setWeeklyBreakdown(breakdown);
    }
  };

  const goalBookPreviewUrls = useMemo(
    () => goalBookFiles.map((file) => URL.createObjectURL(file)),
    [goalBookFiles],
  );

  useEffect(() => {
    return () => goalBookPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [goalBookPreviewUrls]);

  const savedGoalBookPaths = monthlyGoal ? getGoalBookImagePaths(monthlyGoal) : [];

  const canEditGoalBook = Boolean(goalsWindowOpen && monthlyGoal && !goalsLocked);

  const handleRemoveGoalBookImage = async (path: string) => {
    if (!monthlyGoal || !user || !canEditGoalBook) return;

    setRemovingGoalBookPath(path);
    try {
      const updatedPaths = savedGoalBookPaths.filter((p) => p !== path);
      const { error: updateError } = await supabase
        .from("monthly_goals")
        .update({
          goal_book_images: updatedPaths,
          goal_book_image: updatedPaths[0] ?? null,
        })
        .eq("id", monthlyGoal.id);
      if (updateError) throw updateError;

      const { error: storageError } = await supabase.storage.from("avatars").remove([path]);
      if (storageError) {
        console.warn("Storage remove failed:", storageError);
      }

      setMonthlyGoal((prev) =>
        prev
          ? {
              ...prev,
              goal_book_images: updatedPaths,
              goal_book_image: updatedPaths[0] ?? null,
            }
          : null,
      );
      toast.success("Goals book photo removed");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to remove image");
    } finally {
      setRemovingGoalBookPath(null);
    }
  };

  const handleRemovePendingGoalBookFile = (index: number) => {
    setGoalBookFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveGoals = async () => {
    if (!monthlyGoal || !user) return;
    if (!goalsWindowOpen) {
      toast.error("Monthly targets can only be set from 3 days before the month through day 3.");
      return;
    }

    if (
      goalBookFiles.length === 0 &&
      savedGoalBookPaths.length === 0 &&
      !goalInputs.things_to_learn.trim()
    ) {
      toast.error("Upload your goals book photo(s) and fill all required fields.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        target_pages: parseInt(goalInputs.target_pages, 10) || 0,
        target_tags: parseInt(goalInputs.target_tags, 10) || 0,
        target_contacts: parseInt(goalInputs.target_contacts, 10) || 0,
        target_conversions: parseInt(goalInputs.target_conversions, 10) || 0,
        target_income: parseFloat(goalInputs.target_income) || 0,
        things_to_learn: goalInputs.things_to_learn.trim() || null,
      };

      if (
        savedGoalBookPaths.length === 0 &&
        goalBookFiles.length === 0 &&
        !payload.things_to_learn
      ) {
        toast.error("Upload at least one goals book photo and fill all required fields.");
        return;
      }

      if (
        !payload.things_to_learn ||
        payload.target_pages <= 0 ||
        payload.target_tags <= 0 ||
        payload.target_contacts <= 0 ||
        payload.target_conversions <= 0 ||
        payload.target_income <= 0
      ) {
        toast.error("All monthly targets are required (pages, tags, contacts, converts, net income, things to learn, at least one book photo).");
        return;
      }

      const uploadedPaths: string[] = [];
      for (const file of goalBookFiles) {
        const ext = file.name.split(".").pop();
        const fileName = `${user.id}/monthly_goal_${monthlyGoal.month_year}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("avatars").upload(fileName, file);
        if (upErr) throw upErr;
        uploadedPaths.push(fileName);
      }

      const allBookPaths = [...savedGoalBookPaths, ...uploadedPaths];
      if (allBookPaths.length === 0) {
        toast.error("Upload at least one goals book photo.");
        return;
      }

      const { error } = await supabase
        .from("monthly_goals")
        .update({
          ...payload,
          goal_book_images: allBookPaths,
          goal_book_image: allBookPaths[0] ?? null,
          goals_submitted_at: new Date().toISOString(),
        })
        .eq("id", monthlyGoal.id);
      if (error) throw error;

      toast.success("Monthly goals saved successfully!");
      setGoalBookFiles([]);
      setIsGoalDialogOpen(false);
      await fetchMonthlyGoal();
    } catch (error: unknown) {
      console.error("Error saving goals:", error);
      toast.error("Failed to save goals");
    } finally {
      setSaving(false);
    }
  };

  const formatMonthYear = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { timeZone: NIGERIA_TIME_ZONE, month: "long", year: "numeric" });
  };

  const getDaysInMonth = (dateString: string) => {
    const date = new Date(dateString);
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "exceeded":
        return <Badge className="bg-chart-1/10 text-chart-1">Exceeded</Badge>;
      case "on-track":
        return <Badge className="bg-primary/10 text-primary">On Track</Badge>;
      case "behind":
        return <Badge className="bg-destructive/10 text-destructive">Behind</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <TenantAppSeo
          title="Monthly Report & Goals"
          description="View monthly targets and performance on THE PRUDENCE — pages, income, contacts, and weekly breakdown. Nigeria time (WAT)."
          path="/monthly-goals"
          keywords="monthly goals, monthly report, monthly targets, office accountability Nigeria"
        />
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!monthlyGoal) {
    return (
      <AppLayout>
        <TenantAppSeo
          title="Monthly Report & Goals"
          description="View monthly targets and performance on THE PRUDENCE — pages, income, contacts, and weekly breakdown. Nigeria time (WAT)."
          path="/monthly-goals"
          keywords="monthly goals, monthly report, monthly targets, office accountability Nigeria"
        />
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Monthly Report & Goals</h1>
              <p className="text-muted-foreground mt-1">{formatMonthYearLabel(selectedMonthStart)}</p>
            </div>
            <MonthPicker value={selectedMonthStart} onChange={setSelectedMonthStart} />
          </div>
          <div className="text-center py-12">
            <p className="text-muted-foreground">No monthly data for this month yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Submit daily activities or set goals when the month window is open.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const metricRows = [
    { label: "Pages read", target: monthlyGoal.target_pages || 0, actual: monthlyGoal.actual_pages || 0, format: (n: number) => String(n) },
    { label: "Tags", target: monthlyGoal.target_tags || 0, actual: monthlyGoal.actual_tags || 0, format: (n: number) => String(n) },
    { label: "Prospect contacts", target: monthlyGoal.target_contacts || 0, actual: monthlyGoal.actual_contacts || 0, format: (n: number) => String(n) },
    { label: "Converts (expected)", target: monthlyGoal.target_conversions || 0, actual: monthlyGoal.actual_conversions || 0, format: (n: number) => String(n) },
    { label: "Net income (after Fiverr)", target: Number(monthlyGoal.target_income || 0), actual: Number(monthlyGoal.actual_income || 0), format: (n: number) => `$${n.toLocaleString()}` },
  ];

  const goalsOnTrack = metricRows.filter((r) => r.actual >= r.target && r.target > 0).length;
  const totalDays = getDaysInMonth(monthlyGoal.month_year);
  const daysSubmitted = Math.round((Number(monthlyGoal.consistency_score || 0) / 100) * totalDays);

  return (
    <AppLayout>
      <TenantAppSeo
        title="Monthly Report & Goals"
        description="View monthly targets and performance on THE PRUDENCE — pages, income, contacts, and weekly breakdown. Nigeria time (WAT)."
        path="/monthly-goals"
        keywords="monthly goals, monthly report, monthly targets, office accountability Nigeria"
        breadcrumbs={[
          { name: "Dashboard", path: "/dashboard" },
          { name: "Monthly Report & Goals", path: "/monthly-goals" },
        ]}
      />
      <div className="space-y-8">
        {targetsAreEmpty && (
          <GlassCard className="border-primary/30 bg-primary/5">
            <GlassCardContent className="py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="font-semibold text-foreground">Set your monthly targets</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload a photo of goals in your physical book and set all targets (editable until day 3 of the month).
                </p>
              </div>
              <Button onClick={() => setIsGoalDialogOpen(true)} disabled={!goalsWindowOpen}>
                <Target className="mr-2 h-4 w-4" />
                Set Monthly Targets
              </Button>
            </GlassCardContent>
          </GlassCard>
        )}
        {goalsLocked && (
          <GlassCard className="border-border/60">
            <GlassCardContent className="py-4 text-sm text-muted-foreground">
              Monthly targets are locked for this month. Actuals below update daily from your daily and weekly reports.
            </GlassCardContent>
          </GlassCard>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Monthly Report & Goals</h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {formatMonthYear(monthlyGoal.month_year)}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <MonthPicker value={selectedMonthStart} onChange={setSelectedMonthStart} />
          <div className="flex items-center gap-2">
            <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
              <DialogTrigger asChild>
            <Button variant={targetsAreEmpty ? "default" : "outline"} disabled={!goalsWindowOpen}>
                  <Edit className="mr-2 h-4 w-4" />
                  {targetsAreEmpty ? "Set Goals" : goalsWindowOpen ? "Edit Goals" : "Targets locked"}
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-card w-[calc(100%-2rem)] max-w-md sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Set Monthly Goals</DialogTitle>
                  <DialogDescription>
                    Set your targets for {formatMonthYear(monthlyGoal.month_year)}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[60dvh] overflow-y-auto">
                  <div className="space-y-2">
                    <Label>Goals book photos (required)</Label>
                    <p className="text-xs text-muted-foreground">
                      Add as many pages as you need — select multiple files at once or add more in batches.
                    </p>
                    {savedGoalBookPaths.length > 0 && (
                      <ProofImageGrid
                        paths={savedGoalBookPaths}
                        altPrefix="Goals book"
                        thumbnailClassName="max-h-40 object-contain"
                        onRemovePath={canEditGoalBook ? handleRemoveGoalBookImage : undefined}
                        removingPath={removingGoalBookPath}
                      />
                    )}
                    {goalBookPreviewUrls.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">New uploads (save to keep)</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {goalBookPreviewUrls.map((url, idx) => (
                            <div key={url} className="relative rounded-lg overflow-hidden border border-border/50">
                              <img
                                src={url}
                                alt={`New goals book ${idx + 1}`}
                                className="w-full max-h-40 object-cover"
                              />
                              <Button
                                type="button"
                                variant="secondary"
                                size="icon"
                                className="absolute top-1 right-1 h-7 w-7"
                                onClick={() => handleRemovePendingGoalBookFile(idx)}
                                aria-label="Remove pending photo"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <ImageDropzone
                      files={goalBookFiles}
                      onFilesChange={setGoalBookFiles}
                      multiple
                      disabled={!canEditGoalBook}
                      label="Drop goals book photos here or tap to upload"
                      helperText="Select multiple images at once, or add more in batches. Saved when you click Save Goals."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target-pages">Total pages (month)</Label>
                    <Input id="target-pages" type="number" min="1" value={goalInputs.target_pages} onChange={(e) => setGoalInputs({ ...goalInputs, target_pages: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target-tags">Total tags (month)</Label>
                    <Input id="target-tags" type="number" min="1" value={goalInputs.target_tags} onChange={(e) => setGoalInputs({ ...goalInputs, target_tags: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target-contacts">Prospect contacts</Label>
                    <Input id="target-contacts" type="number" min="1" value={goalInputs.target_contacts} onChange={(e) => setGoalInputs({ ...goalInputs, target_contacts: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target-conversions">Converts (expected conversions)</Label>
                    <Input id="target-conversions" type="number" min="1" value={goalInputs.target_conversions} onChange={(e) => setGoalInputs({ ...goalInputs, target_conversions: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target-income">Net income after Fiverr ($)</Label>
                    <Input id="target-income" type="number" min="0.01" step="0.01" value={goalInputs.target_income} onChange={(e) => setGoalInputs({ ...goalInputs, target_income: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="things-to-learn">Things to learn / develop</Label>
                    <Textarea id="things-to-learn" value={goalInputs.things_to_learn} onChange={(e) => setGoalInputs({ ...goalInputs, things_to_learn: e.target.value })} rows={4} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsGoalDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveGoals} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Goals
                      </>
                    )}
            </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassCard>
            <GlassCardContent className="pt-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-chart-1/10">
                <Target className="h-6 w-6 text-chart-1" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{goalsOnTrack}/{metricRows.length}</p>
                <p className="text-sm text-muted-foreground">Goals On Track</p>
              </div>
            </GlassCardContent>
          </GlassCard>
          <GlassCard>
            <GlassCardContent className="pt-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-chart-2/10">
                <CheckCircle2 className="h-6 w-6 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{Math.round(Number(monthlyGoal.consistency_score || 0))}%</p>
                <p className="text-sm text-muted-foreground">Consistency Score</p>
              </div>
            </GlassCardContent>
          </GlassCard>
          <GlassCard>
            <GlassCardContent className="pt-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-chart-3/10">
                <DollarSign className="h-6 w-6 text-chart-3" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">${Number(monthlyGoal.actual_income || 0).toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Income</p>
              </div>
            </GlassCardContent>
          </GlassCard>
          <GlassCard>
            <GlassCardContent className="pt-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-chart-4/10">
                <TrendingUp className="h-6 w-6 text-chart-4" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{daysSubmitted}/{totalDays}</p>
                <p className="text-sm text-muted-foreground">Days Submitted</p>
              </div>
            </GlassCardContent>
          </GlassCard>
        </div>

        {savedGoalBookPaths.length > 0 && (
          <GlassCard>
            <GlassCardHeader>
              <GlassCardTitle>Goals book</GlassCardTitle>
              <GlassCardDescription>
                {savedGoalBookPaths.length} photo{savedGoalBookPaths.length === 1 ? "" : "s"}
              </GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent>
              <ProofImageGrid
                paths={savedGoalBookPaths}
                altPrefix="Goals book"
                thumbnailClassName="max-h-48 object-contain"
                onRemovePath={canEditGoalBook ? handleRemoveGoalBookImage : undefined}
                removingPath={removingGoalBookPath}
              />
            </GlassCardContent>
          </GlassCard>
        )}

        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle>Monthly overview</GlassCardTitle>
            <GlassCardDescription>Target vs actual (updates daily from your reports)</GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Metric</th>
                    <th className="text-center py-2 px-3 text-muted-foreground font-medium">Target</th>
                    <th className="text-center py-2 px-3 text-muted-foreground font-medium">Actual</th>
                  </tr>
                </thead>
                <tbody>
                  {metricRows.map((row) => (
                    <tr key={row.label} className="border-b border-border/50">
                      <td className="py-3 px-3 font-medium">{row.label}</td>
                      <td className="py-3 px-3 text-center text-muted-foreground">{row.format(row.target)}</td>
                      <td className="py-3 px-3 text-center font-semibold">{row.format(row.actual)}</td>
                    </tr>
                  ))}
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-3 font-medium align-top">Things to learn / develop</td>
                    <td className="py-3 px-3 text-muted-foreground align-top whitespace-pre-wrap max-w-[200px]">
                      {monthlyGoal.things_to_learn || "—"}
                    </td>
                    <td className="py-3 px-3 text-muted-foreground align-top whitespace-pre-wrap max-w-[200px]">
                      {monthlyGoal.actual_things_learned || "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </GlassCardContent>
        </GlassCard>

        {/* Weekly Breakdown */}
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle>Weekly Breakdown</GlassCardTitle>
            <GlassCardDescription>
              Performance comparison across weeks
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Week
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                      <BookOpen className="h-4 w-4 inline mr-1" />
                      Pages
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                      <Briefcase className="h-4 w-4 inline mr-1" />
                      Gigs
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                      <DollarSign className="h-4 w-4 inline mr-1" />
                      Income
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                      <Users className="h-4 w-4 inline mr-1" />
                      Contacts
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">
                      <GraduationCap className="h-4 w-4 inline mr-1" />
                      Skills
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyBreakdown.length > 0 ? (
                    weeklyBreakdown.map((week) => (
                    <tr
                      key={week.week}
                      className="border-b border-border/50 hover:bg-accent/30 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-foreground">
                        Week {week.week}
                      </td>
                      <td className="text-center py-3 px-4 text-muted-foreground">
                        {week.pages}
                      </td>
                      <td className="text-center py-3 px-4 text-muted-foreground">
                        {week.gigs}
                      </td>
                      <td className="text-center py-3 px-4 text-muted-foreground">
                          ${week.income.toLocaleString()}
                      </td>
                      <td className="text-center py-3 px-4 text-muted-foreground">
                        {week.contacts}
                      </td>
                      <td className="text-center py-3 px-4 text-muted-foreground">
                          -
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No weekly reports available for this month yet.
                      </td>
                    </tr>
                  )}
                  <tr className="bg-accent/30">
                    <td className="py-3 px-4 font-bold text-foreground">Total</td>
                    <td className="text-center py-3 px-4 font-bold text-foreground">
                      {monthlyGoal.actual_pages || 0}
                    </td>
                    <td className="text-center py-3 px-4 font-bold text-foreground">
                      {monthlyGoal.actual_gigs || 0}
                    </td>
                    <td className="text-center py-3 px-4 font-bold text-foreground">
                      ${Number(monthlyGoal.actual_income || 0).toLocaleString()}
                    </td>
                    <td className="text-center py-3 px-4 font-bold text-foreground">
                      {monthlyGoal.actual_contacts || 0}
                    </td>
                    <td className="text-center py-3 px-4 font-bold text-foreground">
                      -
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </GlassCardContent>
        </GlassCard>

        {/* Consistency Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassCard>
            <GlassCardContent className="py-6 text-center">
              <p className="text-3xl font-bold text-foreground">
                {daysSubmitted}
              </p>
              <p className="text-sm text-muted-foreground">
                Days Submitted (of {totalDays})
              </p>
            </GlassCardContent>
          </GlassCard>
          <GlassCard>
            <GlassCardContent className="py-6 text-center">
              <p className="text-3xl font-bold text-foreground">
                {weeklyBreakdown.length}
              </p>
              <p className="text-sm text-muted-foreground">Weeks Completed</p>
            </GlassCardContent>
          </GlassCard>
          <GlassCard>
            <GlassCardContent className="py-6 text-center">
              <p className="text-3xl font-bold text-foreground">
                {Math.round(Number(monthlyGoal.consistency_score || 0))}%
              </p>
              <p className="text-sm text-muted-foreground">Consistency Score</p>
            </GlassCardContent>
          </GlassCard>
          <GlassCard>
            <GlassCardContent className="py-6 text-center">
              <p className="text-3xl font-bold text-primary">
                {goalsOnTrack >= metricRows.length * 0.8 ? "A" : 
                 goalsOnTrack >= metricRows.length * 0.6 ? "B" : 
                 goalsOnTrack >= metricRows.length * 0.4 ? "C" : "D"}
              </p>
              <p className="text-sm text-muted-foreground">Overall Grade</p>
            </GlassCardContent>
          </GlassCard>
        </div>
      </div>
    </AppLayout>
  );
}
