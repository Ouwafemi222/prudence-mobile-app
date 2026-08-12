import { useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../contexts/ThemeContext";
import {
  accountLinksFrom,
  getActivityProofSections,
  getPublicImageUrl,
  gigLinksFrom,
  type ActivityRow,
} from "../../lib/activityTypes";
import { Badge } from "../ui/Badge";

const PROOF_LABELS: Record<string, string> = {
  reading: "Reading proof",
  skill: "Skill proof",
  gig: "Gig proof",
  account: "Account proof",
  prospecting: "Prospecting proof",
  other: "Other proof",
};

export function DayReportSummary({ activity }: { activity?: Partial<ActivityRow> | null }) {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);

  if (!activity?.id && !activity?.submitted_at) {
    return <Text style={styles.empty}>No report submitted for this day.</Text>;
  }

  const proofs = getActivityProofSections(activity as ActivityRow);
  const gigLinks = gigLinksFrom(activity);
  const accountLinks = accountLinksFrom(activity);
  const tags = activity.submission_tags || [];
  const statusLabel = activity.is_verified ? "Approved" : activity.verified_at ? "Rejected" : "Pending";
  const statusVariant = activity.is_verified ? "success" : activity.verified_at ? "destructive" : "warning";

  return (
    <View style={styles.wrap}>
      <View style={styles.badges}>
        <Badge variant={statusVariant}>{statusLabel}</Badge>
        {tags.map((tag) => (
          <Badge key={tag} variant="outline">
            {tag}
          </Badge>
        ))}
      </View>
      <Text style={styles.line}>Pages: {activity.pages_read ?? 0}</Text>
      <Text style={styles.line}>
        Gigs: {activity.gigs_created ?? 0} · {activity.gig_platform || "—"}
      </Text>
      {gigLinks.length > 0 ? <Text style={styles.line}>Gig links: {gigLinks.join(", ")}</Text> : null}
      {activity.gig_notes?.trim() ? <Text style={styles.line}>Gig notes: {activity.gig_notes}</Text> : null}
      <Text style={styles.line}>Accounts: {activity.accounts_created ?? 0}</Text>
      {accountLinks.length > 0 ? <Text style={styles.line}>Account links: {accountLinks.join(", ")}</Text> : null}
      <Text style={styles.line}>
        Income: ${Number(activity.net_income ?? 0).toFixed(2)} net
        {activity.fiverr_fee != null ? ` · Fiverr fee $${Number(activity.fiverr_fee).toFixed(2)}` : ""}
      </Text>
      <Text style={styles.line}>
        Contacts: {activity.daily_contacts ?? 0} · Follow-ups: {activity.follow_ups ?? 0} · Converts:{" "}
        {activity.expected_conversions ?? 0}
      </Text>
      {activity.reading_notes?.trim() ? <Text style={styles.line}>Reading: {activity.reading_notes}</Text> : null}
      {activity.skill_learned ? <Text style={styles.line}>Skill: {activity.skill_learned}</Text> : null}
      {activity.skill_description?.trim() ? <Text style={styles.line}>{activity.skill_description}</Text> : null}
      {activity.other_activities ? <Text style={styles.line}>Other: {activity.other_activities}</Text> : null}
      {Object.entries(proofs).map(([section, paths]) =>
        paths.length === 0 ? null : (
          <View key={section} style={styles.proofBlock}>
            <Text style={styles.proofLabel}>
              {PROOF_LABELS[section] || `${section} proof`} ({paths.length})
            </Text>
            <View style={styles.proofRow}>
              {paths.map((path) => {
                const uri = getPublicImageUrl(path);
                if (!uri) return null;
                return (
                  <Pressable key={path} onPress={() => setLightboxUri(uri)} accessibilityRole="button">
                    <Image source={{ uri }} style={styles.proof} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        ),
      )}
      <Modal visible={!!lightboxUri} transparent animationType="fade" onRequestClose={() => setLightboxUri(null)}>
        <Pressable
          style={[styles.lightbox, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}
          onPress={() => setLightboxUri(null)}
        >
          {lightboxUri ? (
            <Image
              source={{ uri: lightboxUri }}
              style={{ width: winW - 24, height: Math.min(winH * 0.78, 720) }}
              resizeMode="contain"
            />
          ) : null}
          <Text style={styles.lightboxHint}>Tap to close</Text>
        </Pressable>
      </Modal>
    </View>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    wrap: { gap: 6 },
    empty: { fontSize: 14, color: tokens.colors.mutedForeground, lineHeight: 20 },
    badges: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    line: { fontSize: 14, color: tokens.colors.mutedForeground, lineHeight: 20 },
    proofBlock: { gap: 8, marginTop: 8 },
    proofLabel: { fontWeight: "700", color: tokens.colors.foreground, fontSize: 13 },
    proofRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    proof: { width: 148, height: 148, borderRadius: 10, backgroundColor: tokens.colors.surface },
    lightbox: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.92)",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    lightboxHint: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  });
