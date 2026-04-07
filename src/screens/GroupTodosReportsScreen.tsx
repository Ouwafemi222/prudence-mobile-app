import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../integrations/supabase/client";
import { formatISODateInNigeria } from "../lib/nigeriaTime";
import { useAppTheme } from "../contexts/ThemeContext";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";

type Group = { id: string; name: string };

type ActivityRow = Record<string, unknown>;

function resolveStoragePublicUrl(path: string): string {
  const v = path.trim();
  if (/^https?:\/\//i.test(v)) return v;
  return supabase.storage.from("avatars").getPublicUrl(v).data.publicUrl;
}

function formatSubmittedAt(iso: string | null | undefined): string {
  if (!iso || typeof iso !== "string") return "Time not recorded";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return String(iso);
  }
}

function collectActivityProofUrls(a: ActivityRow): string[] {
  const urls: string[] = [];
  const addPaths = (paths: unknown) => {
    if (!Array.isArray(paths)) return;
    for (const p of paths) {
      if (typeof p === "string" && p.trim()) urls.push(resolveStoragePublicUrl(p));
    }
  };
  addPaths(a.reading_proof_images);
  if (typeof a.reading_proof_image === "string" && a.reading_proof_image.trim()) {
    urls.push(resolveStoragePublicUrl(a.reading_proof_image));
  }
  addPaths(a.skill_proof_images);
  if (typeof a.skill_proof_image === "string" && a.skill_proof_image.trim()) {
    urls.push(resolveStoragePublicUrl(a.skill_proof_image));
  }
  addPaths(a.other_activities_proof_images);
  if (typeof a.other_activities_proof_image === "string" && a.other_activities_proof_image.trim()) {
    urls.push(resolveStoragePublicUrl(a.other_activities_proof_image));
  }
  return [...new Set(urls)];
}

function formatNightReportBody(a: ActivityRow): string {
  const lines: string[] = [];
  const n = (v: unknown): string | null => {
    if (v == null || v === "") return null;
    if (typeof v === "boolean") return v ? "Yes" : "No";
    return String(v);
  };
  const add = (chunk: string[], label: string, v: unknown) => {
    const s = n(v);
    if (s != null) chunk.push(`${label}: ${s}`);
  };
  const flush = (title: string, chunk: string[]) => {
    if (chunk.length === 0) return;
    lines.push(`— ${title} —`, ...chunk, "");
  };

  const reading: string[] = [];
  add(reading, "Pages read", a.pages_read);
  const pr = n(a.reading_notes);
  if (pr) reading.push(`Notes: ${pr}`);
  flush("Reading", reading);

  const gigs: string[] = [];
  add(gigs, "Gigs created", a.gigs_created);
  add(gigs, "Gig platform", a.gig_platform);
  add(gigs, "Gig service", a.gig_service);
  const gigLinks = Array.isArray(a.gig_links) ? a.gig_links : [];
  const gl = typeof a.gig_link === "string" ? [a.gig_link] : [];
  const allGig = [...gigLinks, ...gl].filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  if (allGig.length) gigs.push(`Links:\n${allGig.map((u) => `• ${u}`).join("\n")}`);
  flush("Gig creation", gigs);

  const acct: string[] = [];
  add(acct, "Accounts created", a.accounts_created);
  add(acct, "Account platform", a.account_platform);
  add(acct, "Account service", a.account_service);
  add(acct, "Account country", a.account_country);
  const al = Array.isArray(a.account_links)
    ? a.account_links.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];
  if (al.length) acct.push(`Links:\n${al.map((u) => `• ${u}`).join("\n")}`);
  flush("Account creation", acct);

  const income: string[] = [];
  add(income, "Gross income", a.gross_income);
  add(income, "Net income", a.net_income);
  add(income, "Income platform", a.income_platform);
  add(income, "Payment type", a.payment_type);
  add(income, "Outside payment method", a.outside_payment_method);
  add(income, "Outside payment (other)", a.outside_payment_method_other);
  add(income, "Order type", a.order_type);
  add(income, "Delivery days", a.delivery_days);
  add(income, "Work type", a.work_type);
  add(income, "Cancelled orders", a.cancelled_orders_count);
  add(income, "Cancelled amount received", a.cancelled_order_amount_received);
  flush("Income", income);

  const prospect: string[] = [];
  add(prospect, "Daily contacts", a.daily_contacts);
  add(prospect, "Follow-ups", a.follow_ups);
  add(prospect, "Expected conversions", a.expected_conversions);
  flush("Prospecting", prospect);

  const skill: string[] = [];
  add(skill, "Skill learned", a.skill_learned);
  const sd = n(a.skill_description);
  if (sd) skill.push(`Description: ${sd}`);
  flush("Skill", skill);

  const train: string[] = [];
  add(train, "Skill taught", a.skill_taught);
  add(train, "Theory session", a.is_theory);
  add(train, "Practical session", a.is_practical);
  add(train, "Students trained", a.students_trained);
  add(train, "Training duration (min)", a.training_duration_minutes);
  add(train, "Submissions reviewed", a.submissions_reviewed);
  flush("Training (trainer)", train);

  const other = n(a.other_activities);
  if (other) lines.push("— Other activities —", other, "");

  const ver: string[] = [];
  add(ver, "Verified", a.is_verified);
  const fb = n(a.verification_feedback);
  if (fb) ver.push(`Feedback: ${fb}`);
  const va = typeof a.verified_at === "string" ? formatSubmittedAt(a.verified_at) : null;
  if (va && va !== "Time not recorded") ver.push(`Verified at: ${va}`);
  flush("Verification", ver);

  const out = lines.join("\n").trim();
  return out || "(No details in this submission.)";
}

function ProofImageThumb({
  uri,
  size,
  onOpen,
  tokens,
}: {
  uri: string;
  size: number;
  onOpen: () => void;
  tokens: ReturnType<typeof useAppTheme>["tokens"];
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel="View proof photo full screen"
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: tokens.radius.md,
          overflow: "hidden",
          backgroundColor: tokens.colors.surface,
          borderWidth: 1,
          borderColor: tokens.colors.border,
        },
        pressed ? { opacity: 0.92 } : null,
      ]}
    >
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {status === "loading" ? (
          <View style={[StyleSheet.absoluteFillObject, { justifyContent: "center", alignItems: "center" }]}>
            <ActivityIndicator color={tokens.colors.primary} />
          </View>
        ) : null}
        {status === "error" ? (
          <View style={[StyleSheet.absoluteFillObject, { justifyContent: "center", alignItems: "center", padding: 8 }]}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: tokens.colors.mutedForeground, textAlign: "center" }}>
              Tap to retry in full screen
            </Text>
          </View>
        ) : null}
      </View>
      <Image
        source={{ uri }}
        style={[StyleSheet.absoluteFillObject, { opacity: status === "ready" ? 1 : 0 }]}
        resizeMode="cover"
        onLoad={() => setStatus("ready")}
        onError={() => setStatus("error")}
      />
    </Pressable>
  );
}

export function GroupTodosReportsScreen() {
  const { tokens } = useAppTheme();
  const styles = useMemo(() => getStyles(tokens), [tokens]);
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const { user, isAdmin, isTrainer, isPro } = useAuth();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState("");
  const [dateStr, setDateStr] = useState(formatISODateInNigeria());
  const [rows, setRows] = useState<
    {
      user_id: string;
      name: string;
      todo: boolean;
      activity: boolean;
      verified?: boolean;
      plan?: string;
      /** ISO timestamp for morning plan (updated_at, else created_at from daily_todos) */
      todoSubmittedAt: string | null;
      activityRecord: ActivityRow | null;
    }[]
  >([]);
  const [planModal, setPlanModal] = useState<{ title: string; body: string; submittedLabel: string } | null>(null);
  const [nightModal, setNightModal] = useState<{
    title: string;
    submittedLabel: string;
    body: string;
    imageUrls: string[];
  } | null>(null);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);
  const [lightboxLoading, setLightboxLoading] = useState(true);

  const allowed = isAdmin || isTrainer || isPro;

  const modalCardMaxW = Math.min(winW - 32, 440);
  const nightThumbGap = 10;
  const nightThumbSize = Math.max(120, (modalCardMaxW - 40 - nightThumbGap) / 2);

  const loadGroups = useCallback(async () => {
    if (!user || !allowed) return;
    setLoading(true);
    try {
      let q = supabase.from("groups").select("id, name").order("name");
      if (isPro && !isAdmin && !isTrainer) {
        const { data: prof } = await supabase.from("profiles").select("assigned_group_id").eq("user_id", user.id).maybeSingle();
        const gid = (prof as { assigned_group_id?: string } | null)?.assigned_group_id;
        if (!gid) {
          setGroups([]);
          return;
        }
        q = q.eq("id", gid);
      }
      const { data, error } = await q;
      if (error) throw error;
      const g = (data || []) as Group[];
      setGroups(g);
      setGroupId((prev) => (prev && g.some((x) => x.id === prev) ? prev : g[0]?.id || ""));
    } catch (e) {
      console.error(e);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, allowed, isPro, isAdmin, isTrainer]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const fetchDay = useCallback(async () => {
    if (!groupId || !dateStr) return;
    setLoading(true);
    try {
      const { data: gRow } = await supabase.from("groups").select("trainer_ids").eq("id", groupId).single();
      const trainerIds = ((gRow as { trainer_ids?: string[] } | null)?.trainer_ids || []) as string[];

      const { data: approved } = await supabase
        .from("profiles")
        .select("user_id, full_name, username, assigned_group_id")
        .eq("approval_status", "approved");

      const memberIds = new Set<string>();
      (approved || []).forEach((p: any) => {
        if (p.assigned_group_id === groupId) memberIds.add(p.user_id);
      });
      trainerIds.forEach((id) => memberIds.add(id));
      const { data: superAdminRoles } = await supabase.from("user_roles").select("user_id").eq("role", "super_admin");
      (superAdminRoles || []).forEach((r: any) => memberIds.add(r.user_id));

      const { data: todos } = await supabase
        .from("daily_todos")
        .select("user_id, plan, created_at, updated_at")
        .eq("todo_date", dateStr);
      const { data: acts } = await supabase.from("daily_activities").select("*").eq("activity_date", dateStr);

      const todoMetaByUser = new Map<string, { plan: string; submittedAt: string | null }>();
      (todos || []).forEach((t: any) => {
        memberIds.add(t.user_id);
        const plan = typeof t.plan === "string" ? t.plan : "";
        const submittedAt =
          typeof t.updated_at === "string"
            ? t.updated_at
            : typeof t.created_at === "string"
              ? t.created_at
              : null;
        todoMetaByUser.set(t.user_id, { plan, submittedAt });
      });
      (acts || []).forEach((a: any) => memberIds.add(a.user_id));

      const todoUsers = new Set((todos || []).map((t: any) => t.user_id));
      const activityByUser = new Map<string, ActivityRow>();
      (acts || []).forEach((a: any) => {
        if (a?.user_id) activityByUser.set(a.user_id, a as ActivityRow);
      });

      const list: typeof rows = [];
      const profById = new Map((approved || []).map((p: any) => [p.user_id, p]));
      memberIds.forEach((uid) => {
        const p = profById.get(uid);
        const hasTodo = todoUsers.has(uid);
        const actRow = activityByUser.get(uid) ?? null;
        const todoMeta = todoMetaByUser.get(uid);
        list.push({
          user_id: uid,
          name: p ? `${p.full_name || p.username}` : "Unknown user",
          todo: hasTodo,
          activity: !!actRow,
          verified: actRow ? !!actRow.is_verified : undefined,
          plan: hasTodo ? todoMeta?.plan ?? "" : undefined,
          todoSubmittedAt: hasTodo ? todoMeta?.submittedAt ?? null : null,
          activityRecord: actRow,
        });
      });
      list.sort((a, b) => {
        if (a.todo !== b.todo) return a.todo ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      setRows(list);
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [groupId, dateStr]);

  useEffect(() => {
    if (groupId) fetchDay();
  }, [groupId, dateStr, fetchDay]);

  useEffect(() => {
    if (lightboxUri) setLightboxLoading(true);
  }, [lightboxUri]);

  const splitModalTitle = (full: string | undefined) => {
    if (!full) return { who: "", kind: "" };
    const i = full.indexOf(" — ");
    if (i === -1) return { who: full, kind: "" };
    return { who: full.slice(0, i), kind: full.slice(i + 3) };
  };

  if (!allowed) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Pro, trainer, or admin access required.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.intro}>
        Group morning plans (before 9:00 AM) and night reports (before 11:59 PM) for a selected date.
      </Text>
      <Card style={styles.filters}>
        <Text style={styles.label}>Group</Text>
        <View style={styles.chips}>
          {groups.map((g) => (
            <Pressable key={g.id} onPress={() => setGroupId(g.id)} style={[styles.chip, groupId === g.id && styles.chipOn]}>
              <Text style={[styles.chipText, groupId === g.id && styles.chipTextOn]}>{g.name}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
        <Input value={dateStr} onChangeText={setDateStr} placeholder="2026-03-30" />
      </Card>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={tokens.colors.primary} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.user_id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.muted}>No members for this group/date.</Text>}
          renderItem={({ item }) => (
            <Card style={styles.row}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.hint}>
                {item.todo || item.activity ? "Tap Morning plan or Night report to view details" : " "}
              </Text>
              <View style={styles.badges}>
                <Pressable
                  onPress={() => {
                    if (!item.todo) return;
                    setPlanModal({
                      title: `${item.name} — morning plan`,
                      body: item.plan ?? "",
                      submittedLabel: formatSubmittedAt(item.todoSubmittedAt),
                    });
                  }}
                  disabled={!item.todo}
                  style={({ pressed }) => [styles.badgeHit, !item.todo && styles.badgeHitDisabled, pressed && item.todo && styles.badgeHitPressed]}
                >
                  <Badge variant={item.todo ? "success" : "outline"}>Morning Plan {item.todo ? "✓" : "—"}</Badge>
                </Pressable>
                <Pressable
                  onPress={() => {
                    if (!item.activity || !item.activityRecord) return;
                    const r = item.activityRecord;
                    const submittedRaw =
                      typeof r.submitted_at === "string"
                        ? r.submitted_at
                        : typeof r.updated_at === "string"
                          ? r.updated_at
                          : null;
                    setNightModal({
                      title: `${item.name} — night report`,
                      submittedLabel: formatSubmittedAt(submittedRaw),
                      body: formatNightReportBody(r),
                      imageUrls: collectActivityProofUrls(r),
                    });
                  }}
                  disabled={!item.activity}
                  style={({ pressed }) => [
                    styles.badgeHit,
                    !item.activity && styles.badgeHitDisabled,
                    pressed && item.activity && styles.badgeHitPressed,
                  ]}
                >
                  <Badge variant={item.activity ? (item.verified ? "success" : "warning") : "outline"}>
                    Night Report {item.activity ? (item.verified ? "verified" : "pending") : "—"}
                  </Badge>
                </Pressable>
              </View>
            </Card>
          )}
        />
      )}
      <Modal visible={!!planModal} animationType="fade" transparent onRequestClose={() => setPlanModal(null)}>
        <View style={[styles.modalBackdrop, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setPlanModal(null)} accessibilityLabel="Dismiss" />
          <Pressable
            style={[styles.modalCard, { maxWidth: modalCardMaxW, width: "100%", alignSelf: "center" }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalEyebrow}>{splitModalTitle(planModal?.title).kind || "Morning plan"}</Text>
                <Text style={styles.modalTitle}>{splitModalTitle(planModal?.title).who}</Text>
                <View style={styles.modalMetaChip}>
                  <Text style={styles.modalMetaChipText}>Submitted · {planModal?.submittedLabel}</Text>
                </View>
              </View>
              <Pressable
                onPress={() => setPlanModal(null)}
                style={styles.modalIconBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Text style={styles.modalIconBtnText}>✕</Text>
              </Pressable>
            </View>
            <ScrollView
              style={{ maxHeight: winH * 0.55 }}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              <Text style={styles.modalSectionLabel}>Plan</Text>
              <Text style={styles.modalBody}>{planModal?.body || "(Empty plan)"}</Text>
            </ScrollView>
            <Pressable style={styles.modalPrimaryBtn} onPress={() => setPlanModal(null)}>
              <Text style={styles.modalPrimaryBtnText}>Done</Text>
            </Pressable>
          </Pressable>
        </View>
      </Modal>
      <Modal visible={!!nightModal} animationType="fade" transparent onRequestClose={() => setNightModal(null)}>
        <View style={[styles.modalBackdrop, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setNightModal(null)} accessibilityLabel="Dismiss" />
          <Pressable
            style={[styles.modalCard, { maxWidth: modalCardMaxW, width: "100%", alignSelf: "center" }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalEyebrow}>{splitModalTitle(nightModal?.title).kind || "Night report"}</Text>
                <Text style={styles.modalTitle}>{splitModalTitle(nightModal?.title).who}</Text>
                <View style={styles.modalMetaChip}>
                  <Text style={styles.modalMetaChipText}>Submitted · {nightModal?.submittedLabel}</Text>
                </View>
              </View>
              <Pressable
                onPress={() => setNightModal(null)}
                style={styles.modalIconBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Text style={styles.modalIconBtnText}>✕</Text>
              </Pressable>
            </View>
            <ScrollView
              style={{ maxHeight: winH * 0.62 }}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              <Text style={styles.modalSectionLabel}>Report details</Text>
              <Text style={styles.modalBody}>{nightModal?.body}</Text>
              {(nightModal?.imageUrls?.length ?? 0) > 0 ? (
                <>
                  <View style={styles.modalSectionDivider} />
                  <Text style={styles.modalSectionLabel}>Proof photos</Text>
                  <Text style={styles.modalHint}>Tap any photo for a full-screen view.</Text>
                  <View style={[styles.proofGrid, { gap: nightThumbGap }]}>
                    {(nightModal?.imageUrls ?? []).map((uri, i) => (
                      <ProofImageThumb
                        key={`${uri}-${i}`}
                        uri={uri}
                        size={nightThumbSize}
                        tokens={tokens}
                        onOpen={() => {
                          setLightboxLoading(true);
                          setLightboxUri(uri);
                        }}
                      />
                    ))}
                  </View>
                </>
              ) : null}
            </ScrollView>
            <Pressable style={styles.modalPrimaryBtn} onPress={() => setNightModal(null)}>
              <Text style={styles.modalPrimaryBtnText}>Done</Text>
            </Pressable>
          </Pressable>
        </View>
      </Modal>
      <Modal
        visible={!!lightboxUri}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setLightboxUri(null);
          setLightboxLoading(true);
        }}
        {...(Platform.OS === "ios" ? { presentationStyle: "overFullScreen" as "overFullScreen" } : {})}
      >
        <Pressable
          style={[styles.lightboxRoot, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}
          onPress={() => {
            setLightboxUri(null);
            setLightboxLoading(true);
          }}
        >
          <View style={styles.lightboxStage} pointerEvents="box-none">
            {lightboxUri ? (
              <View style={[styles.lightboxImageFrame, { width: winW - 28, height: Math.min(winH * 0.72, 720) }]}>
                {lightboxLoading ? (
                  <View style={styles.lightboxLoader}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                    <Text style={styles.lightboxLoaderText}>Loading high-quality image…</Text>
                  </View>
                ) : null}
                <Image
                  source={{ uri: lightboxUri }}
                  style={StyleSheet.absoluteFillObject}
                  resizeMode="contain"
                  onLoadEnd={() => setLightboxLoading(false)}
                  onError={() => setLightboxLoading(false)}
                />
              </View>
            ) : null}
          </View>
          <View style={styles.lightboxFooter} pointerEvents="box-none">
            <Text style={styles.lightboxFooterText}>Tap the photo or background to close</Text>
            <Pressable
              style={styles.lightboxClosePill}
              onPress={() => {
                setLightboxUri(null);
                setLightboxLoading(true);
              }}
            >
              <Text style={styles.lightboxClosePillText}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: tokens.colors.background },
    centered: { flex: 1, justifyContent: "center", padding: 24 },
    intro: { padding: 18, paddingBottom: 0, fontSize: 14, color: tokens.colors.mutedForeground },
    filters: { margin: 18, marginBottom: 8, gap: 10 },
    label: { fontWeight: "800", fontSize: 13, color: tokens.colors.foreground },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: tokens.colors.border },
    chipOn: { backgroundColor: tokens.colors.primary, borderColor: tokens.colors.primary },
    chipText: { fontWeight: "700", color: tokens.colors.mutedForeground },
    chipTextOn: { color: tokens.colors.primaryForeground },
    list: { padding: 18, paddingBottom: 32, gap: 10 },
    row: { padding: 14, gap: 6, borderWidth: 1, borderColor: tokens.colors.border },
    badgeHit: { borderRadius: 999 },
    badgeHitDisabled: { opacity: 0.45 },
    badgeHitPressed: { opacity: 0.85 },
    name: { fontWeight: "800", fontSize: 16, color: tokens.colors.foreground },
    hint: { fontSize: 11, color: tokens.colors.mutedForeground, minHeight: 14 },
    badges: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    muted: { textAlign: "center", color: tokens.colors.mutedForeground, marginTop: 24 },
    modalBackdrop: {
      flex: 1,
      backgroundColor: tokens.colors.overlay,
      justifyContent: "center",
      paddingHorizontal: 16,
    },
    modalCard: {
      borderRadius: tokens.radius.lg,
      padding: 20,
      backgroundColor: tokens.colors.card,
      borderWidth: 1,
      borderColor: tokens.colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 12,
    },
    modalHeaderRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      marginBottom: 14,
    },
    modalHeaderText: { flex: 1, minWidth: 0 },
    modalEyebrow: {
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.6,
      textTransform: "uppercase",
      color: tokens.colors.primary,
      marginBottom: 4,
    },
    modalTitle: { fontSize: 20, fontWeight: "800", color: tokens.colors.foreground, lineHeight: 26 },
    modalMetaChip: {
      alignSelf: "flex-start",
      marginTop: 10,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: tokens.colors.surface,
      borderWidth: 1,
      borderColor: tokens.colors.border,
    },
    modalMetaChipText: { fontSize: 12, fontWeight: "700", color: tokens.colors.mutedForeground },
    modalIconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: tokens.colors.surface,
      borderWidth: 1,
      borderColor: tokens.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    modalIconBtnText: { fontSize: 18, color: tokens.colors.foreground, fontWeight: "600" },
    modalScrollContent: { paddingBottom: 8 },
    modalSectionLabel: {
      fontSize: 12,
      fontWeight: "800",
      color: tokens.colors.mutedForeground,
      marginBottom: 8,
      letterSpacing: 0.4,
    },
    modalSectionDivider: {
      height: 1,
      backgroundColor: tokens.colors.border,
      marginVertical: 18,
    },
    modalHint: {
      fontSize: 12,
      color: tokens.colors.mutedForeground,
      marginBottom: 12,
      lineHeight: 18,
    },
    modalBody: { fontSize: 15, color: tokens.colors.foreground, lineHeight: 22 },
    proofGrid: { flexDirection: "row", flexWrap: "wrap" },
    modalPrimaryBtn: {
      marginTop: 16,
      paddingVertical: 14,
      borderRadius: tokens.radius.md,
      backgroundColor: tokens.colors.primary,
      alignItems: "center",
    },
    modalPrimaryBtnText: { color: tokens.colors.primaryForeground, fontWeight: "800", fontSize: 16 },
    lightboxRoot: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.92)",
      justifyContent: "space-between",
    },
    lightboxStage: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    lightboxImageFrame: {
      borderRadius: tokens.radius.md,
      overflow: "hidden",
      backgroundColor: "rgba(255,255,255,0.06)",
    },
    lightboxLoader: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2,
    },
    lightboxLoaderText: {
      color: "rgba(255,255,255,0.85)",
      fontSize: 14,
      fontWeight: "600",
      marginTop: 12,
    },
    lightboxFooter: { alignItems: "center", paddingHorizontal: 20, gap: 12 },
    lightboxFooterText: { color: "rgba(255,255,255,0.65)", fontSize: 13, textAlign: "center" },
    lightboxClosePill: {
      paddingVertical: 12,
      paddingHorizontal: 28,
      borderRadius: 999,
      backgroundColor: "rgba(255,255,255,0.14)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.22)",
    },
    lightboxClosePillText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  });
