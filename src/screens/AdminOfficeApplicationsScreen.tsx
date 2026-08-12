import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../integrations/supabase/client";
import { useAppTheme } from "../contexts/ThemeContext";
import { SITE_URL } from "../lib/siteConfig";
import { copyOrShareText } from "../lib/copyText";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { KeyboardSafeScroll } from "../components/ui/KeyboardSafe";
import { FAST_LIST } from "../lib/listPerf";

type Application = {
  id: string;
  organization_name: string;
  contact_name: string;
  contact_email: string;
  country: string;
  team_size: string;
  use_case: string;
  status: string;
  admin_notes: string | null;
  provisioned_office_id: string | null;
  created_at: string;
};

export function AdminOfficeApplicationsScreen() {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  const { isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Application[]>([]);
  const [filter, setFilter] = useState("pending");
  const [selected, setSelected] = useState<Application | null>(null);
  const [notes, setNotes] = useState("");
  const [slug, setSlug] = useState("");
  const [signupPath, setSignupPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    try {
      let query = supabase.from("office_applications").select("*").order("created_at", { ascending: false });
      if (filter !== "all") query = query.eq("status", filter);
      const { data, error } = await query;
      if (error) throw error;
      setRows((data || []) as Application[]);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, filter]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const provision = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("provision_office_from_application", {
        p_application_id: selected.id,
        p_slug: slug.trim() || undefined,
      });
      if (error) throw error;
      const result = data as { signup_path?: string; slug?: string } | null;
      const path = result?.signup_path || (result?.slug ? `/auth?tab=signup&office=${result.slug}` : null);
      setSignupPath(path);
      Alert.alert("Office provisioned", path ? `Signup: ${SITE_URL}${path}` : "Office created.");
      await load();
    } catch (e) {
      Alert.alert("Provision failed", e instanceof Error ? e.message : "Could not provision office");
    } finally {
      setBusy(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Only super admins can review office applications.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.row}>
        {["pending", "contacted", "approved", "rejected", "all"].map((key) => (
          <Button key={key} title={key} size="sm" variant={filter === key ? "primary" : "outline"} onPress={() => setFilter(key)} />
        ))}
      </View>
      {loading ? <ActivityIndicator color={tokens.colors.primary} /> : null}
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        {...FAST_LIST}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Text style={styles.name}>{item.organization_name}</Text>
            <Text style={styles.meta}>{item.contact_name} · {item.contact_email}</Text>
            <Badge>{item.status}</Badge>
            <Button title="Open" variant="outline" size="sm" onPress={() => { setSelected(item); setNotes(item.admin_notes || ""); setSignupPath(null); }} />
          </Card>
        )}
      />
      <Modal visible={Boolean(selected)} animationType="slide" onRequestClose={() => setSelected(null)}>
        <KeyboardSafeScroll inModal style={styles.modal} contentContainerStyle={styles.modalContent}>
          <Button title="Close" variant="ghost" onPress={() => setSelected(null)} />
          <Text style={styles.name}>{selected?.organization_name}</Text>
          <Text style={styles.meta}>{selected?.use_case}</Text>
          <Textarea value={notes} onChangeText={setNotes} placeholder="Admin notes" style={{ minHeight: 80 }} />
          <Input value={slug} onChangeText={setSlug} placeholder="Optional office slug" />
          <Button title="Mark contacted" variant="outline" disabled={busy} onPress={async () => {
            if (!selected) return;
            await supabase.from("office_applications").update({ status: "contacted", admin_notes: notes || null }).eq("id", selected.id);
            setSelected(null);
            await load();
          }} />
          <Button title="Provision office" onPress={() => void provision()} loading={busy} />
          {signupPath ? (
            <Button title="Copy signup link" variant="outline" onPress={() => void copyOrShareText("Signup link", `${SITE_URL}${signupPath}`)} />
          ) : null}
        </KeyboardSafeScroll>
      </Modal>
    </View>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: tokens.colors.background },
    centered: { flex: 1, justifyContent: "center", padding: 24 },
    row: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 16 },
    list: { padding: 16, gap: 10, paddingBottom: 40 },
    card: { padding: 14, gap: 8 },
    name: { fontWeight: "800", color: tokens.colors.foreground, fontSize: 16 },
    meta: { color: tokens.colors.mutedForeground },
    muted: { textAlign: "center", color: tokens.colors.mutedForeground },
    modal: { flex: 1, backgroundColor: tokens.colors.background },
    modalContent: { padding: 18, gap: 10 },
  });
