import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useAppTheme } from "../contexts/ThemeContext";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useAppBranding } from "../hooks/useAppBranding";
import { openSitePath } from "../lib/openSite";

export function AccountRejectedScreen() {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  const { signOut } = useAuth();
  const { appName } = useAppBranding();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.brand}>{appName}</Text>
      <Card>
        <Text style={styles.title}>Account not approved</Text>
        <Text style={styles.body}>
          Your registration was reviewed and could not be approved. If you believe this is a mistake,
          contact your trainer or office admin.
        </Text>
        <View style={styles.actions}>
          <Button title="Send feedback" variant="outline" onPress={() => void openSitePath("/suggestions")} />
          <Button title="Sign out" onPress={() => void signOut()} />
        </View>
      </Card>
    </ScrollView>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: tokens.colors.background },
    container: { padding: 20, paddingTop: 48, gap: 16 },
    brand: {
      fontSize: 22,
      fontWeight: "800",
      color: tokens.colors.foreground,
      textAlign: "center",
    },
    title: {
      fontSize: 20,
      fontWeight: "800",
      color: tokens.colors.destructive,
      marginBottom: 10,
    },
    body: {
      fontSize: 15,
      lineHeight: 22,
      color: tokens.colors.mutedForeground,
      marginBottom: 16,
    },
    actions: { gap: 10 },
  });
