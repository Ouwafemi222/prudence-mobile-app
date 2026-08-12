import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../integrations/supabase/client";
import { tokens } from "../theme/tokens";
import { Card, CardContent, CardDescription, CardHeader } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { PdfViewerModal } from "../components/PdfViewerModal";
import { showAndroidToast } from "../lib/androidToast";

interface Skill {
  id: string;
  name: string;
  overview: string | null;
  theory: string | null;
  practical: string | null;
  tools: string | null;
  outcomes: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  training_plan_pdf_path: string | null;
  is_mandatory: boolean | null;
  trainers: string[] | null;
}

type SkillTab = "overview" | "theory" | "practical" | "tools";

function parseTextArray(text: string | null): string[] {
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* not JSON */
  }
  if (text.includes("\n")) {
    return text.split("\n").filter((line) => line.trim().length > 0);
  }
  if (text.includes(",")) {
    return text.split(",").map((item) => item.trim()).filter((item) => item.length > 0);
  }
  return text.trim() ? [text.trim()] : [];
}

function getPdfUrl(pdfPath: string | null): string | null {
  if (!pdfPath) return null;
  return supabase.storage.from("training-plans").getPublicUrl(pdfPath).data.publicUrl;
}

function showToast(message: string) {
  if (Platform.OS === "android") showAndroidToast(message);
}

function SkillCard({ skill }: { skill: Skill }) {
  const [tab, setTab] = useState<SkillTab>("overview");
  const [pdfOpen, setPdfOpen] = useState(false);
  const theoryItems = parseTextArray(skill.theory);
  const practicalItems = parseTextArray(skill.practical);
  const toolsItems = parseTextArray(skill.tools);
  const outcomesItems = parseTextArray(skill.outcomes);
  const totalModules = theoryItems.length + practicalItems.length;
  const pdfUrl = getPdfUrl(skill.training_plan_pdf_path);

  const tabs: { key: SkillTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "theory", label: "Theory" },
    { key: "practical", label: "Practical" },
    { key: "tools", label: "Tools" },
  ];

  return (
    <>
      {pdfUrl ? (
        <PdfViewerModal
          visible={pdfOpen}
          url={pdfUrl}
          title={skill.name}
          onClose={() => setPdfOpen(false)}
        />
      ) : null}
      <Card style={styles.skillCard}>
      <CardHeader>
        <View style={styles.skillTitleRow}>
          <Text style={styles.skillName}>{skill.name}</Text>
          {pdfUrl ? (
            <Pressable
              style={styles.pdfBtn}
              onPress={() => setPdfOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={`View training plan PDF for ${skill.name}`}
            >
              <Text style={styles.pdfBtnText}>View PDF</Text>
            </Pressable>
          ) : null}
        </View>
        {skill.overview ? (
          <CardDescription>
            <Text style={styles.skillOverviewPreview} numberOfLines={tab === "overview" ? undefined : 3}>
              {skill.overview}
            </Text>
          </CardDescription>
        ) : null}
        <View style={styles.skillMetaRow}>
          <Text style={styles.skillMeta}>📄 {totalModules} modules</Text>
          {skill.trainers && skill.trainers.length > 0 ? (
            <Text style={styles.skillMeta}>👥 {skill.trainers.join(", ")}</Text>
          ) : null}
        </View>
      </CardHeader>

      <View style={styles.tabRow}>
        {tabs.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key)}
            style={[styles.tabChip, tab === t.key && styles.tabChipOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: tab === t.key }}
          >
            <Text style={[styles.tabChipText, tab === t.key && styles.tabChipTextOn]} numberOfLines={1}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <CardContent style={styles.tabBody}>
        {tab === "overview" && (
          <View style={styles.tabSection}>
            {skill.overview ? <Text style={styles.bodyText}>{skill.overview}</Text> : null}
            {outcomesItems.length > 0 ? (
              <View style={styles.outcomesBlock}>
                <Text style={styles.subheading}>🎯 Learning outcomes</Text>
                {outcomesItems.map((outcome, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <Text style={styles.bullet}>→</Text>
                    <Text style={styles.bodyText}>{outcome}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {!skill.overview && outcomesItems.length === 0 ? (
              <Text style={styles.emptyTab}>No overview available for this skill.</Text>
            ) : null}
          </View>
        )}

        {tab === "theory" && (
          <View style={styles.tabSection}>
            {theoryItems.length > 0 ? (
              theoryItems.map((item, i) => (
                <View key={i} style={styles.listItem}>
                  <Text style={styles.listIcon}>💡</Text>
                  <Text style={styles.bodyText}>{item}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyTab}>No theory content available.</Text>
            )}
          </View>
        )}

        {tab === "practical" && (
          <View style={styles.tabSection}>
            {practicalItems.length > 0 ? (
              practicalItems.map((item, i) => (
                <View key={i} style={styles.listItem}>
                  <Text style={styles.listIcon}>▶</Text>
                  <Text style={styles.bodyText}>{item}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyTab}>No practical content available.</Text>
            )}
          </View>
        )}

        {tab === "tools" && (
          <View style={styles.tabSection}>
            {toolsItems.length > 0 ? (
              <View style={styles.toolsWrap}>
                {toolsItems.map((tool) => (
                  <Badge key={tool} variant="outline">
                    🔧 {tool}
                  </Badge>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyTab}>No tools listed.</Text>
            )}
          </View>
        )}
      </CardContent>
    </Card>
    </>
  );
}

export function SkillsHubScreen() {
  const { officeId } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("skills")
        .select("*")
        .order("is_mandatory", { ascending: false, nullsFirst: false })
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });
      if (officeId) query = query.eq("office_id", officeId);
      const { data, error } = await query;

      if (error) throw error;

      const rows = data || [];
      const activeSkills = rows.filter((s) => s.is_active !== false);
      setSkills(activeSkills.length > 0 ? activeSkills : rows);
    } catch (e) {
      console.error(e);
      showToast("Failed to load skills");
      setSkills([]);
    } finally {
      setLoading(false);
    }
  }, [officeId]);

  useFocusEffect(
    useCallback(() => {
      fetchSkills();
    }, [fetchSkills]),
  );

  const mandatorySkills = skills.filter((s) => s.is_mandatory === true);
  const optionalSkills = skills.filter((s) => s.is_mandatory !== true);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={tokens.colors.primary} />
        <Text style={styles.loadingText}>Loading skills…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heroSub}>Browse and explore all available training skills — same library as the website.</Text>

      {skills.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>📚</Text>
          <Text style={styles.emptyTitle}>No skills available yet</Text>
          <Text style={styles.emptySub}>Skills will appear here once they are added by an administrator.</Text>
        </Card>
      ) : (
        <>
          {mandatorySkills.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Badge>Mandatory</Badge>
                <Text style={styles.sectionTitle}>Mandatory skills ({mandatorySkills.length})</Text>
              </View>
              {mandatorySkills.map((skill) => (
                <SkillCard key={skill.id} skill={skill} />
              ))}
            </View>
          ) : null}

          {optionalSkills.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Badge variant="outline">Optional</Badge>
                <Text style={styles.sectionTitle}>Optional skills ({optionalSkills.length})</Text>
              </View>
              {optionalSkills.map((skill) => (
                <SkillCard key={skill.id} skill={skill} />
              ))}
            </View>
          ) : null}
        </>
      )}

      <Text style={styles.footerHint}>Training plan PDFs open inside the app.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: tokens.colors.background },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.background,
    gap: 10,
  },
  loadingText: { color: tokens.colors.mutedForeground, fontSize: 14 },
  container: { padding: 18, paddingBottom: 36, gap: 16 },
  heroSub: {
    fontSize: 14,
    color: tokens.colors.mutedForeground,
    marginBottom: 4,
  },
  section: { gap: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: tokens.colors.foreground },
  skillCard: { padding: 14 },
  skillTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  skillName: { fontSize: 17, fontWeight: "800", color: tokens.colors.foreground, flex: 1 },
  skillOverviewPreview: { fontSize: 13, color: tokens.colors.mutedForeground },
  skillMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 8 },
  skillMeta: { fontSize: 12, color: tokens.colors.mutedForeground },
  pdfBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.card,
  },
  pdfBtnText: { fontSize: 12, fontWeight: "700", color: tokens.colors.foreground },
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
    marginHorizontal: -14,
    paddingHorizontal: 14,
    paddingBottom: 4,
  },
  tabChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.background,
  },
  tabChipOn: {
    backgroundColor: tokens.colors.primary,
    borderColor: tokens.colors.primary,
  },
  tabChipText: { fontSize: 12, fontWeight: "600", color: tokens.colors.mutedForeground },
  tabChipTextOn: { color: tokens.colors.primaryForeground },
  tabBody: { paddingTop: 4 },
  tabSection: { gap: 10 },
  subheading: { fontSize: 14, fontWeight: "800", color: tokens.colors.foreground, marginBottom: 4 },
  bodyText: { fontSize: 14, color: tokens.colors.mutedForeground, flex: 1 },
  outcomesBlock: { gap: 8, marginTop: 8 },
  bulletRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  bullet: { color: tokens.colors.primary, fontWeight: "800", marginTop: 2 },
  listItem: { flexDirection: "row", gap: 10, alignItems: "flex-start", paddingVertical: 6 },
  listIcon: { fontSize: 16, marginTop: 1 },
  toolsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  emptyTab: { fontSize: 14, color: tokens.colors.mutedForeground, textAlign: "center", paddingVertical: 12 },
  emptyCard: { padding: 28, alignItems: "center", gap: 8 },
  emptyEmoji: { fontSize: 40, opacity: 0.6 },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: tokens.colors.foreground },
  emptySub: { fontSize: 14, color: tokens.colors.mutedForeground, textAlign: "center" },
  footerHint: {
    fontSize: 12,
    color: tokens.colors.muted,
    textAlign: "center",
    marginTop: 8,
  },
});
