import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../integrations/supabase/client";
import { tokens } from "../theme/tokens";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Textarea } from "../components/ui/Textarea";

type ActivityRow = {
  id: string;
  user_id: string;
  activity_date: string;
  is_verified: boolean | null;
  verified_at: string | null;
  verification_feedback: string | null;
  pages_read: number | null;
  net_income: number | null;
  submitted_at: string | null;
};

type ProfileMini = { user_id: string; full_name: string | null; username: string | null };

function canAccess(role: string | undefined) {
  return role === "super_admin" || role === "trainer" || role === "pro" || role === "sponsor";
}

export function SubmissionsReviewScreen() {
  const { user, userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<(ActivityRow & { profile?: ProfileMini })[]>([]);
  const [selected, setSelected] = useState<(ActivityRow & { profile?: ProfileMini }) | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [comment, setComment] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [todoPlan, setTodoPlan] = useState("");

  const canVerify = userRole?.role === "super_admin" || userRole?.role === "trainer";
  const canComment =
    userRole?.role === "pro" || userRole?.role === "super_admin" || userRole?.role === "trainer";

  const load = useCallback(async () => {
    if (!user || !canAccess(userRole?.role)) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("daily_activities")
        .select("id, user_id, activity_date, is_verified, verified_at, verification_feedback, pages_read, net_income, submitted_at")
        .order("submitted_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const rows = (data || []) as ActivityRow[];
      const userIds = [...new Set(rows.map((r) => r.user_id))];
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, username")
        .in("user_id", userIds);
      const map = new Map<string, ProfileMini>();
      (profs || []).forEach((p: any) => map.set(p.user_id, p));
      setActivities(rows.map((r) => ({ ...r, profile: map.get(r.user_id) })));
    } catch (e) {
      console.error(e);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, userRole?.role]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    if (filter === "all") return activities;
    return activities.filter((a) => {
      if (a.is_verified) return false;
      if (!a.is_verified && a.verified_at) return false;
      return true;
    });
  }, [activities, filter]);

  const openOne = async (a: ActivityRow & { profile?: ProfileMini }) => {
    setSelected(a);
    setComment("");
    setRejectNote("");
    setTodoPlan("");
    const { data } = await supabase
      .from("daily_todos")
      .select("plan")
      .eq("user_id", a.user_id)
      .eq("todo_date", a.activity_date)
      .maybeSingle();
    setTodoPlan(((data as { plan?: string } | null)?.plan || "").trim());
  };

  const postComment = async () => {
    if (!user || !selected || !comment.trim() || !canComment) return;
    setBusy(true);
    try {
      await supabase.from("activity_comments").insert({
        activity_id: selected.id,
        author_user_id: user.id,
        comment: comment.trim(),
      });
      setComment("");
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    if (!user || !selected || !canVerify) return;
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
        .eq("id", selected.id);
      setSelected(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!user || !selected || !canVerify || !rejectNote.trim()) return;
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
        .eq("id", selected.id);
      setSelected(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (!canAccess(userRole?.role)) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>You do not have access to submissions review.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={tokens.colors.primary} />
      </View>
    );
  }

  if (selected) {
    return (
      <ScrollView contentContainerStyle={styles.detailWrap} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => setSelected(null)} style={styles.backLink}>
          <Text style={styles.backLinkText}>← Back to list</Text>
        </Pressable>
        <Card style={styles.card}>
          <Text style={styles.h2}>
            {selected.profile?.full_name || selected.profile?.username} · {selected.activity_date}
          </Text>
          <Text style={styles.body}>
            Pages {selected.pages_read ?? 0} · Net ${Number(selected.net_income ?? 0).toFixed(0)}
          </Text>
          <Text style={styles.label}>Morning plan</Text>
          <Text style={styles.body}>{todoPlan || "—"}</Text>
          {selected.verification_feedback ? (
            <Text style={styles.reject}>Feedback: {selected.verification_feedback}</Text>
          ) : null}
        </Card>
        {canComment ? (
          <Card style={styles.card}>
            <Text style={styles.label}>Add comment</Text>
            <Textarea value={comment} onChangeText={setComment} placeholder="Comment for the member…" style={{ minHeight: 80 }} />
            <Button title="Post comment" onPress={postComment} disabled={busy || !comment.trim()} />
          </Card>
        ) : null}
        {canVerify ? (
          <Card style={styles.card}>
            <Text style={styles.label}>Verify (trainers / super admins)</Text>
            <View style={styles.row}>
              <Button title="Approve" onPress={approve} disabled={busy} />
            </View>
            <Text style={styles.label}>Reject with feedback</Text>
            <Textarea value={rejectNote} onChangeText={setRejectNote} placeholder="Required for rejection…" style={{ minHeight: 80 }} />
            <Button title="Reject" variant="outline" onPress={reject} disabled={busy || !rejectNote.trim()} />
          </Card>
        ) : null}
      </ScrollView>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.toggleRow}>
        <Pressable onPress={() => setFilter("pending")} style={[styles.toggle, filter === "pending" && styles.toggleOn]}>
          <Text style={[styles.toggleText, filter === "pending" && styles.toggleTextOn]}>Pending</Text>
        </Pressable>
        <Pressable onPress={() => setFilter("all")} style={[styles.toggle, filter === "all" && styles.toggleOn]}>
          <Text style={[styles.toggleText, filter === "all" && styles.toggleTextOn]}>All</Text>
        </Pressable>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.muted}>No items in this filter.</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => openOne(item)}>
            <Card style={styles.listCard}>
              <Text style={styles.name}>{item.profile?.full_name || item.profile?.username || item.user_id}</Text>
              <Text style={styles.sub}>
                {item.activity_date} · ${Number(item.net_income ?? 0).toFixed(0)} net
              </Text>
              <Badge variant={item.is_verified ? "success" : item.verified_at ? "destructive" : "warning"}>
                {item.is_verified ? "verified" : item.verified_at ? "rejected" : "pending"}
              </Badge>
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: tokens.colors.background },
  centered: { flex: 1, justifyContent: "center", padding: 24 },
  toggleRow: { flexDirection: "row", gap: 8, padding: 18, paddingBottom: 8 },
  toggle: { flex: 1, paddingVertical: 10, borderRadius: tokens.radius.md, borderWidth: 1, borderColor: tokens.colors.border, alignItems: "center" },
  toggleOn: { backgroundColor: tokens.colors.primary, borderColor: tokens.colors.primary },
  toggleText: { fontWeight: "700", color: tokens.colors.mutedForeground },
  toggleTextOn: { color: tokens.colors.primaryForeground },
  list: { paddingHorizontal: 18, paddingBottom: 32, gap: 10 },
  listCard: { padding: 14, gap: 6 },
  name: { fontWeight: "800", fontSize: 16 },
  sub: { fontSize: 13, color: tokens.colors.mutedForeground },
  detailWrap: { padding: 18, paddingBottom: 40, gap: 14 },
  backLink: { marginBottom: 4 },
  backLinkText: { fontWeight: "800", color: tokens.colors.primary },
  card: { padding: 14, gap: 10 },
  h2: { fontSize: 18, fontWeight: "800" },
  body: { fontSize: 14, color: tokens.colors.mutedForeground },
  label: { fontWeight: "800", marginTop: 4 },
  reject: { color: tokens.colors.destructive, marginTop: 8 },
  row: { flexDirection: "row", gap: 10 },
  muted: { textAlign: "center", marginTop: 24, color: tokens.colors.mutedForeground },
});
