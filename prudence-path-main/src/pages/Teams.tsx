import { useState, useEffect, useRef } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  MoreVertical,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Save,
  Edit,
  Trash2,
  BookOpen,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { notifyUser, toastAfterAction } from "@/lib/notifyUser";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import {
  notifyDirectSponsorOfMember,
  notifyRoleChanged,
  notifySponsorUplinesOfMember,
} from "@/lib/teamNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { scopeToUserOffice } from "@/lib/tenantScope";
import { useRealtimeRefresh } from "@/contexts/RealtimeSyncContext";
import { toast } from "sonner";
import { getNigeriaWeekStartISO } from "@/lib/nigeriaTime";
import { TeamsMembersList } from "@/pages/TeamsMembersList";

interface TeamMember {
  id: string;
  user_id: string;
  office_id: string;
  full_name: string;
  username: string;
  email: string | null;
  sponsor_username: string | null;
  approval_status: "pending" | "approved" | "rejected";
  assigned_group_id: string | null;
  assigned_trainer_id: string | null;
  avatar_url: string | null;
  created_at: string;
  role: string;
  group_name: string | null;
  trainer_name: string | null;
  submissionsThisWeek: number;
}

const ROLE_PRIORITY = ["super_admin", "trainer", "pro", "sponsor", "member"] as const;

/** Returns an error message, or null if sponsor is valid in the member's office. */
async function validateSponsorInOffice(
  sponsorUsername: string,
  memberOfficeId: string | null | undefined,
  memberUsername: string,
): Promise<string | null> {
  const sponsor = sponsorUsername.trim().toLowerCase();
  if (!sponsor) return null;
  if (!memberOfficeId) return "Could not determine member office for sponsor validation";
  if (sponsor === memberUsername.toLowerCase()) return "User cannot sponsor themselves";

  const { data: ok, error } = await supabase.rpc("is_sponsor_in_office", {
    p_sponsor_username: sponsor,
    p_office_id: memberOfficeId,
  });
  if (error || !ok) return "Sponsor not found in this office";
  return null;
}

function pickPrimaryRole(roles: { role: string }[] | null | undefined): string {
  const list = roles || [];
  for (const r of ROLE_PRIORITY) {
    if (list.some((x) => x.role === r)) return r;
  }
  return "member";
}

const roleColors: Record<string, string> = {
  super_admin: "bg-destructive/10 text-destructive",
  trainer: "bg-primary/10 text-primary",
  pro: "bg-chart-3/10 text-chart-3",
  sponsor: "bg-chart-4/10 text-chart-4",
  member: "bg-muted text-muted-foreground",
};

const statusIcons: Record<string, React.ReactNode> = {
  approved: <CheckCircle2 className="h-4 w-4 text-chart-1" />,
  pending: <Clock className="h-4 w-4 text-amber-500" />,
  rejected: <XCircle className="h-4 w-4 text-destructive" />,
};

/** Persist across route changes so Teams does not full-screen reload every navigation */
let cachedTeamMembers: TeamMember[] | null = null;

export default function Teams() {
  const { user, profile, office, userRole, userDataLoading, isAdmin, isTrainer, officeId, isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(!cachedTeamMembers?.length);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(cachedTeamMembers ?? []);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [groupsDetailed, setGroupsDetailed] = useState<
    { id: string; name: string; description: string | null; trainer_ids: string[] | null; trainer_names: string[]; member_count: number }[]
  >([]);
  const [trainers, setTrainers] = useState<{ id: string; name: string }[]>([]);
  const [sponsors, setSponsors] = useState<{ username: string; full_name: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "pending" | "rejected">("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const membersSectionRef = useRef<HTMLDivElement>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [approveForm, setApproveForm] = useState({
    role: "member",
    group_id: "",
    trainer_id: "",
    sponsor_username: "",
  });
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: "", description: "", trainer_ids: [] as string[] });
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copyingInvite, setCopyingInvite] = useState(false);
  const [deactivatingUserId, setDeactivatingUserId] = useState<string>("");
  const [deletingUserId, setDeletingUserId] = useState<string>("");
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Bulk selection + edit
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    role: "__nochange__",
    group_id: "__nochange__",
    trainer_id: "__nochange__",
    sponsor_username: "__nochange__",
  });

  // Manage Skills
  const [isManageSkillsOpen, setIsManageSkillsOpen] = useState(false);
  const [skills, setSkills] = useState<{ id: string; name: string; is_mandatory: boolean | null }[]>([]);
  const [userSkills, setUserSkills] = useState<Record<string, { skill_id: string; status: string }>>({});
  const [skillsSaving, setSkillsSaving] = useState(false);
  const [skillsForm, setSkillsForm] = useState<{
    mandatory: Record<string, string>;
    optional: string;
  }>({ mandatory: {}, optional: "__none__" });

  useEffect(() => {
    if (!user?.id) return;

    if (!userRole) {
      if (!userDataLoading) setLoading(false);
      return;
    }

    if (userRole.role !== "super_admin" && userRole.role !== "trainer") {
      setLoading(false);
      return;
    }
    fetchTeamMembers({ soft: !!cachedTeamMembers?.length });
    fetchGroups();
    fetchTrainers();
    fetchSponsors();
    fetchSkills();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when user/role identity changes
  }, [user?.id, userRole?.role, userDataLoading, officeId]);

  const fetchTeamMembers = async (options?: { soft?: boolean }) => {
    if (!user) return;

    if (!options?.soft) {
      setLoading(true);
    }
    try {
      // Build query based on user role
      let profilesQuery = supabase
        .from("profiles")
        .select(`
          id,
          user_id,
          office_id,
          full_name,
          username,
          email,
          sponsor_username,
          approval_status,
          assigned_group_id,
          assigned_trainer_id,
          avatar_url,
          created_at
        `);

      // Sub-trainers can only see members in their assigned group
      if (!isAdmin && profile?.assigned_group_id) {
        profilesQuery = profilesQuery.eq("assigned_group_id", profile.assigned_group_id);
      }

      profilesQuery = scopeToUserOffice(profilesQuery, officeId, isSuperAdmin);

      const { data: profilesData, error: profilesError } = await profilesQuery;

      if (profilesError) throw profilesError;

      // Fetch roles for each profile
      const membersWithRoles = await Promise.all(
        (profilesData || []).map(async (profile) => {
          const { data: rolesData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", profile.user_id);

          // Fetch group name if assigned
          let groupName = null;
          if (profile.assigned_group_id) {
            const { data: groupData } = await supabase
              .from("groups")
              .select("name")
              .eq("id", profile.assigned_group_id)
              .single();
            groupName = groupData?.name || null;
          }

          // Fetch trainer name if assigned
          let trainerName = null;
          if (profile.assigned_trainer_id) {
            const { data: trainerData } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", profile.assigned_trainer_id)
              .single();
            trainerName = trainerData?.full_name || null;
          }

          // Calculate submissions this week
          const weekStartISO = getNigeriaWeekStartISO();

          const { count } = await supabase
            .from("daily_activities")
            .select("*", { count: "exact", head: true })
            .eq("user_id", profile.user_id)
            .gte("activity_date", weekStartISO);

          return {
            ...profile,
            role: pickPrimaryRole((rolesData || []) as any),
            group_name: groupName,
            trainer_name: trainerName,
            submissionsThisWeek: count || 0,
          } as TeamMember;
        })
      );

      cachedTeamMembers = membersWithRoles;
      setTeamMembers(membersWithRoles);
    } catch (error: any) {
      console.error("Error fetching team members:", error);
      toast.error("Failed to load team members");
    } finally {
      setLoading(false);
    }
  };

  useRealtimeRefresh(() => {
    if (!user?.id || !userRole) return;
    if (userRole.role !== "super_admin" && userRole.role !== "trainer") return;
    fetchTeamMembers({ soft: true });
  }, ["profiles", "daily_activities"]);

  const renderMemberActions = (member: TeamMember) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 w-full sm:w-auto min-w-[120px] shrink-0 gap-2">
          <MoreVertical className="h-4 w-4" />
          Options
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 z-50">
        {isAdmin && (isSuperAdmin || ["member", "pro", "sponsor"].includes(member.role)) ? (
          <DropdownMenuItem onClick={() => handleOpenApproveDialog(member)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Member
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled>
            <Edit className="mr-2 h-4 w-4" />
            Edit Member (super admin only)
          </DropdownMenuItem>
        )}
        {isAdmin && (
          <DropdownMenuItem onClick={() => handleOpenManageSkills(member)}>
            <BookOpen className="mr-2 h-4 w-4" />
            Manage Skills
          </DropdownMenuItem>
        )}
        {canDeactivateMember(member) && (
          <DropdownMenuItem
            onClick={() => handleDeactivateMember(member)}
            className="text-destructive focus:text-destructive"
            disabled={!!deactivatingUserId}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {deactivatingUserId === member.user_id ? "Deactivating..." : "Deactivate Member"}
          </DropdownMenuItem>
        )}
        {isSuperAdmin && member.user_id !== user?.id && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleDeleteUser(member)}
              className="text-destructive focus:text-destructive"
              disabled={!!deletingUserId}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deletingUserId === member.user_id ? "Deleting..." : "Delete User (permanent)"}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const fetchGroups = async () => {
    let query = supabase
      .from("groups")
      .select("id, name, description, trainer_id, trainer_ids")
      .order("name", { ascending: true });
    query = scopeToUserOffice(query, officeId, isSuperAdmin);
    const { data, error } = await query;

    if (error) {
      console.error("Error fetching groups:", error);
    } else {
      const rows = (data || []) as { id: string; name: string; description: string | null; trainer_id: string | null; trainer_ids: string[] | null }[];
      setGroups(rows.map((g) => ({ id: g.id, name: g.name })));

      // Collect all trainer IDs (from both trainer_id and trainer_ids)
      const allTrainerIds = new Set<string>();
      rows.forEach((r) => {
        if (r.trainer_id) allTrainerIds.add(r.trainer_id);
        if (r.trainer_ids && r.trainer_ids.length > 0) {
          r.trainer_ids.forEach((tid) => allTrainerIds.add(tid));
        }
      });

      // Resolve trainer names
      const trainerNameById = new Map<string, string>();
      if (allTrainerIds.size > 0) {
        const { data: trainerProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", Array.from(allTrainerIds));
        (trainerProfiles || []).forEach((p: any) => trainerNameById.set(p.user_id, p.full_name));
      }

      const counts = await Promise.all(
        rows.map(async (g) => {
          // Count all approved members assigned to this group
          const { count: assignedCount } = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("assigned_group_id", g.id)
            .eq("approval_status", "approved");
          
          // Get trainer IDs for this group
          const trainerIds = g.trainer_ids && g.trainer_ids.length > 0 
            ? g.trainer_ids 
            : (g.trainer_id ? [g.trainer_id] : []);
          
          // Count trainers who are assigned to this group (to avoid double counting)
          let trainerAssignedCount = 0;
          if (trainerIds.length > 0) {
            const { count: trainerInGroupCount } = await supabase
              .from("profiles")
              .select("*", { count: "exact", head: true })
              .eq("assigned_group_id", g.id)
              .eq("approval_status", "approved")
              .in("user_id", trainerIds);
            trainerAssignedCount = trainerInGroupCount || 0;
          }
          
          // Total count = assigned members + trainers not already counted
          const totalCount = (assignedCount || 0) + (trainerIds.length - trainerAssignedCount);
          
          return { groupId: g.id, count: totalCount };
        })
      );
      const countById = new Map(counts.map((c) => [c.groupId, c.count]));

      setGroupsDetailed(
        rows.map((g) => {
          // Use trainer_ids if available, otherwise fall back to trainer_id
          const trainerIds = g.trainer_ids && g.trainer_ids.length > 0 
            ? g.trainer_ids 
            : (g.trainer_id ? [g.trainer_id] : []);
          const trainerNames = trainerIds.map((tid) => trainerNameById.get(tid) || "Unknown").filter(Boolean);
          
          return {
            id: g.id,
            name: g.name,
            description: g.description,
            trainer_ids: trainerIds,
            trainer_names: trainerNames,
            member_count: countById.get(g.id) || 0,
          };
        })
      );
    }
  };

  const fetchTrainers = async (forOfficeId?: string | null) => {
    const scopeId = forOfficeId ?? officeId;
    if (!scopeId) {
      setTrainers([]);
      return;
    }

    const { data: roleData, error } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("office_id", scopeId)
      .in("role", ["trainer"]);

    if (error) {
      console.error("Error fetching trainers:", error);
      return;
    }

    if (!roleData?.length) {
      setTrainers([]);
      return;
    }

    const userIds = roleData.map((r) => r.user_id);
    let profileQuery = supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
    profileQuery = scopeToUserOffice(profileQuery, scopeId, false);
    const { data: trainerProfiles } = await profileQuery;

    setTrainers(
      (trainerProfiles ?? []).map((t) => ({
        id: t.user_id,
        name: t.full_name,
      })),
    );
  };

  const fetchSponsors = async (forOfficeId?: string | null) => {
    const scopeId = forOfficeId ?? officeId;
    if (!scopeId) {
      setSponsors([]);
      return;
    }

    let query = supabase
      .from("profiles")
      .select("username, full_name")
      .eq("approval_status", "approved")
      .order("full_name", { ascending: true });
    query = scopeToUserOffice(query, scopeId, false);

    const { data: sponsorProfiles, error } = await query;
    if (error) {
      console.error("Error fetching sponsors:", error);
      return;
    }

    setSponsors(
      (sponsorProfiles ?? []).map((s) => ({
        username: s.username,
        full_name: s.full_name,
      })),
    );
  };

  const handleApprove = async () => {
    if (!selectedMember || !user) return;

    setSaving(true);
    try {
      const isPendingApproval = selectedMember.approval_status === "pending";
      const previousRole = selectedMember.role;
      const previousSponsor = selectedMember.sponsor_username?.trim().toLowerCase() || null;
      const newSponsor =
        approveForm.sponsor_username?.trim().toLowerCase() || null;

      if (approveForm.sponsor_username) {
        const sponsorError = await validateSponsorInOffice(
          approveForm.sponsor_username,
          selectedMember.office_id ?? officeId,
          selectedMember.username,
        );
        if (sponsorError) {
          toast.error(sponsorError);
          return;
        }
      }

      // Update approval status
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          approval_status: "approved",
          assigned_group_id: approveForm.group_id || null,
          assigned_trainer_id: approveForm.trainer_id || null,
          sponsor_username: approveForm.sponsor_username || null,
        })
        .eq("id", selectedMember.id);

      if (profileError) throw profileError;

      // Enforce a single "primary role" row per user (cleanup any duplicates)
      const { data: existingRoles, error: rolesFetchError } = await supabase
        .from("user_roles")
        .select("id, role")
        .eq("user_id", selectedMember.user_id);
      if (rolesFetchError) throw rolesFetchError;

      const desiredRole = approveForm.role as any;
      const allowedRolesForEditor = isSuperAdmin
        ? ["member", "pro", "sponsor", "trainer", "super_admin"]
        : ["member", "pro", "sponsor"];

      if (!allowedRolesForEditor.includes(desiredRole)) {
        toast.error("You are not allowed to assign that role");
        return;
      }
      const existing = (existingRoles || []) as { id: string; role: string }[];

      const hasDesired = existing.some((r) => r.role === desiredRole);
      if (!hasDesired && existing.length > 0) {
        const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", selectedMember.user_id);
        if (delErr) throw delErr;
      } else if (hasDesired && existing.length > 1) {
        const deleteIds = existing.filter((r) => r.role !== desiredRole).map((r) => r.id);
        if (deleteIds.length > 0) {
          const { error: delErr } = await supabase.from("user_roles").delete().in("id", deleteIds);
          if (delErr) throw delErr;
        }
      }

      if (!hasDesired) {
        const roleOfficeId = selectedMember.office_id ?? officeId;
        if (!roleOfficeId) {
          toast.error("Could not determine member office for role assignment");
          return;
        }
        const { error: roleError } = await supabase.from("user_roles").insert({
          user_id: selectedMember.user_id,
          role: desiredRole,
          office_id: roleOfficeId,
        });
        if (roleError) throw roleError;
      }

      let approveNotifyResult: Awaited<ReturnType<typeof notifyUser>> | null = null;

      if (isPendingApproval) {
        approveNotifyResult = await notifyUser({
          user_id: selectedMember.user_id,
          title: "Account Approved",
          message: `Your account has been approved! You can now access all features of THE PRUDENCE.`,
          type: "alert",
          link: "/dashboard",
          email_subject: "Your THE PRUDENCE account is approved",
          ctaLabel: "Go to dashboard",
          sendEmail: true,
        });

        if (newSponsor) {
          await notifyDirectSponsorOfMember({
            memberUsername: selectedMember.username,
            memberFullName: selectedMember.full_name,
            sponsorUsername: newSponsor,
            isNewMember: true,
            sendEmail: true,
          });
          await notifySponsorUplinesOfMember({
            memberUsername: selectedMember.username,
            memberFullName: selectedMember.full_name,
            sponsorUsername: newSponsor,
            isNewMember: true,
          });
        }

        supabase.functions
          .invoke("notify-admin-approved", {
            body: { member_user_id: selectedMember.user_id },
          })
          .catch((err) => console.warn("Admin approval email failed:", err));
      } else {
        if (desiredRole !== previousRole) {
          await notifyRoleChanged(selectedMember.user_id, desiredRole, previousRole);
        }
        if (newSponsor && newSponsor !== previousSponsor) {
          await notifySponsorUplinesOfMember({
            memberUsername: selectedMember.username,
            memberFullName: selectedMember.full_name,
            sponsorUsername: newSponsor,
            isNewMember: false,
          });
        }
      }

      if (isPendingApproval && approveNotifyResult) {
        toastAfterAction(`${selectedMember.username} has been approved!`, approveNotifyResult, {
          expectedEmail: true,
        });
      } else {
        toast.success(`${selectedMember.username} has been updated!`);
      }
      setIsApproveDialogOpen(false);
      setSelectedMember(null);
      await fetchTeamMembers();
    } catch (error: any) {
      console.error("Error approving member:", error);
      toast.error("Failed to approve member");
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async (member: TeamMember) => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ approval_status: "rejected" })
        .eq("id", member.id);

      if (error) throw error;

      const notifyResult = await notifyUser({
        user_id: member.user_id,
        title: "Account Rejected",
        message: `Your account request has been rejected. Please contact support for more information.`,
        type: "alert",
        link: "/dashboard",
        email_subject: "THE PRUDENCE account request update",
        ctaLabel: "Contact support",
        sendEmail: true,
      });

      toastAfterAction(`${member.username} has been rejected.`, notifyResult, { expectedEmail: true });
      await fetchTeamMembers();
    } catch (error: any) {
      console.error("Error rejecting member:", error);
      toast.error("Failed to reject member");
    } finally {
      setSaving(false);
    }
  };

  const canDeactivateMember = (member: TeamMember) => {
    if (!isAdmin) return false;
    // Trainers can only deactivate non-admin roles; super_admin can deactivate anyone.
    if (isSuperAdmin) return true;
    return ["member", "pro", "sponsor"].includes(member.role);
  };

  const handleDeactivateMember = async (member: TeamMember) => {
    if (!user) return;
    if (!canDeactivateMember(member)) {
      toast.error("You are not allowed to deactivate this user.");
      return;
    }
    const ok = window.confirm(
      `Deactivate @${member.username}? They will be moved back to 'rejected' (no app access) and their roles will be reset to member.`
    );
    if (!ok) return;

    setDeactivatingUserId(member.user_id);
    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          approval_status: "rejected",
          assigned_group_id: null,
          assigned_trainer_id: null,
        })
        .eq("id", member.id);
      if (profileError) throw profileError;

      // Reset roles back to only "member"
      const { error: delRolesErr } = await supabase.from("user_roles").delete().eq("user_id", member.user_id);
      if (delRolesErr) throw delRolesErr;
      const roleOfficeId = member.office_id ?? officeId;
      if (!roleOfficeId) throw new Error("Could not determine member office for role reset");
      const { error: insRoleErr } = await supabase.from("user_roles").insert({
        user_id: member.user_id,
        role: "member" as any,
        office_id: roleOfficeId,
      });
      if (insRoleErr) throw insRoleErr;

      await notifyUser({
        user_id: member.user_id,
        title: "Account Deactivated",
        message: "Your account access has been revoked. Please contact support if you believe this is a mistake.",
        type: "alert",
        link: "/dashboard",
        email_subject: "THE PRUDENCE account deactivated",
      });

      toast.success(`@${member.username} deactivated`);
      await fetchTeamMembers();
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to deactivate member", { description: e.message });
    } finally {
      setDeactivatingUserId("");
    }
  };

  const handleDeleteUser = async (member: TeamMember) => {
    if (!user || !isSuperAdmin) return;
    if (member.user_id === user.id) {
      toast.error("You cannot delete your own account.");
      return;
    }
    const ok = window.confirm(
      `Permanently delete @${member.username} (${member.full_name})? This will remove their account and all associated data. This action cannot be undone.`
    );
    if (!ok) return;

    setDeletingUserId(member.user_id);
    try {
      await invokeEdgeFunction("delete-user", { user_id: member.user_id });
      toast.success(`@${member.username} has been permanently deleted`);
      await fetchTeamMembers();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to delete user";
      toast.error(message);
    } finally {
      setDeletingUserId("");
    }
  };

  const handleBulkDeleteUsers = async () => {
    if (!user || !isSuperAdmin) return;

    const targets = selectedMembers.filter((m) => m.user_id !== user.id);
    if (targets.length === 0) {
      toast.error("Select at least one member to delete (you cannot delete yourself).");
      return;
    }

    const skippedSelf = selectedMembers.length - targets.length;
    const names = targets
      .slice(0, 5)
      .map((m) => `@${m.username}`)
      .join(", ");
    const more = targets.length > 5 ? ` and ${targets.length - 5} more` : "";

    const ok = window.confirm(
      `Permanently delete ${targets.length} account(s)?\n\n${names}${more}\n\nThis cannot be undone.${
        skippedSelf ? "\n\n(Your own account will be skipped.)" : ""
      }`,
    );
    if (!ok) return;

    setBulkDeleting(true);
    let deleted = 0;
    const failures: string[] = [];

    for (const member of targets) {
      try {
        await invokeEdgeFunction("delete-user", { user_id: member.user_id });
        deleted += 1;
      } catch (e: unknown) {
        failures.push(`@${member.username}: ${e instanceof Error ? e.message : "Failed"}`);
      }
    }

    cachedTeamMembers = null;
    clearSelection();
    await fetchTeamMembers();

    if (deleted > 0) {
      toast.success(`Deleted ${deleted} account(s)`);
    }
    if (failures.length > 0) {
      toast.error(`${failures.length} failed`, {
        description: failures.slice(0, 3).join(" · "),
      });
    }
    setBulkDeleting(false);
  };

  const fetchSkills = async (forOfficeId?: string | null) => {
    const scopeId = forOfficeId ?? officeId;
    if (!scopeId) {
      setSkills([]);
      return [];
    }

    let query = supabase
      .from("skills")
      .select("id, name, is_mandatory")
      .eq("is_active", true)
      .order("is_mandatory", { ascending: false })
      .order("name", { ascending: true });
    query = scopeToUserOffice(query, scopeId, false);

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching skills:", error);
      return [];
    }
    const rows = data || [];
    setSkills(rows);
    return rows;
  };

  const fetchUserSkills = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_skills")
      .select("skill_id, status")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching user skills:", error);
      return {};
    }

    const skillsMap: Record<string, { skill_id: string; status: string }> = {};
    (data || []).forEach((us) => {
      skillsMap[us.skill_id] = { skill_id: us.skill_id, status: us.status };
    });
    return skillsMap;
  };

  const handleOpenManageSkills = async (member: TeamMember) => {
    setSelectedMember(member);
    const officeSkills = await fetchSkills(member.office_id ?? officeId);
    const userSkillsData = await fetchUserSkills(member.user_id);
    setUserSkills(userSkillsData);

    const mandatory: Record<string, string> = {};
    let optional = "__none__";

    const mandatorySkills = officeSkills.filter((s) => s.is_mandatory === true);
    const optionalSkills = officeSkills.filter((s) => s.is_mandatory !== true);

    mandatorySkills.forEach((skill) => {
      mandatory[skill.id] = userSkillsData[skill.id]?.status || "yet_to_begin";
    });

    // Find assigned optional skill
    const assignedOptional = optionalSkills.find((skill) => userSkillsData[skill.id]);
    if (assignedOptional) {
      optional = assignedOptional.id;
    }

    setSkillsForm({ mandatory, optional });
    setIsManageSkillsOpen(true);
  };

  const handleSaveSkills = async () => {
    if (!selectedMember || !user) return;

    setSkillsSaving(true);
    try {
      const skillOfficeId = selectedMember.office_id ?? officeId;
      if (!skillOfficeId) {
        toast.error("Could not determine member office for skill assignment");
        return;
      }

      const mandatorySkills = skills.filter((s) => s.is_mandatory === true);
      const optionalSkills = skills.filter((s) => s.is_mandatory !== true);

      // Update mandatory skills
      for (const skill of mandatorySkills) {
        const status = skillsForm.mandatory[skill.id] || "yet_to_begin";
        const { error } = await supabase
          .from("user_skills")
          .upsert(
            {
              user_id: selectedMember.user_id,
              skill_id: skill.id,
              status: status,
              assigned_by: user.id,
              office_id: skillOfficeId,
            },
            { onConflict: "user_id,skill_id" }
          );

        if (error) throw error;
      }

      // Handle optional skill (only one can be assigned)
      // First, remove all optional skills
      const optionalSkillIds = optionalSkills.map((s) => s.id);
      if (optionalSkillIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("user_skills")
          .delete()
          .eq("user_id", selectedMember.user_id)
          .in("skill_id", optionalSkillIds);

        if (deleteError) throw deleteError;
      }

      // Then assign the selected optional skill if any (skip if "__none__")
      if (skillsForm.optional && skillsForm.optional !== "__none__") {
        const { error: insertError } = await supabase
          .from("user_skills")
          .insert({
            user_id: selectedMember.user_id,
            skill_id: skillsForm.optional,
            status: "yet_to_begin",
            assigned_by: user.id,
            office_id: skillOfficeId,
          });

        if (insertError) throw insertError;
      }

      toast.success("Skills updated successfully!");
      setIsManageSkillsOpen(false);
      await fetchTeamMembers();
    } catch (error: any) {
      console.error("Error saving skills:", error);
      toast.error("Failed to save skills");
    } finally {
      setSkillsSaving(false);
    }
  };

  const handleOpenApproveDialog = (member: TeamMember) => {
    setSelectedMember(member);
    const memberOfficeId = member.office_id ?? officeId;
    void fetchTrainers(memberOfficeId);
    void fetchSponsors(memberOfficeId);
    setApproveForm({
      role: member.role,
      group_id: member.assigned_group_id || "",
      trainer_id: member.assigned_trainer_id || "",
      sponsor_username: member.sponsor_username || "",
    });
    setIsApproveDialogOpen(true);
  };

  const handleCreateGroup = async () => {
    if (!user) return;
    const name = groupForm.name.trim();
    if (!name) {
      toast.error("Group name is required");
      return;
    }

    setCreatingGroup(true);
    try {
      const { error } = await supabase.from("groups").insert({
        name,
        description: groupForm.description.trim() || null,
        trainer_ids: groupForm.trainer_ids.length > 0 ? groupForm.trainer_ids : null,
        created_by: user.id,
        office_id: profile?.office_id,
      });
      if (error) throw error;
      toast.success("Group created");
      setIsCreateGroupOpen(false);
      setGroupForm({ name: "", description: "", trainer_ids: [] });
      await fetchGroups();
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to create group", { description: e.message });
    } finally {
      setCreatingGroup(false);
    }
  };

  const getInviteLink = () => {
    const officeSlug = office?.slug;
    if (!officeSlug) return "";
    const sponsor = profile?.username ? profile.username.toLowerCase() : "";
    const base = window.location.origin;
    const url = new URL("/auth", base);
    url.searchParams.set("tab", "signup");
    url.searchParams.set("office", officeSlug);
    if (sponsor) url.searchParams.set("sponsor", sponsor);
    return url.toString();
  };

  const copyInviteLink = async () => {
    try {
      setCopyingInvite(true);
      const link = getInviteLink();
      if (!link) {
        toast.error("Office not loaded yet — refresh and try again.");
        return;
      }
      await navigator.clipboard.writeText(link);
      toast.success("Invite link copied", { description: "Share it with the person you want to invite." });
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to copy invite link", { description: "Your browser may block clipboard access." });
    } finally {
      setCopyingInvite(false);
    }
  };

  const filteredMembers = teamMembers.filter((member) => {
    const matchesSearch =
      member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.email && member.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      member.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    const matchesStatus =
      statusFilter === "all" || member.approval_status === statusFilter;

    // For group filter: include if assigned to group OR if user is a trainer for that group
    let matchesGroup = true;
    if (groupFilter !== "all") {
      const isAssignedToGroup = (member.assigned_group_id || "") === groupFilter;
      const group = groupsDetailed.find(g => g.id === groupFilter);
      const isTrainerForGroup = group && group.trainer_ids && group.trainer_ids.includes(member.user_id);
      matchesGroup = isAssignedToGroup || isTrainerForGroup;
    }
    
    return matchesSearch && matchesRole && matchesStatus && matchesGroup;
  });

  const pendingApprovals = teamMembers.filter((m) => m.approval_status === "pending");

  const canBulkEditTarget = (member: TeamMember) => {
    if (!isAdmin) return false;
    if (isSuperAdmin) return true;
    // Non-super-admins can only edit non-admin targets.
    return ["member", "pro", "sponsor"].includes(member.role);
  };

  const filteredSelectableMembers = filteredMembers.filter(canBulkEditTarget);
  const selectedMembers = filteredMembers.filter((m) => selectedUserIds.has(m.user_id));
  const selectedCount = selectedMembers.length;

  const headerCheckboxState = (() => {
    if (filteredSelectableMembers.length === 0) return false as const;
    const selectedInFiltered = filteredSelectableMembers.filter((m) => selectedUserIds.has(m.user_id)).length;
    if (selectedInFiltered === 0) return false as const;
    if (selectedInFiltered === filteredSelectableMembers.length) return true as const;
    return "indeterminate" as const;
  })();

  const toggleSelectAllFiltered = (checked: boolean) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        filteredSelectableMembers.forEach((m) => next.add(m.user_id));
      } else {
        filteredSelectableMembers.forEach((m) => next.delete(m.user_id));
      }
      return next;
    });
  };

  const toggleSelectOne = (userId: string, checked: boolean) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(userId);
      else next.delete(userId);
      return next;
    });
  };

  const clearSelection = () => setSelectedUserIds(new Set());

  const openBulkEdit = () => {
    if (selectedCount === 0) return;
    setBulkForm({
      role: "__nochange__",
      group_id: "__nochange__",
      trainer_id: "__nochange__",
      sponsor_username: "__nochange__",
    });
    setIsBulkEditOpen(true);
  };

  const applyBulkChanges = async () => {
    if (!user) return;
    if (selectedCount === 0) return;

    const wantsRoleChange = bulkForm.role !== "__nochange__";
    const wantsProfileChange =
      bulkForm.group_id !== "__nochange__" ||
      bulkForm.trainer_id !== "__nochange__" ||
      bulkForm.sponsor_username !== "__nochange__";

    if (!wantsRoleChange && !wantsProfileChange) {
      toast.error("Select at least one change (role/group/trainer/sponsor).");
      return;
    }

    // Validate desired role against editor permissions
    if (wantsRoleChange) {
      const desiredRole = bulkForm.role as any;
      const allowedRolesForEditor = isSuperAdmin
        ? ["member", "pro", "sponsor", "trainer", "super_admin"]
        : ["member", "pro", "sponsor"];
      if (!allowedRolesForEditor.includes(desiredRole)) {
        toast.error("You are not allowed to assign that role.");
        return;
      }
    }

    if (
      wantsProfileChange &&
      bulkForm.sponsor_username !== "__nochange__" &&
      bulkForm.sponsor_username !== "__clear__"
    ) {
      for (const m of selectedMembers) {
        const sponsorError = await validateSponsorInOffice(
          bulkForm.sponsor_username,
          m.office_id ?? officeId,
          m.username,
        );
        if (sponsorError) {
          toast.error(`@${m.username}: ${sponsorError}`);
          return;
        }
      }
    }

    setBulkSaving(true);
    let ok = 0;
    let skipped = 0;
    let failed = 0;

    for (const m of selectedMembers) {
      // Enforce target restriction (extra safety)
      if (!canBulkEditTarget(m)) {
        skipped += 1;
        continue;
      }

      try {
        const previousRole = m.role;
        const previousSponsor = m.sponsor_username?.trim().toLowerCase() || null;
        let newSponsor = previousSponsor;

        // 1) Update profile fields (group/trainer/sponsor)
        if (wantsProfileChange) {
          const update: any = {};
          if (bulkForm.group_id !== "__nochange__") {
            update.assigned_group_id = bulkForm.group_id === "__clear__" ? null : bulkForm.group_id;
          }
          if (bulkForm.trainer_id !== "__nochange__") {
            update.assigned_trainer_id = bulkForm.trainer_id === "__clear__" ? null : bulkForm.trainer_id;
          }
          if (bulkForm.sponsor_username !== "__nochange__") {
            newSponsor =
              bulkForm.sponsor_username === "__clear__"
                ? null
                : (bulkForm.sponsor_username || "").trim().toLowerCase() || null;
            update.sponsor_username = newSponsor;
          }
          if (Object.keys(update).length > 0) {
            const { error: profErr } = await supabase.from("profiles").update(update).eq("id", m.id);
            if (profErr) throw profErr;
          }
        }

        // 2) Update primary role (reset to a single role row)
        if (wantsRoleChange) {
          const desiredRole = bulkForm.role as any;
          const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", m.user_id);
          if (delErr) throw delErr;
          const roleOfficeId = m.office_id ?? officeId;
          if (!roleOfficeId) throw new Error("Could not determine member office for role assignment");
          const { error: insErr } = await supabase.from("user_roles").insert({
            user_id: m.user_id,
            role: desiredRole,
            office_id: roleOfficeId,
          });
          if (insErr) throw insErr;
          await notifyRoleChanged(m.user_id, desiredRole, previousRole);
        }

        if (
          wantsProfileChange &&
          bulkForm.sponsor_username !== "__nochange__" &&
          newSponsor &&
          newSponsor !== previousSponsor
        ) {
          await notifySponsorUplinesOfMember({
            memberUsername: m.username,
            memberFullName: m.full_name,
            sponsorUsername: newSponsor,
            isNewMember: false,
          });
        }

        ok += 1;
      } catch (e: any) {
        console.error(e);
        failed += 1;
      }
    }

    setBulkSaving(false);
    setIsBulkEditOpen(false);
    clearSelection();
    await fetchTeamMembers();

    if (failed === 0) {
      toast.success("Bulk update complete", { description: `${ok} updated${skipped ? `, ${skipped} skipped` : ""}.` });
    } else {
      toast.error("Bulk update completed with errors", { description: `${ok} updated, ${failed} failed${skipped ? `, ${skipped} skipped` : ""}.` });
    }
  };

  if (!isAdmin && !isTrainer) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You need trainer or admin privileges to access team management.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Team Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage your team members and approval requests
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
            <DialogTrigger asChild>
                  <Button variant="outline">
                    <Users className="mr-2 h-4 w-4" />
                    Create Group
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card w-[calc(100%-2rem)] max-w-[calc(100%-2rem)] sm:max-w-md">
              <DialogHeader>
                    <DialogTitle>Create Group</DialogTitle>
                <DialogDescription>
                      Groups help sub-trainers manage members inside specific teams.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                      <Label>Group Name *</Label>
                      <Input
                        placeholder="e.g., Team Alpha"
                        value={groupForm.name}
                        onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                        disabled={creatingGroup}
                      />
                </div>
                <div className="space-y-2">
                      <Label>Description (optional)</Label>
                      <Input
                        placeholder="Short description"
                        value={groupForm.description}
                        onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                        disabled={creatingGroup}
                      />
                    </div>
                    {trainers.length > 0 && (
                      <div className="space-y-2">
                        <Label>Trainers (optional - select multiple)</Label>
                        <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                          {trainers.map((trainer) => (
                            <div key={trainer.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`trainer-${trainer.id}`}
                                checked={groupForm.trainer_ids.includes(trainer.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setGroupForm({
                                      ...groupForm,
                                      trainer_ids: [...groupForm.trainer_ids, trainer.id],
                                    });
                                  } else {
                                    setGroupForm({
                                      ...groupForm,
                                      trainer_ids: groupForm.trainer_ids.filter((id) => id !== trainer.id),
                                    });
                                  }
                                }}
                                disabled={creatingGroup}
                              />
                              <label
                                htmlFor={`trainer-${trainer.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {trainer.name}
                              </label>
                            </div>
                          ))}
                        </div>
                        {groupForm.trainer_ids.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {groupForm.trainer_ids.length} trainer{groupForm.trainer_ids.length > 1 ? "s" : ""} selected
                          </p>
                        )}
                      </div>
                    )}
              </div>
              <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateGroupOpen(false)} disabled={creatingGroup}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateGroup} disabled={creatingGroup || !groupForm.name.trim()}>
                      {creatingGroup ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Create
                        </>
                      )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
            )}
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card w-[calc(100%-2rem)] max-w-[calc(100%-2rem)] sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Invite New Member</DialogTitle>
                <DialogDescription>
                    Invitation emails are not sent automatically yet. Use the invite link below to onboard new members.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label>Invite link</Label>
                    <Input value={getInviteLink()} readOnly />
                    <p className="text-xs text-muted-foreground">
                      This opens the signup page and pre-fills the sponsor username (if available).
                    </p>
                </div>
                <div className="space-y-2">
                    <Label>What happens after signup?</Label>
                    <p className="text-sm text-muted-foreground">
                      New users land in <span className="font-medium text-foreground">Waiting Approval</span> until an admin/trainer approves them and assigns role/group.
                    </p>
                </div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={copyInviteLink} disabled={copyingInvite}>
                    {copyingInvite ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Copying...
                      </>
                    ) : (
                      "Copy Link"
                    )}
                  </Button>
                  <Button asChild>
                    <a href={getInviteLink()} target="_blank" rel="noreferrer">
                      Open Signup
                    </a>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Groups (Admin view) */}
        {isAdmin && (
          <GlassCard>
            <GlassCardHeader>
              <GlassCardTitle>Groups</GlassCardTitle>
              <GlassCardDescription>
                Groups you’ve created. Use these to organize members.
              </GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent>
              {groupsDetailed.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No groups yet. Click <span className="font-medium text-foreground">Create Group</span> to add one.
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Group</TableHead>
                          <TableHead>Trainer</TableHead>
                          <TableHead>Members</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                    {groupsDetailed.map((g) => (
                      <TableRow key={g.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{g.name}</p>
                            {g.description && (
                              <p className="text-xs text-muted-foreground">{g.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {g.trainer_names && g.trainer_names.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {g.trainer_names.map((name, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {name}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {g.member_count}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setGroupFilter(g.id);
                              setSearchQuery("");
                              requestAnimationFrame(() => {
                                membersSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                              });
                            }}
                          >
                            View members
                          </Button>
                        </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
                </div>
              </div>
              )}
            </GlassCardContent>
          </GlassCard>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <GlassCard>
            <GlassCardContent className="py-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {teamMembers.length}
                </p>
                <p className="text-sm text-muted-foreground">Total Members</p>
              </div>
            </GlassCardContent>
          </GlassCard>
          <GlassCard>
            <GlassCardContent className="py-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-chart-1/10">
                <CheckCircle2 className="h-6 w-6 text-chart-1" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {teamMembers.filter((m) => m.approval_status === "approved").length}
                </p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </GlassCardContent>
          </GlassCard>
          <GlassCard>
            <GlassCardContent className="py-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-warning/10">
                <Clock className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {pendingApprovals.length}
                </p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </GlassCardContent>
          </GlassCard>
          <GlassCard>
            <GlassCardContent className="py-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-chart-2/10">
                <Users className="h-6 w-6 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {teamMembers.filter((m) => m.role === "trainer").length}
                </p>
                <p className="text-sm text-muted-foreground">Trainers</p>
              </div>
            </GlassCardContent>
          </GlassCard>
        </div>

        {/* Pending Approvals */}
        {isAdmin && pendingApprovals.length > 0 && (
          <GlassCard className="border-warning/50">
            <GlassCardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning" />
                <GlassCardTitle>Pending Approvals</GlassCardTitle>
              </div>
              <GlassCardDescription>
                {pendingApprovals.length} member(s) waiting for approval
              </GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent>
              <div className="space-y-3">
                {pendingApprovals.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-accent/30"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-accent-foreground text-primary-foreground">
                          {member.full_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{member.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          @{member.username} • Sponsor: {member.sponsor_username ? `@${member.sponsor_username}` : "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(member)}
                        disabled={saving}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleOpenApproveDialog(member)}
                        disabled={saving}
                      >
                        Approve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCardContent>
          </GlassCard>
        )}

        {/* Team Members Table */}
        <div ref={membersSectionRef} className="scroll-mt-24">
        <GlassCard>
          <GlassCardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <GlassCardTitle>All Members</GlassCardTitle>
                <GlassCardDescription>
                  View and manage all team members
                </GlassCardDescription>
                {selectedCount > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="bg-primary/10 text-primary">
                      {selectedCount} selected
                    </Badge>
                    <Button type="button" size="sm" onClick={openBulkEdit} disabled={bulkSaving || bulkDeleting}>
                      Bulk assign
                    </Button>
                    {isSuperAdmin && (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={handleBulkDeleteUsers}
                        disabled={bulkSaving || bulkDeleting}
                      >
                        {bulkDeleting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Deleting…
                          </>
                        ) : (
                          "Delete selected"
                        )}
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={clearSelection}
                      disabled={bulkSaving || bulkDeleting}
                    >
                      Clear
                    </Button>
                    {!isSuperAdmin && (
                      <p className="text-xs text-muted-foreground">
                        Note: only super admin can bulk-edit trainers/super admins.
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 w-full sm:w-auto">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search members..."
                    className="pl-9 w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="space-y-3 w-full">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Approval status</p>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          { value: "all", label: "All" },
                          { value: "approved", label: "Approved" },
                          { value: "pending", label: "Pending" },
                          { value: "rejected", label: "Rejected" },
                        ] as const
                      ).map(({ value, label }) => (
                        <Button
                          key={value}
                          type="button"
                          size="sm"
                          variant={statusFilter === value ? "default" : "outline"}
                          className="h-9"
                          onClick={() => setStatusFilter(value)}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2 w-full">
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <Filter className="h-4 w-4 mr-2 shrink-0" />
                      <SelectValue placeholder="Filter role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All roles</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                      <SelectItem value="trainer">Trainer</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                    </SelectContent>
                  </Select>
                  {groups.length > 0 && (
                    <Select value={groupFilter} onValueChange={setGroupFilter}>
                      <SelectTrigger className="w-full sm:w-44">
                        <Users className="h-4 w-4 mr-2 shrink-0" />
                        <SelectValue placeholder="Filter group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All groups</SelectItem>
                        {groups.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                </div>
              </div>
            </div>
          </GlassCardHeader>
          <GlassCardContent>
            <TeamsMembersList
              members={filteredMembers}
              roleColors={roleColors}
              statusIcons={statusIcons}
              selectedUserIds={selectedUserIds}
              headerCheckboxState={headerCheckboxState}
              filteredSelectableCount={filteredSelectableMembers.length}
              bulkSaving={bulkSaving || bulkDeleting}
              canBulkEditTarget={canBulkEditTarget}
              onToggleSelectAll={toggleSelectAllFiltered}
              onToggleSelectOne={toggleSelectOne}
              renderActions={renderMemberActions}
            />
          </GlassCardContent>
        </GlassCard>
        </div>

        {/* Manage Skills Dialog */}
        <Dialog
          open={isManageSkillsOpen && !!selectedMember}
          onOpenChange={(open) => {
            setIsManageSkillsOpen(open);
            if (!open) setSelectedMember(null);
          }}
        >
          <DialogContent className="glass-card w-[calc(100%-2rem)] max-w-2xl max-h-[85dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Skills - {selectedMember?.full_name}</DialogTitle>
              <DialogDescription>
                Manage skill assignments and training status for this member
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Mandatory Skills */}
              {skills.filter((s) => s.is_mandatory === true).length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Mandatory</Badge>
                    <h3 className="font-semibold text-foreground">Mandatory Skills</h3>
                  </div>
                  {skills
                    .filter((s) => s.is_mandatory === true)
                    .map((skill) => (
                      <div key={skill.id} className="space-y-2">
                        <Label>{skill.name}</Label>
                        <Select
                          value={skillsForm.mandatory[skill.id] || "yet_to_begin"}
                          onValueChange={(value) =>
                            setSkillsForm({
                              ...skillsForm,
                              mandatory: { ...skillsForm.mandatory, [skill.id]: value },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yet_to_begin">Yet to Begin</SelectItem>
                            <SelectItem value="started_training">Started Training</SelectItem>
                            <SelectItem value="completed_training">Completed Training</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                </div>
              )}

              {/* Optional Skills */}
              {skills.filter((s) => s.is_mandatory !== true).length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Optional</Badge>
                    <h3 className="font-semibold text-foreground">Optional Skills</h3>
                  </div>
                  <div className="space-y-2">
                    <Label>Select One Optional Skill</Label>
                    <Select
                      value={skillsForm.optional}
                      onValueChange={(value) =>
                        setSkillsForm({ ...skillsForm, optional: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an optional skill" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {skills
                          .filter((s) => s.is_mandatory !== true)
                          .map((skill) => (
                            <SelectItem key={skill.id} value={skill.id}>
                              {skill.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Members can only be assigned one optional skill at a time
                    </p>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsManageSkillsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveSkills} disabled={skillsSaving}>
                {skillsSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Skills
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Approve/Edit Member Dialog */}
        <Dialog
          open={isApproveDialogOpen && !!selectedMember}
          onOpenChange={(open) => {
            setIsApproveDialogOpen(open);
            if (!open) setSelectedMember(null);
          }}
        >
          <DialogContent className="glass-card w-[calc(100%-2rem)] max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedMember?.approval_status === "pending" ? "Approve Member" : "Edit Member"}
              </DialogTitle>
              <DialogDescription>
                {selectedMember?.approval_status === "pending"
                  ? "Assign role, sponsor, group, and trainer for this member"
                  : "Update member's role, sponsor, group, and trainer assignment"}
              </DialogDescription>
            </DialogHeader>
            {selectedMember ? (
              <div className="space-y-4 py-4">
                <div className="p-4 rounded-xl bg-accent/30">
                  <p className="font-medium text-foreground">{selectedMember.full_name}</p>
                  <p className="text-sm text-muted-foreground">@{selectedMember.username}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="approve-role">Role *</Label>
                  <Select
                    value={approveForm.role}
                    onValueChange={(value) => setApproveForm({ ...approveForm, role: value })}
                    disabled={!isSuperAdmin && selectedMember && !["member", "pro", "sponsor"].includes(selectedMember.role)}
                  >
                    <SelectTrigger id="approve-role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      {isSuperAdmin && <SelectItem value="trainer">Trainer</SelectItem>}
                      {isSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
                    </SelectContent>
                  </Select>
                  {!isSuperAdmin && selectedMember && !["member", "pro", "sponsor"].includes(selectedMember.role) && (
                    <p className="text-xs text-muted-foreground">
                      Only super admins can change the role for this user.
                    </p>
                  )}
                </div>
                {groups.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="approve-group">Group (Optional)</Label>
                    <Select
                      value={approveForm.group_id}
                      onValueChange={(value) =>
                        setApproveForm({ ...approveForm, group_id: value === "__none__" ? "" : value })
                      }
                    >
                      <SelectTrigger id="approve-group">
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No Group</SelectItem>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {trainers.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="approve-trainer">Trainer (Optional)</Label>
                    <Select
                      value={approveForm.trainer_id}
                      onValueChange={(value) =>
                        setApproveForm({ ...approveForm, trainer_id: value === "__none__" ? "" : value })
                      }
                    >
                      <SelectTrigger id="approve-trainer">
                        <SelectValue placeholder="Select trainer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No Trainer</SelectItem>
                        {trainers.map((trainer) => (
                          <SelectItem key={trainer.id} value={trainer.id}>
                            {trainer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {sponsors.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="approve-sponsor">Sponsor (Optional)</Label>
                    <Select
                      value={approveForm.sponsor_username}
                      onValueChange={(value) =>
                        setApproveForm({ ...approveForm, sponsor_username: value === "__none__" ? "" : value })
                      }
                    >
                      <SelectTrigger id="approve-sponsor">
                        <SelectValue placeholder="Select sponsor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No Sponsor</SelectItem>
                        {sponsors
                          .filter((s) => s.username !== selectedMember?.username)
                          .map((sponsor) => (
                            <SelectItem key={sponsor.username} value={sponsor.username}>
                              @{sponsor.username} - {sponsor.full_name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Select an approved user to be this member's sponsor
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-sm text-muted-foreground">
                No member selected.
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleApprove} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {selectedMember?.approval_status === "pending" ? "Approve" : "Update"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Assign Dialog */}
        <Dialog open={isBulkEditOpen} onOpenChange={(open) => setIsBulkEditOpen(open)}>
          <DialogContent className="glass-card w-[calc(100%-2rem)] max-w-lg">
            <DialogHeader>
              <DialogTitle>Bulk assign</DialogTitle>
              <DialogDescription>
                Apply role/group/trainer/sponsor changes to <span className="font-medium text-foreground">{selectedCount}</span>{" "}
                selected member(s).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={bulkForm.role}
                  onValueChange={(v) => setBulkForm((p) => ({ ...p, role: v }))}
                  disabled={bulkSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No change" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__nochange__">No change</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    {isSuperAdmin && <SelectItem value="trainer">Trainer</SelectItem>}
                    {isSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Group</Label>
                <Select
                  value={bulkForm.group_id}
                  onValueChange={(v) => setBulkForm((p) => ({ ...p, group_id: v }))}
                  disabled={bulkSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No change" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__nochange__">No change</SelectItem>
                    <SelectItem value="__clear__">Clear group</SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Trainer</Label>
                <Select
                  value={bulkForm.trainer_id}
                  onValueChange={(v) => setBulkForm((p) => ({ ...p, trainer_id: v }))}
                  disabled={bulkSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No change" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__nochange__">No change</SelectItem>
                    <SelectItem value="__clear__">Clear trainer</SelectItem>
                    {trainers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sponsor</Label>
                <Select
                  value={bulkForm.sponsor_username}
                  onValueChange={(v) => setBulkForm((p) => ({ ...p, sponsor_username: v }))}
                  disabled={bulkSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No change" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__nochange__">No change</SelectItem>
                    <SelectItem value="__clear__">Clear sponsor</SelectItem>
                    {sponsors.map((s) => (
                      <SelectItem key={s.username} value={s.username}>
                        @{s.username} - {s.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Sponsor usernames are saved in lowercase.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBulkEditOpen(false)} disabled={bulkSaving}>
                Cancel
              </Button>
              <Button onClick={applyBulkChanges} disabled={bulkSaving || selectedCount === 0}>
                {bulkSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Applying...
                  </>
                ) : (
                  "Apply changes"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
