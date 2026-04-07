import { ScrollView, StyleSheet, Text, View } from "react-native";
import { OFFICE_RULES_CATEGORIES } from "../data/officeRules";
import { tokens } from "../theme/tokens";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";

export function OfficeRulesScreen() {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.lead}>
        Guidelines and expectations for all members of PRUDENCE PATH — same content as the website.
      </Text>

      <Card style={styles.notice}>
        <CardContent style={{ gap: 8 }}>
          <Text style={styles.noticeTitle}>⚠️ Important</Text>
          <Text style={styles.body}>
            All members are expected to read, understand, and comply with these rules. Failure to follow these
            guidelines may result in account restrictions or deactivation.
          </Text>
        </CardContent>
      </Card>

      {OFFICE_RULES_CATEGORIES.map((rule, index) => (
        <Card key={rule.category}>
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
      ))}

      <Card style={styles.footerCard}>
        <CardContent>
          <Text style={styles.footerText}>
            For questions or clarifications about these rules, please contact your assigned trainer or administrator.
          </Text>
        </CardContent>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: tokens.colors.background },
  container: { padding: 18, paddingBottom: 36, gap: 14 },
  lead: {
    fontSize: 14,
    color: tokens.colors.mutedForeground,
    marginBottom: 4,
  },
  notice: {
    borderWidth: 1,
    borderColor: "rgba(78, 80, 231, 0.35)",
    backgroundColor: "rgba(78, 80, 231, 0.06)",
  },
  noticeTitle: { fontSize: 16, fontWeight: "800", color: tokens.colors.foreground },
  catTitleRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  categoryTitle: { fontSize: 17, fontWeight: "800", color: tokens.colors.foreground, flex: 1 },
  ruleRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  bullet: { color: tokens.colors.primary, fontSize: 16, marginTop: 2, fontWeight: "800" },
  body: { fontSize: 14, color: tokens.colors.mutedForeground, flex: 1, lineHeight: 22 },
  footerCard: { marginTop: 4 },
  footerText: { fontSize: 13, color: tokens.colors.mutedForeground, textAlign: "center" },
});
