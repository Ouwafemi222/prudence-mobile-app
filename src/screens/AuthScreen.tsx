import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "../contexts/AuthContext";
import { useAppTheme } from "../contexts/ThemeContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

type Mode = "signin" | "signup" | "forgot";
const BIOMETRIC_EMAIL_KEY = "pp.biometric.email";
const BIOMETRIC_PASSWORD_KEY = "pp.biometric.password";

export function AuthScreen() {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  const { signIn, signUp, resetPasswordForEmail } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");

  const [loading, setLoading] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [canUseBiometric, setCanUseBiometric] = useState(false);
  const [hasStoredBiometricCreds, setHasStoredBiometricCreds] = useState(false);

  // Sign In
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Sign Up
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [sponsorUsername, setSponsorUsername] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Forgot Password
  const [forgotEmail, setForgotEmail] = useState("");

  const validateUsername = (u: string) => /^[a-z0-9_]+$/.test(u);

  const checkBiometricReadiness = async () => {
    try {
      const [hasHardware, enrolled, storedEmail, storedPassword] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY),
        SecureStore.getItemAsync(BIOMETRIC_PASSWORD_KEY),
      ]);
      setCanUseBiometric(hasHardware && enrolled);
      setHasStoredBiometricCreds(Boolean(storedEmail && storedPassword));
    } catch {
      setCanUseBiometric(false);
      setHasStoredBiometricCreds(false);
    }
  };

  useEffect(() => {
    void checkBiometricReadiness();
  }, []);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    const result = await signIn(email.trim(), password);
    setLoading(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    if (canUseBiometric) {
      try {
        await Promise.all([
          SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, email.trim()),
          SecureStore.setItemAsync(BIOMETRIC_PASSWORD_KEY, password),
        ]);
        setHasStoredBiometricCreds(true);
      } catch {
        // Ignore storage failures; regular sign-in already succeeded.
      }
    }
  };

  const clearSavedBiometricLogin = async () => {
    try {
      await Promise.all([SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY), SecureStore.deleteItemAsync(BIOMETRIC_PASSWORD_KEY)]);
      setHasStoredBiometricCreds(false);
      setSuccess("Saved Face/Fingerprint login removed. Sign in with email and password.");
      setError(null);
    } catch {
      setError("Could not clear saved login.");
    }
  };

  const handleBiometricSignIn = async () => {
    if (!canUseBiometric || !hasStoredBiometricCreds) return;
    setBiometricBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const auth = await LocalAuthentication.authenticateAsync({
        promptMessage: "Sign in with biometrics",
        cancelLabel: "Cancel",
        fallbackLabel: "Use passcode",
      });
      if (!auth.success) {
        if (auth.error !== "user_cancel") setError("Biometric authentication failed.");
        return;
      }

      const [savedEmail, savedPassword] = await Promise.all([
        SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY),
        SecureStore.getItemAsync(BIOMETRIC_PASSWORD_KEY),
      ]);
      if (!savedEmail || !savedPassword) {
        setError("No saved biometric credentials. Sign in once with email and password.");
        setHasStoredBiometricCreds(false);
        return;
      }
      setEmail(savedEmail);
      const result = await signIn(savedEmail, savedPassword);
      if (result.error) setError(result.error.message);
    } finally {
      setBiometricBusy(false);
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const e = email.trim();
    const u = username.trim().toLowerCase();
    const sponsor = sponsorUsername.trim().toLowerCase();
    const full = fullName.trim();

    if (!full || full.length < 2) {
      setLoading(false);
      setError("Full name is required.");
      return;
    }
    if (!e || !e.includes("@")) {
      setLoading(false);
      setError("Enter a valid email.");
      return;
    }
    if (!u || u.length < 3 || !validateUsername(u)) {
      setLoading(false);
      setError("Username must be 3+ chars and use only lowercase letters, numbers, and underscores.");
      return;
    }
    if (password.length < 6) {
      setLoading(false);
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setLoading(false);
      setError("Passwords don't match.");
      return;
    }

    const result = await signUp(e, password, {
      full_name: full,
      username: u,
      sponsor_username: sponsor ? sponsor : null,
    });

    setLoading(false);
    if (result.error) setError(result.error.message);
    else setSuccess("Account created! If approved, you will gain access.");
  };

  const handleReset = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const e = forgotEmail.trim();
    if (!e || !e.includes("@")) {
      setLoading(false);
      setError("Enter your email.");
      return;
    }

    const result = await resetPasswordForEmail(e);
    setLoading(false);
    if (result.error) setError(result.error.message);
    else setSuccess("Check your email for the reset link.");
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <View style={styles.logoDot} />
        <Text style={styles.brand}>PRUDENCE PATH</Text>
        <Text style={styles.brandSub}>Accountability and Training</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.modeRow}>
          <Pressable onPress={() => setMode("signin")} style={[styles.modeBtn, mode === "signin" ? styles.modeBtnActive : null]}>
            <Text style={[styles.modeText, mode === "signin" ? styles.modeTextActive : null]}>Sign In</Text>
          </Pressable>
          <Pressable onPress={() => setMode("signup")} style={[styles.modeBtn, mode === "signup" ? styles.modeBtnActive : null]}>
            <Text style={[styles.modeText, mode === "signup" ? styles.modeTextActive : null]}>Sign Up</Text>
          </Pressable>
          <Pressable onPress={() => setMode("forgot")} style={[styles.modeBtn, mode === "forgot" ? styles.modeBtnActive : null]}>
            <Text style={[styles.modeText, mode === "forgot" ? styles.modeTextActive : null]}>Reset</Text>
          </Pressable>
        </View>

        <Text style={styles.title}>
          {mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset your password"}
        </Text>

        {mode === "signin" ? (
          <>
            <Input value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" />
            <Input value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry passwordToggle />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {success ? <Text style={styles.success}>{success}</Text> : null}
            <Button title="Continue" onPress={handleSignIn} loading={loading} disabled={loading} style={{ marginTop: 8 }} />
            {canUseBiometric ? (
              <Button
                title={biometricBusy ? "Checking biometrics..." : "Use Face/Fingerprint"}
                variant="outline"
                onPress={handleBiometricSignIn}
                loading={biometricBusy}
                disabled={biometricBusy || !hasStoredBiometricCreds}
                style={{ marginTop: 8 }}
              />
            ) : null}
            {canUseBiometric && !hasStoredBiometricCreds ? (
              <Text style={styles.hint}>Sign in once with email/password to enable biometric login on this device.</Text>
            ) : null}
            {hasStoredBiometricCreds ? (
              <Pressable onPress={clearSavedBiometricLogin} accessibilityRole="button">
                <Text style={styles.linkMuted}>Remove saved Face/Fingerprint login</Text>
              </Pressable>
            ) : null}
            <Text style={styles.hint}>
              Use the same Supabase project as the website: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env (no extra quotes).
            </Text>
          </>
        ) : mode === "signup" ? (
          <>
            <Input value={fullName} onChangeText={setFullName} placeholder="Full Name" />
            <Input value={username} onChangeText={setUsername} placeholder="Username (lowercase, _ )" />
            <Input value={sponsorUsername} onChangeText={setSponsorUsername} placeholder="Sponsor Username (optional)" />
            <Input value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" />
            <Input value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry passwordToggle />
            <Input
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm Password"
              secureTextEntry
              passwordToggle
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {success ? <Text style={styles.success}>{success}</Text> : null}
            <Button title="Create Account" onPress={handleSignUp} loading={loading} disabled={loading} style={{ marginTop: 8 }} />
          </>
        ) : (
          <>
            <Input value={forgotEmail} onChangeText={setForgotEmail} placeholder="Email" keyboardType="email-address" />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {success ? <Text style={styles.success}>{success}</Text> : null}
            <Button title="Send Reset Link" onPress={handleReset} loading={loading} disabled={loading} style={{ marginTop: 8 }} />
          </>
        )}
      </View>
    </ScrollView>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.colors.background,
  },
  container: {
    padding: 20,
    justifyContent: "center",
    paddingBottom: 32,
  },
  hero: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  logoDot: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: tokens.colors.borderGlow,
    backgroundColor: tokens.colors.surface,
    marginBottom: 10,
    shadowColor: tokens.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  brand: {
    fontSize: 20,
    fontWeight: "800",
    color: tokens.colors.foreground,
  },
  brandSub: {
    marginTop: 4,
    fontSize: 13,
    color: tokens.colors.mutedForeground,
  },
  card: {
    backgroundColor: tokens.colors.card,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    padding: 14,
    shadowColor: tokens.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 3,
    gap: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: tokens.colors.foreground,
    marginBottom: 6,
  },
  modeRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 2,
    marginBottom: 10,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    alignItems: "center",
  },
  modeBtnActive: {
    backgroundColor: tokens.colors.primary,
    borderColor: tokens.colors.primary,
  },
  modeText: {
    color: tokens.colors.mutedForeground,
    fontWeight: "700",
    fontSize: 13,
  },
  modeTextActive: {
    color: tokens.colors.primaryForeground,
  },
  error: {
    color: tokens.colors.destructive,
    fontSize: 13,
  },
  success: {
    color: tokens.colors.success,
    fontSize: 13,
  },
  hint: {
    color: tokens.colors.mutedForeground,
    fontSize: 12,
    marginTop: 4,
  },
  linkMuted: {
    color: tokens.colors.mutedForeground,
    fontSize: 12,
    marginTop: 8,
    textDecorationLine: "underline",
  },
  });
