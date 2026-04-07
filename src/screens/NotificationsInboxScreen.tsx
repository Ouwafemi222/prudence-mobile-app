import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../integrations/supabase/client";
import { tokens } from "../theme/tokens";
import { Card } from "../components/ui/Card";

interface NotificationRow {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export function NotificationsInboxScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NotificationRow[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, message, type, is_read, created_at")
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
      load();
    }, [load]),
  );

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
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
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ListEmptyComponent={<Text style={styles.muted}>No notifications yet.</Text>}
      renderItem={({ item }) => (
        <Pressable onPress={() => !item.is_read && markRead(item.id)}>
          <Card style={[styles.card, !item.is_read && styles.cardUnread]}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.message}</Text>
            <Text style={styles.meta}>
              {new Date(item.created_at).toLocaleString()} · {item.type}
            </Text>
          </Card>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 18, paddingBottom: 32, gap: 10 },
  card: { padding: 14, gap: 6 },
  cardUnread: { borderColor: tokens.colors.primary, borderWidth: 2 },
  title: { fontSize: 16, fontWeight: "800", color: tokens.colors.foreground },
  body: { fontSize: 14, color: tokens.colors.mutedForeground },
  meta: { fontSize: 11, color: tokens.colors.muted },
  muted: { textAlign: "center", marginTop: 24, color: tokens.colors.mutedForeground },
});
