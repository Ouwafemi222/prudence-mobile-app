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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useManagedOffice } from "@/hooks/useManagedOffice";
import { toast } from "sonner";
import {
  fetchOfficeRules,
  fetchOfficeTimetable,
  fetchOfficeProRequirements,
} from "@/lib/officeContent";
import {
  saveOfficeRuleSections,
  saveOfficeTimetableSlots,
  saveOfficeProRequirements,
  upsertOfficeContentMeta,
} from "@/lib/officeContentAdmin";
import {
  Building2,
  CheckCircle2,
  Copy,
  FileText,
  Loader2,
  Plus,
  Save,
  Trash2,
  UserPlus,
  Users,
  XCircle,
  Calendar,
  Target,
} from "lucide-react";

type PendingMember = {
  id: string;
  user_id: string;
  full_name: string;
  username: string;
  email: string | null;
  sponsor_username: string | null;
  approval_status: "pending" | "approved" | "rejected";
  created_at: string;
};

type RuleDraft = {
  id?: string;
  category: string;
  itemsText: string;
  sort_order: number;
};

type SlotDraft = {
  id?: string;
  time_label: string;
  activity: string;
  description: string;
  sort_order: number;
};

type ProReqDraft = {
  id?: string;
  title: string;
  description: string;
  icon_key: string;
  detailsText: string;
  sort_order: number;
};

function linesToArray(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function arrayToLines(items: string[]): string {
  return items.join("\n");
}

export default function OfficeAdmin() {
  const { profile, userRole, refreshProfile } = useAuth();
  const isSuperAdmin = userRole?.role === "super_admin";
  const {
    managedOfficeId: officeId,
    managedOffice: office,
    allOffices,
    setOfficeSlug,
    refreshManagedOffice,
    loading: officeLoading,
    isManagingOtherOffice,
    canSwitchOffice,
  } = useManagedOffice();

  const [activeTab, setActiveTab] = useState("overview");
  const [contentTab, setContentTab] = useState("rules");

  // Overview
  const [officeName, setOfficeName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [memberStats, setMemberStats] = useState({ total: 0, pending: 0, approved: 0 });

  // Invites
  const [inviteSponsor, setInviteSponsor] = useState("");

  // Members
  const [membersLoading, setMembersLoading] = useState(false);
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [memberActionId, setMemberActionId] = useState<string | null>(null);

  // Rules
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesSaving, setRulesSaving] = useState(false);
  const [ruleSections, setRuleSections] = useState<RuleDraft[]>([]);
  const [rulesMeta, setRulesMeta] = useState({ subtitle: "", notice_text: "", footer_text: "" });

  // Timetable
  const [timetableLoading, setTimetableLoading] = useState(false);
  const [timetableSaving, setTimetableSaving] = useState(false);
  const [slots, setSlots] = useState<SlotDraft[]>([]);
  const [timetableMeta, setTimetableMeta] = useState({ subtitle: "", notesText: "" });

  // Pro requirements
  const [proLoading, setProLoading] = useState(false);
  const [proSaving, setProSaving] = useState(false);
  const [proReqs, setProReqs] = useState<ProReqDraft[]>([]);
  const [proMeta, setProMeta] = useState({
    subtitle: "",
    notice_text: "",
    footer_text: "",
    privilegesText: "",
  });

  useEffect(() => {
    if (office?.name) setOfficeName(office.name);
  }, [office?.name]);

  const fetchStats = useCallback(async () => {
    if (!officeId) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("approval_status")
      .eq("office_id", officeId);
    if (error) return;
    const rows = data ?? [];
    setMemberStats({
      total: rows.length,
      pending: rows.filter((r) => r.approval_status === "pending").length,
      approved: rows.filter((r) => r.approval_status === "approved").length,
    });
  }, [officeId]);

  const fetchPendingMembers = useCallback(async () => {
    if (!officeId) return;
    setMembersLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, username, email, sponsor_username, approval_status, created_at")
        .eq("office_id", officeId)
        .eq("approval_status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setPendingMembers((data ?? []) as PendingMember[]);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load pending members");
    } finally {
      setMembersLoading(false);
    }
  }, [officeId]);

  const loadRules = useCallback(async () => {
    if (!officeId) return;
    setRulesLoading(true);
    try {
      const { sections, meta } = await fetchOfficeRules(officeId);
      setRuleSections(
        sections.map((s) => ({
          id: s.id,
          category: s.category,
          itemsText: arrayToLines(s.items),
          sort_order: s.sort_order,
        })),
      );
      setRulesMeta({
        subtitle: meta?.subtitle ?? "",
        notice_text: meta?.notice_text ?? "",
        footer_text: meta?.footer_text ?? "",
      });
    } catch (e) {
      console.error(e);
      toast.error("Failed to load rules");
    } finally {
      setRulesLoading(false);
    }
  }, [officeId]);

  const loadTimetable = useCallback(async () => {
    if (!officeId) return;
    setTimetableLoading(true);
    try {
      const { slots: data, meta, notes } = await fetchOfficeTimetable(officeId);
      setSlots(
        data.map((s) => ({
          id: s.id,
          time_label: s.time_label,
          activity: s.activity,
          description: s.description ?? "",
          sort_order: s.sort_order,
        })),
      );
      setTimetableMeta({
        subtitle: meta?.subtitle ?? "",
        notesText: arrayToLines(notes),
      });
    } catch (e) {
      console.error(e);
      toast.error("Failed to load timetable");
    } finally {
      setTimetableLoading(false);
    }
  }, [officeId]);

  const loadProReqs = useCallback(async () => {
    if (!officeId) return;
    setProLoading(true);
    try {
      const { requirements, meta, privileges } = await fetchOfficeProRequirements(officeId);
      setProReqs(
        requirements.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description ?? "",
          icon_key: r.icon_key,
          detailsText: arrayToLines(r.details),
          sort_order: r.sort_order,
        })),
      );
      setProMeta({
        subtitle: meta?.subtitle ?? "",
        notice_text: meta?.notice_text ?? "",
        footer_text: meta?.footer_text ?? "",
        privilegesText: arrayToLines(privileges),
      });
    } catch (e) {
      console.error(e);
      toast.error("Failed to load pro requirements");
    } finally {
      setProLoading(false);
    }
  }, [officeId]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === "members") void fetchPendingMembers();
  }, [activeTab, fetchPendingMembers]);

  useEffect(() => {
    if (activeTab !== "content") return;
    if (contentTab === "rules") void loadRules();
    if (contentTab === "timetable") void loadTimetable();
    if (contentTab === "pro") void loadProReqs();
  }, [activeTab, contentTab, loadRules, loadTimetable, loadProReqs]);

  const inviteLink = useMemo(() => {
    if (!office?.slug) return "";
    const base = `${window.location.origin}/auth?tab=signup&office=${office.slug}`;
    const sponsor = inviteSponsor.trim().toLowerCase();
    return sponsor ? `${base}&sponsor=${sponsor}` : base;
  }, [office?.slug, inviteSponsor]);

  const copyInvite = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    toast.success("Invite link copied");
  };

  const saveOfficeName = async () => {
    if (!officeId || !officeName.trim()) return;
    setSavingName(true);
    try {
      const { error } = await supabase
        .from("offices")
        .update({ name: officeName.trim(), updated_at: new Date().toISOString() })
        .eq("id", officeId);
      if (error) throw error;
      if (isManagingOtherOffice) {
        await refreshManagedOffice();
      } else {
        await refreshProfile();
      }
      toast.success("Office name updated");
    } catch (e) {
      console.error(e);
      toast.error("Failed to update office name");
    } finally {
      setSavingName(false);
    }
  };

  const handleMemberAction = async (memberId: string, action: "approved" | "rejected") => {
    setMemberActionId(memberId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ approval_status: action, updated_at: new Date().toISOString() })
        .eq("id", memberId);
      if (error) throw error;
      toast.success(action === "approved" ? "Member approved" : "Member rejected");
      await fetchPendingMembers();
      await fetchStats();
    } catch (e) {
      console.error(e);
      toast.error("Action failed");
    } finally {
      setMemberActionId(null);
    }
  };

  const saveRules = async () => {
    if (!officeId) return;
    setRulesSaving(true);
    try {
      await saveOfficeRuleSections(
        officeId,
        ruleSections.map((s, i) => ({
          id: s.id,
          category: s.category.trim(),
          items: linesToArray(s.itemsText),
          sort_order: i,
        })),
      );
      await upsertOfficeContentMeta(officeId, "rules", {
        subtitle: rulesMeta.subtitle.trim() || null,
        notice_text: rulesMeta.notice_text.trim() || null,
        footer_text: rulesMeta.footer_text.trim() || null,
      });
      await loadRules();
      toast.success("Office rules saved");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save rules");
    } finally {
      setRulesSaving(false);
    }
  };

  const saveTimetable = async () => {
    if (!officeId) return;
    setTimetableSaving(true);
    try {
      await saveOfficeTimetableSlots(
        officeId,
        slots.map((s, i) => ({
          id: s.id,
          time_label: s.time_label.trim(),
          activity: s.activity.trim(),
          description: s.description.trim() || null,
          sort_order: i,
        })),
      );
      await upsertOfficeContentMeta(officeId, "timetable", {
        subtitle: timetableMeta.subtitle.trim() || null,
        extra: { notes: linesToArray(timetableMeta.notesText) },
      });
      await loadTimetable();
      toast.success("Timetable saved");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save timetable");
    } finally {
      setTimetableSaving(false);
    }
  };

  const saveProReqs = async () => {
    if (!officeId) return;
    setProSaving(true);
    try {
      await saveOfficeProRequirements(
        officeId,
        proReqs.map((r, i) => ({
          id: r.id,
          title: r.title.trim(),
          description: r.description.trim() || null,
          icon_key: r.icon_key || "target",
          details: linesToArray(r.detailsText),
          sort_order: i,
        })),
      );
      await upsertOfficeContentMeta(officeId, "pro_requirements", {
        subtitle: proMeta.subtitle.trim() || null,
        notice_text: proMeta.notice_text.trim() || null,
        footer_text: proMeta.footer_text.trim() || null,
        extra: { privileges: linesToArray(proMeta.privilegesText) },
      });
      await loadProReqs();
      toast.success("Pro requirements saved");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save pro requirements");
    } finally {
      setProSaving(false);
    }
  };

  if (officeLoading || !officeId || !office) {
    return (
      <AppLayout>
        <GlassCard>
          <GlassCardContent className="py-12 text-center text-muted-foreground">
            {officeLoading ? "Loading office..." : "Office not found"}
          </GlassCardContent>
        </GlassCard>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-7 w-7 sm:h-8 sm:w-8 text-primary shrink-0" />
            Office Admin
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage {office.name}
            {isManagingOtherOffice && " (platform admin — other office)"}
            {isSuperAdmin && !isManagingOtherOffice && " (your home office)"}
          </p>
        </div>

        {canSwitchOffice && (
          <GlassCard>
            <GlassCardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="office-switch">Operating as office</Label>
                  <Select value={office.slug} onValueChange={setOfficeSlug}>
                    <SelectTrigger id="office-switch">
                      <SelectValue placeholder="Select office" />
                    </SelectTrigger>
                    <SelectContent>
                      {allOffices.map((o) => (
                        <SelectItem key={o.id} value={o.slug}>
                          {o.name} ({o.slug})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Super admins can manage any office — members, content, and invites for the selected workspace.
              </p>
            </GlassCardContent>
          </GlassCard>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto gap-1">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="invites" className="text-xs sm:text-sm">Invites</TabsTrigger>
            <TabsTrigger value="members" className="text-xs sm:text-sm">
              Members
              {memberStats.pending > 0 && (
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-xs">
                  {memberStats.pending}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="content" className="text-xs sm:text-sm">Content</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <GlassCard>
                <GlassCardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Total members</p>
                  <p className="text-3xl font-bold">{memberStats.total}</p>
                </GlassCardContent>
              </GlassCard>
              <GlassCard>
                <GlassCardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-3xl font-bold text-emerald-600">{memberStats.approved}</p>
                </GlassCardContent>
              </GlassCard>
              <GlassCard>
                <GlassCardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Pending approval</p>
                  <p className="text-3xl font-bold text-amber-600">{memberStats.pending}</p>
                </GlassCardContent>
              </GlassCard>
            </div>

            <GlassCard>
              <GlassCardHeader>
                <GlassCardTitle>Office settings</GlassCardTitle>
                <GlassCardDescription>Slug: {office.slug} (cannot be changed)</GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="office-name">Display name</Label>
                  <Input
                    id="office-name"
                    value={officeName}
                    onChange={(e) => setOfficeName(e.target.value)}
                  />
                </div>
                <Button onClick={saveOfficeName} disabled={savingName || !officeName.trim()}>
                  {savingName ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save name
                </Button>
              </GlassCardContent>
            </GlassCard>
          </TabsContent>

          <TabsContent value="invites" className="space-y-4">
            <GlassCard>
              <GlassCardHeader>
                <GlassCardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Member invite link
                </GlassCardTitle>
                <GlassCardDescription>
                  Share this link so new members can sign up into your office.
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-sponsor">Sponsor username (optional)</Label>
                  <Input
                    id="invite-sponsor"
                    placeholder={profile?.username ?? "sponsor username"}
                    value={inviteSponsor}
                    onChange={(e) => setInviteSponsor(e.target.value.toLowerCase())}
                  />
                  <p className="text-xs text-muted-foreground">
                    Pre-fills the sponsor field on signup. Must be a member of this office.
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3 break-all text-sm font-mono">
                  {inviteLink}
                </div>
                <Button onClick={copyInvite} className="w-full sm:w-auto">
                  <Copy className="mr-2 h-4 w-4" />
                  Copy invite link
                </Button>
              </GlassCardContent>
            </GlassCard>
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <GlassCard>
              <GlassCardHeader>
                <GlassCardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Pending approvals
                </GlassCardTitle>
                <GlassCardDescription>
                  Approve or reject members waiting to join your office.
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                {membersLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : pendingMembers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No pending members.</p>
                ) : (
                  <div className="space-y-3">
                    {pendingMembers.map((m) => (
                      <div
                        key={m.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border p-4"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{m.full_name || m.username}</p>
                          <p className="text-sm text-muted-foreground">@{m.username}</p>
                          {m.email && (
                            <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                          )}
                          {m.sponsor_username && (
                            <p className="text-xs text-muted-foreground">
                              Sponsor: @{m.sponsor_username}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            onClick={() => handleMemberAction(m.id, "approved")}
                            disabled={memberActionId === m.id}
                          >
                            {memberActionId === m.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="mr-1 h-4 w-4" />
                                Approve
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMemberAction(m.id, "rejected")}
                            disabled={memberActionId === m.id}
                          >
                            <XCircle className="mr-1 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCardContent>
            </GlassCard>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <Tabs value={contentTab} onValueChange={setContentTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="rules"><FileText className="h-4 w-4 mr-1 hidden sm:inline" />Rules</TabsTrigger>
                <TabsTrigger value="timetable"><Calendar className="h-4 w-4 mr-1 hidden sm:inline" />Timetable</TabsTrigger>
                <TabsTrigger value="pro"><Target className="h-4 w-4 mr-1 hidden sm:inline" />Pro reqs</TabsTrigger>
              </TabsList>

              <TabsContent value="rules" className="mt-4 space-y-4">
                {rulesLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : (
                  <>
                    <GlassCard>
                      <GlassCardHeader><GlassCardTitle>Page meta</GlassCardTitle></GlassCardHeader>
                      <GlassCardContent className="space-y-3">
                        <div className="space-y-2">
                          <Label>Subtitle</Label>
                          <Input value={rulesMeta.subtitle} onChange={(e) => setRulesMeta({ ...rulesMeta, subtitle: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Notice text</Label>
                          <Textarea value={rulesMeta.notice_text} onChange={(e) => setRulesMeta({ ...rulesMeta, notice_text: e.target.value })} rows={2} />
                        </div>
                        <div className="space-y-2">
                          <Label>Footer text</Label>
                          <Textarea value={rulesMeta.footer_text} onChange={(e) => setRulesMeta({ ...rulesMeta, footer_text: e.target.value })} rows={2} />
                        </div>
                      </GlassCardContent>
                    </GlassCard>

                    {ruleSections.map((section, idx) => (
                      <GlassCard key={section.id ?? `new-${idx}`}>
                        <GlassCardContent className="pt-6 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <Label>Section {idx + 1}</Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setRuleSections((prev) => prev.filter((_, i) => i !== idx))}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          <Input
                            placeholder="Category name"
                            value={section.category}
                            onChange={(e) =>
                              setRuleSections((prev) =>
                                prev.map((s, i) => (i === idx ? { ...s, category: e.target.value } : s)),
                              )
                            }
                          />
                          <Textarea
                            placeholder="One rule per line"
                            value={section.itemsText}
                            onChange={(e) =>
                              setRuleSections((prev) =>
                                prev.map((s, i) => (i === idx ? { ...s, itemsText: e.target.value } : s)),
                              )
                            }
                            rows={4}
                          />
                        </GlassCardContent>
                      </GlassCard>
                    ))}

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setRuleSections((prev) => [
                            ...prev,
                            { category: "", itemsText: "", sort_order: prev.length },
                          ])
                        }
                      >
                        <Plus className="mr-2 h-4 w-4" /> Add section
                      </Button>
                      <Button onClick={saveRules} disabled={rulesSaving} className="sm:ml-auto">
                        {rulesSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save rules
                      </Button>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="timetable" className="mt-4 space-y-4">
                {timetableLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : (
                  <>
                    <GlassCard>
                      <GlassCardContent className="pt-6 space-y-3">
                        <div className="space-y-2">
                          <Label>Subtitle</Label>
                          <Input value={timetableMeta.subtitle} onChange={(e) => setTimetableMeta({ ...timetableMeta, subtitle: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Notes (one per line)</Label>
                          <Textarea value={timetableMeta.notesText} onChange={(e) => setTimetableMeta({ ...timetableMeta, notesText: e.target.value })} rows={3} />
                        </div>
                      </GlassCardContent>
                    </GlassCard>

                    {slots.map((slot, idx) => (
                      <GlassCard key={slot.id ?? `slot-${idx}`}>
                        <GlassCardContent className="pt-6 space-y-3">
                          <div className="flex justify-end">
                            <Button type="button" variant="ghost" size="icon" onClick={() => setSlots((prev) => prev.filter((_, i) => i !== idx))}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label>Time</Label>
                              <Input value={slot.time_label} onChange={(e) => setSlots((prev) => prev.map((s, i) => i === idx ? { ...s, time_label: e.target.value } : s))} placeholder="9:00 AM" />
                            </div>
                            <div className="space-y-2">
                              <Label>Activity</Label>
                              <Input value={slot.activity} onChange={(e) => setSlots((prev) => prev.map((s, i) => i === idx ? { ...s, activity: e.target.value } : s))} />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Input value={slot.description} onChange={(e) => setSlots((prev) => prev.map((s, i) => i === idx ? { ...s, description: e.target.value } : s))} />
                          </div>
                        </GlassCardContent>
                      </GlassCard>
                    ))}

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button type="button" variant="outline" onClick={() => setSlots((prev) => [...prev, { time_label: "", activity: "", description: "", sort_order: prev.length }])}>
                        <Plus className="mr-2 h-4 w-4" /> Add slot
                      </Button>
                      <Button onClick={saveTimetable} disabled={timetableSaving} className="sm:ml-auto">
                        {timetableSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save timetable
                      </Button>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="pro" className="mt-4 space-y-4">
                {proLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : (
                  <>
                    <GlassCard>
                      <GlassCardContent className="pt-6 space-y-3">
                        <div className="space-y-2"><Label>Subtitle</Label><Input value={proMeta.subtitle} onChange={(e) => setProMeta({ ...proMeta, subtitle: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Overview</Label><Textarea value={proMeta.notice_text} onChange={(e) => setProMeta({ ...proMeta, notice_text: e.target.value })} rows={2} /></div>
                        <div className="space-y-2"><Label>Footer</Label><Textarea value={proMeta.footer_text} onChange={(e) => setProMeta({ ...proMeta, footer_text: e.target.value })} rows={2} /></div>
                        <div className="space-y-2"><Label>Privileges (one per line)</Label><Textarea value={proMeta.privilegesText} onChange={(e) => setProMeta({ ...proMeta, privilegesText: e.target.value })} rows={3} /></div>
                      </GlassCardContent>
                    </GlassCard>

                    {proReqs.map((req, idx) => (
                      <GlassCard key={req.id ?? `pro-${idx}`}>
                        <GlassCardContent className="pt-6 space-y-3">
                          <div className="flex justify-end">
                            <Button type="button" variant="ghost" size="icon" onClick={() => setProReqs((prev) => prev.filter((_, i) => i !== idx))}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label>Title</Label>
                              <Input value={req.title} onChange={(e) => setProReqs((prev) => prev.map((r, i) => i === idx ? { ...r, title: e.target.value } : r))} />
                            </div>
                            <div className="space-y-2">
                              <Label>Icon</Label>
                              <Select value={req.icon_key} onValueChange={(v) => setProReqs((prev) => prev.map((r, i) => i === idx ? { ...r, icon_key: v } : r))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {["target", "book", "star", "check", "clock"].map((k) => (
                                    <SelectItem key={k} value={k}>{k}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Input value={req.description} onChange={(e) => setProReqs((prev) => prev.map((r, i) => i === idx ? { ...r, description: e.target.value } : r))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Details (one per line)</Label>
                            <Textarea value={req.detailsText} onChange={(e) => setProReqs((prev) => prev.map((r, i) => i === idx ? { ...r, detailsText: e.target.value } : r))} rows={3} />
                          </div>
                        </GlassCardContent>
                      </GlassCard>
                    ))}

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button type="button" variant="outline" onClick={() => setProReqs((prev) => [...prev, { title: "", description: "", icon_key: "target", detailsText: "", sort_order: prev.length }])}>
                        <Plus className="mr-2 h-4 w-4" /> Add requirement
                      </Button>
                      <Button onClick={saveProReqs} disabled={proSaving} className="sm:ml-auto">
                        {proSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save pro requirements
                      </Button>
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
