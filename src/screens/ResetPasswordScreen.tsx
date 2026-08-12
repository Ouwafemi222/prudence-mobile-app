import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import * as Linking from "expo-linking";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../contexts/AuthContext";
import { useAppTheme } from "../contexts/ThemeContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { KeyboardSafeScroll } from "../components/ui/KeyboardSafe";
import type { RootStackParamList } from "../navigation/types";

function parseCodeFromUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = Linking.parse(url);
    const fromQuery = parsed.queryParams?.code;
    if (typeof fromQuery === "string" && fromQuery) return fromQuery;
  } catch {
    // ignore
  }
  return null;
}

export function ResetPasswordScreen() {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  const { clearPasswordRecovery, signOut } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && !cancelled) {
        setReady(true);
        setVerifying(false);
      }
    });

    const resolve = async () => {
      const url = await Linking.getInitialURL();
      const code = parseCodeFromUrl(url);
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (exchangeError) {
          setError(exchangeError.message);
          setReady(false);
          setVerifying(false);
          return;
        }
        setReady(true);
        setVerifying(false);
        return;
      }
      setTimeout(() => {
        if (!cancelled) setVerifying(false);
      }, 800);
    };

    void resolve();
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSuccess("Password updated. Sign in with your new password.");
    clearPasswordRecovery();
    await signOut();
    navigation.navigate("Auth");
  };

  return (
    <KeyboardSafeScroll style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.brand}>THE PRUDENCE</Text>
      <Text style={styles.title}>Set new password</Text>
      {verifying ? <Text style={styles.hint}>Verifying reset link…</Text> : null}
      {!verifying && !ready ? (
        <Text style={styles.error}>
          {error || "This reset link is invalid or expired. Request a new one from Sign In → Reset."}
        </Text>
      ) : null}
      {ready ? (
        <>
          <Input value={password} onChangeText={setPassword} placeholder="New password" secureTextEntry passwordToggle />
          <Input
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm password"
            secureTextEntry
            passwordToggle
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {success ? <Text style={styles.success}>{success}</Text> : null}
          <Button title="Update password" onPress={() => void handleSubmit()} loading={loading} disabled={loading} />
        </>
      ) : null}
      <Button title="Back to Sign In" variant="ghost" onPress={() => navigation.navigate("Auth")} />
    </KeyboardSafeScroll>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: tokens.colors.background },
    container: { padding: 20, paddingTop: 48, gap: 12 },
    brand: {
      fontSize: 22,
      fontWeight: "800",
      color: tokens.colors.foreground,
      textAlign: "center",
    },
    title: { fontSize: 20, fontWeight: "800", color: tokens.colors.foreground },
    hint: { color: tokens.colors.mutedForeground, fontSize: 14 },
    error: { color: tokens.colors.destructive, fontSize: 13 },
    success: { color: tokens.colors.success, fontSize: 13 },
  });
