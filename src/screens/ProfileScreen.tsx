import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { AppTabParamList } from "../navigation/AppTabs";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { useMainAppNavigation } from "../hooks/useMainAppNavigation";
import { supabase } from "../integrations/supabase/client";
import { getLocalUriAsUploadBody } from "../lib/localFileForUpload";
import { formatSupabaseError } from "../lib/supabaseError";
import { useAppTheme } from "../contexts/ThemeContext";
import { useTabBarContentPaddingBottom } from "../hooks/useTabBarContentPaddingBottom";
import { useNigeriaTimeGreeting } from "../hooks/useNigeriaTimeGreeting";
import {
  applySubmissionLocalReminders,
  DEFAULT_SUBMISSION_REMINDER_PREFS,
  loadSubmissionReminderPrefs,
  saveSubmissionReminderPrefs,
  type MinutesBeforeOption,
  type SubmissionReminderPrefs,
} from "../lib/submissionLocalReminders";
import {
  DEFAULT_PUSH_PREFS,
  parsePushPrefs,
  prefsToJsonb,
  type PushNotificationPrefs,
} from "../lib/pushNotificationPrefs";
import { Card } from "../components/ui/Card";
import { KeyboardSafeScroll } from "../components/ui/KeyboardSafe";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Avatar } from "../components/ui/Avatar";
import { PdfViewerModal } from "../components/PdfViewerModal";
import { openSitePath } from "../lib/openSite";

function resolveAvatarPublicUrl(avatarPathOrUrl: string | null | undefined): string | null {
  if (!avatarPathOrUrl?.trim()) return null;
  const v = avatarPathOrUrl.trim();
  if (/^https?:\/\//i.test(v)) return v;
  return supabase.storage.from("avatars").getPublicUrl(v).data.publicUrl;
}

type TabKey = "profile" | "skills" | "notifications" | "security";

type UserSkill = {
  skill_id: string;
  skill_name: string;
  status: string;
  is_mandatory: boolean;
  training_plan_pdf_path: string | null;
  trainers: string[] | null;
  overview: string | null;
};

const TABS: { key: TabKey; label: string }[] = [
  { key: "profile", label: "Profile" },
  { key: "skills", label: "My Skills" },
  { key: "notifications", label: "Alerts" },
  { key: "security", label: "Security" },
];

function skillStatusLabel(status: string): string {
  switch (status) {
    case "yet_to_begin":
      return "Yet to Begin";
    case "started_training":
      return "Started Training";
    case "completed_training":
      return "Completed";
    default:
      return status;
  }
}

export function ProfileScreen() {
  const { user, profile, userRole, office, refreshProfile, isAdmin, isTrainer, isSponsor, isPro, isOfficeAdmin, isSuperAdmin, signOut } = useAuth();
  const { themeName, setThemeName, tokens } = useAppTheme();
  const styles = getStyles(tokens);
  const isCrimson = themeName === "crimson";
  const stackNav = useMainAppNavigation();
  const tabNav = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
  const [tab, setTab] = useState<TabKey>("profile");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [notifications, setNotifications] = useState<PushNotificationPrefs>({ ...DEFAULT_PUSH_PREFS });
  const [reminderPrefs, setReminderPrefs] = useState<SubmissionReminderPrefs>(DEFAULT_SUBMISSION_REMINDER_PREFS);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useFocusEffect(
    useCallback(() => {
      if (user?.id) void refreshProfile();
    }, [user?.id, refreshProfile]),
  );

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setEmail(profile?.email ?? user?.email ?? "");
  }, [profile?.full_name, profile?.email, user?.email]);

  useEffect(() => {
    void loadSubmissionReminderPrefs().then(setReminderPrefs);
  }, []);

  useEffect(() => {
    if (profile?.push_notification_prefs !== undefined && profile.push_notification_prefs !== null) {
      setNotifications(parsePushPrefs(profile.push_notification_prefs));
    }
  }, [profile?.push_notification_prefs]);

  const persistServerPushPrefs = useCallback(
    async (next: PushNotificationPrefs) => {
      if (!user?.id) return;
      const { error } = await supabase
        .from("profiles")
        .update({ push_notification_prefs: prefsToJsonb(next) })
        .eq("user_id", user.id);
      if (error) console.warn("push_notification_prefs update", error);
    },
    [user?.id],
  );

  const updateReminderPrefs = async (next: SubmissionReminderPrefs) => {
    setReminderPrefs(next);
    await saveSubmissionReminderPrefs(next);
    await applySubmissionLocalReminders(next);
  };

  const avatarPublicUrl = resolveAvatarPublicUrl(profile?.avatar_url);

  const initials =
    (profile?.full_name || profile?.username || "U")
      .split(" ")
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  const fetchUserSkills = useCallback(async () => {
    if (!user) return;
    setSkillsLoading(true);
    try {
      const { data: links, error: linkError } = await supabase
        .from("user_skills")
        .select("skill_id, status")
        .eq("user_id", user.id);
      if (linkError) throw linkError;

      const rows = links || [];
      if (rows.length === 0) {
        setUserSkills([]);
        return;
      }

      const ids = [...new Set(rows.map((row) => row.skill_id).filter(Boolean))];
      const { data: skills, error: skillError } = await supabase
        .from("skills")
        .select("id, name, is_mandatory, training_plan_pdf_path, trainers, overview")
        .in("id", ids);
      if (skillError) throw skillError;

      const byId = new Map((skills || []).map((skill) => [skill.id, skill]));
      setUserSkills(
        rows.map((row) => {
          const skill = byId.get(row.skill_id);
          return {
            skill_id: row.skill_id,
            skill_name: skill?.name ?? "Unknown",
            status: row.status,
            is_mandatory: Boolean(skill?.is_mandatory),
            training_plan_pdf_path: skill?.training_plan_pdf_path ?? null,
            trainers: skill?.trainers ?? null,
            overview: skill?.overview ?? null,
          };
        }),
      );
    } catch {
      setUserSkills([]);
    } finally {
      setSkillsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (tab === "skills" && user) fetchUserSkills();
  }, [tab, user?.id, fetchUserSkills]);

  const getPdfUrl = (pdfPath: string | null) => {
    if (!pdfPath) return null;
    return supabase.storage.from("training-plans").getPublicUrl(pdfPath).data.publicUrl;
  };

  const [pdfViewer, setPdfViewer] = useState<{ title: string; url: string } | null>(null);

  const openPdf = (name: string, path: string) => {
    const url = getPdfUrl(path);
    if (!url) {
      Alert.alert("Unavailable", "Training plan file is missing.");
      return;
    }
    setPdfViewer({ title: `${name} — training plan`, url });
  };

  const handleAvatarUpload = async () => {
    if (!user) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo access to upload your profile picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    try {
      const asset = result.assets[0];
      const { body, contentType } = await getLocalUriAsUploadBody(asset.uri);
      const size =
        body instanceof Blob
          ? body.size
          : body.byteLength;
      if (size > 5 * 1024 * 1024) {
        Alert.alert("Too large", "Image must be 5MB or less.");
        return;
      }
      const ext = asset.uri.match(/\.(\w+)(\?|$)/)?.[1] ?? "jpg";
      const fileName = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, body, {
        contentType,
        upsert: true,
      });
      if (uploadError) throw uploadError;
      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: fileName }).eq("user_id", user.id);
      if (updateError) throw updateError;
      await refreshProfile();
      Alert.alert("Success", "Profile picture updated.");
    } catch (e: unknown) {
      Alert.alert("Upload failed", formatSupabaseError(e));
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim() || null,
          email: email.trim() || null,
        })
        .eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
      Alert.alert("Saved", "Profile updated successfully.");
    } catch (e: any) {
      Alert.alert("Save failed", e?.message ?? "Could not update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert("Mismatch", "Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Too short", "Password must be at least 6 characters.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Success", "Password updated.");
    } catch (e: any) {
      Alert.alert("Update failed", e?.message ?? "Could not update password.");
    } finally {
      setSaving(false);
    }
  };

  const showAdminTools = isAdmin || isTrainer || isOfficeAdmin;
  const canViewGroupTodos = isAdmin || isTrainer || isPro || isOfficeAdmin;
  const tabBarClearance = useTabBarContentPaddingBottom();
  const firstName = (profile?.full_name || profile?.username || "there").split(" ")[0];
  const greeting = useNigeriaTimeGreeting(firstName);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <PdfViewerModal
        visible={!!pdfViewer}
        url={pdfViewer?.url ?? ""}
        title={pdfViewer?.title ?? ""}
        onClose={() => setPdfViewer(null)}
      />
      <KeyboardSafeScroll
        style={styles.screen}
        contentContainerStyle={[styles.container, { paddingBottom: tabBarClearance }]}
      >
        <Text style={styles.pageTitle}>
          {greeting.emoji} {greeting.headline}
        </Text>
        <Text style={styles.pageSub}>
          {greeting.clock} WAT · Manage your account and preferences
        </Text>
        <Button title="Ask Prudence" variant="outline" onPress={() => stackNav.navigate("AssistantChat")} />

        <View style={styles.tabRow}>
          {TABS.map((t) => (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[styles.tabPill, tab === t.key && styles.tabPillActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t.key }}
            >
              <Text style={[styles.tabPillText, tab === t.key && styles.tabPillTextActive]} numberOfLines={2}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === "profile" && (
          <>
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Profile picture</Text>
              <Text style={styles.cardDesc}>Upload a photo to personalize your account</Text>
              <View style={styles.avatarRow}>
                <Avatar uri={avatarPublicUrl} initials={initials} size={88} />
                <View style={{ flex: 1, gap: 8 }}>
                  <Button title={uploading ? "Uploading…" : "Upload photo"} variant="outline" onPress={handleAvatarUpload} disabled={uploading} />
                  <Text style={styles.hint}>JPG, PNG. Max 5MB.</Text>
                </View>
              </View>
            </Card>

            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Basic information</Text>
              <Text style={styles.cardDesc}>Update your personal details</Text>
              <Text style={styles.label}>Full name</Text>
              <Input value={fullName} onChangeText={setFullName} placeholder="Your name" />
              <Text style={styles.label}>Email</Text>
              <Input value={email} onChangeText={setEmail} placeholder="you@email.com" keyboardType="email-address" />
              <View style={styles.readonlyRow}>
                <Text style={styles.label}>
                  Username <Badge variant="outline"> read-only </Badge>
                </Text>
                <TextInput value={profile?.username ?? ""} editable={false} style={styles.readonlyInput} />
              </View>
              <View style={styles.readonlyRow}>
                <Text style={styles.label}>
                  Sponsor username <Badge variant="outline"> read-only </Badge>
                </Text>
                <TextInput value={profile?.sponsor_username ?? ""} editable={false} style={styles.readonlyInput} />
              </View>
              <View style={styles.readonlyRow}>
                <Text style={styles.label}>
                  Office <Badge variant="outline"> read-only </Badge>
                </Text>
                <TextInput value={office?.name ?? "—"} editable={false} style={styles.readonlyInput} />
              </View>
            </Card>

            <Card style={[styles.card, isCrimson ? styles.keyCardAccent : null]}>
              <Text style={styles.cardTitle}>Account information</Text>
              <View style={styles.accountGrid}>
                <View style={styles.accountTile}>
                  <Text style={styles.accountTileMuted}>Role</Text>
                  <Text style={styles.accountTileValue}>{(userRole?.role ?? "member").replace("_", " ")}</Text>
                </View>
                <View style={styles.accountTile}>
                  <Text style={styles.accountTileMuted}>Joined</Text>
                  <Text style={styles.accountTileValue}>
                    {profile?.created_at
                      ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : "—"}
                  </Text>
                </View>
                <View style={styles.accountTile}>
                  <Text style={styles.accountTileMuted}>Status</Text>
                  <Badge variant={profile?.approval_status === "approved" ? "success" : "warning"}>
                    {profile?.approval_status ?? "—"}
                  </Badge>
                </View>
              </View>
            </Card>

            <Card style={[styles.card, isCrimson ? styles.keyCardAccent : null]}>
              <Text style={styles.cardTitle}>Appearance</Text>
              <Text style={styles.cardDesc}>Choose your preferred app theme.</Text>
              <View style={styles.themeRow}>
                <Pressable
                  onPress={() => setThemeName("prudence")}
                  style={[styles.themePill, themeName === "prudence" ? styles.themePillActive : null]}
                >
                  <Text style={[styles.themePillText, themeName === "prudence" ? styles.themePillTextActive : null]}>
                    Prudence
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setThemeName("neo")}
                  style={[styles.themePill, themeName === "neo" ? styles.themePillActive : null]}
                >
                  <Text style={[styles.themePillText, themeName === "neo" ? styles.themePillTextActive : null]}>Neo Dark</Text>
                </Pressable>
                <Pressable
                  onPress={() => setThemeName("crimson")}
                  style={[styles.themePill, themeName === "crimson" ? styles.themePillActive : null]}
                >
                  <Text style={[styles.themePillText, themeName === "crimson" ? styles.themePillTextActive : null]}>
                    Crimson UI
                  </Text>
                </Pressable>
              </View>
            </Card>

            <Card style={styles.card}>
              <Text style={styles.cardTitle}>More tools</Text>
              <Text style={styles.cardDesc}>History, alerts, and suggestions — opens above the tab bar.</Text>
              <Button title="My submissions" variant="outline" onPress={() => stackNav.navigate("MySubmissions")} />
              <Button title="Notifications inbox" variant="outline" onPress={() => stackNav.navigate("NotificationsInbox")} />
              <Button title="Suggestion box" variant="outline" onPress={() => stackNav.navigate("Suggestions")} />
              <Button title="About (website)" variant="outline" onPress={() => void openSitePath("/about")} />
              <Button title="FAQ (website)" variant="outline" onPress={() => void openSitePath("/faq")} />
              <Button title="Apply (website)" variant="outline" onPress={() => void openSitePath("/apply")} />
              {canViewGroupTodos ? (
                <Button title="Group todo list" variant="outline" onPress={() => stackNav.navigate("GroupTodosReports")} />
              ) : null}
              <Button title="Sponsor dashboard" variant="outline" onPress={() => stackNav.navigate("SponsorDashboard")} />
              {isSponsor ? (
                <Button title="My team list" variant="outline" onPress={() => stackNav.navigate("Teams")} />
              ) : null}
            </Card>

            {showAdminTools && (
              <Card style={[styles.card, isCrimson ? styles.keyCardAccent : null]}>
                <Text style={styles.cardTitle}>Trainer / admin</Text>
                <Text style={styles.cardDesc}>Review work, groups, and skills (mobile views; complex edits on web).</Text>
                <Button title="Admin hub" onPress={() => stackNav.navigate("AdminHub")} />
                <Button title="Admin dashboard" variant="outline" onPress={() => stackNav.navigate("AdminDashboard")} />
                <Button title="Submissions review" variant="outline" onPress={() => stackNav.navigate("SubmissionsReview")} />
                <Button title="Teams" variant="outline" onPress={() => stackNav.navigate("Teams")} />
                <Button title="Team members" variant="outline" onPress={() => stackNav.navigate("TeamMembers")} />
                <Button title="Group todos & reports" variant="outline" onPress={() => stackNav.navigate("GroupTodosReports")} />
                <Button title="Trainer group weekly" variant="outline" onPress={() => stackNav.navigate("TrainerGroupWeekly")} />
                {(isOfficeAdmin || isSuperAdmin) ? (
                  <Button title="Office admin" variant="outline" onPress={() => stackNav.navigate("OfficeAdmin")} />
                ) : null}
              </Card>
            )}

            <Button title={saving ? "Saving…" : "Save changes"} onPress={handleSaveProfile} loading={saving} disabled={saving} />
          </>
        )}

        {tab === "skills" && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>My Skills</Text>
            <Text style={styles.cardDesc}>View your assigned skills and training progress</Text>
            {skillsLoading ? (
              <ActivityIndicator color={tokens.colors.primary} style={{ marginVertical: 24 }} />
            ) : userSkills.length === 0 ? (
              <View style={styles.skillEmpty}>
                <Text style={styles.emptyText}>No skills assigned yet.</Text>
                <Text style={styles.cardDesc}>
                  Skills will appear here once they are assigned. Browse Skills Hub to add or review training skills.
                </Text>
                <Button
                  title="Add your skills"
                  onPress={() => tabNav.navigate("Resources", { section: "skills" })}
                />
              </View>
            ) : (
              <>
                {userSkills.filter((s) => s.is_mandatory).length > 0 && (
                  <View style={styles.skillBlock}>
                    <View style={styles.skillBlockHead}>
                      <Badge>Mandatory</Badge>
                      <Text style={styles.skillBlockTitle}>Mandatory Skills</Text>
                    </View>
                    {userSkills
                      .filter((s) => s.is_mandatory)
                      .map((skill) => (
                        <View key={skill.skill_id} style={styles.skillItem}>
                          <View style={styles.skillItemHead}>
                            <Text style={styles.skillName}>{skill.skill_name}</Text>
                            <Badge variant="outline">{skillStatusLabel(skill.status)}</Badge>
                          </View>
                          {skill.overview ? <Text style={styles.trainers}>{skill.overview}</Text> : null}
                          {skill.trainers && skill.trainers.length > 0 ? (
                            <Text style={styles.trainers}>Trainers: {skill.trainers.join(", ")}</Text>
                          ) : null}
                          {skill.training_plan_pdf_path ? (
                            <Button title="View PDF" variant="outline" size="sm" onPress={() => openPdf(skill.skill_name, skill.training_plan_pdf_path!)} />
                          ) : null}
                        </View>
                      ))}
                  </View>
                )}
                {userSkills.filter((s) => !s.is_mandatory).length > 0 && (
                  <View style={styles.skillBlock}>
                    <View style={styles.skillBlockHead}>
                      <Badge variant="outline">Optional</Badge>
                      <Text style={styles.skillBlockTitle}>Optional Skills</Text>
                    </View>
                    {userSkills
                      .filter((s) => !s.is_mandatory)
                      .map((skill) => (
                        <View key={skill.skill_id} style={styles.skillItem}>
                          <View style={styles.skillItemHead}>
                            <Text style={styles.skillName}>{skill.skill_name}</Text>
                            <Badge variant="outline">{skillStatusLabel(skill.status)}</Badge>
                          </View>
                          {skill.overview ? <Text style={styles.trainers}>{skill.overview}</Text> : null}
                          {skill.trainers && skill.trainers.length > 0 ? (
                            <Text style={styles.trainers}>Trainers: {skill.trainers.join(", ")}</Text>
                          ) : null}
                          {skill.training_plan_pdf_path ? (
                            <Button title="View PDF" variant="outline" size="sm" onPress={() => openPdf(skill.skill_name, skill.training_plan_pdf_path!)} />
                          ) : null}
                        </View>
                      ))}
                  </View>
                )}
              </>
            )}
          </Card>
        )}

        {tab === "notifications" && (
          <>
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Inbox</Text>
              <Text style={styles.cardDesc}>Trainer feedback, reminders, and team messages.</Text>
              <Button title="Open alerts inbox" onPress={() => stackNav.navigate("NotificationsInbox")} />
            </Card>

            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Deadline reminders</Text>
              <Text style={styles.cardDesc}>On this phone · use Lagos time for 9:00 AM / 11:59 PM WAT.</Text>
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>Enable reminders</Text>
                  <Text style={styles.switchSub}>Morning plan and night report</Text>
                </View>
                <Switch
                  value={reminderPrefs.enabled}
                  onValueChange={(v) => updateReminderPrefs({ ...reminderPrefs, enabled: v })}
                  trackColor={{ false: tokens.colors.border, true: tokens.colors.primary }}
                />
              </View>
              {reminderPrefs.enabled ? (
                <>
                  <View style={styles.switchRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.switchTitle}>Morning plan</Text>
                      <Text style={styles.switchSub}>Before 9:00 AM WAT</Text>
                    </View>
                    <Switch
                      value={reminderPrefs.morningPlan}
                      onValueChange={(v) => updateReminderPrefs({ ...reminderPrefs, morningPlan: v })}
                      trackColor={{ false: tokens.colors.border, true: tokens.colors.primary }}
                    />
                  </View>
                  <View style={styles.switchRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.switchTitle}>Daily report</Text>
                      <Text style={styles.switchSub}>Before 11:59 PM WAT</Text>
                    </View>
                    <Switch
                      value={reminderPrefs.dailyReport}
                      onValueChange={(v) => updateReminderPrefs({ ...reminderPrefs, dailyReport: v })}
                      trackColor={{ false: tokens.colors.border, true: tokens.colors.primary }}
                    />
                  </View>
                  <Text style={styles.label}>Remind me before</Text>
                  <View style={styles.reminderPillRow}>
                    {([15, 30, 60] as const).map((m: MinutesBeforeOption) => (
                      <Pressable
                        key={m}
                        onPress={() => updateReminderPrefs({ ...reminderPrefs, minutesBeforeDeadline: m })}
                        style={[
                          styles.reminderPill,
                          reminderPrefs.minutesBeforeDeadline === m && styles.reminderPillActive,
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: reminderPrefs.minutesBeforeDeadline === m }}
                      >
                        <Text
                          style={[
                            styles.reminderPillText,
                            reminderPrefs.minutesBeforeDeadline === m && styles.reminderPillTextActive,
                          ]}
                        >
                          {m} min
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}
            </Card>

            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Push alerts</Text>
              <Text style={styles.cardDesc}>Saved to your profile for inbox and team events.</Text>
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>Verifications</Text>
                  <Text style={styles.switchSub}>Trainer feedback</Text>
                </View>
                <Switch
                  value={notifications.verificationAlerts}
                  onValueChange={(v) => {
                    setNotifications((p) => {
                      const next = { ...p, verificationAlerts: v };
                      void persistServerPushPrefs(next);
                      return next;
                    });
                  }}
                  trackColor={{ false: tokens.colors.border, true: tokens.colors.primary }}
                />
              </View>
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>Weekly summary</Text>
                  <Text style={styles.switchSub}>Week recap messages</Text>
                </View>
                <Switch
                  value={notifications.weeklySummary}
                  onValueChange={(v) => {
                    setNotifications((p) => {
                      const next = { ...p, weeklySummary: v };
                      void persistServerPushPrefs(next);
                      return next;
                    });
                  }}
                  trackColor={{ false: tokens.colors.border, true: tokens.colors.primary }}
                />
              </View>
              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingBottom: 2 }}>
                  <Text style={styles.switchTitle}>Team updates</Text>
                  <Text style={styles.switchSub}>Approvals and team alerts</Text>
                </View>
                <Switch
                  value={notifications.teamUpdates}
                  onValueChange={(v) => {
                    setNotifications((p) => {
                      const next = { ...p, teamUpdates: v };
                      void persistServerPushPrefs(next);
                      return next;
                    });
                  }}
                  trackColor={{ false: tokens.colors.border, true: tokens.colors.primary }}
                />
              </View>
            </Card>
          </>
        )}

        {tab === "security" && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Change password</Text>
            <Text style={styles.cardDesc}>Update your password to keep your account secure</Text>
            <Text style={styles.label}>New password</Text>
            <Input value={newPassword} onChangeText={setNewPassword} placeholder="••••••••" secureTextEntry />
            <Text style={styles.label}>Confirm password</Text>
            <Input value={confirmPassword} onChangeText={setConfirmPassword} placeholder="••••••••" secureTextEntry />
            <Button title={saving ? "Updating…" : "Update password"} onPress={handlePasswordChange} loading={saving} disabled={saving} />
          </Card>
        )}

        <Button title="Sign out" variant="destructive" onPress={signOut} />
      </KeyboardSafeScroll>
    </SafeAreaView>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.background },
  screen: { flex: 1 },
  container: { padding: 18, gap: 12, flexGrow: 1 },
  pageTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: tokens.colors.foreground,
  },
  pageSub: {
    fontSize: 14,
    color: tokens.colors.mutedForeground,
    marginBottom: 4,
  },
  tabRow: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 6,
    alignSelf: "stretch",
  },
  tabPill: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    paddingHorizontal: 6,
    paddingVertical: 10,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  tabPillActive: {
    backgroundColor: tokens.colors.primary,
    borderColor: tokens.colors.primary,
  },
  tabPillText: {
    color: tokens.colors.foreground,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  tabPillTextActive: { color: tokens.colors.primaryForeground },
  card: {
    padding: 14,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  keyCardAccent: {
    borderColor: tokens.colors.primary,
    borderLeftWidth: 3,
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: tokens.colors.foreground },
  cardDesc: { fontSize: 13, color: tokens.colors.mutedForeground, marginBottom: 4 },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 4 },
  hint: { fontSize: 11, color: tokens.colors.mutedForeground },
  label: { fontSize: 13, fontWeight: "700", color: tokens.colors.foreground, marginTop: 4 },
  readonlyRow: { gap: 4 },
  readonlyInput: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: tokens.colors.accent,
    color: tokens.colors.mutedForeground,
  },
  accountGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 6 },
  accountTile: {
    flex: 1,
    minWidth: "28%",
    padding: 12,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.accent,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    gap: 4,
  },
  accountTileMuted: { fontSize: 12, color: tokens.colors.mutedForeground },
  accountTileValue: { fontSize: 14, fontWeight: "700", color: tokens.colors.foreground, textTransform: "capitalize" },
  emptyText: { textAlign: "center", color: tokens.colors.mutedForeground, paddingVertical: 8 },
  skillEmpty: { gap: 10, paddingVertical: 8 },
  skillBlock: { gap: 10, marginTop: 8 },
  skillBlockHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  skillBlockTitle: { fontSize: 14, fontWeight: "800", color: tokens.colors.foreground },
  skillItemHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  skillItem: {
    padding: 12,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.accent,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    gap: 6,
  },
  skillName: { flex: 1, fontSize: 15, fontWeight: "700", color: tokens.colors.foreground },
  trainers: { fontSize: 12, color: tokens.colors.mutedForeground },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tokens.colors.border },
  switchTitle: { fontSize: 14, fontWeight: "700", color: tokens.colors.foreground },
  switchSub: { fontSize: 12, color: tokens.colors.mutedForeground, marginTop: 2 },
  themeRow: { flexDirection: "row", gap: 8, marginTop: 2 },
  themePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
    alignItems: "center",
  },
  themePillActive: {
    borderColor: tokens.colors.primary,
    backgroundColor: tokens.colors.accentStrong,
  },
  themePillText: { color: tokens.colors.mutedForeground, fontWeight: "700", fontSize: 13 },
  themePillTextActive: { color: tokens.colors.foreground },
  reminderPillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6, marginBottom: 4 },
  reminderPill: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
  },
  reminderPillActive: {
    borderColor: tokens.colors.primary,
    backgroundColor: tokens.colors.accentStrong,
  },
  reminderPillText: { fontSize: 13, fontWeight: "700", color: tokens.colors.mutedForeground },
  reminderPillTextActive: { color: tokens.colors.foreground },
  });
