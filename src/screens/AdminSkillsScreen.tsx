import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Platform, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../integrations/supabase/client";
import { useAppTheme } from "../contexts/ThemeContext";
import { scopeToUserOffice } from "../lib/tenantScope";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { KeyboardSafeScroll } from "../components/ui/KeyboardSafe";
import { FAST_LIST } from "../lib/listPerf";
import { showAndroidToast } from "../lib/androidToast";

type Skill = {
  id: string;
  name: string;
  overview: string | null;
  theory: string | null;
  practical: string | null;
  tools: string | null;
  outcomes: string | null;
  is_active: boolean | null;
  is_mandatory: boolean | null;
  office_id: string;
};

function toast(msg: string) {
  if (Platform.OS === "android") showAndroidToast(msg);
}

const EMPTY: Omit<Skill, "id" | "office_id"> = {
  name: "",
  overview: "",
  theory: "",
  practical: "",
  tools: "",
  outcomes: "",
  is_active: true,
  is_mandatory: false,
};

export function AdminSkillsScreen() {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  const { isAdmin, officeId, isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [edit, setEdit] = useState<(Partial<Skill> & { name: string }) | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      let query = supabase.from("skills").select("*").order("display_order").order("name");
      query = scopeToUserOffice(query, officeId, isSuperAdmin);
      const { data, error } = await query;
      if (error) throw error;
      setSkills((data || []) as Skill[]);
    } catch {
      setSkills([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, officeId, isSuperAdmin]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const save = async () => {
    if (!edit || !officeId) return;
    setSaving(true);
    try {
      const payload = {
        name: edit.name.trim(),
        overview: edit.overview || null,
        theory: edit.theory || null,
        practical: edit.practical || null,
        tools: edit.tools || null,
        outcomes: edit.outcomes || null,
        is_active: edit.is_active !== false,
        is_mandatory: Boolean(edit.is_mandatory),
        office_id: officeId,
      };
      if (edit.id) {
        const { error } = await supabase.from("skills").update(payload).eq("id", edit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("skills").insert(payload);
        if (error) throw error;
      }
      toast("Saved");
      setEdit(null);
      await load();
    } catch {
      toast("Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Manage skills is limited to trainers and super admins.</Text>
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
    <>
      <FlatList
        data={skills}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        {...FAST_LIST}
        ListHeaderComponent={
          <Button title="Add skill" onPress={() => setEdit({ ...EMPTY })} />
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => setEdit(item)}>
            <Card style={styles.row}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.preview} numberOfLines={2}>{item.overview || "No overview"}</Text>
              <Text style={styles.meta}>{item.is_mandatory ? "Mandatory" : "Optional"} · {item.is_active ? "Active" : "Inactive"}</Text>
            </Card>
          </Pressable>
        )}
      />
      <Modal visible={!!edit} animationType="slide" onRequestClose={() => setEdit(null)}>
        <KeyboardSafeScroll inModal style={styles.modal} contentContainerStyle={styles.modalBox}>
          <Text style={styles.modalTitle}>{edit?.id ? "Edit skill" : "New skill"}</Text>
          <Input value={edit?.name || ""} onChangeText={(name) => setEdit((p) => (p ? { ...p, name } : p))} placeholder="Name" />
          <Textarea value={edit?.overview || ""} onChangeText={(overview) => setEdit((p) => (p ? { ...p, overview } : p))} placeholder="Overview" style={{ minHeight: 80 }} />
          <Textarea value={edit?.theory || ""} onChangeText={(theory) => setEdit((p) => (p ? { ...p, theory } : p))} placeholder="Theory" style={{ minHeight: 80 }} />
          <Textarea value={edit?.practical || ""} onChangeText={(practical) => setEdit((p) => (p ? { ...p, practical } : p))} placeholder="Practical" style={{ minHeight: 80 }} />
          <Textarea value={edit?.tools || ""} onChangeText={(tools) => setEdit((p) => (p ? { ...p, tools } : p))} placeholder="Tools" style={{ minHeight: 80 }} />
          <Textarea value={edit?.outcomes || ""} onChangeText={(outcomes) => setEdit((p) => (p ? { ...p, outcomes } : p))} placeholder="Outcomes" style={{ minHeight: 80 }} />
          <View style={styles.switchRow}>
            <Text style={styles.name}>Active</Text>
            <Switch value={edit?.is_active !== false} onValueChange={(is_active) => setEdit((p) => (p ? { ...p, is_active } : p))} />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.name}>Mandatory</Text>
            <Switch value={Boolean(edit?.is_mandatory)} onValueChange={(is_mandatory) => setEdit((p) => (p ? { ...p, is_mandatory } : p))} />
          </View>
          <Button title="Cancel" variant="outline" onPress={() => setEdit(null)} />
          <Button title={saving ? "Saving…" : "Save"} onPress={() => void save()} disabled={saving} />
        </KeyboardSafeScroll>
      </Modal>
    </>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    centered: { flex: 1, justifyContent: "center", padding: 24 },
    list: { padding: 18, paddingBottom: 40, gap: 10 },
    row: { padding: 14, gap: 6 },
    name: { fontSize: 17, fontWeight: "800", color: tokens.colors.foreground },
    preview: { fontSize: 13, color: tokens.colors.mutedForeground },
    meta: { fontSize: 11, color: tokens.colors.muted },
    modal: { flex: 1, backgroundColor: tokens.colors.background },
    modalBox: { padding: 18, gap: 12, paddingBottom: 40 },
    modalTitle: { fontSize: 18, fontWeight: "800", color: tokens.colors.foreground },
    switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    muted: { textAlign: "center", color: tokens.colors.mutedForeground },
  });
