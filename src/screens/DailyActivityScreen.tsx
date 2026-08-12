import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useDeferredReactNativeCalendar } from "../hooks/useDeferredReactNativeCalendar";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../integrations/supabase/client";
import { useAppTheme } from "../contexts/ThemeContext";
import { formatISODateInNigeria, formatLongDateInNigeria, getNigeriaWeekStartISO } from "../lib/nigeriaTime";
import { formatSupabaseError } from "../lib/supabaseError";
import { showAndroidToast } from "../lib/androidToast";
import { WEEKLY_PAGES_TARGET } from "../lib/reportTargets";
import { formatTagsToBoxes, hasDuplicateTagsInBoxes, normalizeTag, parseTagBoxes } from "../lib/activityTypes";
import { fetchBlockedTags, tagReuseError } from "../lib/blockedTags";
import { uploadActivityProofs } from "../lib/uploadActivityProof";
import { pickProofFromGallery, snapLiveProofPhoto } from "../lib/pickProofImage";
import { verificationFieldsOnResubmit } from "../lib/submissionRules";
import { PolicyNoticeBanner } from "../components/notices/PolicyNoticeBanner";
import { Card } from "../components/ui/Card";
import { FocusAwareTextInput, KeyboardSafeScroll } from "../components/ui/KeyboardSafe";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";

type PaymentType = "fiverr" | "outside" | "";
type Status = "draft" | "saved";
type SectionKey = "reading" | "gigs" | "accounts" | "income" | "prospecting" | "skills" | "trainer" | "other";
type ProofKind = "reading" | "gigs" | "accounts" | "skills" | "prospecting" | "other";

const toInt = (v: string) => parseInt(v || "0", 10) || 0;
const toFloat = (v: string) => parseFloat(v || "0") || 0;
const cleanLinks = (links: string[]) => links.map((l) => l.trim()).filter(Boolean);

const minutesUntilEndOfTodayNigeria = () => {
  const nowInNigeria = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos" }));
  const end = new Date(nowInNigeria);
  end.setHours(23, 59, 0, 0);
  const diffMs = end.getTime() - nowInNigeria.getTime();
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / 60000);
};

const EMPTY_FORM = {
  pagesRead: "",
  readingNotes: "",
  gigsCreated: "",
  gigPlatform: "",
  gigService: "",
  gigLinks: [] as string[],
  gigNotes: "",
  accountsCreated: "",
  accountPlatform: "",
  accountService: "",
  accountCountry: "",
  accountLinks: [] as string[],
  accountNotes: "",
  paymentType: "" as PaymentType,
  outsidePaymentMethod: "",
  outsidePaymentMethodOther: "",
  cancelledOrdersCount: "",
  cancelledOrderAmountReceived: "",
  orderType: "",
  deliveryDays: "",
  workType: "",
  dailyContacts: "",
  followUps: "",
  expectedConversions: "",
  grossIncome: "",
  netIncome: "",
  skillLearned: "",
  skillDescription: "",
  skillTaught: "",
  isTheory: false,
  isPractical: false,
  studentsTrained: "",
  trainingDuration: "",
  submissionsReviewed: "",
  otherActivities: "",
};

type SelectOption = { label: string; value: string };

const GIG_PLATFORM_OPTIONS: SelectOption[] = [
  { label: "Fiverr", value: "fiverr" },
  { label: "Upwork", value: "upwork" },
  { label: "Freelancer", value: "freelancer" },
  { label: "Other", value: "other" },
];
const GIG_SERVICE_OPTIONS: SelectOption[] = [
  { label: "Design", value: "design" },
  { label: "Writing", value: "writing" },
  { label: "Development", value: "development" },
  { label: "Marketing", value: "marketing" },
];
const ACCOUNT_PLATFORM_OPTIONS: SelectOption[] = [
  { label: "Fiverr", value: "fiverr" },
  { label: "Upwork", value: "upwork" },
  { label: "Freelancer", value: "freelancer" },
  { label: "PeoplePerHour", value: "peopleperhour" },
];
const PAYMENT_TYPE_OPTIONS: SelectOption[] = [
  { label: "Fiverr", value: "fiverr" },
  { label: "Outside Payment", value: "outside" },
];
const OUTSIDE_PAYMENT_METHOD_OPTIONS: SelectOption[] = [
  { label: "Bank Transfer", value: "bank_transfer" },
  { label: "Crypto", value: "crypto" },
  { label: "Wise", value: "wise" },
  { label: "Revolut", value: "revolut" },
  { label: "Skrill", value: "skrill" },
  { label: "Other", value: "other" },
];
const ORDER_TYPE_OPTIONS: SelectOption[] = [
  { label: "New Order", value: "new" },
  { label: "Repeat Client", value: "repeat" },
  { label: "Upsell", value: "upsell" },
];
const WORK_TYPE_OPTIONS: SelectOption[] = [
  { label: "Design", value: "design" },
  { label: "Writing", value: "writing" },
  { label: "Development", value: "development" },
];

export function DailyActivityScreen() {
  const { tokens } = useAppTheme();
  const styles = getStyles(tokens);
  const { user, userRole, officeId } = useAuth();
  const tabBarHeight = useBottomTabBarHeight();
  const Calendar = useDeferredReactNativeCalendar();
  const today = useMemo(() => formatISODateInNigeria(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockMessage, setLockMessage] = useState("");
  const [status, setStatus] = useState<Status>("draft");
  const [error, setError] = useState<string | null>(null);
  const [weeklyPages, setWeeklyPages] = useState(0);
  const [todayTodoPlan, setTodayTodoPlan] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTitle, setPickerTitle] = useState("");
  const [pickerOptions, setPickerOptions] = useState<SelectOption[]>([]);
  const [onSelectOption, setOnSelectOption] = useState<((value: string) => void) | null>(null);
  const [expanded, setExpanded] = useState<Record<SectionKey, boolean>>({
    reading: true,
    gigs: false,
    accounts: false,
    income: false,
    prospecting: false,
    skills: false,
    trainer: false,
    other: false,
  });
  const emptyProofs = (): Record<ProofKind, string[]> => ({
    reading: [],
    gigs: [],
    accounts: [],
    skills: [],
    prospecting: [],
    other: [],
  });
  const [savedProofs, setSavedProofs] = useState<Record<ProofKind, string[]>>(emptyProofs);
  const [newProofUris, setNewProofUris] = useState<Record<ProofKind, string[]>>(emptyProofs);
  const [tagBoxes, setTagBoxes] = useState<string[]>([""]);
  const [usedTags, setUsedTags] = useState<string[]>([]);
  const [savedTags, setSavedTags] = useState<string[]>([]);
  const [existingMeta, setExistingMeta] = useState<{
    id: string | null;
    verified_at: string | null;
    is_verified: boolean | null;
  }>({ id: null, verified_at: null, is_verified: null });

  const isTrainer = userRole?.role === "trainer";
  const isFiverr = form.paymentType === "fiverr";
  const gross = toFloat(form.grossIncome);
  const fiverrFee = isFiverr ? gross * 0.2 : 0;
  const fiverrNet = isFiverr ? Math.max(gross - fiverrFee, 0) : 0;
  const weeklyTargetPages = WEEKLY_PAGES_TARGET;
  const weeklyProgress = Math.min((weeklyPages / weeklyTargetPages) * 100, 100);

  const showToast = (message: string) => {
    if (Platform.OS === "android") showAndroidToast(message);
    else Alert.alert("Success", message);
  };

  useEffect(() => {
    if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const checkLock = async () => {
    if (!user) return;
    try {
      if (selectedDate !== today) {
        setIsLocked(true);
        setLockMessage(
          selectedDate < today
            ? "Past dates are read-only. Submit or edit today’s report only."
            : "Future dates are read-only. Submit today’s report only.",
        );
        return;
      }
      const { data } = await supabase.rpc("is_today_submission_locked");
      const locked = data === true;
      setIsLocked(locked);
      if (locked) {
        setLockMessage("Submissions are locked after 11:59 PM (WAT).");
      } else {
        const mins = minutesUntilEndOfTodayNigeria();
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        setLockMessage(`Submissions close at 11:59 PM (WAT). ${h}h ${m}m remaining.`);
      }
    } catch {
      setIsLocked(false);
      setLockMessage("Submissions lock at 11:59 PM (WAT).");
    }
  };

  const fetchWeeklyPages = async () => {
    if (!user) return;
    const weekStart = getNigeriaWeekStartISO();
    const { data } = await supabase.from("daily_activities").select("pages_read").eq("user_id", user.id).gte("activity_date", weekStart);
    if (!data) return;
    const sum = data.reduce((acc, row) => acc + ((row.pages_read as number | null) ?? 0), 0);
    setWeeklyPages(sum);
  };

  const fetchUsedTags = async (currentActivityId?: string | null, currentActivityDate?: string | null) => {
    if (!user) return;
    try {
      const blocked = await fetchBlockedTags({
        userId: user.id,
        officeId,
        currentActivityId,
        currentActivityDate: currentActivityDate ?? selectedDate,
      });
      setUsedTags(blocked);
    } catch {
      setUsedTags([]);
    }
  };

  const fetchMorningPlan = async () => {
    if (!user) return;
    try {
      const { data } = await supabase.from("daily_todos").select("plan").eq("user_id", user.id).eq("todo_date", selectedDate).maybeSingle();
      setTodayTodoPlan((data?.plan as string | null) ?? "");
    } catch {
      setTodayTodoPlan("");
    }
  };

  const fetchReport = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: rowErr } = await supabase.from("daily_activities").select("*").eq("user_id", user.id).eq("activity_date", selectedDate).maybeSingle();
      if (rowErr) throw rowErr;

      await Promise.all([
        checkLock(),
        fetchWeeklyPages(),
        fetchMorningPlan(),
        fetchUsedTags(data?.id as string | undefined, selectedDate),
      ]);

      if (!data) {
        setForm(EMPTY_FORM);
        setStatus("draft");
        setSavedProofs(emptyProofs());
        setNewProofUris(emptyProofs());
        setTagBoxes([""]);
        setSavedTags([]);
        setExistingMeta({ id: null, verified_at: null, is_verified: null });
        return;
      }

      setForm({
        pagesRead: String(data.pages_read ?? ""),
        readingNotes: data.reading_notes ?? "",
        gigsCreated: String(data.gigs_created ?? ""),
        gigPlatform: data.gig_platform ?? "",
        gigService: data.gig_service ?? "",
        gigLinks: data.gig_links ?? (data.gig_link ? [data.gig_link] : []),
        gigNotes: data.gig_notes ?? "",
        accountsCreated: String(data.accounts_created ?? ""),
        accountPlatform: data.account_platform ?? "",
        accountService: data.account_service ?? "",
        accountCountry: data.account_country ?? "",
        accountLinks: data.account_links ?? [],
        accountNotes: data.account_notes ?? "",
        paymentType: (data.payment_type ?? (data.income_platform === "fiverr" ? "fiverr" : "")) as PaymentType,
        outsidePaymentMethod: data.outside_payment_method ?? "",
        outsidePaymentMethodOther: data.outside_payment_method_other ?? "",
        cancelledOrdersCount: String(data.cancelled_orders_count ?? ""),
        cancelledOrderAmountReceived: String(data.cancelled_order_amount_received ?? ""),
        orderType: data.order_type ?? "",
        deliveryDays: String(data.delivery_days ?? ""),
        workType: data.work_type ?? "",
        dailyContacts: String(data.daily_contacts ?? ""),
        followUps: String(data.follow_ups ?? ""),
        expectedConversions: String(data.expected_conversions ?? ""),
        grossIncome: String(data.gross_income ?? ""),
        netIncome: String(data.net_income ?? ""),
        skillLearned: data.skill_learned ?? "",
        skillDescription: data.skill_description ?? "",
        skillTaught: data.skill_taught ?? "",
        isTheory: data.is_theory ?? false,
        isPractical: data.is_practical ?? false,
        studentsTrained: String(data.students_trained ?? ""),
        trainingDuration: String(data.training_duration_minutes ?? ""),
        submissionsReviewed: String(data.submissions_reviewed ?? ""),
        otherActivities: data.other_activities ?? "",
      });
      const readingPaths = ((data.reading_proof_images as string[] | null) ?? []).filter(Boolean);
      if (readingPaths.length === 0 && data.reading_proof_image) readingPaths.push(data.reading_proof_image as string);
      const skillPaths = ((data.skill_proof_images as string[] | null) ?? []).filter(Boolean);
      if (skillPaths.length === 0 && data.skill_proof_image) skillPaths.push(data.skill_proof_image as string);
      const otherPaths = ((data.other_activities_proof_images as string[] | null) ?? []).filter(Boolean);
      if (otherPaths.length === 0 && data.other_activities_proof_image) {
        otherPaths.push(data.other_activities_proof_image as string);
      }
      setSavedProofs({
        reading: readingPaths,
        gigs: ((data.gig_proof_images as string[] | null) ?? []).filter(Boolean),
        accounts: ((data.account_proof_images as string[] | null) ?? []).filter(Boolean),
        skills: skillPaths,
        prospecting: ((data.prospecting_proof_images as string[] | null) ?? []).filter(Boolean),
        other: otherPaths,
      });
      setNewProofUris(emptyProofs());
      const loadedTags = parseTagBoxes((data.submission_tags as string[] | null) ?? []);
      setTagBoxes(formatTagsToBoxes(loadedTags));
      setSavedTags(loadedTags);
      setExistingMeta({
        id: (data.id as string | null) ?? null,
        verified_at: (data.verified_at as string | null) ?? null,
        is_verified: (data.is_verified as boolean | null) ?? null,
      });
      setStatus("saved");
    } catch (e: any) {
      setError(e?.message || "Failed to load daily activity.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchReport();
  }, [user?.id, selectedDate]);

  const submit = async () => {
    if (!user || isLocked) return;
    if (hasDuplicateTagsInBoxes(tagBoxes)) {
      setError("Remove duplicate tags — matching is not case-sensitive (Agno and agno count as the same).");
      return;
    }
    const tags = parseTagBoxes(tagBoxes);
    const allowedOnThisReport = savedTags.map((t) => normalizeTag(t));
    const reused = tags.filter((tag) => tagReuseError(tag, usedTags, allowedOnThisReport));
    if (reused.length > 0) {
      setError(`These tags were already used on another day: ${reused.join(", ")}. Each tag can only be used once.`);
      return;
    }
    setSaving(true);
    setError(null);
    const wasSaved = status === "saved";
    try {
      const merged = {
        reading: [...savedProofs.reading, ...(await uploadProofs("reading"))],
        gigs: [...savedProofs.gigs, ...(await uploadProofs("gigs"))],
        accounts: [...savedProofs.accounts, ...(await uploadProofs("accounts"))],
        skills: [...savedProofs.skills, ...(await uploadProofs("skills"))],
        prospecting: [...savedProofs.prospecting, ...(await uploadProofs("prospecting"))],
        other: [...savedProofs.other, ...(await uploadProofs("other"))],
      };
      const payload = {
        user_id: user.id,
        office_id: officeId,
        activity_date: selectedDate,
        pages_read: toInt(form.pagesRead),
        reading_notes: form.readingNotes || null,
        reading_proof_images: merged.reading.length > 0 ? merged.reading : null,
        gigs_created: toInt(form.gigsCreated),
        gig_platform: form.gigPlatform || null,
        gig_service: form.gigService || null,
        gig_notes: form.gigNotes || null,
        gig_links: cleanLinks(form.gigLinks).length > 0 ? cleanLinks(form.gigLinks) : null,
        gig_proof_images: merged.gigs.length > 0 ? merged.gigs : null,
        accounts_created: toInt(form.accountsCreated),
        account_platform: form.accountPlatform || null,
        account_service: form.accountService || null,
        account_country: form.accountCountry || null,
        account_notes: form.accountNotes || null,
        account_links: cleanLinks(form.accountLinks).length > 0 ? cleanLinks(form.accountLinks) : null,
        account_proof_images: merged.accounts.length > 0 ? merged.accounts : null,
        gross_income: toFloat(form.grossIncome),
        net_income: isFiverr ? fiverrNet : toFloat(form.netIncome || form.grossIncome),
        income_platform: isFiverr ? "fiverr" : "outside",
        payment_type: form.paymentType || null,
        outside_payment_method: form.paymentType === "outside" ? form.outsidePaymentMethod || null : null,
        outside_payment_method_other:
          form.paymentType === "outside" && form.outsidePaymentMethod === "other" ? form.outsidePaymentMethodOther || null : null,
        fiverr_fee: isFiverr ? fiverrFee : null,
        cancelled_orders_count: isFiverr ? toInt(form.cancelledOrdersCount) : 0,
        cancelled_order_amount_received: isFiverr ? toFloat(form.cancelledOrderAmountReceived) : 0,
        order_type: form.orderType || null,
        delivery_days: form.deliveryDays ? toInt(form.deliveryDays) : null,
        work_type: form.workType || null,
        daily_contacts: toInt(form.dailyContacts),
        follow_ups: toInt(form.followUps),
        expected_conversions: toInt(form.expectedConversions),
        skill_learned: form.skillLearned || null,
        skill_description: form.skillDescription || null,
        skill_proof_images: merged.skills.length > 0 ? merged.skills : null,
        prospecting_proof_images: merged.prospecting.length > 0 ? merged.prospecting : null,
        skill_taught: isTrainer ? form.skillTaught || null : null,
        is_theory: isTrainer ? form.isTheory : false,
        is_practical: isTrainer ? form.isPractical : false,
        students_trained: isTrainer ? toInt(form.studentsTrained) : 0,
        training_duration_minutes: isTrainer ? toInt(form.trainingDuration) : 0,
        submissions_reviewed: isTrainer ? toInt(form.submissionsReviewed) : 0,
        other_activities: form.otherActivities.trim() || "",
        other_activities_proof_images: merged.other.length > 0 ? merged.other : null,
        submission_tags: tags.length > 0 ? tags : null,
        submitted_at: new Date().toISOString(),
        ...verificationFieldsOnResubmit({
          verified_at: existingMeta.verified_at,
          is_verified: existingMeta.is_verified,
        }),
      };

      const { error: upsertErr } = await supabase.from("daily_activities").upsert(payload, { onConflict: "user_id,activity_date" });
      if (upsertErr) throw upsertErr;

      setStatus("saved");
      await fetchReport();
      showToast(wasSaved ? "Daily report updated" : "Daily report saved");
    } catch (e: unknown) {
      const raw = formatSupabaseError(e);
      if (raw.includes("tag_already_used")) {
        setError("One or more tags were already used on another day. Each tag can only be used once.");
      } else if (raw.includes("tag_limit_exceeded")) {
        setError("Maximum 10 tags per daily report.");
      } else {
        setError(raw);
      }
    } finally {
      setSaving(false);
    }
  };

  const addLink = (key: "gigLinks" | "accountLinks") => setForm((p) => ({ ...p, [key]: [...p[key], ""] }));
  const removeLink = (key: "gigLinks" | "accountLinks", index: number) => setForm((p) => ({ ...p, [key]: p[key].filter((_, i) => i !== index) }));
  const labelFor = (options: SelectOption[], value: string) => options.find((o) => o.value === value)?.label ?? "";
  const toggleSection = (key: SectionKey) => {
    if (Platform.OS === "ios") {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const getPublicImageUrl = (path: string) => supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  const pickProofs = async (kind: ProofKind) => {
    const uris = await pickProofFromGallery({ multiple: true, limit: 6 });
    if (uris.length === 0) return;
    setNewProofUris((prev) => ({ ...prev, [kind]: [...prev[kind], ...uris] }));
  };
  const snapProof = async (kind: ProofKind) => {
    const uri = await snapLiveProofPhoto();
    if (!uri) return;
    setNewProofUris((prev) => ({ ...prev, [kind]: [...prev[kind], uri] }));
  };
  const removeNewProof = (kind: ProofKind, index: number) =>
    setNewProofUris((prev) => ({ ...prev, [kind]: prev[kind].filter((_, i) => i !== index) }));
  const removeSavedProof = (kind: ProofKind, path: string) =>
    setSavedProofs((prev) => ({ ...prev, [kind]: prev[kind].filter((item) => item !== path) }));
  const uploadProofs = async (kind: ProofKind) => {
    if (!user) return [];
    return uploadActivityProofs({
      uris: newProofUris[kind],
      userId: user.id,
      officeId,
      proofType: kind,
      activityDate: selectedDate,
      activityId: existingMeta.id,
    });
  };
  const renderProofs = (kind: ProofKind, label: string, opts?: { liveCamera?: boolean }) => (
    <>
      <View style={styles.topRow}>
        <Text style={styles.label}>{label}</Text>
        {!isLocked ? (
          <View style={styles.proofActions}>
            {opts?.liveCamera ? (
              <Button title="Snap live" size="sm" onPress={() => void snapProof(kind)} />
            ) : null}
            <Button title={opts?.liveCamera ? "Gallery" : "+ Upload"} variant="outline" size="sm" onPress={() => void pickProofs(kind)} />
          </View>
        ) : null}
      </View>
      {opts?.liveCamera && !isLocked ? (
        <Text style={styles.mutedText}>Snap a live photo of the book you read, or pick from your gallery.</Text>
      ) : null}
      {savedProofs[kind].map((path) => (
        <View key={path} style={styles.proofRow}>
          <Image source={{ uri: getPublicImageUrl(path) }} style={styles.proofImage} resizeMode="cover" />
          {!isLocked ? (
            <Button title="Remove saved" variant="destructive" size="sm" onPress={() => removeSavedProof(kind, path)} />
          ) : null}
        </View>
      ))}
      {newProofUris[kind].map((uri, index) => (
        <View key={`${uri}-${index}`} style={styles.proofRow}>
          <Image source={{ uri }} style={styles.proofImage} resizeMode="cover" />
          <Button title="Remove" variant="destructive" size="sm" onPress={() => removeNewProof(kind, index)} />
        </View>
      ))}
    </>
  );
  const openPicker = (title: string, options: SelectOption[], onSelect: (value: string) => void) => {
    setPickerTitle(title);
    setPickerOptions(options);
    setOnSelectOption(() => onSelect);
    setPickerVisible(true);
  };
  const renderSelect = (
    value: string,
    options: SelectOption[],
    placeholder: string,
    onPress: () => void,
  ) => (
    <Pressable style={({ pressed }) => [styles.selectField, pressed && styles.selectFieldPressed]} onPress={onPress}>
      <View style={styles.selectInner}>
        <Text style={value ? styles.selectText : styles.selectPlaceholder}>{labelFor(options, value) || placeholder}</Text>
        <Text style={styles.selectChevron}>▼</Text>
      </View>
      <Text style={styles.selectHint}>Tap to select</Text>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={tokens.colors.primary} />
        <Text style={styles.loadingText}>Loading daily activity...</Text>
      </View>
    );
  }

  return (
    <KeyboardSafeScroll style={styles.screen} contentContainerStyle={[styles.container, { paddingBottom: tabBarHeight + 56 }]}>
      <View style={styles.topRow}>
        <Text style={styles.title}>Daily Activity</Text>
        <Badge variant={isLocked ? "destructive" : status === "saved" ? "success" : "default"}>
          {isLocked ? "Locked" : status === "saved" ? "Saved" : "Draft"}
        </Badge>
      </View>
      <Text style={styles.subtitle}>Complete today’s report before 11:59 PM WAT. Past dates are read-only.</Text>
      <Text style={styles.mutedText}>{lockMessage}</Text>
      <PolicyNoticeBanner noticeId="tags_lifetime_v2" title="Tags are lifetime unique">
        Add up to 10 tags, one per box. Each tag can be used only once ever in this office (case-insensitive).
      </PolicyNoticeBanner>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Pick a date</Text>
        <View style={styles.calendarWrap}>
          {Calendar ? (
            <Calendar
              maxDate={today}
              onDayPress={(d: { dateString: string }) => {
                if (d.dateString > today) return;
                setSelectedDate(d.dateString);
              }}
              markedDates={{ [selectedDate]: { selected: true, selectedColor: tokens.colors.primary } }}
              theme={{
                calendarBackground: tokens.colors.surface,
                backgroundColor: tokens.colors.surface,
                textSectionTitleColor: tokens.colors.mutedForeground,
                selectedDayBackgroundColor: tokens.colors.primary,
                selectedDayTextColor: tokens.colors.primaryForeground,
                todayTextColor: tokens.colors.primary,
                dayTextColor: tokens.colors.foreground,
                monthTextColor: tokens.colors.foreground,
                arrowColor: tokens.colors.primary,
                textDisabledColor: tokens.colors.muted,
              }}
            />
          ) : (
            <View style={styles.calendarLoading}>
              <ActivityIndicator color={tokens.colors.primary} />
            </View>
          )}
        </View>
        <View style={styles.dateRow}>
          <FocusAwareTextInput value={selectedDate} onChangeText={setSelectedDate} style={[styles.textInput, { flex: 1 }]} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
          <View style={{ width: 8 }} />
          <Button title="Today" variant="outline" onPress={() => setSelectedDate(today)} size="sm" />
        </View>
        <Text style={styles.mutedText}>{formatLongDateInNigeria(new Date(`${selectedDate}T12:00:00`))}</Text>
      </Card>

      <Card style={styles.card}>
        <View style={styles.topRow}>
          <Text style={styles.cardTitle}>Weekly Reading Progress</Text>
          <Text style={styles.mutedText}>
            {weeklyPages} / {weeklyTargetPages} pages
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${weeklyProgress}%` }]} />
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Morning Daily Todo</Text>
        <View style={styles.todoPreview}>
          <Text style={styles.todoText}>{todayTodoPlan || "No morning plan saved for this date yet."}</Text>
        </View>
      </Card>

      <Card style={styles.card}>
        <Pressable style={styles.sectionHeader} onPress={() => toggleSection("reading")}>
          <Text style={styles.cardTitle}>Reading & Learning</Text>
          <Text style={styles.sectionChevron}>{expanded.reading ? "▲" : "▼"}</Text>
        </Pressable>
        {expanded.reading ? (
          <>
            <Text style={styles.label}>Pages Read</Text>
            <FocusAwareTextInput value={form.pagesRead} onChangeText={(v) => setForm((p) => ({ ...p, pagesRead: v }))} style={styles.textInput} keyboardType="numbers-and-punctuation" />
            <Text style={styles.label}>Reading Notes (max 200)</Text>
            <Textarea value={form.readingNotes} onChangeText={(v) => setForm((p) => ({ ...p, readingNotes: v.slice(0, 200) }))} placeholder="What did you learn today?" />
            <Text style={styles.mutedText}>{form.readingNotes.length}/200</Text>

            {renderProofs("reading", "Book Proof Images", { liveCamera: true })}
          </>
        ) : null}
      </Card>

      <Card style={styles.card}>
        <Pressable style={styles.sectionHeader} onPress={() => toggleSection("gigs")}>
          <Text style={styles.cardTitle}>Gig Creation</Text>
          <Text style={styles.sectionChevron}>{expanded.gigs ? "▲" : "▼"}</Text>
        </Pressable>
        {expanded.gigs ? (
          <>
            <Text style={styles.label}>Number of Gigs</Text>
            <FocusAwareTextInput value={form.gigsCreated} onChangeText={(v) => setForm((p) => ({ ...p, gigsCreated: v }))} style={styles.textInput} keyboardType="numbers-and-punctuation" />
            <View style={styles.dual}>
              <View style={styles.formHalf}>
                <Text style={styles.label}>Platform</Text>
                {renderSelect(form.gigPlatform, GIG_PLATFORM_OPTIONS, "Select platform", () =>
                  openPicker("Gig Platform", GIG_PLATFORM_OPTIONS, (value) => setForm((p) => ({ ...p, gigPlatform: value }))),
                )}
              </View>
              <View style={styles.formHalf}>
                <Text style={styles.label}>Service</Text>
                {renderSelect(form.gigService, GIG_SERVICE_OPTIONS, "Select service", () =>
                  openPicker("Gig Service", GIG_SERVICE_OPTIONS, (value) => setForm((p) => ({ ...p, gigService: value }))),
                )}
              </View>
            </View>
            <View style={styles.topRow}>
              <Text style={styles.label}>Gig Links</Text>
              <Button title="+ Add Link" variant="outline" size="sm" onPress={() => addLink("gigLinks")} />
            </View>
            {form.gigLinks.map((link, index) => (
              <View key={`g-${index}`} style={styles.linkRow}>
                <Input value={link} onChangeText={(value) => setForm((p) => ({ ...p, gigLinks: p.gigLinks.map((x, i) => (i === index ? value : x)) }))} placeholder="https://..." style={{ flex: 1 }} />
                <Button title="Remove" variant="destructive" size="sm" onPress={() => removeLink("gigLinks", index)} />
              </View>
            ))}
            <Text style={styles.label}>Gig notes</Text>
            <Textarea value={form.gigNotes} onChangeText={(v) => setForm((p) => ({ ...p, gigNotes: v }))} placeholder="Notes about gigs created today" style={{ minHeight: 80 }} />
            {renderProofs("gigs", "Gig proof images")}
          </>
        ) : null}
      </Card>

      <Card style={styles.card}>
        <Pressable style={styles.sectionHeader} onPress={() => toggleSection("accounts")}>
          <Text style={styles.cardTitle}>Account Creation</Text>
          <Text style={styles.sectionChevron}>{expanded.accounts ? "▲" : "▼"}</Text>
        </Pressable>
        {expanded.accounts ? (
          <>
            <Text style={styles.label}>Accounts Created</Text>
            <FocusAwareTextInput value={form.accountsCreated} onChangeText={(v) => setForm((p) => ({ ...p, accountsCreated: v }))} style={styles.textInput} keyboardType="numbers-and-punctuation" />
            <View style={styles.dual}>
              <View style={styles.formHalf}>
                <Text style={styles.label}>Platform</Text>
                {renderSelect(form.accountPlatform, ACCOUNT_PLATFORM_OPTIONS, "Select platform", () =>
                  openPicker("Account Platform", ACCOUNT_PLATFORM_OPTIONS, (value) => setForm((p) => ({ ...p, accountPlatform: value }))),
                )}
              </View>
              <View style={styles.formHalf}>
                <Text style={styles.label}>Service</Text>
                <Input value={form.accountService} onChangeText={(v) => setForm((p) => ({ ...p, accountService: v }))} placeholder="Logo design" />
              </View>
            </View>
            <Text style={styles.label}>Country</Text>
            <Input value={form.accountCountry} onChangeText={(v) => setForm((p) => ({ ...p, accountCountry: v }))} placeholder="USA" />
            <View style={styles.topRow}>
              <Text style={styles.label}>Account links</Text>
              <Button title="+ Add Link" variant="outline" size="sm" onPress={() => addLink("accountLinks")} />
            </View>
            {form.accountLinks.map((link, index) => (
              <View key={`a-${index}`} style={styles.linkRow}>
                <Input value={link} onChangeText={(value) => setForm((p) => ({ ...p, accountLinks: p.accountLinks.map((x, i) => (i === index ? value : x)) }))} placeholder="https://..." style={{ flex: 1 }} />
                <Button title="Remove" variant="destructive" size="sm" onPress={() => removeLink("accountLinks", index)} />
              </View>
            ))}
            <Text style={styles.label}>Account notes</Text>
            <Textarea value={form.accountNotes} onChangeText={(v) => setForm((p) => ({ ...p, accountNotes: v }))} placeholder="Notes about accounts created today" style={{ minHeight: 80 }} />
            {renderProofs("accounts", "Account proof images")}
          </>
        ) : null}
      </Card>

      <Card style={styles.card}>
        <Pressable style={styles.sectionHeader} onPress={() => toggleSection("income")}>
          <Text style={styles.cardTitle}>Income Tracking</Text>
          <Text style={styles.sectionChevron}>{expanded.income ? "▲" : "▼"}</Text>
        </Pressable>
        {expanded.income ? (
          <>
            <Text style={styles.label}>Payment Type</Text>
            {renderSelect(form.paymentType, PAYMENT_TYPE_OPTIONS, "Select payment type", () =>
              openPicker("Payment Type", PAYMENT_TYPE_OPTIONS, (value) =>
                setForm((p) => ({
                  ...p,
                  paymentType: value as PaymentType,
                  outsidePaymentMethod: value === "outside" ? p.outsidePaymentMethod : "",
                  outsidePaymentMethodOther: value === "outside" ? p.outsidePaymentMethodOther : "",
                })),
              ),
            )}
            <View style={styles.dual}>
              <View style={styles.formHalf}>
                <Text style={styles.label}>Gross Income ($)</Text>
                <FocusAwareTextInput value={form.grossIncome} onChangeText={(v) => setForm((p) => ({ ...p, grossIncome: v }))} style={styles.textInput} keyboardType="numbers-and-punctuation" />
              </View>
              <View style={styles.formHalf}>
                <Text style={styles.label}>Net Income ($)</Text>
                <FocusAwareTextInput value={isFiverr ? fiverrNet.toFixed(2) : form.netIncome} onChangeText={(v) => setForm((p) => ({ ...p, netIncome: v }))} style={[styles.textInput, isFiverr ? styles.disabledInput : undefined]} keyboardType="numbers-and-punctuation" editable={!isFiverr} />
              </View>
            </View>
            {isFiverr ? (
              <>
                <Text style={styles.mutedText}>Fiverr fee (20%): ${fiverrFee.toFixed(2)}</Text>
                <View style={styles.dual}>
                  <View style={styles.formHalf}>
                    <Text style={styles.label}>Cancelled orders</Text>
                    <FocusAwareTextInput value={form.cancelledOrdersCount} onChangeText={(v) => setForm((p) => ({ ...p, cancelledOrdersCount: v }))} style={styles.textInput} keyboardType="numbers-and-punctuation" />
                  </View>
                  <View style={styles.formHalf}>
                    <Text style={styles.label}>Amount received ($)</Text>
                    <FocusAwareTextInput value={form.cancelledOrderAmountReceived} onChangeText={(v) => setForm((p) => ({ ...p, cancelledOrderAmountReceived: v }))} style={styles.textInput} keyboardType="numbers-and-punctuation" />
                  </View>
                </View>
                <Text style={styles.label}>Delivery days</Text>
                <FocusAwareTextInput value={form.deliveryDays} onChangeText={(v) => setForm((p) => ({ ...p, deliveryDays: v }))} style={styles.textInput} keyboardType="numbers-and-punctuation" />
              </>
            ) : null}
            {form.paymentType === "outside" ? (
              <>
                <Text style={styles.label}>Outside Payment Method</Text>
                {renderSelect(form.outsidePaymentMethod, OUTSIDE_PAYMENT_METHOD_OPTIONS, "Select method", () =>
                  openPicker("Outside Payment Method", OUTSIDE_PAYMENT_METHOD_OPTIONS, (value) =>
                    setForm((p) => ({
                      ...p,
                      outsidePaymentMethod: value,
                      outsidePaymentMethodOther: value === "other" ? p.outsidePaymentMethodOther : "",
                    })),
                  ),
                )}
                {form.outsidePaymentMethod === "other" ? (
                  <Input
                    value={form.outsidePaymentMethodOther}
                    onChangeText={(v) => setForm((p) => ({ ...p, outsidePaymentMethodOther: v }))}
                    placeholder="Specify method"
                  />
                ) : null}
              </>
            ) : null}
            <View style={styles.dual}>
              <View style={styles.formHalf}>
                <Text style={styles.label}>Order Type</Text>
                {renderSelect(form.orderType, ORDER_TYPE_OPTIONS, "Select order type", () =>
                  openPicker("Order Type", ORDER_TYPE_OPTIONS, (value) => setForm((p) => ({ ...p, orderType: value }))),
                )}
              </View>
              <View style={styles.formHalf}>
                <Text style={styles.label}>Work Type</Text>
                {renderSelect(form.workType, WORK_TYPE_OPTIONS, "Select work type", () =>
                  openPicker("Work Type", WORK_TYPE_OPTIONS, (value) => setForm((p) => ({ ...p, workType: value }))),
                )}
              </View>
            </View>
            <Text style={styles.label}>Daily Contacts</Text>
            <FocusAwareTextInput value={form.dailyContacts} onChangeText={(v) => setForm((p) => ({ ...p, dailyContacts: v }))} style={styles.textInput} keyboardType="numbers-and-punctuation" />
          </>
        ) : null}
      </Card>

      <Card style={styles.card}>
        <Pressable style={styles.sectionHeader} onPress={() => toggleSection("prospecting")}>
          <Text style={styles.cardTitle}>Prospecting</Text>
          <Text style={styles.sectionChevron}>{expanded.prospecting ? "▲" : "▼"}</Text>
        </Pressable>
        {expanded.prospecting ? (
          <>
            <View style={styles.dual}>
              <View style={styles.formHalf}>
                <Text style={styles.label}>Follow-ups</Text>
                <FocusAwareTextInput value={form.followUps} onChangeText={(v) => setForm((p) => ({ ...p, followUps: v }))} style={styles.textInput} keyboardType="numbers-and-punctuation" />
              </View>
              <View style={styles.formHalf}>
                <Text style={styles.label}>Expected Conversions</Text>
                <FocusAwareTextInput value={form.expectedConversions} onChangeText={(v) => setForm((p) => ({ ...p, expectedConversions: v }))} style={styles.textInput} keyboardType="numbers-and-punctuation" />
              </View>
            </View>
            {renderProofs("prospecting", "Prospecting proof images")}
          </>
        ) : null}
      </Card>

      <Card style={styles.card}>
        <Pressable style={styles.sectionHeader} onPress={() => toggleSection("skills")}>
          <Text style={styles.cardTitle}>Skill Acquisition</Text>
          <Text style={styles.sectionChevron}>{expanded.skills ? "▲" : "▼"}</Text>
        </Pressable>
        {expanded.skills ? (
          <>
            <Text style={styles.label}>Skill Learned</Text>
            <Input value={form.skillLearned} onChangeText={(v) => setForm((p) => ({ ...p, skillLearned: v }))} placeholder="Advanced Excel formulas" />
            <Text style={styles.label}>Skill Description</Text>
            <Textarea value={form.skillDescription} onChangeText={(v) => setForm((p) => ({ ...p, skillDescription: v }))} placeholder="Describe what you learned..." style={{ minHeight: 80 }} />
            {renderProofs("skills", "Skill proof images")}
          </>
        ) : null}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Daily Tags</Text>
        <Text style={styles.mutedText}>
          One tag per box. Max 10. You can edit today’s tags freely. Tags from other days stay blocked.
        </Text>
        {tagBoxes.map((box, index) => {
          const normalized = normalizeTag(box);
          const dupHere = Boolean(
            normalized && tagBoxes.some((other, i) => i !== index && normalizeTag(other) === normalized),
          );
          const usedBefore = Boolean(
            normalized && usedTags.includes(normalized) && !savedTags.map((t) => normalizeTag(t)).includes(normalized),
          );
          const invalid = dupHere || usedBefore;
          return (
            <View key={`tag-${index}`} style={{ gap: 4 }}>
              <View style={styles.dateRow}>
                <FocusAwareTextInput
                  value={box}
                  onChangeText={(value) =>
                    setTagBoxes((prev) => prev.map((item, i) => (i === index ? value : item)))
                  }
                  style={[styles.textInput, { flex: 1 }, invalid ? styles.tagInvalid : null]}
                  placeholder={`Tag ${index + 1}`}
                  editable={!isLocked}
                  autoCapitalize="none"
                />
                {tagBoxes.length > 1 ? (
                  <Button
                    title="Remove"
                    variant="ghost"
                    size="sm"
                    onPress={() => setTagBoxes((prev) => prev.filter((_, i) => i !== index))}
                  />
                ) : null}
              </View>
              {dupHere ? <Text style={styles.error}>This tag is duplicated in today's boxes.</Text> : null}
              {usedBefore ? <Text style={styles.error}>Already used before — pick a new tag.</Text> : null}
            </View>
          );
        })}
        {tagBoxes.length < 10 && !isLocked ? (
          <Button title="Add tag" variant="outline" size="sm" onPress={() => setTagBoxes((prev) => [...prev, ""])} />
        ) : null}
        {usedTags.length > 0 ? (
          <Text style={styles.mutedText}>
            Used on other days: {usedTags.slice(0, 20).join(", ")}
            {usedTags.length > 20 ? "…" : ""}
          </Text>
        ) : null}
      </Card>

      {isTrainer ? (
        <Card style={styles.card}>
          <Pressable style={styles.sectionHeader} onPress={() => toggleSection("trainer")}>
            <Text style={styles.cardTitle}>Training Given (Trainer)</Text>
            <Text style={styles.sectionChevron}>{expanded.trainer ? "▲" : "▼"}</Text>
          </Pressable>
          {expanded.trainer ? (
            <>
              <Text style={styles.label}>Skill Taught</Text>
              <Input value={form.skillTaught} onChangeText={(v) => setForm((p) => ({ ...p, skillTaught: v }))} placeholder="Prospecting techniques" />
              <View style={styles.dual}>
                <Button title={form.isTheory ? "Theory ✓" : "Theory"} variant={form.isTheory ? "primary" : "outline"} size="sm" onPress={() => setForm((p) => ({ ...p, isTheory: !p.isTheory }))} />
                <Button title={form.isPractical ? "Practical ✓" : "Practical"} variant={form.isPractical ? "primary" : "outline"} size="sm" onPress={() => setForm((p) => ({ ...p, isPractical: !p.isPractical }))} />
              </View>
              <View style={styles.dual}>
                <View style={styles.formHalf}>
                  <Text style={styles.label}>Students trained</Text>
                  <FocusAwareTextInput value={form.studentsTrained} onChangeText={(v) => setForm((p) => ({ ...p, studentsTrained: v }))} style={styles.textInput} keyboardType="numbers-and-punctuation" />
                </View>
                <View style={styles.formHalf}>
                  <Text style={styles.label}>Duration (min)</Text>
                  <FocusAwareTextInput value={form.trainingDuration} onChangeText={(v) => setForm((p) => ({ ...p, trainingDuration: v }))} style={styles.textInput} keyboardType="numbers-and-punctuation" />
                </View>
              </View>
              <Text style={styles.label}>Submissions reviewed</Text>
              <FocusAwareTextInput value={form.submissionsReviewed} onChangeText={(v) => setForm((p) => ({ ...p, submissionsReviewed: v }))} style={styles.textInput} keyboardType="numbers-and-punctuation" />
            </>
          ) : null}
        </Card>
      ) : null}

      <Card style={styles.card}>
        <Pressable style={styles.sectionHeader} onPress={() => toggleSection("other")}>
          <Text style={styles.cardTitle}>Other Activities</Text>
          <Text style={styles.sectionChevron}>{expanded.other ? "▲" : "▼"}</Text>
        </Pressable>
        {expanded.other ? (
          <>
            <Textarea value={form.otherActivities} onChangeText={(v) => setForm((p) => ({ ...p, otherActivities: v }))} placeholder="Write other activities done today..." />
            {renderProofs("other", "Other Activity Proof Images")}
          </>
        ) : null}
      </Card>

      <Card style={styles.card}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {isLocked ? <Text style={styles.lockedText}>Submissions are locked for this date.</Text> : null}
        <Button title={status === "saved" ? "Update Report" : "Submit Report"} onPress={submit} loading={saving} disabled={saving || isLocked} />
      </Card>

      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{pickerTitle}</Text>
            <ScrollView style={styles.modalList}>
              {pickerOptions.map((option) => (
                <Pressable
                  key={option.value}
                  style={styles.modalOption}
                  onPress={() => {
                    if (onSelectOption) onSelectOption(option.value);
                    setPickerVisible(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{option.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Button title="Cancel" variant="outline" onPress={() => setPickerVisible(false)} />
          </View>
        </View>
      </Modal>
    </KeyboardSafeScroll>
  );
}

const getStyles = (tokens: ReturnType<typeof useAppTheme>["tokens"]) =>
  StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.colors.background },
  container: { padding: 18, paddingBottom: 24, gap: 10 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: tokens.colors.background },
  loadingText: { color: tokens.colors.mutedForeground, fontSize: 13 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  title: { fontSize: 24, fontWeight: "800", color: tokens.colors.foreground },
  subtitle: { marginTop: 6, color: tokens.colors.mutedForeground, fontSize: 13 },
  card: { padding: 14, gap: 8 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  sectionChevron: {
    color: tokens.colors.mutedForeground,
    fontSize: 13,
    fontWeight: "700",
  },
  cardTitle: { color: tokens.colors.foreground, fontWeight: "800", fontSize: 15 },
  selectField: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: tokens.colors.card,
  },
  selectFieldPressed: {
    backgroundColor: tokens.colors.accent,
    transform: [{ scale: 0.99 }],
  },
  selectInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  selectText: {
    color: tokens.colors.foreground,
    fontSize: 14,
  },
  selectChevron: {
    color: tokens.colors.mutedForeground,
    fontSize: 12,
  },
  selectPlaceholder: {
    color: tokens.colors.mutedForeground,
    fontSize: 14,
  },
  selectHint: {
    color: tokens.colors.mutedForeground,
    fontSize: 11,
    marginTop: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: tokens.colors.card,
    color: tokens.colors.foreground,
  },
  disabledInput: { backgroundColor: tokens.colors.accent, color: tokens.colors.mutedForeground },
  label: { color: tokens.colors.foreground, fontWeight: "700", fontSize: 13 },
  mutedText: { color: tokens.colors.mutedForeground, fontSize: 12 },
  calendarLoading: { minHeight: 320, justifyContent: "center", alignItems: "center" },
  calendarWrap: { borderWidth: 1, borderColor: tokens.colors.border, borderRadius: tokens.radius.md, overflow: "hidden", backgroundColor: tokens.colors.surface },
  dateRow: { flexDirection: "row", alignItems: "center" },
  todoPreview: { borderWidth: 1, borderColor: tokens.colors.border, borderRadius: tokens.radius.md, backgroundColor: tokens.colors.accent, padding: 10 },
  todoText: { color: tokens.colors.foreground, fontSize: 13, lineHeight: 18 },
  dual: { flexDirection: "row", gap: 10 },
  formHalf: { flex: 1, gap: 6 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  proofActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  proofRow: { gap: 8 },
  proofImage: {
    width: "100%",
    height: 140,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  segmentRow: { flexDirection: "row", gap: 8 },
  segmentBtn: { flex: 1 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: tokens.colors.card,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    padding: 14,
    maxHeight: "70%",
    gap: 10,
  },
  modalTitle: {
    color: tokens.colors.foreground,
    fontSize: 16,
    fontWeight: "700",
  },
  modalList: {
    maxHeight: 320,
  },
  modalOption: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.border,
  },
  modalOptionText: {
    color: tokens.colors.foreground,
    fontSize: 14,
  },
  progressTrack: {
    marginTop: 2,
    height: 8,
    borderRadius: 999,
    backgroundColor: tokens.colors.border,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: tokens.colors.primary,
    borderRadius: 999,
  },
  tagInvalid: { borderColor: tokens.colors.destructive },
  error: { color: tokens.colors.destructive, fontSize: 13 },
  lockedText: { color: tokens.colors.warning, fontSize: 13 },
  });
