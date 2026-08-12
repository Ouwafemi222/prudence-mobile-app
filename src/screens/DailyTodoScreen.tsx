import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, View } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useDeferredReactNativeCalendar } from "../hooks/useDeferredReactNativeCalendar";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../integrations/supabase/client";
import { useAppTheme } from "../contexts/ThemeContext";
import { formatISODateInNigeria, formatLongDateInNigeria } from "../lib/nigeriaTime";
import { getTodoLockMessage, isTodoDateEditable, isTodoDateToday } from "../lib/todoRules";
import { Button } from "../components/ui/Button";
import { Textarea } from "../components/ui/Textarea";
import { Card } from "../components/ui/Card";
import { FocusAwareTextInput, KeyboardSafeScroll } from "../components/ui/KeyboardSafe";
import { PolicyNoticeBanner } from "../components/notices/PolicyNoticeBanner";
import { TodoUpdateHistory } from "../components/todos/TodoUpdateHistory";
import type { TodoLogEntry } from "../lib/fetchTodoSubmissionData";
import { showAndroidToast } from "../lib/androidToast";

type DailyTodoRow = {
  id: string;
  user_id: string;
  todo_date: string;
  plan: string | null;
  updated_at: string;
};

export function DailyTodoScreen() {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  const tabBarHeight = useBottomTabBarHeight();
  const { user, officeId } = useAuth();
  const Calendar = useDeferredReactNativeCalendar();

  const today = useMemo(() => formatISODateInNigeria(), []);
  const [selectedDate, setSelectedDate] = useState(today);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [todo, setTodo] = useState<DailyTodoRow | null>(null);
  const [plan, setPlan] = useState("");
  const [logs, setLogs] = useState<TodoLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const canEdit = isTodoDateEditable(selectedDate);
  const lockMessage = getTodoLockMessage(selectedDate);
  const isToday = isTodoDateToday(selectedDate);

  const showToast = (message: string) => {
    if (Platform.OS === "android") showAndroidToast(message);
    else Alert.alert("Success", message);
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchTodo = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("daily_todos")
          .select("*")
          .eq("user_id", user.id)
          .eq("todo_date", selectedDate)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          const row = data as DailyTodoRow;
          setTodo(row);
          setPlan(row.plan ?? "");
        } else {
          setTodo(null);
          setPlan("");
        }

        setLogsLoading(true);
        const { data: logRows } = await supabase
          .from("daily_todo_logs")
          .select("id, plan, created_at")
          .eq("user_id", user.id)
          .eq("todo_date", selectedDate)
          .order("created_at", { ascending: false });
        setLogs((logRows || []) as TodoLogEntry[]);
      } catch {
        setTodo(null);
        setPlan("");
        setLogs([]);
      } finally {
        setLogsLoading(false);
        setLoading(false);
      }
    };

    fetchTodo();
  }, [selectedDate, user?.id]);

  const save = async () => {
    if (!user) return;
    if (!canEdit) {
      Alert.alert("Read only", lockMessage || "This date cannot be edited.");
      return;
    }
    if (!plan.trim()) {
      Alert.alert("Morning plan", "Write your morning plan before saving.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("daily_todos").upsert(
        {
          user_id: user.id,
          office_id: officeId,
          todo_date: selectedDate,
          plan: plan.trim(),
        },
        { onConflict: "user_id,todo_date" },
      );
      if (error) throw error;
      // refetch by changing state trigger
      const { data } = await supabase
        .from("daily_todos")
        .select("*")
        .eq("user_id", user.id)
        .eq("todo_date", selectedDate)
        .maybeSingle();
      setTodo((data as DailyTodoRow) ?? null);
      showToast("Morning plan saved");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardSafeScroll
      style={styles.screen}
      contentContainerStyle={[styles.container, { paddingBottom: tabBarHeight + 56 }]}
    >
      <Card style={styles.heroCard}>
        <Text style={styles.heroTitle}>Morning Plan</Text>
        <Text style={styles.heroSubtitle}>
          Set your morning plan for today only. Past dates are read-only. Every save is logged.
        </Text>
      </Card>

      <PolicyNoticeBanner noticeId="todo_same_day_v1" title="Todo planning update">
        Morning plans are same-day only — set today's plan on today, before 11:59 PM WAT. Planning
        future days in advance is no longer available.
      </PolicyNoticeBanner>

      {lockMessage ? (
        <Card style={styles.heroCard}>
          <Text style={styles.heroTitle}>{canEdit ? "Today’s window" : "Read only"}</Text>
          <Text style={styles.heroSubtitle}>{lockMessage}</Text>
        </Card>
      ) : null}

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Pick a date</Text>
        <Text style={styles.cardDescription}>
          {isToday ? "You’re editing today’s plan." : "You’re viewing a read-only date."}
        </Text>

        <View style={styles.calendarWrap}>
          {Calendar ? (
            <Calendar
              maxDate={today}
              onDayPress={(d: { dateString: string }) => {
                if (d.dateString > today) return;
                setSelectedDate(d.dateString);
              }}
              markedDates={{
                [selectedDate]: {
                  selected: true,
                  selectedColor: tokens.colors.primary,
                },
              }}
              theme={{
                calendarBackground: tokens.colors.surface,
                backgroundColor: tokens.colors.surface,
                textSectionTitleColor: tokens.colors.mutedForeground,
                selectedDayBackgroundColor: tokens.colors.primary,
                selectedDayTextColor: tokens.colors.primaryForeground,
                todayTextColor: tokens.colors.primary,
                dayTextColor: tokens.colors.foreground,
                monthTextColor: tokens.colors.foreground,
                arrowColor: tokens.colors.primary,
                textDisabledColor: tokens.colors.muted,
              }}
              style={styles.calendar}
            />
          ) : (
            <View style={styles.calendarLoading}>
              <ActivityIndicator color={tokens.colors.primary} />
            </View>
          )}
        </View>

        <View style={styles.dateRow}>
          <FocusAwareTextInput
            value={selectedDate}
            onChangeText={(value) => {
              if (value > today) {
                setSelectedDate(today);
                return;
              }
              setSelectedDate(value);
            }}
            style={[styles.dateInput, { flex: 1 }]}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
          />
          <View style={{ width: 8 }} />
          <Button title="Today" variant="outline" onPress={() => setSelectedDate(today)} size="sm" />
        </View>
        <Text style={styles.dateHint}>{formatLongDateInNigeria(new Date(`${selectedDate}T12:00:00`))}</Text>
        <Text style={styles.tipText}>Tip: trainers/admins can see your saved morning todo inside Submissions when they open any date.</Text>

        <View style={{ height: 12 }} />
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={tokens.colors.primary} />
            <Text style={styles.muted}>Loading...</Text>
          </View>
        ) : (
          <>
            <Text style={styles.inputLabel}>Your plan</Text>
            <Textarea
              value={plan}
              onChangeText={setPlan}
              placeholder="Example: Read 5 pages, create 2 gigs, do 15 outreaches..."
              editable={canEdit}
            />
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{todo ? `Last updated: ${new Date(todo.updated_at).toLocaleString()}` : "Not saved yet"}</Text>
              <Text style={styles.metaText}>{plan.length} chars</Text>
            </View>

            <View style={styles.buttonSpacer} />
            <Button
              title={canEdit ? "Save Morning Plan" : "Read only"}
              onPress={() => void save()}
              loading={saving}
              disabled={saving || !canEdit}
              style={styles.primaryActionBtn}
            />
            <TodoUpdateHistory logs={logs} loading={logsLoading} />
          </>
        )}
      </Card>
    </KeyboardSafeScroll>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.colors.background,
  },
  container: {
    padding: 18,
    paddingBottom: 24,
    gap: 10,
  },
  heroCard: {
    padding: 14,
    backgroundColor: tokens.colors.primary,
    borderColor: tokens.colors.primary,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: tokens.colors.primaryForeground,
    marginBottom: 4,
  },
  heroSubtitle: {
    color: tokens.colors.primaryForeground,
    opacity: 0.9,
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: {
    fontWeight: "800",
    fontSize: 15,
    color: tokens.colors.foreground,
    marginBottom: 4,
  },
  cardDescription: {
    color: tokens.colors.mutedForeground,
    fontSize: 13,
    marginBottom: 10,
  },
  calendarLoading: {
    minHeight: 320,
    justifyContent: "center",
    alignItems: "center",
  },
  calendarWrap: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    overflow: "hidden",
    marginBottom: 12,
    backgroundColor: tokens.colors.surface,
  },
  calendar: {
    paddingBottom: 6,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateInput: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: tokens.colors.card,
    color: tokens.colors.foreground,
  },
  inputLabel: {
    color: tokens.colors.foreground,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },
  dateHint: {
    marginTop: 8,
    color: tokens.colors.mutedForeground,
    fontSize: 12,
  },
  tipText: {
    marginTop: 12,
    color: tokens.colors.mutedForeground,
    fontSize: 12,
    lineHeight: 18,
  },
  muted: {
    color: tokens.colors.mutedForeground,
    fontSize: 13,
  },
  loadingRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    gap: 10,
  },
  metaText: {
    color: tokens.colors.mutedForeground,
    fontSize: 12,
  },
  buttonSpacer: {
    height: 18,
  },
  primaryActionBtn: {
    marginBottom: 2,
  },
  });

