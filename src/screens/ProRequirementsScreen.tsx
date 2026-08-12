import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { fetchOfficeProRequirements, type OfficeProRequirement } from "../lib/officeContent";
import { useAppTheme } from "../contexts/ThemeContext";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";

export function ProRequirementsScreen() {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  const { officeId, office } = useAuth();
  const [loading, setLoading] = useState(true);
  const [requirements, setRequirements] = useState<OfficeProRequirement[]>([]);
  const [privileges, setPrivileges] = useState<string[]>([]);
  const [subtitle, setSubtitle] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!officeId) {
        setRequirements([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      void fetchOfficeProRequirements(officeId)
        .then((result) => {
          setRequirements(result.requirements);
          setPrivileges(result.privileges);
          setSubtitle(result.meta?.subtitle ?? null);
          setNotice(result.meta?.notice_text ?? null);
        })
        .catch(() => setRequirements([]))
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
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.lead}>{subtitle || `Pro path for ${office?.name || "your office"}.`}</Text>
      {notice ? <Text style={styles.body}>{notice}</Text> : null}
      {requirements.length === 0 ? (
        <Text style={styles.body}>No pro requirements published yet.</Text>
      ) : (
        requirements.map((req) => (
          <Card key={req.id}>
            <CardHeader>
              <View style={styles.row}>
                <Badge variant="outline">{req.icon_key}</Badge>
                <Text style={styles.title}>{req.title}</Text>
              </View>
            </CardHeader>
            <CardContent style={{ gap: 8 }}>
              {req.description ? <Text style={styles.body}>{req.description}</Text> : null}
              {req.details.map((detail) => (
                <Text key={detail} style={styles.body}>
                  • {detail}
                </Text>
              ))}
            </CardContent>
          </Card>
        ))
      )}
      {privileges.length > 0 ? (
        <Card>
          <CardHeader>
            <Text style={styles.title}>Pro privileges</Text>
          </CardHeader>
          <CardContent style={{ gap: 8 }}>
            {privileges.map((item) => (
              <Text key={item} style={styles.body}>
                • {item}
              </Text>
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
    row: { flexDirection: "row", alignItems: "center", gap: 8 },
    title: { fontSize: 17, fontWeight: "800", color: tokens.colors.foreground, flex: 1 },
    body: { fontSize: 14, color: tokens.colors.mutedForeground, lineHeight: 22 },
  });
