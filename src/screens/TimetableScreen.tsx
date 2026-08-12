import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { fetchOfficeTimetable, type OfficeTimetableSlot } from "../lib/officeContent";
import { useAppTheme } from "../contexts/ThemeContext";
import { Card, CardContent, CardDescription, CardHeader } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";

export function TimetableScreen() {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  const { officeId, office } = useAuth();
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<OfficeTimetableSlot[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [subtitle, setSubtitle] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!officeId) {
        setSlots([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      void fetchOfficeTimetable(officeId)
        .then((result) => {
          setSlots(result.slots);
          setNotes(result.notes);
          setSubtitle(result.meta?.subtitle ?? null);
        })
        .catch(() => setSlots([]))
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
      <Text style={styles.lead}>{subtitle || `Daily schedule for ${office?.name || "your office"}.`}</Text>
      <Card style={styles.sectionCard}>
        <CardHeader>
          <Text style={styles.cardTitle}>Daily schedule</Text>
          <CardDescription>
            <Text style={styles.cardDesc}>Office-scoped timetable from the website CMS</Text>
          </CardDescription>
        </CardHeader>
        <CardContent style={{ gap: 12 }}>
          {slots.length === 0 ? (
            <Text style={styles.cardDesc}>No timetable slots published yet.</Text>
          ) : (
            slots.map((item) => (
              <View key={item.id} style={styles.slot}>
                <View style={styles.slotTop}>
                  <Badge variant="outline">{item.time_label}</Badge>
                  <Text style={styles.activityTitle}>{item.activity}</Text>
                </View>
                {item.description ? <Text style={styles.activityDesc}>{item.description}</Text> : null}
              </View>
            ))
          )}
        </CardContent>
      </Card>
      {notes.length > 0 ? (
        <Card style={styles.notesCard}>
          <CardHeader>
            <Text style={styles.cardTitle}>Important notes</Text>
          </CardHeader>
          <CardContent style={{ gap: 12 }}>
            {notes.map((text) => (
              <View key={text} style={styles.noteRow}>
                <Text style={styles.noteBullet}>•</Text>
                <Text style={styles.noteText}>{text}</Text>
              </View>
            ))}
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
    lead: { fontSize: 14, color: tokens.colors.mutedForeground },
    sectionCard: {},
    notesCard: {},
    cardTitle: { fontSize: 17, fontWeight: "800", color: tokens.colors.foreground },
    cardDesc: { fontSize: 13, color: tokens.colors.mutedForeground },
    slot: { gap: 6, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tokens.colors.border },
    slotTop: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
    activityTitle: { fontWeight: "800", color: tokens.colors.foreground, flex: 1 },
    activityDesc: { fontSize: 13, color: tokens.colors.mutedForeground, lineHeight: 20 },
    noteRow: { flexDirection: "row", gap: 8 },
    noteBullet: { color: tokens.colors.primary, fontWeight: "800" },
    noteText: { flex: 1, color: tokens.colors.mutedForeground, lineHeight: 20 },
  });
