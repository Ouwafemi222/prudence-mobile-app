import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { addDaysISODate, formatISODateInNigeria, formatLongDateInNigeria } from "@/lib/nigeriaTime";
import { useSearchParams } from "react-router-dom";
import { ActivityProofSectionsDisplay } from "@/components/reports/ActivityProofSectionsDisplay";
import { DayReportSummary } from "@/components/reports/DayReportSummary";
import { TenantAppSeo } from "@/components/seo/TenantAppSeo";
import type { ActivityRow } from "@/lib/activityTypes";

type ActivityRow = {
  id: string;
  activity_date: string;
  is_verified: boolean | null;
  verified_at: string | null;
  verification_feedback: string | null;
  pages_read: number | null;
  reading_notes: string | null;
  reading_proof_image: string | null;
  reading_proof_images?: string[] | null;
  skill_proof_images?: string[] | null;
  other_activities_proof_images?: string[] | null;
  gig_notes?: string | null;
  gig_links?: string[] | null;
  gig_proof_images?: string[] | null;
  account_notes?: string | null;
  account_links?: string[] | null;
  account_proof_images?: string[] | null;
  prospecting_proof_images?: string[] | null;
  gigs_created: number | null;
  gig_platform: string | null;
  gig_service: string | null;
  gig_link: string | null;
  accounts_created: number | null;
  account_platform: string | null;
  account_service: string | null;
  account_country: string | null;
  gross_income: number | null;
  net_income: number | null;
  payment_type: string | null;
  outside_payment_method: string | null;
  outside_payment_method_other: string | null;
  fiverr_fee: number | null;
  cancelled_orders_count: number | null;
  cancelled_order_amount_received: number | null;
  daily_contacts: number | null;
  follow_ups: number | null;
  expected_conversions: number | null;
  skill_learned: string | null;
  skill_description: string | null;
  skill_proof_image: string | null;
  other_activities: string | null;
  other_activities_proof_image: string | null;
  submitted_at: string | null;
};

export default function MySubmissions() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [todoPlan, setTodoPlan] = useState<string>("");
  const [dateFilterMode, setDateFilterMode] = useState<"today" | "yesterday" | "date" | "all">("all");
  const [pickedDate, setPickedDate] = useState<string>(formatISODateInNigeria());

  const selected = useMemo(
    () => activities.find((a) => a.id === selectedId) || null,
    [activities, selectedId]
  );

  const selectedDateObj = useMemo(() => {
    const d = selected?.activity_date || formatISODateInNigeria();
    return new Date(`${d}T12:00:00`);
  }, [selected?.activity_date]);

  const pickByDate = (dateStr: string) => {
    const match = activities.find((r) => r.activity_date === dateStr) || null;
    setSelectedId(match?.id || "");
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("date", dateStr);
      return next;
    });
  };

  const setPickedDateFromCalendar = (d: Date | undefined) => {
    if (!d) return;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const iso = `${y}-${m}-${day}`;
    setPickedDate(iso);
    setDateFilterMode("date");
    pickByDate(iso);
  };

  useEffect(() => {
    if (!user) return;
    const run = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("daily_activities")
          .select("*")
          .eq("user_id", user.id)
          .order("activity_date", { ascending: false })
          .limit(120);
        if (error) throw error;
        const rows = (data || []) as ActivityRow[];
        setActivities(rows);

        const dateFromUrl = (searchParams.get("date") || "").trim();
        const matchByDate = dateFromUrl
          ? rows.find((r) => r.activity_date === dateFromUrl)
          : null;
        const pick = matchByDate || rows[0] || null;
        setSelectedId(pick?.id || "");
      } catch (e: any) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user || !selected) return;
    const run = async () => {
      try {
        const { data } = await supabase
          .from("daily_todos")
          .select("plan")
          .eq("user_id", user.id)
          .eq("todo_date", selected.activity_date)
          .maybeSingle();
        setTodoPlan(((data as { plan?: string } | null)?.plan || "").trim());
      } catch {
        setTodoPlan("");
      }
    };
    run();
  }, [user, selected?.activity_date]);

  const status = useMemo(() => {
    if (!selected) return "—";
    if (selected.is_verified) return "approved";
    if (!selected.is_verified && selected.verified_at) return "rejected";
    return "pending";
  }, [selected]);

  const statusBadge =
    status === "approved"
      ? "bg-chart-1/10 text-chart-1"
      : status === "rejected"
        ? "bg-destructive/10 text-destructive"
        : "bg-warning/10 text-warning";

  return (
    <AppLayout>
      <TenantAppSeo
        title="My Submissions"
        description="View your submitted daily reports on THE PRUDENCE — reading, income, gigs, and proof images with full preview. Nigeria time (WAT)."
        path="/my-submissions"
        keywords="my submissions, daily report history, proof images, office accountability Nigeria"
        breadcrumbs={[
          { name: "Dashboard", path: "/dashboard" },
          { name: "My Submissions", path: "/my-submissions" },
        ]}
      />
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Submissions</h1>
          <p className="text-muted-foreground mt-1">
            View your previous daily reports and the morning todo you saved for each day.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <GlassCard className="lg:col-span-1">
            <GlassCardHeader>
              <GlassCardTitle>History</GlassCardTitle>
              <GlassCardDescription>Select a date to view details</GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent>
              <div className="space-y-3 mb-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={dateFilterMode === "today" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const t = formatISODateInNigeria();
                      setPickedDate(t);
                      setDateFilterMode("today");
                      pickByDate(t);
                    }}
                  >
                    Today
                  </Button>
                  <Button
                    type="button"
                    variant={dateFilterMode === "yesterday" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const y = addDaysISODate(formatISODateInNigeria(), -1);
                      setPickedDate(y);
                      setDateFilterMode("yesterday");
                      pickByDate(y);
                    }}
                  >
                    Yesterday
                  </Button>
                  <Button
                    type="button"
                    variant={dateFilterMode === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDateFilterMode("all")}
                  >
                    All
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={pickedDate}
                    onChange={(e) => {
                      setPickedDate(e.target.value);
                      setDateFilterMode("date");
                      pickByDate(e.target.value);
                    }}
                    className="h-9"
                  />
                </div>
                <div className="rounded-xl border border-border/50 bg-background/40">
                  <Calendar
                    mode="single"
                    selected={new Date(`${pickedDate}T12:00:00`)}
                    onSelect={setPickedDateFromCalendar}
                  />
                </div>
              </div>
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : activities.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No submissions yet. Submit your first report in Daily Activity.
                </div>
              ) : (
                <div className="space-y-2 max-h-[520px] overflow-auto pr-1">
                  {activities
                    .filter((a) => {
                      const today = formatISODateInNigeria();
                      const yesterday = addDaysISODate(today, -1);
                      return (
                        dateFilterMode === "all" ||
                        (dateFilterMode === "today" && a.activity_date === today) ||
                        (dateFilterMode === "yesterday" && a.activity_date === yesterday) ||
                        (dateFilterMode === "date" && a.activity_date === pickedDate)
                      );
                    })
                    .map((a) => {
                    const isActive = a.id === selectedId;
                    const label = new Date(`${a.activity_date}T12:00:00`).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "2-digit",
                      year: "numeric",
                      timeZone: "Africa/Lagos",
                    });
                    const s = a.is_verified ? "approved" : !a.is_verified && a.verified_at ? "rejected" : "pending";
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setSelectedId(a.id);
                          setPickedDate(a.activity_date);
                          setDateFilterMode("date");
                          setSearchParams((prev) => {
                            const next = new URLSearchParams(prev);
                            next.set("date", a.activity_date);
                            return next;
                          });
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          isActive ? "border-primary bg-accent/40" : "border-border/50 bg-background/30 hover:bg-accent/30"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-medium text-foreground">{label}</div>
                          <span className="text-xs text-muted-foreground">{a.activity_date}</span>
                        </div>
                        <div className="mt-2">
                          <Badge variant="outline" className={statusBadge}>
                            {s}
                          </Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </GlassCardContent>
          </GlassCard>

          <GlassCard className="lg:col-span-2">
            <GlassCardHeader>
              <GlassCardTitle>Details</GlassCardTitle>
              <GlassCardDescription>{formatLongDateInNigeria(selectedDateObj)}</GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent className="space-y-6">
              {!selected ? (
                <div className="text-sm text-muted-foreground">Select a submission to view details.</div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="outline" className={statusBadge}>
                      {status}
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      {selected.submitted_at ? `Submitted: ${new Date(selected.submitted_at).toLocaleString()}` : ""}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-accent/20 border border-border/50">
                    <p className="text-sm font-semibold text-foreground mb-2">Morning Todo (Plan)</p>
                    {todoPlan ? (
                      <Textarea value={todoPlan} readOnly className="min-h-[120px] bg-background/40 whitespace-pre-wrap" />
                    ) : (
                      <p className="text-sm text-muted-foreground">No morning todo saved for this date.</p>
                    )}
                  </div>

                  {selected.verification_feedback && (
                    <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20">
                      <p className="text-sm font-semibold text-foreground mb-2">Feedback</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selected.verification_feedback}</p>
                    </div>
                  )}

                  <DayReportSummary activity={selected as ActivityRow} />

                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-foreground">Proof images — tap to preview</p>
                    <ActivityProofSectionsDisplay
                      activity={selected}
                      thumbnailClassName="max-h-56"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button asChild variant="outline">
                      <a href="/daily-activity">Go to Daily Activity</a>
                    </Button>
                  </div>
                </>
              )}
            </GlassCardContent>
          </GlassCard>
        </div>
      </div>
    </AppLayout>
  );
}

