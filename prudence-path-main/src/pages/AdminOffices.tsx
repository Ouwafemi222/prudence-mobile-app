import { useCallback, useEffect, useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Copy, ExternalLink, Loader2, RefreshCw, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type OfficeRow = {
  id: string;
  slug: string;
  name: string;
  status: string;
  plan: string;
  created_at: string;
  member_count: number;
  pending_count: number;
};

const statusClass: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  suspended: "bg-destructive/15 text-destructive",
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
};

export default function AdminOffices() {
  const [loading, setLoading] = useState(true);
  const [offices, setOffices] = useState<OfficeRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: officeRows, error: officeError } = await supabase
        .from("offices")
        .select("id, slug, name, status, plan, created_at")
        .order("created_at", { ascending: true });
      if (officeError) throw officeError;

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("office_id, approval_status");
      if (profileError) throw profileError;

      const counts = new Map<string, { total: number; pending: number }>();
      for (const p of profiles ?? []) {
        if (!p.office_id) continue;
        const cur = counts.get(p.office_id) ?? { total: 0, pending: 0 };
        cur.total += 1;
        if (p.approval_status === "pending") cur.pending += 1;
        counts.set(p.office_id, cur);
      }

      setOffices(
        (officeRows ?? []).map((o) => ({
          ...o,
          member_count: counts.get(o.id)?.total ?? 0,
          pending_count: counts.get(o.id)?.pending ?? 0,
        })),
      );
    } catch (e) {
      console.error(e);
      toast.error("Failed to load offices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const copyInvite = async (slug: string) => {
    const link = `${window.location.origin}/auth?tab=signup&office=${slug}`;
    await navigator.clipboard.writeText(link);
    toast.success("Invite link copied");
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Building2 className="h-7 w-7 text-primary shrink-0" />
              Platform Offices
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              All tenant workspaces on THE PRUDENCE
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/admin-office-applications">
                <ExternalLink className="h-4 w-4 mr-2" />
                Applications
              </Link>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : offices.length === 0 ? (
          <GlassCard>
            <GlassCardContent className="py-12 text-center text-muted-foreground">
              No offices found.
            </GlassCardContent>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {offices.map((office) => (
              <GlassCard key={office.id}>
                <GlassCardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <GlassCardTitle>{office.name}</GlassCardTitle>
                      <GlassCardDescription>slug: {office.slug}</GlassCardDescription>
                    </div>
                    <Badge className={statusClass[office.status] ?? ""}>{office.status}</Badge>
                  </div>
                </GlassCardHeader>
                <GlassCardContent className="space-y-4">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {office.member_count} members
                    </span>
                    {office.pending_count > 0 && (
                      <span className="text-amber-600 dark:text-amber-400">
                        {office.pending_count} pending approval
                      </span>
                    )}
                    <span className="text-muted-foreground capitalize">{office.plan} plan</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyInvite(office.slug)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy signup link
                    </Button>
                    <Button asChild size="sm">
                      <Link to={`/office-admin?office=${office.slug}`}>
                        Manage office
                      </Link>
                    </Button>
                  </div>
                </GlassCardContent>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
