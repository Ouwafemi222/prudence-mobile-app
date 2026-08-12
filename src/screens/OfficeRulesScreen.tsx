import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { fetchOfficeRules, type OfficeRuleSection } from "../lib/officeContent";
import { useAppTheme } from "../contexts/ThemeContext";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";

export function OfficeRulesScreen() {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  const { officeId, office } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<OfficeRuleSection[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [footer, setFooter] = useState<string | null>(null);
  const [subtitle, setSubtitle] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!officeId) {
        setSections([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      void fetchOfficeRules(officeId)
        .then(({ sections: rows, meta }) => {
          setSections(rows);
          setNotice(meta?.notice_text ?? null);
          setFooter(meta?.footer_text ?? null);
          setSubtitle(meta?.subtitle ?? null);
        })
        .catch(() => setSections([]))
        .finally(() => setLoading(false));
    }, [officeId]),
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={tokens.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.lead}>{subtitle || `Guidelines for ${office?.name || "your office"}.`}</Text>
      {notice ? (
        <Card style={styles.notice}>
          <CardContent style={{ gap: 8 }}>
            <Text style={styles.noticeTitle}>Important</Text>
            <Text style={styles.body}>{notice}</Text>
          </CardContent>
        </Card>
      ) : null}
      {sections.length === 0 ? (
        <Text style={styles.body}>No office rules have been published yet.</Text>
      ) : (
        sections.map((rule, index) => (
          <Card key={rule.id}>
            <CardHeader>
              <View style={styles.catTitleRow}>
                <Badge variant="outline">{index + 1}</Badge>
                <Text style={styles.categoryTitle}>{rule.category}</Text>
              </View>
            </CardHeader>
            <CardContent style={{ gap: 10 }}>
              {rule.items.map((item, itemIndex) => (
                <View key={itemIndex} style={styles.ruleRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.body}>{item}</Text>
                </View>
              ))}
            </CardContent>
          </Card>
        ))
      )}
      {footer ? (
        <Card style={styles.footerCard}>
          <CardContent>
            <Text style={styles.footerText}>{footer}</Text>
          </CardContent>
        </Card>
      ) : null}
    </ScrollView>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    scroll: { flex: 1, backgroundColor: tokens.colors.background },
    container: { padding: 18, paddingBottom: 36, gap: 14 },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    lead: { fontSize: 14, color: tokens.colors.mutedForeground, marginBottom: 4 },
    notice: { borderWidth: 1, borderColor: "rgba(91, 82, 235, 0.35)", backgroundColor: "rgba(91, 82, 235, 0.06)" },
    noticeTitle: { fontSize: 16, fontWeight: "800", color: tokens.colors.foreground },
    catTitleRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
    categoryTitle: { fontSize: 17, fontWeight: "800", color: tokens.colors.foreground, flex: 1 },
    ruleRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    bullet: { color: tokens.colors.primary, fontSize: 16, marginTop: 2, fontWeight: "800" },
    body: { fontSize: 14, color: tokens.colors.mutedForeground, flex: 1, lineHeight: 22 },
    footerCard: { marginTop: 4 },
    footerText: { fontSize: 13, color: tokens.colors.mutedForeground, textAlign: "center" },
  });
