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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Building2,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Mail,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ApplicationStatus = "pending" | "contacted" | "approved" | "rejected";

type OfficeApplication = {
  id: string;
  organization_name: string;
  contact_name: string;
  contact_email: string;
  country: string;
  team_size: string;
  use_case: string;
  status: ApplicationStatus;
  admin_notes: string | null;
  provisioned_office_id: string | null;
  created_at: string;
  updated_at: string;
};

type ProvisionResult = {
  office_id: string;
  slug: string;
  name: string;
  skills_cloned: number;
  pending_admin_email: string;
  signup_path: string;
};

const STATUS_OPTIONS: { value: ApplicationStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "contacted", label: "Contacted" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const statusBadgeClass: Record<ApplicationStatus, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  contacted: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  rejected: "bg-destructive/15 text-destructive",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function AdminOfficeApplications() {
  const { userRole } = useAuth();
  const isSuperAdmin = userRole?.role === "super_admin";

  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<OfficeApplication[]>([]);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">("pending");
  const [selected, setSelected] = useState<OfficeApplication | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [proposedSlug, setProposedSlug] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [provisionResult, setProvisionResult] = useState<ProvisionResult | null>(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("office_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setApplications((data || []) as OfficeApplication[]);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load applications";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (isSuperAdmin) void fetchApplications();
  }, [isSuperAdmin, fetchApplications]);

  const pendingCount = useMemo(
    () => applications.filter((a) => a.status === "pending").length,
    [applications],
  );

  const openApplication = (app: OfficeApplication) => {
    setSelected(app);
    setAdminNotes(app.admin_notes || "");
    setProposedSlug("");
    setProvisionResult(null);
  };

  const closeDialog = () => {
    setSelected(null);
    setProvisionResult(null);
    setActionLoading(false);
  };

  const copySignupLink = async (path: string) => {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Signup link copied");
    } catch {
      toast.message("Signup link", { description: url });
    }
  };

  const updateApplication = async (
    id: string,
    patch: Partial<Pick<OfficeApplication, "status" | "admin_notes">>,
  ) => {
    const { error } = await supabase
      .from("office_applications")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
  };

  const handleMarkContacted = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await updateApplication(selected.id, {
        status: "contacted",
        admin_notes: adminNotes.trim() || null,
      });
      toast.success("Marked as contacted");
      closeDialog();
      await fetchApplications();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await updateApplication(selected.id, {
        status: "rejected",
        admin_notes: adminNotes.trim() || null,
      });
      toast.success("Application rejected");
      closeDialog();
      await fetchApplications();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleProvision = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase.rpc("provision_office_from_application", {
        p_application_id: selected.id,
        p_slug: proposedSlug.trim() || null,
      });

      if (error) throw error;
      const result = data as ProvisionResult;
      setProvisionResult(result);
      toast.success(`Office "${result.name}" provisioned`);
      await fetchApplications();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Provisioning failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <AppLayout>
        <GlassCard>
          <GlassCardContent className="py-12 text-center">
            <p className="text-muted-foreground">Super admin access required.</p>
          </GlassCardContent>
        </GlassCard>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
              <Building2 className="h-7 w-7 text-primary shrink-0" />
              Office applications
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Review /apply submissions and provision new offices.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void fetchApplications()} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as ApplicationStatus | "all")}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {statusFilter === "all" && pendingCount > 0 && (
            <Badge variant="secondary">{pendingCount} pending in view</Badge>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : applications.length === 0 ? (
          <GlassCard>
            <GlassCardContent className="py-12 text-center text-muted-foreground">
              No applications{statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}.
            </GlassCardContent>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {applications.map((app) => (
              <GlassCard
                key={app.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => openApplication(app)}
              >
                <GlassCardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <GlassCardTitle className="text-lg truncate">{app.organization_name}</GlassCardTitle>
                      <GlassCardDescription className="truncate">
                        {app.contact_name} · {app.contact_email}
                      </GlassCardDescription>
                    </div>
                    <Badge className={cn("shrink-0 capitalize", statusBadgeClass[app.status])}>
                      {app.status}
                    </Badge>
                  </div>
                </GlassCardHeader>
                <GlassCardContent className="space-y-2 text-sm">
                  <p className="text-muted-foreground line-clamp-2">{app.use_case}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{app.country}</span>
                    <span>·</span>
                    <span>{app.team_size} members</span>
                    <span>·</span>
                    <span>{formatDate(app.created_at)}</span>
                  </div>
                </GlassCardContent>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.organization_name}</DialogTitle>
                <DialogDescription>
                  Submitted {formatDate(selected.created_at)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-muted-foreground">Contact</p>
                    <p className="font-medium">{selected.contact_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <a
                      href={`mailto:${selected.contact_email}`}
                      className="font-medium text-primary hover:underline break-all"
                    >
                      {selected.contact_email}
                    </a>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Country</p>
                    <p className="font-medium">{selected.country}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Team size</p>
                    <p className="font-medium">{selected.team_size}</p>
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground mb-1">Use case</p>
                  <p className="rounded-lg bg-muted/50 p-3 whitespace-pre-wrap">{selected.use_case}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminNotes">Admin notes</Label>
                  <Textarea
                    id="adminNotes"
                    rows={3}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Internal notes, follow-up details..."
                    disabled={selected.status === "approved" || !!provisionResult}
                  />
                </div>

                {provisionResult ? (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="h-5 w-5" />
                      Office provisioned
                    </div>
                    <dl className="grid grid-cols-1 gap-2 text-sm">
                      <div>
                        <dt className="text-muted-foreground">Slug</dt>
                        <dd className="font-mono">{provisionResult.slug}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Skills cloned</dt>
                        <dd>{provisionResult.skills_cloned}</dd>
                      </div>
                    </dl>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => void copySignupLink(provisionResult.signup_path)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy signup link
                      </Button>
                      <Button type="button" variant="outline" className="flex-1" asChild>
                        <a href={`mailto:${provisionResult.pending_admin_email}`}>
                          <Mail className="h-4 w-4 mr-2" />
                          Email admin
                        </a>
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      First signup at this office with {provisionResult.pending_admin_email} becomes office admin.
                    </p>
                  </div>
                ) : selected.status === "approved" ? (
                  <p className="text-sm text-muted-foreground">
                    This application was already approved
                    {selected.provisioned_office_id ? " and provisioned." : "."}
                  </p>
                ) : selected.status !== "rejected" ? (
                  <div className="space-y-2">
                    <Label htmlFor="proposedSlug">Office slug (optional)</Label>
                    <Input
                      id="proposedSlug"
                      value={proposedSlug}
                      onChange={(e) => setProposedSlug(e.target.value)}
                      placeholder="auto-generated from organization name"
                    />
                    <p className="text-xs text-muted-foreground">
                      Used in signup links: /auth?tab=signup&office=slug
                    </p>
                  </div>
                ) : null}
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                {provisionResult ? (
                  <Button type="button" onClick={closeDialog} className="w-full sm:w-auto">
                    Done
                  </Button>
                ) : selected.status === "rejected" || selected.status === "approved" ? (
                  <Button type="button" variant="outline" onClick={closeDialog} className="w-full sm:w-auto">
                    Close
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleReject()}
                      disabled={actionLoading}
                      className="w-full sm:w-auto"
                    >
                      {actionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </>
                      )}
                    </Button>
                    {selected.status === "pending" && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => void handleMarkContacted()}
                        disabled={actionLoading}
                        className="w-full sm:w-auto"
                      >
                        Mark contacted
                      </Button>
                    )}
                    <Button
                      type="button"
                      onClick={() => void handleProvision()}
                      disabled={actionLoading}
                      className="w-full sm:w-auto"
                    >
                      {actionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Approve & provision
                        </>
                      )}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
