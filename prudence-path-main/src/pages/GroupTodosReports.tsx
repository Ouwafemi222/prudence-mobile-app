import { useState, useEffect, useMemo } from "react";
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
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Calendar,
  FileText,
  Users,
  Loader2,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { scopeToUserOffice } from "@/lib/tenantScope";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatISODateInNigeria, formatLongDateInNigeria } from "@/lib/nigeriaTime";
import { Calendar as DayPickerCalendar } from "@/components/ui/calendar";
import { SubmissionReviewDialog } from "@/components/submissions/SubmissionReviewDialog";

interface Group {
  id: string;
  name: string;
  trainer_ids: string[] | null;
}

interface Member {
  user_id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  assigned_group_id: string | null;
}

interface Todo {
  id: string;
  user_id: string;
  todo_date: string;
  plan: string;
  created_at: string;
  updated_at: string;
}

interface Activity {
  id: string;
  user_id: string;
  activity_date: string;
  submitted_at: string | null;
  is_verified: boolean | null;
}

type TodoWithMember = Todo & { member: Member };
type ActivityWithMember = Activity & { member: Member };

export default function GroupTodosReports() {
  const { user, userRole, isAdmin, isTrainer, isPro, officeId, isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(formatISODateInNigeria());
  const [members, setMembers] = useState<Member[]>([]);
  const [todos, setTodos] = useState<TodoWithMember[]>([]);
  const [activities, setActivities] = useState<ActivityWithMember[]>([]);
  const [selectedTodo, setSelectedTodo] = useState<TodoWithMember | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewActivityId, setReviewActivityId] = useState<string | null>(null);
  const [reviewProfile, setReviewProfile] = useState<{
    user_id: string;
    full_name: string;
    username: string;
  } | null>(null);

  useEffect(() => {
    if (!user || !userRole) {
      setLoading(false);
      return;
    }

    // Check permissions
    if (!isAdmin && !isTrainer && !isPro) {
      setLoading(false);
      return;
    }

    fetchGroups();
  }, [user, userRole, isAdmin, isTrainer, isPro]);

  useEffect(() => {
    if (selectedGroupId) {
      fetchGroupData();
    }
  }, [selectedGroupId, selectedDate]);

  const fetchGroups = async () => {
    try {
      let query = supabase.from("groups").select("id, name, trainer_ids").order("name");
      query = scopeToUserOffice(query, officeId, isSuperAdmin);

      // Pros can only see their own group
      if (isPro && !isAdmin && !isTrainer) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("assigned_group_id")
          .eq("user_id", user?.id)
          .single();

        if (profile?.assigned_group_id) {
          query = query.eq("id", profile.assigned_group_id);
        } else {
          setGroups([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      setGroups(data || []);

      if (data && data.length > 0 && !selectedGroupId) {
        setSelectedGroupId(isAdmin ? "all" : data[0].id);
      }
    } catch (error: any) {
      console.error("Error fetching groups:", error);
      toast.error("Failed to load groups", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupData = async () => {
    if (!selectedGroupId) return;

    setLoading(true);
    try {
      let profilesQuery = supabase
        .from("profiles")
        .select("user_id, full_name, username, avatar_url, assigned_group_id")
        .eq("approval_status", "approved");
      profilesQuery = scopeToUserOffice(profilesQuery, officeId, isSuperAdmin);
      const { data: allProfilesData, error: profilesError } = await profilesQuery;

      if (profilesError) throw profilesError;

      const viewAllGroups = selectedGroupId === "all";

      let groupMembers: Member[] = (allProfilesData || []) as Member[];

      // "All groups" = every approved member (grouped and ungrouped).
      if (!viewAllGroups) {
        const { data: groupData } = await supabase
          .from("groups")
          .select("trainer_ids")
          .eq("id", selectedGroupId)
          .single();

        const trainerIds = (groupData?.trainer_ids as string[] | null) || [];
        const memberIds = new Set<string>();

        groupMembers.forEach((profile) => {
          if (profile.assigned_group_id === selectedGroupId) {
            memberIds.add(profile.user_id);
          }
        });

        trainerIds.forEach((trainerId) => memberIds.add(trainerId));

        groupMembers = groupMembers.filter((p) => memberIds.has(p.user_id));
      }

      const memberIdsArray = groupMembers.map((m) => m.user_id);
      setMembers(groupMembers);

      if (memberIdsArray.length === 0) {
        setTodos([]);
        setActivities([]);
        return;
      }

      const { data: todosData, error: todosError } = await supabase
        .from("daily_todos")
        .select("*")
        .eq("todo_date", selectedDate)
        .in("user_id", memberIdsArray)
        .order("created_at", { ascending: false });

      if (todosError) throw todosError;

      const { data: activitiesData, error: activitiesError } = await supabase
        .from("daily_activities")
        .select("id, user_id, activity_date, submitted_at, is_verified")
        .eq("activity_date", selectedDate)
        .in("user_id", memberIdsArray)
        .order("submitted_at", { ascending: false });

      if (activitiesError) throw activitiesError;

      const filteredTodos = todosData || [];
      const filteredActivities = activitiesData || [];

      // Combine with member data
      const memberMap = new Map(groupMembers.map((m) => [m.user_id, m]));
      const todosWithMembers = filteredTodos.map((todo) => ({
        ...todo,
        member: memberMap.get(todo.user_id) || ({
          user_id: todo.user_id,
          full_name: "Unknown User",
          username: "unknown",
          avatar_url: null,
          assigned_group_id: null,
        } as Member),
      }));
      const activitiesWithMembers = filteredActivities.map((activity) => ({
        ...activity,
        member: memberMap.get(activity.user_id) || ({
          user_id: activity.user_id,
          full_name: "Unknown User",
          username: "unknown",
          avatar_url: null,
          assigned_group_id: null,
        } as Member),
      }));

      setTodos(todosWithMembers);
      setActivities(activitiesWithMembers);
    } catch (error: any) {
      console.error("Error fetching group data:", error);
      toast.error("Failed to load group data", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const selectedGroup = useMemo(() => {
    if (selectedGroupId === "all") return { id: "all", name: "All groups", trainer_ids: null };
    return groups.find((g) => g.id === selectedGroupId);
  }, [groups, selectedGroupId]);

  const setSelectedDateFromCalendar = (d: Date | undefined) => {
    if (!d) return;
    setSelectedDate(formatISODateInNigeria(d));
  };

  if (loading && !selectedGroupId) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin && !isTrainer && !isPro) {
    return (
      <AppLayout>
        <GlassCard>
          <GlassCardContent className="py-12 text-center">
            <p className="text-muted-foreground">You don't have permission to access this page.</p>
          </GlassCardContent>
        </GlassCard>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Group Todos & Reports</h1>
            <p className="text-muted-foreground mt-1">
              View todos and daily reports submitted by group members
            </p>
          </div>
        </div>

        {/* Filters */}
        <GlassCard>
          <GlassCardContent className="py-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {isAdmin && (
                <div className="space-y-2 flex-1">
                  <label className="text-sm font-medium">Select Group</label>
                  <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All groups</SelectItem>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {!isAdmin && selectedGroup && (
                <div className="space-y-2 flex-1">
                  <label className="text-sm font-medium">Group</label>
                  <Input value={selectedGroup.name} disabled />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full sm:w-[200px]"
                />
              </div>
              <div className="hidden lg:block rounded-xl border border-border/50 bg-background/40 p-2">
                <DayPickerCalendar
                  mode="single"
                  selected={new Date(`${selectedDate}T12:00:00`)}
                  onSelect={setSelectedDateFromCalendar}
                />
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>

        {selectedGroupId && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <GlassCard>
                <GlassCardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Members</p>
                      <p className="text-2xl font-bold">{members.length}</p>
                    </div>
                    <Users className="h-8 w-8 text-primary opacity-50" />
                  </div>
                </GlassCardContent>
              </GlassCard>
              <GlassCard>
                <GlassCardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Todos Submitted</p>
                      <p className="text-2xl font-bold">{todos.length}</p>
                    </div>
                    <FileText className="h-8 w-8 text-primary opacity-50" />
                  </div>
                </GlassCardContent>
              </GlassCard>
              <GlassCard>
                <GlassCardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Reports Submitted</p>
                      <p className="text-2xl font-bold">{activities.length}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-primary opacity-50" />
                  </div>
                </GlassCardContent>
              </GlassCard>
            </div>

            {/* Todos List */}
            <GlassCard>
              <GlassCardHeader>
                <GlassCardTitle>Morning Todos - {formatLongDateInNigeria(new Date(`${selectedDate}T12:00:00`))}</GlassCardTitle>
                <GlassCardDescription>
                  Todos submitted for this date (all approved members when viewing all groups)
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                {todos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No todos submitted for this date.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todos.map((todo) => (
                      <div
                        key={todo.id}
                        onClick={() => setSelectedTodo(todo)}
                        className="flex items-center justify-between p-4 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <Avatar>
                            <AvatarFallback className="bg-gradient-to-br from-primary to-accent-foreground text-primary-foreground">
                              {todo.member?.full_name
                                ?.split(" ")
                                .filter(Boolean)
                                .slice(0, 2)
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {todo.member?.full_name || "Unknown User"}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              @{todo.member?.username || "unknown"}
                            </p>
                          </div>
                        </div>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                )}
              </GlassCardContent>
            </GlassCard>

            {/* Activities List */}
            <GlassCard>
              <GlassCardHeader>
                <GlassCardTitle>Daily Reports - {formatLongDateInNigeria(new Date(`${selectedDate}T12:00:00`))}</GlassCardTitle>
                <GlassCardDescription>
                  Daily activity reports submitted by group members
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                {activities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No reports submitted for this date.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activities.map((activity) => {
                      const status = activity.is_verified
                        ? "Approved"
                        : activity.submitted_at
                        ? "Pending"
                        : "Not Submitted";
                      const statusVariant = activity.is_verified
                        ? "default"
                        : activity.submitted_at
                        ? "secondary"
                        : "outline";

                      return (
                        <div
                          key={activity.id}
                          onClick={() => {
                          setReviewActivityId(activity.id);
                          setReviewProfile({
                            user_id: activity.user_id,
                            full_name: activity.member?.full_name || "Unknown",
                            username: activity.member?.username || "unknown",
                          });
                          setReviewOpen(true);
                        }}
                          className="flex items-center justify-between p-4 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <Avatar>
                              <AvatarFallback className="bg-gradient-to-br from-primary to-accent-foreground text-primary-foreground">
                                {activity.member?.full_name
                                  ?.split(" ")
                                  .filter(Boolean)
                                  .slice(0, 2)
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate">
                                {activity.member?.full_name || "Unknown User"}
                              </p>
                              <p className="text-sm text-muted-foreground truncate">
                                @{activity.member?.username || "unknown"} •{" "}
                                {activity.submitted_at
                                  ? new Date(activity.submitted_at).toLocaleTimeString()
                                  : "Not submitted"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant={statusVariant as any}>{status}</Badge>
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </GlassCardContent>
            </GlassCard>
          </>
        )}

        {/* Todo Detail Dialog */}
        <Dialog open={!!selectedTodo} onOpenChange={() => setSelectedTodo(null)}>
          <DialogContent className="glass-card w-[calc(100%-2rem)] max-w-2xl max-h-[85dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedTodo?.member?.full_name || "Unknown User"}'s Todo
              </DialogTitle>
              <DialogDescription>
                {formatLongDateInNigeria(new Date(`${selectedTodo?.todo_date}T12:00:00`))}
              </DialogDescription>
            </DialogHeader>
            {selectedTodo && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-accent/20 border border-border/50">
                  <p className="text-sm font-semibold text-foreground mb-2">Morning Plan</p>
                  <Textarea
                    value={selectedTodo.plan}
                    readOnly
                    className="min-h-[200px] bg-background/40 whitespace-pre-wrap"
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Last updated: {new Date(selectedTodo.updated_at).toLocaleString()}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedTodo(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <SubmissionReviewDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          activityId={reviewActivityId}
          profile={reviewProfile}
          onUpdated={() => {
            if (selectedGroupId) fetchGroupData();
          }}
        />

      </div>
    </AppLayout>
  );
}
