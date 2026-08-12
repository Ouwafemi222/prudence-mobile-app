import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../integrations/supabase/client";
import { useAppTheme } from "../../contexts/ThemeContext";
import { fetchTodoSubmissionData, type TodoLogEntry } from "../../lib/fetchTodoSubmissionData";
import { canVerifySubmission } from "../../lib/submissionRules";
import { notifyUser } from "../../lib/notifyUser";
import type { ActivityComment, ActivityRow, ProfileMini } from "../../lib/activityTypes";
import { DayReportSummary } from "../reports/DayReportSummary";
import { TodoUpdateHistory } from "../todos/TodoUpdateHistory";
import { Button } from "../ui/Button";
import { Textarea } from "../ui/Textarea";
import { KeyboardSafeScroll } from "../ui/KeyboardSafe";

type Props = {
  visible: boolean;
  asScreen?: boolean;
  activity: (Partial<ActivityRow> & { profile?: ProfileMini; submitterIsSuperAdmin?: boolean }) | null;
  onClose: () => void;
  onChanged?: () => void;
};

export function SubmissionReviewDialog({ visible, asScreen, activity, onClose, onChanged }: Props) {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  const { user, userRole, isSuperAdmin, isTrainer, isPro } = useAuth();
  const [plan, setPlan] = useState("");
  const [logs, setLogs] = useState<TodoLogEntry[]>([]);
  const [comments, setComments] = useState<ActivityComment[]>([]);
  const [comment, setComment] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const verifierCanVerify = isSuperAdmin || isTrainer;
  const canVerify = canVerifySubmission({
    verifierCanVerify,
    submitterIsSuperAdmin: Boolean(activity?.submitterIsSuperAdmin),
    verifierUserId: user?.id,
    submitterUserId: activity?.user_id,
    verifierRole: userRole?.role,
  });
  const canComment = isSuperAdmin || isTrainer || isPro || userRole?.role === "sponsor";

  useEffect(() => {
    if (!visible || !activity?.user_id || !activity.activity_date || !activity.id) {
      setPlan("");
      setLogs([]);
      setComments([]);
      setComment("");
      setRejectNote("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const todo = await fetchTodoSubmissionData(activity.user_id!, activity.activity_date!);
        const { data: commentRows } = await supabase
          .from("activity_comments")
          .select("id, activity_id, author_user_id, comment, created_at")
          .eq("activity_id", activity.id)
          .order("created_at", { ascending: true });
        if (cancelled) return;
        setPlan(todo.plan);
        setLogs(todo.logs);
        setComments((commentRows || []) as ActivityComment[]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, activity?.id, activity?.user_id, activity?.activity_date]);

  const postComment = async () => {
    if (!user || !activity?.id || !comment.trim() || !canComment) return;
    setBusy(true);
    try {
      await supabase.from("activity_comments").insert({
        activity_id: activity.id,
        author_user_id: user.id,
        comment: comment.trim(),
      });
      setComment("");
      const { data } = await supabase
        .from("activity_comments")
        .select("id, activity_id, author_user_id, comment, created_at")
        .eq("activity_id", activity.id)
        .order("created_at", { ascending: true });
      setComments((data || []) as ActivityComment[]);
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    if (!user || !activity?.id || !canVerify) return;
    setBusy(true);
    try {
      await supabase
        .from("daily_activities")
        .update({
          is_verified: true,
          verified_by: user.id,
          verified_at: new Date().toISOString(),
          verification_feedback: null,
        })
        .eq("id", activity.id);
      if (activity.user_id) {
        await notifyUser({
          user_id: activity.user_id,
          title: "Submission approved",
          message: `Your report for ${activity.activity_date} was approved.`,
          type: "verification",
          link: "/my-submissions",
          sendEmail: true,
        });
      }
      onChanged?.();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!user || !activity?.id || !canVerify || !rejectNote.trim()) return;
    setBusy(true);
    try {
      await supabase
        .from("daily_activities")
        .update({
          is_verified: false,
          verified_by: user.id,
          verified_at: new Date().toISOString(),
          verification_feedback: rejectNote.trim(),
        })
        .eq("id", activity.id);
      if (activity.user_id) {
        await notifyUser({
          user_id: activity.user_id,
          title: "Submission needs changes",
          message: rejectNote.trim(),
          type: "verification",
          link: "/my-submissions",
          sendEmail: true,
        });
      }
      onChanged?.();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const body = (
    <KeyboardSafeScroll inModal={!asScreen} style={styles.screen} contentContainerStyle={styles.content}>
      {asScreen ? null : <Button title="Close" variant="ghost" onPress={onClose} />}
      <Text style={styles.title}>
        {activity?.profile?.full_name || activity?.profile?.username || "Submission"} · {activity?.activity_date}
      </Text>
      {loading ? <ActivityIndicator color={tokens.colors.primary} /> : null}
      <Text style={styles.label}>Morning plan</Text>
      <Text style={styles.body}>{plan || "—"}</Text>
      <TodoUpdateHistory logs={logs} />
      {activity ? <DayReportSummary activity={activity} /> : null}
      <Text style={styles.label}>Comments</Text>
      {comments.map((item) => (
        <Text key={item.id} style={styles.body}>
          {item.comment}
        </Text>
      ))}
      {canComment ? (
        <>
          <Textarea value={comment} onChangeText={setComment} placeholder="Add a comment" style={{ minHeight: 80 }} />
          <Button title="Post comment" onPress={() => void postComment()} disabled={busy || !comment.trim()} />
        </>
      ) : null}
      {canVerify ? (
        <View style={styles.verify}>
          <Button title="Approve" onPress={() => void approve()} disabled={busy} />
          <Textarea value={rejectNote} onChangeText={setRejectNote} placeholder="Required feedback to reject" style={{ minHeight: 80 }} />
          <Button title="Reject" variant="outline" onPress={() => void reject()} disabled={busy || !rejectNote.trim()} />
        </View>
      ) : (
        <Text style={styles.body}>You can comment, but only trainers and super admins can verify.</Text>
      )}
    </KeyboardSafeScroll>
  );

  if (asScreen) return body;
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {body}
    </Modal>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: tokens.colors.background },
    content: { padding: 18, paddingBottom: 40, gap: 10 },
    title: { fontSize: 18, fontWeight: "800", color: tokens.colors.foreground },
    label: { fontWeight: "800", color: tokens.colors.foreground, marginTop: 8 },
    body: { color: tokens.colors.mutedForeground, fontSize: 14, lineHeight: 20 },
    verify: { gap: 10, marginTop: 8 },
  });
