import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "../contexts/AuthContext";
import { useAppTheme } from "../contexts/ThemeContext";
import { Logo } from "../components/brand/Logo";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { KeyboardSafeScroll } from "../components/ui/KeyboardSafe";
import { supabase } from "../integrations/supabase/client";
import type { RootStackParamList } from "../navigation/types";

type Mode = "signin" | "signup" | "forgot";
const BIOMETRIC_EMAIL_KEY = "pp.biometric.email";
const BIOMETRIC_PASSWORD_KEY = "pp.biometric.password";

export function AuthScreen() {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  const route = useRoute<RouteProp<RootStackParamList, "Auth">>();
  const { signIn, signUp, resetPasswordForEmail, resendConfirmationEmail } = useAuth();

  const officeFromLink = (route.params?.office || "").toLowerCase();
  const sponsorFromLink = (route.params?.sponsor || "").toLowerCase();
  const initialMode: Mode =
    route.params?.tab === "signup" ? "signup" : route.params?.tab === "forgot" ? "forgot" : "signin";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [canUseBiometric, setCanUseBiometric] = useState(false);
  const [hasStoredBiometricCreds, setHasStoredBiometricCreds] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [sponsorUsername, setSponsorUsername] = useState(sponsorFromLink);
  const [officeSlug, setOfficeSlug] = useState(officeFromLink);
  const [officeName, setOfficeName] = useState<string | null>(null);
  const [officeValid, setOfficeValid] = useState<boolean | null>(officeFromLink ? null : null);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const validateUsername = (u: string) => /^[a-z0-9_]+$/.test(u);

  useEffect(() => {
    if (route.params?.confirmed === "1") {
      setSuccess("Email confirmed! Sign in to continue.");
      setMode("signin");
    }
    if (route.params?.tab === "signup") setMode("signup");
    if (route.params?.office) setOfficeSlug(route.params.office.toLowerCase());
    if (route.params?.sponsor) setSponsorUsername(route.params.sponsor.toLowerCase());
  }, [route.params]);

  useEffect(() => {
    const slug = officeSlug.trim().toLowerCase();
    if (!slug) {
      setOfficeName(null);
      setOfficeValid(null);
      return;
    }
    let cancelled = false;
    void supabase
      .from("offices")
      .select("name")
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle()
      .then(({ data, error: officeError }) => {
        if (cancelled) return;
        if (officeError || !data) {
          setOfficeName(null);
          setOfficeValid(false);
        } else {
          setOfficeName(data.name);
          setOfficeValid(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [officeSlug]);

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
      if (result.error.message.includes("Email not confirmed")) {
        setError("Please confirm your email before signing in.");
        setPendingEmail(email.trim().toLowerCase());
        return;
      }
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
      await Promise.all([
        SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY),
        SecureStore.deleteItemAsync(BIOMETRIC_PASSWORD_KEY),
      ]);
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

    const e = email.trim().toLowerCase();
    const u = username.trim().toLowerCase();
    const sponsor = sponsorUsername.trim().toLowerCase();
    const full = fullName.trim();
    const slug = officeSlug.trim().toLowerCase();

    if (!slug) {
      setLoading(false);
      setError("You need an office invite slug to sign up. Ask your office admin or sponsor.");
      return;
    }
    if (officeValid === false) {
      setLoading(false);
      setError("This office link is invalid or inactive. Check the slug and try again.");
      return;
    }
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
    if (sponsor && !validateUsername(sponsor)) {
      setLoading(false);
      setError("Sponsor username can only contain lowercase letters, numbers, and underscores.");
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

    await supabase.functions.invoke("prepare-signup", { body: { email: e } });

    const { data: officeId, error: officeError } = await supabase.rpc("get_office_id_by_slug", {
      p_slug: slug,
    });
    if (officeError || !officeId) {
      setLoading(false);
      setError("Could not verify office. Check your invite slug.");
      return;
    }

    if (sponsor) {
      const { data: sponsorOk, error: sponsorError } = await supabase.rpc("is_sponsor_in_office", {
        p_sponsor_username: sponsor,
        p_office_id: officeId,
      });
      if (sponsorError || !sponsorOk) {
        setLoading(false);
        setError("Sponsor not found in this office. Check the username or leave blank.");
        return;
      }
    }

    const { data: usernameAvailable, error: usernameCheckError } = await supabase.rpc(
      "is_username_available",
      { p_username: u, p_office_id: officeId },
    );
    if (usernameCheckError) {
      setLoading(false);
      setError(usernameCheckError.message);
      return;
    }
    if (!usernameAvailable) {
      setLoading(false);
      setError("Username already taken or reserved in this office.");
      return;
    }

    const signupMeta = {
      full_name: full,
      username: u,
      sponsor_username: sponsor || null,
      office_slug: slug,
    };

    let result = await signUp(e, password, signupMeta);
    if (result.error?.message.includes("User already registered")) {
      await supabase.functions.invoke("prepare-signup", { body: { email: e } });
      result = await signUp(e, password, signupMeta);
    }

    setLoading(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setPendingEmail(e);
    setSuccess("Check your email to confirm your account before your profile is created.");
  };

  const handleResend = async () => {
    const target = pendingEmail || email.trim();
    if (!target) return;
    setResending(true);
    const { error: resendError } = await resendConfirmationEmail(target);
    setResending(false);
    if (resendError) setError(resendError.message);
    else setSuccess("Confirmation email sent again.");
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
    else setSuccess("Check your email for the reset link. Open it on this phone.");
  };

  return (
    <KeyboardSafeScroll style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Logo size={72} style={styles.logo} />
        <Text style={styles.brand}>THE PRUDENCE</Text>
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
            <Button title="Continue" onPress={() => void handleSignIn()} loading={loading} disabled={loading} style={{ marginTop: 8 }} />
            {pendingEmail ? (
              <Button
                title="Resend confirmation email"
                variant="outline"
                onPress={() => void handleResend()}
                loading={resending}
                disabled={resending}
              />
            ) : null}
            {canUseBiometric ? (
              <Button
                title={biometricBusy ? "Checking biometrics..." : "Use Face/Fingerprint"}
                variant="outline"
                onPress={() => void handleBiometricSignIn()}
                loading={biometricBusy}
                disabled={biometricBusy || !hasStoredBiometricCreds}
                style={{ marginTop: 8 }}
              />
            ) : null}
            {canUseBiometric && !hasStoredBiometricCreds ? (
              <Text style={styles.hint}>Sign in once with email/password to enable biometric login on this device.</Text>
            ) : null}
            {hasStoredBiometricCreds ? (
              <Pressable onPress={() => void clearSavedBiometricLogin()} accessibilityRole="button">
                <Text style={styles.linkMuted}>Remove saved Face/Fingerprint login</Text>
              </Pressable>
            ) : null}
          </>
        ) : mode === "signup" ? (
          <>
            <Input
              value={officeSlug}
              onChangeText={(v) => setOfficeSlug(v.toLowerCase())}
              placeholder="Office slug (from invite link)"
            />
            {officeValid === true && officeName ? (
              <Text style={styles.success}>Joining {officeName}</Text>
            ) : null}
            {officeValid === false ? <Text style={styles.error}>Office not found or inactive.</Text> : null}
            <Input value={fullName} onChangeText={setFullName} placeholder="Full Name" />
            <Input value={username} onChangeText={setUsername} placeholder="Username (lowercase, _ )" />
            <Input
              value={sponsorUsername}
              onChangeText={setSponsorUsername}
              placeholder="Sponsor Username (optional)"
            />
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
            <Button title="Create Account" onPress={() => void handleSignUp()} loading={loading} disabled={loading} style={{ marginTop: 8 }} />
            {pendingEmail ? (
              <Button title="Resend confirmation email" variant="outline" onPress={() => void handleResend()} loading={resending} />
            ) : null}
            <Text style={styles.hint}>
              Use your office invite: prudence://auth?tab=signup&office=your-office&sponsor=username
            </Text>
          </>
        ) : (
          <>
            <Input value={forgotEmail} onChangeText={setForgotEmail} placeholder="Email" keyboardType="email-address" />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {success ? <Text style={styles.success}>{success}</Text> : null}
            <Button title="Send Reset Link" onPress={() => void handleReset()} loading={loading} disabled={loading} style={{ marginTop: 8 }} />
          </>
        )}
      </View>
    </KeyboardSafeScroll>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: tokens.colors.background },
    container: { padding: 20, justifyContent: "center", paddingBottom: 32 },
    hero: { alignItems: "center", marginTop: 8, marginBottom: 16 },
    logo: {
      marginBottom: 10,
    },
    brand: { fontSize: 20, fontWeight: "800", color: tokens.colors.foreground },
    brandSub: { marginTop: 4, fontSize: 13, color: tokens.colors.mutedForeground },
    card: {
      backgroundColor: tokens.colors.card,
      borderWidth: 1,
      borderColor: tokens.colors.border,
      borderRadius: tokens.radius.lg,
      padding: 14,
      shadowColor: tokens.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 3,
      gap: 10,
    },
    title: { fontSize: 22, fontWeight: "800", color: tokens.colors.foreground, marginBottom: 6 },
    modeRow: { flexDirection: "row", gap: 8, paddingHorizontal: 2, marginBottom: 10 },
    modeBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: tokens.radius.md,
      borderWidth: 1,
      borderColor: tokens.colors.border,
      alignItems: "center",
    },
    modeBtnActive: { backgroundColor: tokens.colors.primary, borderColor: tokens.colors.primary },
    modeText: { color: tokens.colors.mutedForeground, fontWeight: "700", fontSize: 13 },
    modeTextActive: { color: tokens.colors.primaryForeground },
    error: { color: tokens.colors.destructive, fontSize: 13 },
    success: { color: tokens.colors.success, fontSize: 13 },
    hint: { color: tokens.colors.mutedForeground, fontSize: 12, marginTop: 4 },
    linkMuted: {
      color: tokens.colors.mutedForeground,
      fontSize: 12,
      marginTop: 8,
      textDecorationLine: "underline",
    },
  });
