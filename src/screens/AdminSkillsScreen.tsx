import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
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
import { Button } from "../components/ui/Button";
import { Textarea } from "../components/ui/Textarea";
import { showAndroidToast } from "../lib/androidToast";

type Skill = {
  id: string;
  name: string;
  overview: string | null;
  is_active: boolean;
};

function toast(msg: string) {
  if (Platform.OS === "android") showAndroidToast(msg);
}

export function AdminSkillsScreen() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [edit, setEdit] = useState<Skill | null>(null);
  const [overview, setOverview] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from("skills").select("id, name, overview, is_active").order("display_order").order("name");
      if (error) throw error;
      setSkills((data || []) as Skill[]);
    } catch {
      setSkills([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const openEdit = (s: Skill) => {
    setEdit(s);
    setOverview(s.overview || "");
  };

  const save = async () => {
    if (!edit) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("skills").update({ overview: overview || null }).eq("id", edit.id);
      if (error) throw error;
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
        ListHeaderComponent={
          <Text style={styles.intro}>Tap a skill to edit overview text. Full theory/practical editors are on the web.</Text>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => openEdit(item)}>
            <Card style={styles.row}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.preview} numberOfLines={2}>
                {item.overview || "No overview"}
              </Text>
              <Text style={styles.meta}>{item.is_active ? "Active" : "Inactive"}</Text>
            </Card>
          </Pressable>
        )}
      />
      <Modal visible={!!edit} transparent animationType="fade" onRequestClose={() => setEdit(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{edit?.name}</Text>
            <Text style={styles.label}>Overview</Text>
            <Textarea value={overview} onChangeText={setOverview} placeholder="Overview…" style={{ minHeight: 140 }} />
            <View style={styles.modalActions}>
              <Button title="Cancel" variant="outline" onPress={() => setEdit(null)} />
              <Button title={saving ? "Saving…" : "Save"} onPress={save} disabled={saving} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", padding: 24 },
  list: { padding: 18, paddingBottom: 40, gap: 10 },
  intro: { marginBottom: 12, fontSize: 14, color: tokens.colors.mutedForeground },
  row: { padding: 14, gap: 6 },
  name: { fontSize: 17, fontWeight: "800" },
  preview: { fontSize: 13, color: tokens.colors.mutedForeground },
  meta: { fontSize: 11, color: tokens.colors.muted },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 18 },
  modalBox: { backgroundColor: tokens.colors.card, borderRadius: tokens.radius.lg, padding: 18, gap: 12, borderWidth: 1, borderColor: tokens.colors.border },
  modalTitle: { fontSize: 18, fontWeight: "800" },
  label: { fontWeight: "800" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" },
  muted: { textAlign: "center", color: tokens.colors.mutedForeground },
});
