import { ScrollView, StyleSheet, Text, View } from "react-native";
import { tokens } from "../theme/tokens";
import { Card, CardContent, CardDescription, CardHeader } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";

const REQUIREMENTS: {
  title: string;
  description: string;
  details: string[];
  symbol: string;
}[] = [
  {
    title: "Complete 3 Books",
    description: "Read and complete three books as part of your development",
    symbol: "📖",
    details: [
      "Select books relevant to your skill development or personal growth",
      "Complete reading and demonstrate understanding",
      "Document your progress and key learnings",
      "Books must be approved by your trainer",
    ],
  },
  {
    title: "Become a Pro at a Skill",
    description: "Master and become proficient in at least one skill",
    symbol: "🎯",
    details: [
      "Complete mandatory skills (Digital Marketing, Prompt Engineering)",
      "Select and complete one optional skill",
      "Demonstrate proficiency through practical work",
      "Update skill status to 'Completed Training'",
    ],
  },
  {
    title: "Portfolio Website",
    description: "Create a portfolio website showcasing your work",
    symbol: "⭐",
    details: [
      "Build a portfolio website for your chosen skill",
      "Include at least 3-5 standard works/projects",
      "Website must be live and accessible",
      "Showcase your best work and capabilities",
    ],
  },
  {
    title: "Understand Neolife Basics",
    description: "Complete understanding of all Neolife fundamentals",
    symbol: "✓",
    details: [
      "Learn all Neolife basics and principles",
      "Demonstrate understanding through assessments",
      "Apply Neolife knowledge in your work",
      "Complete all required Neolife training modules",
    ],
  },
  {
    title: "Be Active and Punctual",
    description: "Maintain consistent activity and punctuality",
    symbol: "🕐",
    details: [
      "Maintain high attendance and punctuality",
      "Submit daily reports consistently and on time",
      "Participate actively in all office activities",
      "Follow the office timetable diligently",
    ],
  },
];

const PRIVILEGES: { bold: string; rest: string }[] = [
  {
    bold: "Verify Submissions:",
    rest: " Review and verify daily activity submissions for members in your assigned group",
  },
  {
    bold: "Provide Feedback:",
    rest: " Add comments and feedback on member submissions",
  },
  {
    bold: "Section-by-Section Verification:",
    rest: " Verify individual sections of daily activities",
  },
  {
    bold: "Group Management:",
    rest: " View and manage submissions for members in your assigned group",
  },
];

export function ProRequirementsScreen() {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.lead}>
        Requirements and criteria to become a Pro member in PRUDENCE PATH — aligned with the website.
      </Text>

      <Card style={styles.overview}>
        <CardHeader>
          <Text style={styles.cardTitle}>Overview</Text>
          <CardDescription>
            <Text style={styles.cardDesc}>
              Pro members have demonstrated exceptional commitment, consistency, and skill development. They are granted
              additional privileges including the ability to verify submissions and provide feedback to members within
              their assigned group.
            </Text>
          </CardDescription>
        </CardHeader>
      </Card>

      {REQUIREMENTS.map((req, index) => (
        <Card key={req.title} style={styles.reqCard}>
          <CardHeader>
            <View style={styles.reqHead}>
              <View style={styles.reqIconWrap}>
                <Text style={styles.reqIcon}>{req.symbol}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.reqTitleRow}>
                  <Badge variant="outline">{index + 1}</Badge>
                  <Text style={styles.reqTitle}>{req.title}</Text>
                </View>
                <Text style={styles.reqSub}>{req.description}</Text>
              </View>
            </View>
          </CardHeader>
          <CardContent style={{ gap: 10 }}>
            {req.details.map((detail, detailIndex) => (
              <View key={detailIndex} style={styles.detailRow}>
                <Text style={styles.check}>✓</Text>
                <Text style={styles.detailText}>{detail}</Text>
              </View>
            ))}
          </CardContent>
        </Card>
      ))}

      <Card style={styles.sectionCard}>
        <CardHeader>
          <Text style={styles.cardTitle}>Pro member privileges</Text>
          <CardDescription>
            <Text style={styles.cardDesc}>Once you become a Pro member, you gain access to the following:</Text>
          </CardDescription>
        </CardHeader>
        <CardContent style={{ gap: 12 }}>
          {PRIVILEGES.map((p) => (
            <View key={p.bold} style={styles.privRow}>
              <Text style={styles.check}>✓</Text>
              <Text style={styles.detailText}>
                <Text style={styles.privBold}>{p.bold}</Text>
                {p.rest}
              </Text>
            </View>
          ))}
        </CardContent>
      </Card>

      <Card style={styles.footerCard}>
        <CardContent>
          <Text style={styles.footerText}>
            For questions about Pro requirements or to check your progress, please contact your assigned trainer.
          </Text>
        </CardContent>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: tokens.colors.background },
  container: { padding: 18, paddingBottom: 36, gap: 14 },
  lead: { fontSize: 14, color: tokens.colors.mutedForeground, marginBottom: 4 },
  overview: {
    borderWidth: 1,
    borderColor: "rgba(78, 80, 231, 0.35)",
    backgroundColor: "rgba(78, 80, 231, 0.06)",
    padding: 14,
  },
  sectionCard: { padding: 14 },
  reqCard: { padding: 14 },
  cardTitle: { fontSize: 17, fontWeight: "800", color: tokens.colors.foreground },
  cardDesc: { fontSize: 14, color: tokens.colors.mutedForeground, marginTop: 6, lineHeight: 22 },
  reqHead: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  reqIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(78, 80, 231, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  reqIcon: { fontSize: 22 },
  reqTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  reqTitle: { fontSize: 16, fontWeight: "800", color: tokens.colors.foreground, flex: 1 },
  reqSub: { fontSize: 13, color: tokens.colors.mutedForeground, marginTop: 6 },
  detailRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  check: { color: tokens.colors.primary, fontWeight: "800", marginTop: 2 },
  detailText: { fontSize: 14, color: tokens.colors.mutedForeground, flex: 1, lineHeight: 22 },
  privRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  privBold: { fontWeight: "800", color: tokens.colors.foreground },
  footerCard: { marginTop: 4 },
  footerText: { fontSize: 13, color: tokens.colors.mutedForeground, textAlign: "center" },
});
