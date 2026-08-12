import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../integrations/supabase/client";
import { useAppTheme } from "../contexts/ThemeContext";
import { useManagedOffice } from "../hooks/useManagedOffice";
import { fetchOfficeRules, fetchOfficeTimetable, fetchOfficeProRequirements } from "../lib/officeContent";
import { saveOfficeProRequirements, saveOfficeRuleSections, saveOfficeTimetableSlots, upsertOfficeContentMeta } from "../lib/officeContentAdmin";
import { SITE_URL } from "../lib/siteConfig";
import { copyOrShareText } from "../lib/copyText";
import { PeriodPicker } from "../components/reports/PeriodPicker";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { KeyboardSafeScroll } from "../components/ui/KeyboardSafe";
import { notifyUser } from "../lib/notifyUser";

type Pending = { id: string; user_id: string; full_name: string; username: string };

export function OfficeAdminScreen() {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  const { isSuperAdmin, isOfficeAdmin, refreshProfile } = useAuth();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const { offices, managedOffice, managedOfficeId, canManage } = useManagedOffice(selectedSlug);
  const [officeName, setOfficeName] = useState("");
  const [pending, setPending] = useState<Pending[]>([]);
  const [rulesText, setRulesText] = useState("");
  const [slotsText, setSlotsText] = useState("");
  const [proText, setProText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!managedOfficeId || !canManage) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setOfficeName(managedOffice?.name ?? "");
      const [{ data: pendingRows }, rules, timetable, pro] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, user_id, full_name, username")
          .eq("office_id", managedOfficeId)
          .eq("approval_status", "pending"),
        fetchOfficeRules(managedOfficeId),
        fetchOfficeTimetable(managedOfficeId),
        fetchOfficeProRequirements(managedOfficeId),
      ]);
      setPending((pendingRows || []) as Pending[]);
      setRulesText(rules.sections.map((s) => `${s.category}\n${s.items.join("\n")}`).join("\n\n"));
      setSlotsText(timetable.slots.map((s) => `${s.time_label} | ${s.activity} | ${s.description || ""}`).join("\n"));
      setProText(pro.requirements.map((r) => `${r.title}\n${r.description || ""}\n${r.details.join("\n")}`).join("\n\n"));
    } finally {
      setLoading(false);
    }
  }, [managedOfficeId, managedOffice?.name, canManage]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const approve = async (member: Pending, status: "approved" | "rejected") => {
    await supabase.from("profiles").update({ approval_status: status }).eq("id", member.id);
    if (status === "approved") {
      await notifyUser({
        user_id: member.user_id,
        title: "Account approved",
        message: "Your account has been approved. You can now use THE PRUDENCE.",
        type: "team",
        link: "/dashboard",
        sendEmail: true,
      });
    } else {
      await notifyUser({
        user_id: member.user_id,
        title: "Account rejected",
        message: "Your account request has been rejected. Please contact your office admin for more information.",
        type: "alert",
        link: "/account-rejected",
        sendEmail: true,
      });
    }
    await load();
  };

  const saveName = async () => {
    if (!managedOfficeId || !officeName.trim()) return;
    await supabase.from("offices").update({ name: officeName.trim() }).eq("id", managedOfficeId);
    await refreshProfile();
    Alert.alert("Saved", "Office name updated");
  };

  const saveCms = async () => {
    if (!managedOfficeId) return;
    setSaving(true);
    try {
      const ruleSections = rulesText
        .split(/\n\s*\n/)
        .map((block, i) => {
          const [category, ...items] = block.split("\n").map((s) => s.trim()).filter(Boolean);
          return { category: category || `Section ${i + 1}`, items, sort_order: i };
        })
        .filter((s) => s.items.length > 0);
      await saveOfficeRuleSections(managedOfficeId, ruleSections);
      await upsertOfficeContentMeta(managedOfficeId, "rules", { subtitle: "Office rules" });
      const slots = slotsText
        .split("\n")
        .map((line, i) => {
          const [time_label, activity, description] = line.split("|").map((s) => s.trim());
          return { time_label: time_label || "", activity: activity || "", description: description || null, sort_order: i };
        })
        .filter((s) => s.time_label && s.activity);
      await saveOfficeTimetableSlots(managedOfficeId, slots);
      const reqs = proText
        .split(/\n\s*\n/)
        .map((block, i) => {
          const [title, description, ...details] = block.split("\n").map((s) => s.trim()).filter(Boolean);
          return { title: title || `Requirement ${i + 1}`, description: description || null, icon_key: "target", details, sort_order: i };
        })
        .filter((r) => r.title);
      await saveOfficeProRequirements(managedOfficeId, reqs);
      Alert.alert("Saved", "Office content updated");
    } catch (e) {
      Alert.alert("Save failed", e instanceof Error ? e.message : "Could not save CMS");
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Office admin is for office owners and super admins.</Text>
      </View>
    );
  }

  return (
    <KeyboardSafeScroll contentContainerStyle={styles.container}>
      {isSuperAdmin && offices.length > 0 ? (
        <PeriodPicker
          options={offices.map((o) => ({ value: o.slug, label: o.name }))}
          value={selectedSlug || managedOffice?.slug || offices[0]?.slug || ""}
          onChange={setSelectedSlug}
        />
      ) : null}
      {loading ? <ActivityIndicator color={tokens.colors.primary} /> : null}
      <Card style={styles.card}>
        <Text style={styles.title}>Office name</Text>
        <Input value={officeName} onChangeText={setOfficeName} />
        <Button title="Save name" onPress={() => void saveName()} />
        {managedOffice?.slug ? (
          <Button
            title="Copy signup link"
            variant="outline"
            onPress={() => void copyOrShareText("Signup link", `${SITE_URL}/auth?tab=signup&office=${managedOffice.slug}`)}
          />
        ) : null}
      </Card>
      <Card style={styles.card}>
        <Text style={styles.title}>Pending approvals (status only)</Text>
        {pending.length === 0 ? <Text style={styles.muted}>No pending members.</Text> : null}
        {pending.map((m) => (
          <View key={m.id} style={styles.row}>
            <Text style={styles.meta}>@{m.username} · {m.full_name}</Text>
            <Button title="Approve" size="sm" onPress={() => void approve(m, "approved")} />
            <Button title="Reject" size="sm" variant="outline" onPress={() => void approve(m, "rejected")} />
          </View>
        ))}
      </Card>
      <Card style={styles.card}>
        <Text style={styles.title}>Rules CMS</Text>
        <Text style={styles.muted}>Blank line between sections. First line is the category.</Text>
        <Textarea value={rulesText} onChangeText={setRulesText} style={{ minHeight: 140 }} />
        <Text style={styles.title}>Timetable</Text>
        <Text style={styles.muted}>One slot per line: time | activity | description</Text>
        <Textarea value={slotsText} onChangeText={setSlotsText} style={{ minHeight: 120 }} />
        <Text style={styles.title}>Pro requirements</Text>
        <Textarea value={proText} onChangeText={setProText} style={{ minHeight: 120 }} />
        <Button title="Save office content" onPress={() => void saveCms()} loading={saving} />
      </Card>
    </KeyboardSafeScroll>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    container: { padding: 16, gap: 12, paddingBottom: 40 },
    centered: { flex: 1, justifyContent: "center", padding: 24 },
    card: { padding: 14, gap: 10 },
    title: { fontWeight: "800", color: tokens.colors.foreground },
    muted: { color: tokens.colors.mutedForeground },
    meta: { flex: 1, color: tokens.colors.foreground },
    row: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  });
