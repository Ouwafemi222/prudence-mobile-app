import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { notifyUser, toastAfterAction } from "@/lib/notifyUser";
import { toast } from "sonner";
import {
  ActivityComment,
  ActivityRow,
  ProfileMini,
} from "@/lib/activityTypes";
import { DayReportSummary } from "@/components/reports/DayReportSummary";
import { CheckCircle2, Loader2, Send, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { canVerifySubmission, fetchUserIsSuperAdmin } from "@/lib/submissionRules";
import { fetchTodoSubmissionData } from "@/lib/fetchTodoSubmissionData";
import { TodoLogEntry, TodoUpdateHistory } from "@/components/todos/TodoUpdateHistory";

type SubmissionReviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityId: string | null;
  profile?: ProfileMini | null;
  onUpdated?: () => void;
};

export function SubmissionReviewDialog({
  open,
  onOpenChange,
  activityId,
  profile,
  onUpdated,
}: SubmissionReviewDialogProps) {
  const { user, userRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activity, setActivity] = useState<ActivityRow | null>(null);
  const [comments, setComments] = useState<ActivityComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [todoPlan, setTodoPlan] = useState("");
  const [todoLogs, setTodoLogs] = useState<TodoLogEntry[]>([]);
  const [loadingTodoLogs, setLoadingTodoLogs] = useState(false);
  const [rejectionFeedback, setRejectionFeedback] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [submitterIsSuperAdmin, setSubmitterIsSuperAdmin] = useState(false);
  const loadGen = useRef(0);
  const commentsFetchGen = useRef(0);

  const canComment = useMemo(() => {
    if (!userRole?.role) return false;
    if (userRole.role === "pro") return true;
    return ["super_admin", "trainer", "sponsor"].includes(userRole.role);
  }, [userRole?.role]);

  const canVerify = useMemo(() => {
    if (!userRole?.role) return false;
    return userRole.role === "super_admin" || userRole.role === "trainer";
  }, [userRole?.role]);

  const canVerifyThisSubmission = useMemo(
    () =>
      canVerifySubmission({
        verifierCanVerify: canVerify,
        submitterIsSuperAdmin,
        verifierUserId: user?.id,
        submitterUserId: activity?.user_id,
        verifierRole: userRole?.role,
      }),
    [canVerify, submitterIsSuperAdmin, user?.id, activity?.user_id, userRole?.role],
  );

  const isOwnSubmission =
    Boolean(user?.id && activity?.user_id && user.id === activity.user_id);

  const loadActivity = async (id: string) => {
    const gen = ++loadGen.current;
    setLoading(true);
    setTodoPlan("");
    setTodoLogs([]);
    setLoadingTodoLogs(true);
    try {
      const { data, error } = await supabase.from("daily_activities").select("*").eq("id", id).single();
      if (error) throw error;
      const row = data as ActivityRow;

      const [isSuper, todoData] = await Promise.all([
        fetchUserIsSuperAdmin(row.user_id),
        fetchTodoSubmissionData(row.user_id, row.activity_date),
      ]);

      if (gen !== loadGen.current) return;

      setActivity(row);
      setRejectionFeedback("");
      setSubmitterIsSuperAdmin(isSuper);
      setTodoPlan(todoData.plan);
      setTodoLogs(todoData.logs);
    } catch (e: unknown) {
      if (gen !== loadGen.current) return;
      toast.error(e instanceof Error ? e.message : "Failed to load submission");
      onOpenChange(false);
    } finally {
      if (gen === loadGen.current) {
        setLoading(false);
        setLoadingTodoLogs(false);
      }
    }
  };

  const fetchComments = async (id: string) => {
    const gen = ++commentsFetchGen.current;
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from("activity_comments")
        .select("*")
        .eq("activity_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (gen !== commentsFetchGen.current) return;
      const rows = (data || []) as ActivityComment[];
      const authorIds = Array.from(new Set(rows.map((c) => c.author_user_id)));
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name, username, avatar_url")
        .in("user_id", authorIds);
      if (gen !== commentsFetchGen.current) return;
      const profileByUserId = new Map<string, ProfileMini>();
      (profilesData || []).forEach((p) => profileByUserId.set(p.user_id, p as ProfileMini));
      setComments(rows.map((c) => ({ ...c, authorProfile: profileByUserId.get(c.author_user_id) })));
    } catch (e: unknown) {
      if (gen !== commentsFetchGen.current) return;
      console.error(e);
    } finally {
      if (gen === commentsFetchGen.current) {
        setLoadingComments(false);
      }
    }
  };

  useEffect(() => {
    if (!open || !activityId) {
      loadGen.current += 1;
      commentsFetchGen.current += 1;
      setActivity(null);
      setComments([]);
      setNewComment("");
      setTodoPlan("");
      setTodoLogs([]);
      setLoading(false);
      setLoadingComments(false);
      setLoadingTodoLogs(false);
      return;
    }

    setActivity(null);
    setComments([]);
    setTodoPlan("");
    setTodoLogs([]);
    setLoadingComments(true);
    setLoadingTodoLogs(true);
    loadActivity(activityId);
    fetchComments(activityId);
  }, [open, activityId]);

  const displayName = profile?.full_name || "Unknown User";
  const displayUsername = profile?.username || "unknown";

  const postComment = async () => {
    if (!user || !activity) return;
    const text = newComment.trim();
    if (!text) return;
    setPostingComment(true);
    try {
      const { error } = await supabase.from("activity_comments").insert({
        activity_id: activity.id,
        author_user_id: user.id,
        comment: text,
      });
      if (error) throw error;
      setNewComment("");
      await fetchComments(activity.id);
      toast.success("Comment posted");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to post comment");
    } finally {
      setPostingComment(false);
    }
  };

  const handleApprove = async () => {
    if (!user || !activity) return;
    if (
      !canVerifySubmission({
        verifierCanVerify: canVerify,
        submitterIsSuperAdmin,
        verifierUserId: user.id,
        submitterUserId: activity.user_id,
        verifierRole: userRole?.role,
      })
    ) {
      toast.error("You cannot approve or reject this submission");
      return;
    }
    setIsVerifying(true);
    try {
      const { error } = await supabase
        .from("daily_activities")
        .update({
          is_verified: true,
          verified_by: user.id,
          verified_at: new Date().toISOString(),
          verification_feedback: null,
        })
        .eq("id", activity.id);
      if (error) throw error;
      const notifyResult = await notifyUser({
        user_id: activity.user_id,
        title: "Submission Approved",
        message: `Your daily activity submission for ${activity.activity_date} has been approved.`,
        type: "verification",
        link: "/my-submissions",
        email_subject: "Daily submission approved — THE PRUDENCE",
        ctaLabel: "View submissions",
        sendEmail: true,
      });
      toastAfterAction("Submission approved", notifyResult, { expectedEmail: true });
      onUpdated?.();
      onOpenChange(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to approve");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReject = async () => {
    if (!user || !activity) return;
    if (
      !canVerifySubmission({
        verifierCanVerify: canVerify,
        submitterIsSuperAdmin,
        verifierUserId: user.id,
        submitterUserId: activity.user_id,
        verifierRole: userRole?.role,
      })
    ) {
      toast.error("You cannot approve or reject this submission");
      return;
    }
    if (!rejectionFeedback.trim()) {
      toast.error("Please provide feedback for rejection");
      return;
    }
    setIsVerifying(true);
    try {
      const { error } = await supabase
        .from("daily_activities")
        .update({
          is_verified: false,
          verified_by: user.id,
          verified_at: new Date().toISOString(),
          verification_feedback: rejectionFeedback.trim(),
        })
        .eq("id", activity.id);
      if (error) throw error;
      const notifyResult = await notifyUser({
        user_id: activity.user_id,
        title: "Submission Needs Revision",
        message: `Your daily activity for ${activity.activity_date} was not approved. Feedback: ${rejectionFeedback.trim()}`,
        type: "verification",
        link: "/daily-activity",
        email_subject: "Daily submission feedback — THE PRUDENCE",
        ctaLabel: "Update submission",
        sendEmail: true,
      });
      toastAfterAction("Submission rejected", notifyResult, { expectedEmail: true });
      onUpdated?.();
      onOpenChange(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to reject");
    } finally {
      setIsVerifying(false);
    }
  };

  const isPending =
    activity && !activity.is_verified && activity.verified_at === null && activity.submitted_at;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card w-[calc(100%-2rem)] max-w-[95vw] sm:max-w-3xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent-foreground text-primary-foreground">
                {displayName
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate">{displayName}</p>
              <p className="text-sm font-normal text-muted-foreground truncate">
                @{displayUsername} • {activity?.activity_date || "—"}
              </p>
            </div>
          </DialogTitle>
          <DialogDescription>Submission review</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : activity ? (
          <div className="space-y-5 mt-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={activity.is_verified ? "default" : activity.submitted_at ? "secondary" : "outline"}>
                {activity.is_verified ? "Approved" : activity.verified_at ? "Rejected" : activity.submitted_at ? "Pending" : "Not submitted"}
              </Badge>
              {(activity.submission_tags || []).map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-accent/30 space-y-4" key={activity.id}>
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">Morning Todo (Latest)</p>
                {loadingTodoLogs ? (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading todo…
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {todoPlan || "No plan saved for this date."}
                  </p>
                )}
              </div>
              <TodoUpdateHistory
                logs={todoLogs}
                loading={loadingTodoLogs}
                emptyMessage="No todo versions logged for this date."
              />
            </div>

            <DayReportSummary activity={activity} />

            {activity.verification_feedback && (
              <div className="p-3 rounded-xl bg-destructive/10 text-sm text-destructive">
                <span className="font-medium">Rejection feedback: </span>
                {activity.verification_feedback}
              </div>
            )}

            <div className="space-y-3">
              <p className="text-sm font-semibold">Comments</p>
              {loadingComments ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No comments yet.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {comments.map((c) => (
                    <div key={c.id} className="p-3 rounded-xl bg-accent/30 text-sm">
                      <p className="font-medium">
                        {c.authorProfile?.full_name || "Unknown"}{" "}
                        <span className="text-xs text-muted-foreground">@{c.authorProfile?.username}</span>
                      </p>
                      <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{c.comment}</p>
                    </div>
                  ))}
                </div>
              )}
              {canComment && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={2}
                  />
                  <Button size="sm" onClick={postComment} disabled={postingComment || !newComment.trim()}>
                    {postingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Post
                  </Button>
                </div>
              )}
            </div>

            {canVerify && submitterIsSuperAdmin && isPending && (
              <p className="text-sm text-muted-foreground pt-3 border-t">
                Submissions from super admins cannot be approved or rejected here.
              </p>
            )}
            {canVerify && isOwnSubmission && userRole?.role === "trainer" && isPending && !submitterIsSuperAdmin && (
              <p className="text-sm text-muted-foreground pt-3 border-t">
                You cannot approve or reject your own submission. A super admin must review it.
              </p>
            )}
            {canVerifyThisSubmission && isPending && (
              <div className="space-y-3 pt-3 border-t">
                <Textarea
                  placeholder="Rejection feedback (required if rejecting)..."
                  value={rejectionFeedback}
                  onChange={(e) => setRejectionFeedback(e.target.value)}
                  className="min-h-[80px]"
                />
                <div className="flex flex-col sm:flex-row gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={handleReject}
                    disabled={isVerifying || !rejectionFeedback.trim()}
                    className="text-destructive w-full sm:w-auto"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                  <Button onClick={handleApprove} disabled={isVerifying} className="w-full sm:w-auto">
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {activity && (
            <Button variant="secondary" asChild className="w-full sm:w-auto">
              <Link
                to={`/submissions?userId=${activity.user_id}&dateMode=date&date=${activity.activity_date}`}
                onClick={() => onOpenChange(false)}
              >
                Open in Submissions
              </Link>
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
