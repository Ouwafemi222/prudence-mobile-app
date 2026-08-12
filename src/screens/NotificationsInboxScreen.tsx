import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../integrations/supabase/client";
import { useAppTheme } from "../contexts/ThemeContext";
import { navigateFromAppLink } from "../lib/navigateFromAppLink";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { FAST_LIST } from "../lib/listPerf";

interface NotificationRow {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  link?: string | null;
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "reminder", label: "Reminders" },
  { key: "verification", label: "Verifications" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function typeLabel(type: string): string {
  switch (type) {
    case "verification":
      return "Verification";
    case "reminder":
      return "Reminder";
    case "feedback":
      return "Feedback";
    case "summary":
      return "Summary";
    case "team":
      return "Team";
    default:
      return "Alert";
  }
}

export function NotificationsInboxScreen() {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, message, type, is_read, created_at, link")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setItems((data || []) as NotificationRow[]);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const unreadCount = items.filter((n) => !n.is_read).length;
  const verificationCount = items.filter((n) => n.type === "verification").length;
  const summaryCount = items.filter((n) => n.type === "summary").length;

  const visible = useMemo(() => {
    if (filter === "unread") return items.filter((n) => !n.is_read);
    if (filter === "all") return items;
    return items.filter((n) => n.type === filter);
  }, [items, filter]);

  const markRead = async (row: NotificationRow) => {
    if (!row.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", row.id);
      setItems((prev) => prev.map((n) => (n.id === row.id ? { ...n, is_read: true } : n)));
    }
    navigateFromAppLink(row.link);
  };

  const markAll = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Sign in to view notifications.</Text>
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
    <FlatList
      data={visible}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      {...FAST_LIST}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{items.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{unreadCount}</Text>
              <Text style={styles.statLabel}>Unread</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{verificationCount}</Text>
              <Text style={styles.statLabel}>Verified</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{summaryCount}</Text>
              <Text style={styles.statLabel}>Summaries</Text>
            </View>
          </View>
          <View style={styles.filters}>
            {FILTERS.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => setFilter(item.key)}
                style={[styles.chip, filter === item.key && styles.chipOn]}
              >
                <Text style={[styles.chipText, filter === item.key && styles.chipTextOn]}>
                  {item.key === "unread" && unreadCount > 0 ? `${item.label} (${unreadCount})` : item.label}
                </Text>
              </Pressable>
            ))}
          </View>
          {unreadCount > 0 ? <Button title="Mark all read" variant="outline" size="sm" onPress={() => void markAll()} /> : null}
        </View>
      }
      ListEmptyComponent={<Text style={styles.muted}>No notifications in this view.</Text>}
      renderItem={({ item }) => (
        <Pressable onPress={() => void markRead(item)}>
          <Card style={[styles.card, !item.is_read && styles.cardUnread]}>
            <View style={styles.rowTop}>
              <Text style={styles.typePill}>{typeLabel(item.type)}</Text>
              <Text style={styles.meta}>{formatRelativeTime(item.created_at)}</Text>
            </View>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.body} numberOfLines={2}>
              {item.message}
            </Text>
          </Card>
        </Pressable>
      )}
    />
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    list: { padding: 18, paddingBottom: 32, gap: 8 },
    header: { gap: 12, marginBottom: 6 },
    statsRow: { flexDirection: "row", gap: 8 },
    statCard: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: tokens.radius.md,
      backgroundColor: tokens.colors.card,
      borderWidth: 1,
      borderColor: tokens.colors.border,
      alignItems: "center",
      gap: 2,
    },
    statValue: { fontSize: 18, fontWeight: "800", color: tokens.colors.foreground },
    statLabel: { fontSize: 10, fontWeight: "700", color: tokens.colors.mutedForeground },
    filters: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      borderWidth: 1,
      borderColor: tokens.colors.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    chipOn: { backgroundColor: tokens.colors.primary, borderColor: tokens.colors.primary },
    chipText: { fontSize: 12, fontWeight: "700", color: tokens.colors.mutedForeground },
    chipTextOn: { color: tokens.colors.primaryForeground },
    card: { paddingVertical: 12, paddingHorizontal: 14, gap: 4 },
    cardUnread: { borderLeftWidth: 3, borderLeftColor: tokens.colors.primary },
    rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    typePill: {
      fontSize: 11,
      fontWeight: "800",
      color: tokens.colors.primary,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    title: { fontSize: 15, fontWeight: "800", color: tokens.colors.foreground },
    body: { fontSize: 13, lineHeight: 18, color: tokens.colors.mutedForeground },
    meta: { fontSize: 11, color: tokens.colors.muted },
    muted: { textAlign: "center", marginTop: 24, color: tokens.colors.mutedForeground },
  });
