import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TextInput, ToastAndroid, View } from "react-native";
import { Calendar } from "react-native-calendars";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../integrations/supabase/client";
import { tokens } from "../theme/tokens";
import { formatISODateInNigeria, formatLongDateInNigeria } from "../lib/nigeriaTime";
import { Button } from "../components/ui/Button";
import { Textarea } from "../components/ui/Textarea";
import { Card } from "../components/ui/Card";

type DailyTodoRow = {
  id: string;
  user_id: string;
  todo_date: string;
  plan: string | null;
  updated_at: string;
};

export function DailyTodoScreen() {
  const { user } = useAuth();

  const today = useMemo(() => formatISODateInNigeria(), []);
  const [selectedDate, setSelectedDate] = useState(today);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [todo, setTodo] = useState<DailyTodoRow | null>(null);
  const [plan, setPlan] = useState("");

  const showToast = (message: string) => {
    if (Platform.OS === "android") ToastAndroid.show(message, ToastAndroid.SHORT);
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
      } catch (e: any) {
        // keep UI responsive; show error inline
        setTodo(null);
        setPlan("");
      } finally {
        setLoading(false);
      }
    };

    fetchTodo();
  }, [selectedDate, user?.id]);

  const isToday = selectedDate === today;

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("daily_todos").upsert(
        {
          user_id: user.id,
          todo_date: selectedDate,
          plan,
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
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Card style={styles.heroCard}>
        <Text style={styles.title}>Morning Plan</Text>
        <Text style={styles.subtitle}>Write your top priorities first, then submit your daily report after execution.</Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Pick a date</Text>
        <Text style={styles.cardDescription}>{isToday ? "You’re editing today’s plan." : "You’re editing a past date plan."}</Text>

        <View style={styles.calendarWrap}>
          <Calendar
            onDayPress={(d) => setSelectedDate(d.dateString)}
            markedDates={{
              [selectedDate]: {
                selected: true,
                selectedColor: tokens.colors.primary,
              },
            }}
            theme={{
              calendarBackground: "#FFFFFF",
              textSectionTitleColor: tokens.colors.mutedForeground,
              selectedDayBackgroundColor: tokens.colors.primary,
              selectedDayTextColor: "#FFFFFF",
              todayTextColor: tokens.colors.primary,
              dayTextColor: tokens.colors.foreground,
              monthTextColor: tokens.colors.foreground,
              arrowColor: tokens.colors.foreground,
              textMonthFontFamily: "Georgia",
              textDayFontFamily: "Georgia",
              textDayHeaderFontFamily: "Georgia",
            }}
            style={styles.calendar}
          />
        </View>

        <View style={styles.dateRow}>
          <TextInput
            value={selectedDate}
            onChangeText={setSelectedDate}
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
            <Textarea value={plan} onChangeText={setPlan} placeholder="Example: Read 5 pages, create 2 gigs, do 15 outreaches..." />
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{todo ? `Last updated: ${new Date(todo.updated_at).toLocaleString()}` : "Not saved yet"}</Text>
              <Text style={styles.metaText}>{plan.length} chars</Text>
            </View>

            <View style={styles.buttonSpacer} />
            <Button title="Save Morning Plan" onPress={save} loading={saving} disabled={saving} style={styles.primaryActionBtn} />
          </>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: tokens.colors.accent,
    borderColor: tokens.colors.border,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: tokens.colors.foreground,
    marginBottom: 4,
  },
  subtitle: {
    color: tokens.colors.mutedForeground,
    fontSize: 13,
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
    fontFamily: "Georgia",
  },
  calendarWrap: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    overflow: "hidden",
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
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
    fontFamily: "Georgia",
  },
  tipText: {
    marginTop: 12,
    color: tokens.colors.mutedForeground,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Georgia",
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

