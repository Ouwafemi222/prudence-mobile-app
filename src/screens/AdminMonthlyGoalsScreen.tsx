import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../integrations/supabase/client";
import { useAppTheme } from "../contexts/ThemeContext";
import { formatMonthYearLabel, getNigeriaMonthStartISO, listRecentMonthStarts } from "../lib/nigeriaTime";
import { scopeToUserOffice } from "../lib/tenantScope";
import { PeriodPicker } from "../components/reports/PeriodPicker";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { KeyboardSafeView } from "../components/ui/KeyboardSafe";
import { FAST_LIST } from "../lib/listPerf";

type Member = { user_id: string; full_name: string; username: string };
type Goal = {
  target_pages: number | null;
  actual_pages: number | null;
  target_income: number | null;
  actual_income: number | null;
  target_contacts: number | null;
  actual_contacts: number | null;
  things_to_learn: string | null;
};

export function AdminMonthlyGoalsScreen() {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  const { isAdmin, isTrainer, isSuperAdmin, officeId } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [monthStart, setMonthStart] = useState(getNigeriaMonthStartISO);
  const [selected, setSelected] = useState<Member | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);

  const allowed = isAdmin || isTrainer;
  const monthOptions = useMemo(
    () => listRecentMonthStarts(12).map((value) => ({ value, label: formatMonthYearLabel(value) })),
    [],
  );

  const loadMembers = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    try {
      let query = supabase.from("profiles").select("user_id, full_name, username").eq("approval_status", "approved").order("full_name");
      query = scopeToUserOffice(query, officeId, isSuperAdmin);
      const { data } = await query;
      setMembers((data || []) as Member[]);
    } finally {
      setLoading(false);
    }
  }, [allowed, officeId, isSuperAdmin]);

  useFocusEffect(
    useCallback(() => {
      void loadMembers();
    }, [loadMembers]),
  );

  const loadGoal = async (member: Member, month: string) => {
    setSelected(member);
    const { data } = await supabase.rpc("get_or_generate_monthly_goal", {
      p_user_id: member.user_id,
      p_month_year: month,
    });
    setGoal(Array.isArray(data) && data[0] ? (data[0] as Goal) : null);
  };

  if (!allowed) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Admin monthly goals are for trainers and admins.</Text>
      </View>
    );
  }

  const visible = members.filter(
    (m) =>
      m.full_name.toLowerCase().includes(search.toLowerCase()) ||
      m.username.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <KeyboardSafeView style={styles.root}>
      <View style={styles.header}>
        <PeriodPicker options={monthOptions} value={monthStart} onChange={(value) => {
          setMonthStart(value);
          if (selected) void loadGoal(selected, value);
        }} />
        <Input value={search} onChangeText={setSearch} placeholder="Search members" />
      </View>
      {loading ? <ActivityIndicator color={tokens.colors.primary} /> : null}
      <FlatList
        data={visible}
        keyExtractor={(item) => item.user_id}
        style={{ flex: 1 }}
        contentContainerStyle={styles.list}
        {...FAST_LIST}
        renderItem={({ item }) => (
          <Pressable onPress={() => void loadGoal(item, monthStart)}>
            <Card style={[styles.card, selected?.user_id === item.user_id && styles.cardOn]}>
              <Text style={styles.name}>{item.full_name}</Text>
              <Text style={styles.meta}>@{item.username}</Text>
            </Card>
          </Pressable>
        )}
      />
      {goal && selected ? (
        <ScrollView style={styles.detail}>
          <Text style={styles.name}>{selected.full_name} · {formatMonthYearLabel(monthStart)}</Text>
          <Text style={styles.meta}>Pages {goal.actual_pages ?? 0} / {goal.target_pages ?? 0}</Text>
          <Text style={styles.meta}>Income ${Number(goal.actual_income ?? 0).toFixed(0)} / ${Number(goal.target_income ?? 0).toFixed(0)}</Text>
          <Text style={styles.meta}>Contacts {goal.actual_contacts ?? 0} / {goal.target_contacts ?? 0}</Text>
          <Text style={styles.meta}>Learn: {goal.things_to_learn || "—"}</Text>
        </ScrollView>
      ) : null}
    </KeyboardSafeView>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: tokens.colors.background },
    centered: { flex: 1, justifyContent: "center", padding: 24 },
    header: { padding: 16, gap: 8 },
    list: { padding: 16, gap: 8 },
    card: { padding: 12 },
    cardOn: { borderColor: tokens.colors.primary, borderWidth: 2 },
    name: { fontWeight: "800", color: tokens.colors.foreground },
    meta: { color: tokens.colors.mutedForeground, marginTop: 4 },
    detail: { maxHeight: 180, padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tokens.colors.border },
    muted: { textAlign: "center", color: tokens.colors.mutedForeground },
  });
