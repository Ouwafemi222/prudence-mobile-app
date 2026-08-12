import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../integrations/supabase/client";
import { useAppTheme } from "../contexts/ThemeContext";
import { SITE_URL } from "../lib/siteConfig";
import { copyOrShareText } from "../lib/copyText";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";

type OfficeRow = {
  id: string;
  slug: string;
  name: string;
  status: string;
  plan: string;
  member_count: number;
  pending_count: number;
};

export function AdminOfficesScreen() {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  const { isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [offices, setOffices] = useState<OfficeRow[]>([]);

  const load = useCallback(async () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    try {
      const [{ data: officeRows }, { data: profiles }] = await Promise.all([
        supabase.from("offices").select("id, slug, name, status, plan, created_at").order("name"),
        supabase.from("profiles").select("office_id, approval_status"),
      ]);
      const counts = new Map<string, { total: number; pending: number }>();
      (profiles || []).forEach((p: { office_id: string | null; approval_status: string }) => {
        if (!p.office_id) return;
        const cur = counts.get(p.office_id) ?? { total: 0, pending: 0 };
        cur.total += 1;
        if (p.approval_status === "pending") cur.pending += 1;
        counts.set(p.office_id, cur);
      });
      setOffices(
        ((officeRows || []) as Omit<OfficeRow, "member_count" | "pending_count">[]).map((o) => ({
          ...o,
          member_count: counts.get(o.id)?.total ?? 0,
          pending_count: counts.get(o.id)?.pending ?? 0,
        })),
      );
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!isSuperAdmin) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Only super admins can manage all offices.</Text>
      </View>
    );
  }

  if (loading) return <ActivityIndicator color={tokens.colors.primary} style={{ marginTop: 40 }} />;

  return (
    <FlatList
      data={offices}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <Card style={styles.card}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.meta}>/{item.slug} · {item.member_count} members · {item.pending_count} pending</Text>
          <Badge>{item.status}</Badge>
          <Button
            title="Copy signup link"
            variant="outline"
            size="sm"
            onPress={() => void copyOrShareText("Signup link", `${SITE_URL}/auth?tab=signup&office=${item.slug}`)}
          />
        </Card>
      )}
    />
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    centered: { flex: 1, justifyContent: "center", padding: 24 },
    list: { padding: 16, gap: 10, paddingBottom: 40 },
    card: { padding: 14, gap: 8 },
    name: { fontWeight: "800", fontSize: 16, color: tokens.colors.foreground },
    meta: { color: tokens.colors.mutedForeground, fontSize: 13 },
    muted: { textAlign: "center", color: tokens.colors.mutedForeground },
  });
