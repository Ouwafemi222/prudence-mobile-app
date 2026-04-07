import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../integrations/supabase/client";
import { formatISODateInNigeria } from "../lib/nigeriaTime";
import { tokens } from "../theme/tokens";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";

type ActivityRow = {
  id: string;
  activity_date: string;
  is_verified: boolean | null;
  verified_at: string | null;
  verification_feedback: string | null;
  pages_read: number | null;
  net_income: number | null;
  gigs_created: number | null;
  daily_contacts: number | null;
  submitted_at: string | null;
};

export function MySubmissionsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [todoPlan, setTodoPlan] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("daily_activities")
        .select(
          "id, activity_date, is_verified, verified_at, verification_feedback, pages_read, net_income, gigs_created, daily_contacts, submitted_at",
        )
        .eq("user_id", user.id)
        .order("activity_date", { ascending: false })
        .limit(120);
      if (error) throw error;
      const rows = (data || []) as ActivityRow[];
      setActivities(rows);
      setSelectedId((prev) => prev && rows.some((r) => r.id === prev) ? prev : rows[0]?.id ?? null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = useMemo(() => activities.find((a) => a.id === selectedId) ?? null, [activities, selectedId]);

  useEffect(() => {
    if (!user || !selected) {
      setTodoPlan("");
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("daily_todos")
        .select("plan")
        .eq("user_id", user.id)
        .eq("todo_date", selected.activity_date)
        .maybeSingle();
      setTodoPlan(((data as { plan?: string } | null)?.plan || "").trim());
    })();
  }, [user, selected?.activity_date]);

  const statusLabel = (a: ActivityRow) => {
    if (a.is_verified) return "approved";
    if (!a.is_verified && a.verified_at) return "rejected";
    return "pending";
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Sign in to view submissions.</Text>
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

  return (
    <View style={styles.root}>
      <Text style={styles.intro}>Your daily reports and the morning plan for each day.</Text>
      <View style={styles.split}>
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.muted}>No submissions yet.</Text>}
          renderItem={({ item }) => {
            const st = statusLabel(item);
            return (
              <Pressable
                onPress={() => setSelectedId(item.id)}
                style={[styles.listRow, selectedId === item.id && styles.listRowOn]}
              >
                <Text style={styles.listDate}>{item.activity_date}</Text>
                <Badge
                  variant={st === "approved" ? "success" : st === "rejected" ? "destructive" : "warning"}
                >
                  {st}
                </Badge>
              </Pressable>
            );
          }}
        />
        <ScrollView style={styles.detail} contentContainerStyle={styles.detailContent}>
          {!selected ? (
            <Text style={styles.muted}>Select a date from the list.</Text>
          ) : (
            <Card style={styles.detailCard}>
              <Text style={styles.detailTitle}>{selected.activity_date}</Text>
              <View style={styles.row}>
                <Text style={styles.muted}>Status</Text>
                <Badge
                  variant={
                    statusLabel(selected) === "approved"
                      ? "success"
                      : statusLabel(selected) === "rejected"
                        ? "destructive"
                        : "warning"
                  }
                >
                  {statusLabel(selected)}
                </Badge>
              </View>
              {selected.verification_feedback ? (
                <View style={styles.feedbackBox}>
                  <Text style={styles.feedbackLabel}>Verifier feedback</Text>
                  <Text style={styles.body}>{selected.verification_feedback}</Text>
                </View>
              ) : null}
              <Text style={styles.sectionLabel}>Morning plan</Text>
              <Text style={styles.body}>{todoPlan || "—"}</Text>
              <Text style={styles.sectionLabel}>Activity snapshot</Text>
              <Text style={styles.body}>
                Pages: {selected.pages_read ?? 0} · Gigs: {selected.gigs_created ?? 0} · Net: $
                {Number(selected.net_income ?? 0).toFixed(0)} · Contacts: {selected.daily_contacts ?? 0}
              </Text>
              <Text style={styles.hint}>Open the Work tab to edit today’s report. Full field history is on the website.</Text>
            </Card>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: tokens.colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  intro: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8, fontSize: 14, color: tokens.colors.mutedForeground },
  split: { flex: 1, flexDirection: "column" },
  list: { maxHeight: 200, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tokens.colors.border },
  listContent: { paddingHorizontal: 18, paddingBottom: 8, gap: 6 },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.card,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  listRowOn: { borderColor: tokens.colors.primary, backgroundColor: tokens.colors.accent },
  listDate: { fontWeight: "700", color: tokens.colors.foreground },
  detail: { flex: 1 },
  detailContent: { padding: 18, paddingBottom: 32 },
  detailCard: { padding: 14, gap: 10 },
  detailTitle: { fontSize: 20, fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionLabel: { fontWeight: "800", marginTop: 8, color: tokens.colors.foreground },
  body: { fontSize: 14, color: tokens.colors.mutedForeground, lineHeight: 22 },
  muted: { fontSize: 14, color: tokens.colors.mutedForeground },
  feedbackBox: {
    padding: 10,
    borderRadius: tokens.radius.md,
    backgroundColor: "rgba(220, 38, 38, 0.08)",
    borderLeftWidth: 3,
    borderLeftColor: tokens.colors.destructive,
  },
  feedbackLabel: { fontWeight: "800", marginBottom: 4, color: tokens.colors.destructive },
  hint: { fontSize: 12, color: tokens.colors.muted, marginTop: 8 },
});
