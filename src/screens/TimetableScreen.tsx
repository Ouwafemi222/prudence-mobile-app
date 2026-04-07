import { ScrollView, StyleSheet, Text, View } from "react-native";
import { tokens } from "../theme/tokens";
import { Card, CardContent, CardDescription, CardHeader } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";

const SCHEDULE: { time: string; activity: string; description: string }[] = [
  { time: "9:00 AM - 11:00 AM", activity: "General Training", description: "General training sessions for all members" },
  { time: "11:01 AM - 11:30 AM", activity: "Break Time", description: "Break period for rest and refreshment" },
  { time: "11:31 AM - 1:00 PM", activity: "Skill Acquisition", description: "Focus on learning and developing your chosen skills" },
  { time: "1:01 PM - 3:00 PM", activity: "Personal Activities", description: "Time for personal work and individual tasks" },
  { time: "3:01 PM - 3:30 PM", activity: "Neolife Basics", description: "Learning and understanding Neolife fundamentals" },
  { time: "3:31 PM - 4:00 PM", activity: "General Book Reading", description: "Dedicated time for reading and learning from books" },
  { time: "4:00 PM - 4:30 PM", activity: "Personal Activities", description: "Continue with personal work and tasks" },
  { time: "4:31 PM - 5:00 PM", activity: "To Do Reviewing", description: "Review and assess daily todos and tasks" },
];

const NOTES: { title: string; text: string }[] = [
  {
    title: "Mandatory",
    text: "This timetable must be followed by everyone in the office.",
  },
  {
    title: "Daily Reports",
    text: "Must be submitted before 10:00 PM (Nigeria time). Submissions are locked after this time.",
  },
  {
    title: "Punctuality",
    text: "Late coming starts by 9:15am (10 frog jumps per min or #50 per min).",
  },
  {
    title: "Daily Todo",
    text: "All daily todos must be written/submitted on the website before 9am.",
  },
];

export function TimetableScreen() {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.lead}>Recommended daily schedule for PRUDENCE PATH members — same as the website.</Text>

      <Card style={styles.sectionCard}>
        <CardHeader>
          <Text style={styles.cardTitle}>🕐 Daily schedule</Text>
          <CardDescription>
            <Text style={styles.cardDesc}>Recommended time allocation for daily activities</Text>
          </CardDescription>
        </CardHeader>
        <CardContent style={{ gap: 12 }}>
          {SCHEDULE.map((item, index) => (
            <View key={index} style={styles.slot}>
              <View style={styles.slotTop}>
                <Badge variant="outline">{item.time}</Badge>
                <Text style={styles.activityTitle}>{item.activity}</Text>
              </View>
              <Text style={styles.activityDesc}>{item.description}</Text>
            </View>
          ))}
        </CardContent>
      </Card>

      <Card style={styles.notesCard}>
        <CardHeader>
          <Text style={styles.cardTitle}>Important notes</Text>
        </CardHeader>
        <CardContent style={{ gap: 12 }}>
          {NOTES.map((n) => (
            <View key={n.title} style={styles.noteRow}>
              <Text style={styles.noteBullet}>•</Text>
              <Text style={styles.noteText}>
                <Text style={styles.noteStrong}>{n.title}:</Text> {n.text}
              </Text>
            </View>
          ))}
        </CardContent>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: tokens.colors.background },
  container: { padding: 18, paddingBottom: 36, gap: 14 },
  lead: { fontSize: 14, color: tokens.colors.mutedForeground, marginBottom: 4 },
  sectionCard: { padding: 14 },
  notesCard: {
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(78, 80, 231, 0.35)",
    backgroundColor: "rgba(78, 80, 231, 0.06)",
  },
  cardTitle: { fontSize: 17, fontWeight: "800", color: tokens.colors.foreground },
  cardDesc: { fontSize: 13, color: tokens.colors.mutedForeground, marginTop: 4 },
  slot: {
    padding: 14,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.accent,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.colors.border,
    gap: 8,
  },
  slotTop: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  activityTitle: { fontSize: 16, fontWeight: "800", color: tokens.colors.foreground, flex: 1 },
  activityDesc: { fontSize: 13, color: tokens.colors.mutedForeground },
  noteRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  noteBullet: { color: tokens.colors.primary, fontWeight: "800", marginTop: 3 },
  noteText: { fontSize: 14, color: tokens.colors.mutedForeground, flex: 1, lineHeight: 22 },
  noteStrong: { fontWeight: "800", color: tokens.colors.foreground },
});
