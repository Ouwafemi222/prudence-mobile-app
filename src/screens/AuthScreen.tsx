import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { tokens } from "../theme/tokens";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

type Mode = "signin" | "signup" | "forgot";

export function AuthScreen() {
  const { signIn, signUp, resetPasswordForEmail } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    const result = await signIn(email.trim(), password);
    setLoading(false);
    if (result.error) setError(result.error.message);
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
            <Input value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {success ? <Text style={styles.success}>{success}</Text> : null}
            <Button title="Continue" onPress={handleSignIn} loading={loading} disabled={loading} style={{ marginTop: 8 }} />
          </>
        ) : mode === "signup" ? (
          <>
            <Input value={fullName} onChangeText={setFullName} placeholder="Full Name" />
            <Input value={username} onChangeText={setUsername} placeholder="Username (lowercase, _ )" />
            <Input value={sponsorUsername} onChangeText={setSponsorUsername} placeholder="Sponsor Username (optional)" />
            <Input value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" />
            <Input value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
            <Input value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm Password" secureTextEntry />
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

const styles = StyleSheet.create({
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
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: tokens.colors.primary,
    marginBottom: 10,
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
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
});
