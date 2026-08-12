import { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../contexts/AuthContext";
import { useAppTheme } from "../contexts/ThemeContext";
import { useAppBranding } from "../hooks/useAppBranding";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

export function WaitingApprovalScreen() {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  const { profile, office, signOut, refreshProfile } = useAuth();
  const { appName } = useAppBranding();
  const adminNotified = useRef(false);

  useEffect(() => {
    if (!profile || profile.approval_status !== "pending") return;
    if (adminNotified.current) return;
    adminNotified.current = true;
    supabase.functions.invoke("notify-admin-signup").catch((err) => {
      console.warn("Admin signup notification failed:", err);
    });
  }, [profile]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.brand}>{appName}</Text>
      {office ? <Text style={styles.sub}>Powered by THE PRUDENCE</Text> : null}
      <Card>
        <Text style={styles.title}>Account pending approval</Text>
        <Text style={styles.body}>
          Your account has been created and is awaiting approval from a trainer or administrator.
        </Text>
        {profile ? (
          <View style={styles.details}>
            <Text style={styles.detailName}>{profile.full_name}</Text>
            <Text style={styles.muted}>@{profile.username}</Text>
            {profile.sponsor_username ? (
              <Text style={styles.muted}>Sponsor: @{profile.sponsor_username}</Text>
            ) : null}
            {office ? <Text style={styles.muted}>Office: {office.name}</Text> : null}
          </View>
        ) : null}
        <View style={styles.actions}>
          <Button title="Check status" variant="outline" onPress={() => void refreshProfile()} />
          <Button title="Sign out" onPress={() => void signOut()} />
        </View>
      </Card>
    </ScrollView>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: tokens.colors.background },
    container: { padding: 20, paddingTop: 48, gap: 12 },
    brand: { fontSize: 22, fontWeight: "800", color: tokens.colors.foreground, textAlign: "center" },
    sub: { textAlign: "center", color: tokens.colors.mutedForeground, marginBottom: 8 },
    title: { fontSize: 20, fontWeight: "800", color: tokens.colors.foreground, marginBottom: 8 },
    body: { fontSize: 15, lineHeight: 22, color: tokens.colors.mutedForeground, marginBottom: 14 },
    details: {
      backgroundColor: tokens.colors.cardMuted,
      borderRadius: tokens.radius.md,
      padding: 12,
      marginBottom: 14,
      gap: 4,
    },
    detailName: { fontWeight: "700", color: tokens.colors.foreground },
    muted: { color: tokens.colors.mutedForeground, fontSize: 13 },
    actions: { gap: 10 },
  });
