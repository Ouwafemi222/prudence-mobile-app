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
import { addDaysISODate, formatISODateInNigeria } from "../lib/nigeriaTime";
import { useAppTheme } from "../contexts/ThemeContext";
import type { ActivityRow } from "../lib/activityTypes";
import { fetchTodoSubmissionData, type TodoLogEntry } from "../lib/fetchTodoSubmissionData";
import { DayReportSummary } from "../components/reports/DayReportSummary";
import { TodoUpdateHistory } from "../components/todos/TodoUpdateHistory";
import { Card } from "../components/ui/Card";
import { KeyboardSafeView } from "../components/ui/KeyboardSafe";
import { FAST_LIST } from "../lib/listPerf";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";

function statusLabel(a: Pick<ActivityRow, "is_verified" | "verified_at">) {
  if (a.is_verified) return "approved";
  if (!a.is_verified && a.verified_at) return "rejected";
  return "pending";
}

export function MySubmissionsScreen() {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  const { user } = useAuth();
  const today = formatISODateInNigeria();
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(addDaysISODate(today, -30));
  const [toDate, setToDate] = useState(today);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [plan, setPlan] = useState("");
  const [logs, setLogs] = useState<TodoLogEntry[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("daily_activities")
        .select("*")
        .eq("user_id", user.id)
        .gte("activity_date", fromDate)
        .lte("activity_date", toDate)
        .order("activity_date", { ascending: false })
        .limit(180);
      if (error) throw error;
      const rows = (data || []) as ActivityRow[];
      setActivities(rows);
      setSelectedId((prev) => (prev && rows.some((r) => r.id === prev) ? prev : rows[0]?.id ?? null));
    } finally {
      setLoading(false);
    }
  }, [user?.id, fromDate, toDate]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const selected = useMemo(() => activities.find((a) => a.id === selectedId) ?? null, [activities, selectedId]);

  useFocusEffect(
    useCallback(() => {
      if (!user || !selected) {
        setPlan("");
        setLogs([]);
        return;
      }
      void fetchTodoSubmissionData(user.id, selected.activity_date).then((todo) => {
        setPlan(todo.plan);
        setLogs(todo.logs);
      });
    }, [user?.id, selected?.id, selected?.activity_date]),
  );

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Sign in to view submissions.</Text>
      </View>
    );
  }

  return (
    <KeyboardSafeView style={styles.root}>
      <View style={styles.filters}>
        <Input value={fromDate} onChangeText={setFromDate} placeholder="From YYYY-MM-DD" />
        <Input value={toDate} onChangeText={setToDate} placeholder="To YYYY-MM-DD" />
        <Button title="Apply dates" variant="outline" size="sm" onPress={() => void load()} />
      </View>
      {loading ? (
        <ActivityIndicator color={tokens.colors.primary} style={{ marginTop: 24 }} />
      ) : (
        <View style={styles.split}>
          <FlatList
            data={activities}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            {...FAST_LIST}
            ListEmptyComponent={<Text style={styles.muted}>No submissions in this range.</Text>}
            renderItem={({ item }) => {
              const st = statusLabel(item);
              return (
                <Pressable
                  onPress={() => setSelectedId(item.id)}
                  style={[styles.listRow, selectedId === item.id && styles.listRowOn]}
                >
                  <Text style={styles.listDate}>{item.activity_date}</Text>
                  <Badge variant={st === "approved" ? "success" : st === "rejected" ? "destructive" : "warning"}>
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
                {selected.verification_feedback ? (
                  <View style={styles.feedbackBox}>
                    <Text style={styles.feedbackLabel}>Verifier feedback</Text>
                    <Text style={styles.body}>{selected.verification_feedback}</Text>
                  </View>
                ) : null}
                <Text style={styles.sectionLabel}>Morning plan</Text>
                <Text style={styles.body}>{plan || "—"}</Text>
                <TodoUpdateHistory logs={logs} />
                <Text style={styles.sectionLabel}>Full report</Text>
                <DayReportSummary activity={selected} />
              </Card>
            )}
          </ScrollView>
        </View>
      )}
    </KeyboardSafeView>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: tokens.colors.background },
    centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
    filters: { padding: 16, gap: 8 },
    split: { flex: 1 },
    list: { maxHeight: 200, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tokens.colors.border },
    listContent: { paddingHorizontal: 16, paddingBottom: 8, gap: 6 },
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
    detailContent: { padding: 16, paddingBottom: 40 },
    detailCard: { padding: 14, gap: 10 },
    detailTitle: { fontSize: 20, fontWeight: "800", color: tokens.colors.foreground },
    sectionLabel: { fontWeight: "800", marginTop: 8, color: tokens.colors.foreground },
    body: { fontSize: 14, color: tokens.colors.mutedForeground, lineHeight: 22 },
    muted: { fontSize: 14, color: tokens.colors.mutedForeground, textAlign: "center", marginTop: 16 },
    feedbackBox: {
      padding: 10,
      borderRadius: tokens.radius.md,
      backgroundColor: "rgba(220, 38, 38, 0.08)",
      borderLeftWidth: 3,
      borderLeftColor: tokens.colors.destructive,
    },
    feedbackLabel: { fontWeight: "800", marginBottom: 4, color: tokens.colors.destructive },
  });
