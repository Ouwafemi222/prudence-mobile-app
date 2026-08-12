import { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BookOpen,
  Briefcase,
  UserPlus,
  DollarSign,
  Users,
  GraduationCap,
  ChevronDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Tag,
  X,
} from "lucide-react";
import {
  formatTagsToBoxes,
  hasDuplicateTagsInBoxes,
  normalizeTag,
  parseTagBoxes,
} from "@/lib/activityTypes";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeRefresh } from "@/contexts/RealtimeSyncContext";
import { addDaysISODate, formatISODateInNigeria, formatLongDateInNigeria, getNigeriaNowLockInfo, getNigeriaWeekStartISO } from "@/lib/nigeriaTime";
import { verificationFieldsOnResubmit } from "@/lib/submissionRules";
import { WEEKLY_PAGES_TARGET } from "@/lib/reportTargets";
import { TenantAppSeo } from "@/components/seo/TenantAppSeo";
import { Link } from "react-router-dom";
import { ActivityProofUploader } from "@/components/daily-activity/ActivityProofUploader";
import { PolicyNoticeBanner } from "@/components/notices/PolicyNoticeBanner";
import {
  checkDuplicateProofImage,
  checkPerceptualProofImage,
  fetchUserProofHashes,
  hashFileSha256,
  recordProofImageHash,
  type ProofHashRow,
} from "@/lib/proofImageHash";
import { computeDHash } from "@/lib/proofImagePerceptualHash";

const getPublicImageUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
};

const sections = [
  { id: "reading", title: "Reading & Learning", icon: BookOpen, description: "Track your daily reading progress" },
  { id: "gigs", title: "Gig Creation", icon: Briefcase, description: "Log new gigs you've created" },
  { id: "accounts", title: "Account Creation", icon: UserPlus, description: "Track new accounts created" },
  { id: "income", title: "Income Tracking", icon: DollarSign, description: "Record your earnings" },
  { id: "prospecting", title: "Prospecting", icon: Users, description: "Log your outreach activities" },
  { id: "skills", title: "Skill Acquisition", icon: GraduationCap, description: "Document skills you're learning" },
  { id: "tags", title: "Daily Tags", icon: Tag, description: "One tag per box — each tag can only be used once" },
  { id: "other", title: "Other Activities", icon: CheckCircle2, description: "Submit any other activities not in the template" },
];

const trainerSections = [
  { id: "training", title: "Training Given", icon: GraduationCap, description: "Log training sessions you've conducted" },
];

function activityToFormData(data: Record<string, unknown>) {
  return {
    pagesRead: (data.pages_read as number | null)?.toString() || "",
    readingNotes: (data.reading_notes as string) || "",
    gigsCreated: (data.gigs_created as number | null)?.toString() || "",
    gigPlatform: (data.gig_platform as string) || "",
    gigService: (data.gig_service as string) || "",
    gigLinks: (data.gig_links as string[] | null) || (data.gig_link ? [data.gig_link as string] : []),
    gigNotes: (data.gig_notes as string) || "",
    accountsCreated: (data.accounts_created as number | null)?.toString() || "",
    accountPlatform: (data.account_platform as string) || "",
    accountService: (data.account_service as string) || "",
    accountCountry: (data.account_country as string) || "",
    accountLinks: (data.account_links as string[] | null) || [],
    accountNotes: (data.account_notes as string) || "",
    grossIncome: (data.gross_income as number | null)?.toString() || "",
    netIncome: (data.net_income as number | null)?.toString() || "",
    paymentType:
      (data.payment_type as string) || (data.income_platform === "fiverr" ? "fiverr" : ""),
    outsidePaymentMethod: (data.outside_payment_method as string) || "",
    outsidePaymentMethodOther: (data.outside_payment_method_other as string) || "",
    cancelledOrdersCount: (data.cancelled_orders_count as number | null)?.toString() || "",
    cancelledOrderAmountReceived:
      (data.cancelled_order_amount_received as number | null)?.toString() || "",
    orderType: (data.order_type as string) || "",
    deliveryDays: (data.delivery_days as number | null)?.toString() || "",
    workType: (data.work_type as string) || "",
    dailyContacts: (data.daily_contacts as number | null)?.toString() || "",
    followUps: (data.follow_ups as number | null)?.toString() || "",
    expectedConversions: (data.expected_conversions as number | null)?.toString() || "",
    skillLearned: (data.skill_learned as string) || "",
    skillDescription: (data.skill_description as string) || "",
    skillTaught: (data.skill_taught as string) || "",
    isTheory: (data.is_theory as boolean) || false,
    isPractical: (data.is_practical as boolean) || false,
    studentsTrained: (data.students_trained as number | null)?.toString() || "",
    trainingDuration: (data.training_duration_minutes as number | null)?.toString() || "",
    submissionsReviewed: (data.submissions_reviewed as number | null)?.toString() || "",
    dailyTagBoxes: formatTagsToBoxes(data.submission_tags as string[] | null),
    newThingsLearned: (data.new_things_learned as string) || "",
    otherActivities: (data.other_activities as string) || "",
  };
}

export default function DailyActivity() {
  const { user, isTrainer, officeId } = useAuth();
  const userId = user?.id;
  const [openSections, setOpenSections] = useState<string[]>(["reading"]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [todayActivity, setTodayActivity] = useState<any>(null);
  const [todayTodoPlan, setTodayTodoPlan] = useState<string>("");
  const [weeklyPages, setWeeklyPages] = useState(0);
  const [usedTagsElsewhere, setUsedTagsElsewhere] = useState<Set<string>>(new Set());
  const pendingProofRecords = useRef<
    {
      contentHash: string;
      perceptualHash: string | null;
      storagePath: string;
      proofType: string;
    }[]
  >([]);
  const [userProofHashes, setUserProofHashes] = useState<ProofHashRow[]>([]);
  const [readingProofFiles, setReadingProofFiles] = useState<File[]>([]);
  const [skillProofFiles, setSkillProofFiles] = useState<File[]>([]);
  const [otherActivitiesProofFiles, setOtherActivitiesProofFiles] = useState<File[]>([]);
  const [readingPreviewUrls, setReadingPreviewUrls] = useState<string[]>([]);
  const [skillPreviewUrls, setSkillPreviewUrls] = useState<string[]>([]);
  const [otherPreviewUrls, setOtherPreviewUrls] = useState<string[]>([]);
  const [gigProofFiles, setGigProofFiles] = useState<File[]>([]);
  const [accountProofFiles, setAccountProofFiles] = useState<File[]>([]);
  const [prospectingProofFiles, setProspectingProofFiles] = useState<File[]>([]);
  const [prospectingPreviewUrls, setProspectingPreviewUrls] = useState<string[]>([]);
  const [removingImagePath, setRemovingImagePath] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockMessage, setLockMessage] = useState("");
  const formDirtyRef = useRef(false);

  const [formData, setFormDataState] = useState({
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
    grossIncome: "",
    netIncome: "",
    paymentType: "",
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
    skillLearned: "",
    skillDescription: "",
    // Trainer fields
    skillTaught: "",
    isTheory: false,
    isPractical: false,
    studentsTrained: "",
    trainingDuration: "",
    submissionsReviewed: "",
    dailyTagBoxes: [""] as string[],
    newThingsLearned: "",
    otherActivities: "",
  });

  const parsedGrossIncome = parseFloat(formData.grossIncome) || 0;
  const isFiverrPayment = formData.paymentType === "fiverr";
  const fiverrFee = isFiverrPayment ? parsedGrossIncome * 0.2 : 0;
  const fiverrNet = isFiverrPayment ? Math.max(parsedGrossIncome - fiverrFee, 0) : 0;

  useEffect(() => {
    if (!userId) return;
    formDirtyRef.current = false;
    fetchTodayActivity({ hydrateForm: true });
    fetchWeeklyPages();
    checkSubmissionLock();
    fetchTodayTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per user, not on token refresh
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    void fetchUserProofHashes().then(setUserProofHashes);
  }, [userId]);

  useEffect(() => {
    if (!userId || !officeId) return;
    void fetchUsedTags(todayActivity?.id);
  }, [userId, officeId, todayActivity?.id]);

  const setFormData: typeof setFormDataState = (update) => {
    formDirtyRef.current = true;
    setFormDataState(update);
  };

  // Local preview URLs (avoid creating object URLs during render + revoke to prevent leaks)
  useEffect(() => {
    const urls = readingProofFiles.map(file => URL.createObjectURL(file));
    setReadingPreviewUrls(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [readingProofFiles]);

  useEffect(() => {
    const urls = skillProofFiles.map(file => URL.createObjectURL(file));
    setSkillPreviewUrls(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [skillProofFiles]);

  useEffect(() => {
    const urls = otherActivitiesProofFiles.map(file => URL.createObjectURL(file));
    setOtherPreviewUrls(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [otherActivitiesProofFiles]);

  const [gigPreviewUrls, setGigPreviewUrls] = useState<string[]>([]);
  const [accountPreviewUrls, setAccountPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    const urls = gigProofFiles.map((file) => URL.createObjectURL(file));
    setGigPreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [gigProofFiles]);

  useEffect(() => {
    const urls = accountProofFiles.map((file) => URL.createObjectURL(file));
    setAccountPreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [accountProofFiles]);

  useEffect(() => {
    const urls = prospectingProofFiles.map((file) => URL.createObjectURL(file));
    setProspectingPreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [prospectingProofFiles]);

  const fetchTodayTodo = async () => {
    if (!user) return;
    try {
      const today = formatISODateInNigeria();
      const { data, error } = await supabase
        .from("daily_todos")
        .select("plan")
        .eq("user_id", user.id)
        .eq("todo_date", today)
        .maybeSingle();

      if (error) throw error;
      setTodayTodoPlan(data?.plan || "");
    } catch (e) {
      // Don't block the page if this fails
      setTodayTodoPlan("");
    }
  };

  const fetchUsedTags = async (currentActivityId?: string) => {
    if (!userId || !officeId) return;
    const blocked = new Set<string>();
    const todayISO = formatISODateInNigeria();

    const { data: registry, error: regError } = await supabase
      .from("user_submission_tags")
      .select("tag, first_activity_id, first_used_date")
      .eq("user_id", userId)
      .eq("office_id", officeId);

    if (regError) {
      console.error("fetchUsedTags registry:", regError);
    } else {
      for (const row of registry || []) {
        if (row.first_activity_id && row.first_activity_id === currentActivityId) continue;
        if (row.first_used_date === todayISO) continue;
        blocked.add(row.tag);
      }
    }

    // Also scan past daily reports so every historically submitted tag is blocked
    const { data: activities, error: actError } = await supabase
      .from("daily_activities")
      .select("id, activity_date, submission_tags")
      .eq("user_id", userId)
      .eq("office_id", officeId);

    if (actError) {
      console.error("fetchUsedTags activities:", actError);
    } else {
      for (const activity of activities || []) {
        if (activity.id === currentActivityId || activity.activity_date === todayISO) continue;
        for (const raw of activity.submission_tags || []) {
          const tag = normalizeTag(String(raw));
          if (tag) blocked.add(tag);
        }
      }
    }

    setUsedTagsElsewhere(blocked);
  };

  const checkSubmissionLock = async () => {
    if (!user) return;
    
    try {
      // Check if today's submission is locked using database function
      const { data, error } = await supabase
        .rpc("is_today_submission_locked");
      
      if (error) throw error;
      
      const locked = data === true;
      setIsLocked(locked);
      
      if (locked) {
        const todayISO = formatISODateInNigeria();
        const tomorrowISO = addDaysISODate(todayISO, 1);
        setLockMessage(
          `Submissions are locked after 11:59 PM (WAT). The deadline for ${todayISO} has passed. Next submission opens for ${tomorrowISO}.`
        );
      } else {
        const info = getNigeriaNowLockInfo();
        if (info.minutesUntilLock !== null) {
          const hoursUntilLock = Math.floor(info.minutesUntilLock / 60);
          const minutesUntilLock = info.minutesUntilLock % 60;
          setLockMessage(`Submissions close at 11:59 PM (WAT). ${hoursUntilLock}h ${minutesUntilLock}m remaining.`);
        } else {
          setLockMessage("Submissions lock at 11:59 PM (WAT)");
        }
      }
    } catch (error: any) {
      console.error("Error checking submission lock:", error);
      // Fallback to client-side check
      const info = getNigeriaNowLockInfo();
      setIsLocked(info.isLockedForToday);
    }
  };

  const fetchTodayActivity = async (options?: { hydrateForm?: boolean }) => {
    if (!user) return;

    const today = formatISODateInNigeria();
    const { data } = await supabase
      .from("daily_activities")
      .select("*")
      .eq("user_id", user.id)
      .eq("activity_date", today)
      .maybeSingle();

    if (data) {
      setTodayActivity(data);
      if (options?.hydrateForm || !formDirtyRef.current) {
        setFormDataState(activityToFormData(data));
        if (options?.hydrateForm) formDirtyRef.current = false;
      }
    } else {
      setTodayActivity(null);
      if (options?.hydrateForm) formDirtyRef.current = false;
    }
  };

  const fetchWeeklyPages = async () => {
    if (!user) return;
    
    const startOfWeek = getNigeriaWeekStartISO();
    
    const { data } = await supabase
      .from("daily_activities")
      .select("pages_read")
      .eq("user_id", user.id)
      .gte("activity_date", startOfWeek);
    
    if (data) {
      const total = data.reduce((sum, d) => sum + (d.pages_read || 0), 0);
      setWeeklyPages(total);
    }
  };

  useRealtimeRefresh(() => {
    fetchTodayActivity({ hydrateForm: false });
    fetchWeeklyPages();
    checkSubmissionLock();
  }, ["daily_activities", "weekly_reports", "daily_todos"]);

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const uploadProofImage = async (file: File, type: string): Promise<string | null> => {
    if (!user) return null;

    const contentHash = await hashFileSha256(file);
    const duplicate = await checkDuplicateProofImage(contentHash);
    if (duplicate.isDuplicate) {
      const when = duplicate.activityDate ?? "a previous day";
      toast.error(`This exact file was already uploaded on ${when}. Use a different photo.`);
      throw new Error("duplicate_proof_image");
    }

    const perceptualHash = await computeDHash(file);
    const perceptualDuplicate = await checkPerceptualProofImage(
      perceptualHash,
      userProofHashes,
      pendingProofRecords.current,
      { excludeActivityId: todayActivity?.id ?? null }
    );
    if (perceptualDuplicate.isDuplicate) {
      const when = perceptualDuplicate.activityDate ?? "a previous day";
      const section = perceptualDuplicate.proofType ?? type;
      toast.error(
        `This looks like a photo you already used on ${when} (${section}). Use a new screenshot.`
      );
      throw new Error("duplicate_proof_image");
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${type}_${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage.from("avatars").upload(fileName, file);

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    pendingProofRecords.current.push({
      contentHash,
      perceptualHash,
      storagePath: fileName,
      proofType: type,
    });
    return fileName;
  };

  const handleRemoveSavedImage = async (
    type: "reading" | "skill" | "other" | "gig" | "account" | "prospecting",
    path: string
  ) => {
    if (!user || !todayActivity || isLocked) return;
    setRemovingImagePath(path);
    try {
      const getCurrent = () => {
        if (type === "reading") {
          const arr = (todayActivity.reading_proof_images as string[] | null) ||
            (todayActivity.reading_proof_image ? [todayActivity.reading_proof_image] : []);
          return arr;
        }
        if (type === "skill") {
          const arr = (todayActivity.skill_proof_images as string[] | null) ||
            (todayActivity.skill_proof_image ? [todayActivity.skill_proof_image] : []);
          return arr;
        }
        if (type === "gig") {
          return (todayActivity.gig_proof_images as string[] | null) || [];
        }
        if (type === "account") {
          return (todayActivity.account_proof_images as string[] | null) || [];
        }
        if (type === "prospecting") {
          return (todayActivity.prospecting_proof_images as string[] | null) || [];
        }
        const arr = (todayActivity.other_activities_proof_images as string[] | null) ||
          (todayActivity.other_activities_proof_image ? [todayActivity.other_activities_proof_image] : []);
        return arr;
      };
      const current = getCurrent();
      const updated = current.filter((p) => p !== path);
      const payload: Record<string, unknown> = {};
      if (type === "reading") {
        payload.reading_proof_images = updated.length > 0 ? updated : null;
        payload.reading_proof_image = null;
      } else if (type === "skill") {
        payload.skill_proof_images = updated.length > 0 ? updated : null;
        payload.skill_proof_image = null;
      } else if (type === "gig") {
        payload.gig_proof_images = updated.length > 0 ? updated : null;
      } else if (type === "account") {
        payload.account_proof_images = updated.length > 0 ? updated : null;
      } else if (type === "prospecting") {
        payload.prospecting_proof_images = updated.length > 0 ? updated : null;
      } else {
        payload.other_activities_proof_images = updated.length > 0 ? updated : null;
        payload.other_activities_proof_image = null;
      }
      const { error: updateError } = await supabase
        .from("daily_activities")
        .update(payload)
        .eq("id", todayActivity.id);
      if (updateError) throw updateError;
      const { error: removeError } = await supabase.storage.from("avatars").remove([path]);
      if (removeError) {
        // Best-effort: DB already updated; storage cleanup may be restricted
      }
      toast.success("Image removed");
      setTodayActivity((prev) => (prev ? { ...prev, ...payload } : prev));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to remove image");
    } finally {
      setRemovingImagePath(null);
    }
  };

  const handleAdminBackfillReading = async () => {
    if (!user || !isSuperAdmin) return;
    if (!backfillDate?.trim()) {
      toast.error("Choose an activity date.");
      return;
    }
    setBackfillSubmitting(true);
    try {
      let newPath: string | null = null;
      if (backfillFile) newPath = await uploadProofImage(backfillFile, "reading");
      const { data: row, error: fetchErr } = await supabase
        .from("daily_activities")
        .select("*")
        .eq("user_id", user.id)
        .eq("activity_date", backfillDate)
        .maybeSingle();
      if (fetchErr) throw fetchErr;
      const existingReading =
        (row?.reading_proof_images as string[] | null) ||
        (row?.reading_proof_image ? [row.reading_proof_image as string] : []);
      const mergedProof = newPath != null ? [...existingReading, newPath] : [...existingReading];
      const pages = parseInt(backfillPages, 10) || 0;
      const notes = backfillNotes.trim() || null;
      if (row) {
        const { error: upErr } = await supabase
          .from("daily_activities")
          .update({
            pages_read: pages,
            reading_notes: notes,
            reading_proof_images: mergedProof.length > 0 ? mergedProof : null,
            reading_proof_image: null,
            submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        if (upErr) throw upErr;
      } else {
        const { error: insErr } = await supabase.from("daily_activities").insert({
          user_id: user.id,
          activity_date: backfillDate,
          pages_read: pages,
          reading_notes: notes,
          reading_proof_images: mergedProof.length > 0 ? mergedProof : null,
          reading_proof_image: null,
          gigs_created: 0,
          gig_links: null,
          accounts_created: 0,
          account_links: null,
          gross_income: 0,
          net_income: 0,
          daily_contacts: 0,
          follow_ups: 0,
          expected_conversions: 0,
          is_theory: false,
          is_practical: false,
          students_trained: 0,
          training_duration_minutes: 0,
          submissions_reviewed: 0,
          other_activities: "",
          cancelled_orders_count: 0,
          cancelled_order_amount_received: 0,
          submitted_at: new Date().toISOString(),
        });
        if (insErr) throw insErr;
      }
      toast.success(`Reading saved for ${backfillDate}`);
      setBackfillFile(null);
      await fetchTodayActivity();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not save reading for that date.");
    } finally {
      setBackfillSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !officeId) return;

    if (hasDuplicateTagsInBoxes(formData.dailyTagBoxes)) {
      toast.error("Remove duplicate tags — matching is not case-sensitive (Agno and agno count as the same).");
      return;
    }

    const tags = parseTagBoxes(formData.dailyTagBoxes);
    for (const tag of tags) {
      if (usedTagsElsewhere.has(tag)) {
        toast.error(`Tag "${tag}" was already used on another day. Each tag can only be used once.`);
        return;
      }
    }

    setIsSubmitting(true);
    pendingProofRecords.current = [];

    try {
      // Upload new reading proof images
      const existingReadingImages = (todayActivity?.reading_proof_images as string[] | null) || 
        (todayActivity?.reading_proof_image ? [todayActivity.reading_proof_image] : []);
      const newReadingImageUrls: string[] = [];
      for (const file of readingProofFiles) {
        const url = await uploadProofImage(file, "reading");
        if (url) newReadingImageUrls.push(url);
      }
      const allReadingImages = [...existingReadingImages, ...newReadingImageUrls];

      // Upload new skill proof images
      const existingSkillImages = (todayActivity?.skill_proof_images as string[] | null) || 
        (todayActivity?.skill_proof_image ? [todayActivity.skill_proof_image] : []);
      const newSkillImageUrls: string[] = [];
      for (const file of skillProofFiles) {
        const url = await uploadProofImage(file, "skill");
        if (url) newSkillImageUrls.push(url);
      }
      const allSkillImages = [...existingSkillImages, ...newSkillImageUrls];

      // Upload new other activities proof images
      const existingOtherImages = (todayActivity?.other_activities_proof_images as string[] | null) || 
        (todayActivity?.other_activities_proof_image ? [todayActivity.other_activities_proof_image] : []);
      const newOtherImageUrls: string[] = [];
      for (const file of otherActivitiesProofFiles) {
        const url = await uploadProofImage(file, "other");
        if (url) newOtherImageUrls.push(url);
      }
      const allOtherImages = [...existingOtherImages, ...newOtherImageUrls];

      const existingGigImages = (todayActivity?.gig_proof_images as string[] | null) || [];
      const newGigImageUrls: string[] = [];
      for (const file of gigProofFiles) {
        const url = await uploadProofImage(file, "gig");
        if (url) newGigImageUrls.push(url);
      }
      const allGigImages = [...existingGigImages, ...newGigImageUrls];

      const existingAccountImages = (todayActivity?.account_proof_images as string[] | null) || [];
      const newAccountImageUrls: string[] = [];
      for (const file of accountProofFiles) {
        const url = await uploadProofImage(file, "account");
        if (url) newAccountImageUrls.push(url);
      }
      const allAccountImages = [...existingAccountImages, ...newAccountImageUrls];

      const existingProspectingImages =
        (todayActivity?.prospecting_proof_images as string[] | null) || [];
      const newProspectingImageUrls: string[] = [];
      for (const file of prospectingProofFiles) {
        const url = await uploadProofImage(file, "prospecting");
        if (url) newProspectingImageUrls.push(url);
      }
      const allProspectingImages = [...existingProspectingImages, ...newProspectingImageUrls];
      
      const activityData = {
        user_id: user.id,
        activity_date: formatISODateInNigeria(),
        pages_read: parseInt(formData.pagesRead) || 0,
        reading_notes: formData.readingNotes || null,
        reading_proof_images: allReadingImages.length > 0 ? allReadingImages : null,
        gigs_created: parseInt(formData.gigsCreated) || 0,
        gig_platform: formData.gigPlatform || null,
        gig_service: formData.gigService || null,
        gig_links: formData.gigLinks.length > 0 ? formData.gigLinks : null,
        gig_notes: formData.gigNotes?.trim() || null,
        gig_proof_images: allGigImages.length > 0 ? allGigImages : null,
        accounts_created: parseInt(formData.accountsCreated) || 0,
        account_platform: formData.accountPlatform || null,
        account_service: formData.accountService || null,
        account_country: formData.accountCountry || null,
        account_links: formData.accountLinks.length > 0 ? formData.accountLinks : null,
        account_notes: formData.accountNotes?.trim() || null,
        account_proof_images: allAccountImages.length > 0 ? allAccountImages : null,
        gross_income: parseFloat(formData.grossIncome) || 0,
        net_income: isFiverrPayment ? fiverrNet : (parseFloat(formData.netIncome) || parseFloat(formData.grossIncome) || 0),
        income_platform: isFiverrPayment ? "fiverr" : "outside",
        payment_type: formData.paymentType || null,
        outside_payment_method: formData.paymentType === "outside" ? (formData.outsidePaymentMethod || null) : null,
        outside_payment_method_other: formData.paymentType === "outside" && formData.outsidePaymentMethod === "other"
          ? (formData.outsidePaymentMethodOther || null)
          : null,
        fiverr_fee: isFiverrPayment ? fiverrFee : null,
        cancelled_orders_count: isFiverrPayment ? (parseInt(formData.cancelledOrdersCount) || 0) : 0,
        cancelled_order_amount_received: isFiverrPayment ? (parseFloat(formData.cancelledOrderAmountReceived) || 0) : 0,
        order_type: formData.orderType || null,
        delivery_days: parseInt(formData.deliveryDays) || null,
        work_type: formData.workType || null,
        daily_contacts: parseInt(formData.dailyContacts) || 0,
        follow_ups: parseInt(formData.followUps) || 0,
        expected_conversions: parseInt(formData.expectedConversions) || 0,
        prospecting_proof_images: allProspectingImages.length > 0 ? allProspectingImages : null,
        skill_learned: formData.skillLearned || null,
        skill_description: formData.skillDescription || null,
        skill_proof_images: allSkillImages.length > 0 ? allSkillImages : null,
        skill_taught: formData.skillTaught || null,
        is_theory: formData.isTheory,
        is_practical: formData.isPractical,
        students_trained: parseInt(formData.studentsTrained) || 0,
        training_duration_minutes: parseInt(formData.trainingDuration) || 0,
        submissions_reviewed: parseInt(formData.submissionsReviewed) || 0,
        // Keep optional, but avoid null in case the DB has a NOT NULL constraint in production.
        other_activities: formData.otherActivities?.trim() || "",
        other_activities_proof_images: allOtherImages.length > 0 ? allOtherImages : null,
        submission_tags: (() => {
          const parsed = parseTagBoxes(formData.dailyTagBoxes);
          return parsed.length ? parsed : null;
        })(),
        new_things_learned: formData.newThingsLearned?.trim() || null,
        submitted_at: new Date().toISOString(),
      };
      
      let savedActivityId = todayActivity?.id as string | undefined;

      if (todayActivity) {
        const { error } = await supabase
          .from("daily_activities")
          .update({
            ...activityData,
            ...verificationFieldsOnResubmit({
              verified_at: todayActivity.verified_at,
              is_verified: todayActivity.is_verified,
            }),
          })
          .eq("id", todayActivity.id);

        if (error) throw error;
        savedActivityId = todayActivity.id;
      } else {
        const { data: inserted, error } = await supabase
          .from("daily_activities")
          .insert(activityData)
          .select("id")
          .single();

        if (error) throw error;
        savedActivityId = inserted?.id;
      }

      const activityDate = formatISODateInNigeria();
      for (const rec of pendingProofRecords.current) {
        await recordProofImageHash({
          contentHash: rec.contentHash,
          perceptualHash: rec.perceptualHash,
          storagePath: rec.storagePath,
          proofType: rec.proofType,
          activityDate,
          officeId,
          activityId: savedActivityId,
        });
      }
      pendingProofRecords.current = [];
      void fetchUserProofHashes().then(setUserProofHashes);
      
      toast.success("Daily activity report submitted successfully!", {
        description: "Your trainer will review your submission shortly.",
      });
      
      setReadingProofFiles([]);
      setSkillProofFiles([]);
      setOtherActivitiesProofFiles([]);
      setGigProofFiles([]);
      setAccountProofFiles([]);
      setProspectingProofFiles([]);
      formDirtyRef.current = false;
      await fetchTodayActivity({ hydrateForm: true });
      await fetchUsedTags(savedActivityId);
      fetchWeeklyPages();
    } catch (error: any) {
      pendingProofRecords.current = [];
      if (error?.message === "duplicate_proof_image") {
        return;
      }
      if (error.message && error.message.includes("locked")) {
        toast.error("Submission Locked", { 
          description: error.message || "Submissions are locked after 11:59 PM (GMT+1)." 
        });
        checkSubmissionLock(); // Refresh lock status
      } else if (error.message?.includes("tag_limit_exceeded")) {
        toast.error("Maximum 10 tags per daily report.");
      } else if (error.message?.includes("tag_already_used")) {
        toast.error("One or more tags were already used on another day.");
      } else {
        toast.error("Failed to submit report", { description: error.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  const allSections = isTrainer ? [...sections, ...trainerSections] : sections;

  return (
    <AppLayout>
      <TenantAppSeo
        title="Daily Activity Report"
        description="Submit your daily activity report for THE PRUDENCE — reading, gigs, income, prospecting, and skills with proof images. Nigeria time (WAT)."
        path="/daily-activity"
        keywords="daily activity report, daily submission, proof images, office accountability Nigeria"
        breadcrumbs={[
          { name: "Dashboard", path: "/dashboard" },
          { name: "Daily Activity", path: "/daily-activity" },
        ]}
      />
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 px-2 sm:px-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Daily Activity Report</h1>
            <p className="text-muted-foreground mt-1">
              {formatLongDateInNigeria()}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {lockMessage || "Submissions lock at 11:59 PM (WAT)"}
            </span>
          </div>
        </div>

        <PolicyNoticeBanner noticeId="tags_lifetime_v2" title="Tag rules update">
          Use <strong>one tag per box</strong>. Every tag you submit is saved for your office — including
          tags from past reports — and <strong>cannot be used again</strong>. Matching ignores capital
          letters (Agno and agno are the same).
        </PolicyNoticeBanner>

        {/* Progress Card */}
        <GlassCard>
          <GlassCardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Weekly Reading Progress</span>
              <span className="text-sm text-muted-foreground">{weeklyPages} / {WEEKLY_PAGES_TARGET} pages</span>
            </div>
            <Progress value={Math.min((weeklyPages / WEEKLY_PAGES_TARGET) * 100, 100)} className="h-2" />
          </GlassCardContent>
        </GlassCard>

        {/* Morning Todo */}
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="text-lg">Morning Daily Todo</GlassCardTitle>
            <GlassCardDescription>
              Write your plan first, then submit what you actually completed.
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent className="space-y-3">
            {todayTodoPlan ? (
              <div className="p-4 rounded-xl bg-accent/30 whitespace-pre-wrap text-sm text-foreground">
                {todayTodoPlan}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-muted/30 text-sm text-muted-foreground">
                No morning plan saved for today yet.
              </div>
            )}
            <div className="flex justify-end">
              <Button asChild variant="outline">
                <Link to="/daily-todo">{todayTodoPlan ? "Edit Today's Plan" : "Create Today's Plan"}</Link>
              </Button>
            </div>
          </GlassCardContent>
        </GlassCard>

        {/* Lock Warning */}
        {isLocked && (
          <GlassCard className="border-destructive/50 bg-destructive/5">
            <GlassCardContent className="py-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <p className="text-sm text-destructive font-medium">
                  {lockMessage || "Submissions are locked for today. The deadline was 11:59 PM (WAT)."}
                </p>
              </div>
            </GlassCardContent>
          </GlassCard>
        )}

        {/* Already Submitted Notice */}
        {todayActivity && (
          <GlassCard className="border-chart-1/50 bg-chart-1/5">
            <GlassCardContent className="py-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-chart-1" />
                <p className="text-sm text-chart-1 font-medium">
                  You've already submitted today. You can update your report until 11:59 PM (WAT).
                </p>
              </div>
            </GlassCardContent>
          </GlassCard>
        )}

        {/* Form Sections */}
        <div className="space-y-4">
          {allSections.map((section) => (
            <Collapsible
              key={section.id}
              open={openSections.includes(section.id)}
              onOpenChange={() => toggleSection(section.id)}
            >
              <GlassCard>
                <CollapsibleTrigger asChild>
                  <button className="w-full text-left">
                    <GlassCardHeader className="cursor-pointer hover:bg-accent/50 transition-colors rounded-t-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <section.icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <GlassCardTitle className="text-lg">{section.title}</GlassCardTitle>
                            <GlassCardDescription>{section.description}</GlassCardDescription>
                          </div>
                        </div>
                        <ChevronDown
                          className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                            openSections.includes(section.id) ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </GlassCardHeader>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <GlassCardContent className="pt-0 space-y-4">
                    {section.id === "reading" && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="pagesRead">Pages Read Today</Label>
                            <Input
                              id="pagesRead"
                              type="number"
                              placeholder="Enter number"
                              value={formData.pagesRead}
                              onChange={(e) => setFormData({ ...formData, pagesRead: e.target.value })}
                              disabled={isLocked}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="readingNotes">Notes (max 200 characters)</Label>
                          <Textarea
                            id="readingNotes"
                            placeholder="Brief summary of what you learned..."
                            maxLength={200}
                            value={formData.readingNotes}
                            onChange={(e) => setFormData({ ...formData, readingNotes: e.target.value })}
                            disabled={isLocked}
                          />
                          <p className="text-xs text-muted-foreground text-right">{formData.readingNotes.length}/200</p>
                        </div>
                        <ActivityProofUploader
                          label="Proof Images"
                          files={readingProofFiles}
                          onFilesChange={setReadingProofFiles}
                          previewUrls={readingPreviewUrls}
                          savedPaths={(todayActivity?.reading_proof_images as string[] | null) || []}
                          legacySinglePath={todayActivity?.reading_proof_image}
                          disabled={isLocked}
                          removingPath={removingImagePath}
                          onRemoveSaved={(path) => handleRemoveSavedImage("reading", path)}
                        />
                      </>
                    )}

                    {section.id === "gigs" && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Number of Gigs</Label>
                            <Input type="number" placeholder="0" value={formData.gigsCreated} onChange={(e) => setFormData({ ...formData, gigsCreated: e.target.value })} disabled={isLocked} />
                          </div>
                          <div className="space-y-2">
                            <Label>Platform</Label>
                            <Select value={formData.gigPlatform} onValueChange={(v) => setFormData({ ...formData, gigPlatform: v })} disabled={isLocked}>
                              <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fiverr">Fiverr</SelectItem>
                                <SelectItem value="upwork">Upwork</SelectItem>
                                <SelectItem value="freelancer">Freelancer</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Service Type</Label>
                            <Select value={formData.gigService} onValueChange={(v) => setFormData({ ...formData, gigService: v })} disabled={isLocked}>
                              <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="design">Design</SelectItem>
                                <SelectItem value="writing">Writing</SelectItem>
                                <SelectItem value="development">Development</SelectItem>
                                <SelectItem value="marketing">Marketing</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>Gig Links (optional)</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setFormData({ ...formData, gigLinks: [...formData.gigLinks, ""] })}
                              disabled={isLocked}
                            >
                              Add Link
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {formData.gigLinks.map((link, idx) => (
                              <div key={idx} className="flex gap-2">
                                <Input
                                  placeholder="https://..."
                                  value={link}
                                  onChange={(e) => {
                                    const newLinks = [...formData.gigLinks];
                                    newLinks[idx] = e.target.value;
                                    setFormData({ ...formData, gigLinks: newLinks });
                                  }}
                                  disabled={isLocked}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setFormData({ ...formData, gigLinks: formData.gigLinks.filter((_, i) => i !== idx) })}
                                  disabled={isLocked}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            {formData.gigLinks.length === 0 && (
                              <p className="text-sm text-muted-foreground">No links added yet</p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Notes (optional)</Label>
                          <Textarea
                            placeholder="Details about gigs created today..."
                            value={formData.gigNotes}
                            onChange={(e) => setFormData({ ...formData, gigNotes: e.target.value })}
                            disabled={isLocked}
                            rows={3}
                          />
                        </div>
                        <ActivityProofUploader
                          label="Gig proof images"
                          files={gigProofFiles}
                          onFilesChange={setGigProofFiles}
                          previewUrls={gigPreviewUrls}
                          savedPaths={(todayActivity?.gig_proof_images as string[] | null) || []}
                          disabled={isLocked}
                          removingPath={removingImagePath}
                          onRemoveSaved={(path) => handleRemoveSavedImage("gig", path)}
                        />
                      </>
                    )}

                    {section.id === "accounts" && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Accounts Created</Label>
                            <Input type="number" placeholder="0" value={formData.accountsCreated} onChange={(e) => setFormData({ ...formData, accountsCreated: e.target.value })} disabled={isLocked} />
                          </div>
                          <div className="space-y-2">
                            <Label>Platform</Label>
                            <Select value={formData.accountPlatform} onValueChange={(v) => setFormData({ ...formData, accountPlatform: v })} disabled={isLocked}>
                              <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fiverr">Fiverr</SelectItem>
                                <SelectItem value="upwork">Upwork</SelectItem>
                                <SelectItem value="freelancer">Freelancer</SelectItem>
                                <SelectItem value="peopleperhour">PeoplePerHour</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Service</Label>
                            <Input placeholder="e.g., Logo Design" value={formData.accountService} onChange={(e) => setFormData({ ...formData, accountService: e.target.value })} disabled={isLocked} />
                          </div>
                          <div className="space-y-2">
                            <Label>Country</Label>
                            <Input placeholder="e.g., USA" value={formData.accountCountry} onChange={(e) => setFormData({ ...formData, accountCountry: e.target.value })} disabled={isLocked} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>Account Links (optional)</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setFormData({ ...formData, accountLinks: [...formData.accountLinks, ""] })}
                              disabled={isLocked}
                            >
                              Add Link
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {formData.accountLinks.map((link, idx) => (
                              <div key={idx} className="flex gap-2">
                                <Input
                                  placeholder="https://..."
                                  value={link}
                                  onChange={(e) => {
                                    const newLinks = [...formData.accountLinks];
                                    newLinks[idx] = e.target.value;
                                    setFormData({ ...formData, accountLinks: newLinks });
                                  }}
                                  disabled={isLocked}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setFormData({ ...formData, accountLinks: formData.accountLinks.filter((_, i) => i !== idx) })}
                                  disabled={isLocked}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            {formData.accountLinks.length === 0 && (
                              <p className="text-sm text-muted-foreground">No links added yet</p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Notes (optional)</Label>
                          <Textarea
                            placeholder="Details about accounts created today..."
                            value={formData.accountNotes}
                            onChange={(e) => setFormData({ ...formData, accountNotes: e.target.value })}
                            disabled={isLocked}
                            rows={3}
                          />
                        </div>
                        <ActivityProofUploader
                          label="Account proof images"
                          files={accountProofFiles}
                          onFilesChange={setAccountProofFiles}
                          previewUrls={accountPreviewUrls}
                          savedPaths={(todayActivity?.account_proof_images as string[] | null) || []}
                          disabled={isLocked}
                          removingPath={removingImagePath}
                          onRemoveSaved={(path) => handleRemoveSavedImage("account", path)}
                        />
                      </>
                    )}

                    {section.id === "income" && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Payment Type</Label>
                            <Select
                              value={formData.paymentType}
                              onValueChange={(v) =>
                                setFormData({
                                  ...formData,
                                  paymentType: v,
                                  // Reset outside fields when switching away
                                  outsidePaymentMethod: v === "outside" ? formData.outsidePaymentMethod : "",
                                  outsidePaymentMethodOther: v === "outside" ? formData.outsidePaymentMethodOther : "",
                                })
                              }
                              disabled={isLocked}
                            >
                              <SelectTrigger><SelectValue placeholder="Select payment type" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fiverr">Fiverr</SelectItem>
                                <SelectItem value="outside">Outside Payment</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Gross Income ($)</Label>
                            <Input type="number" placeholder="0.00" value={formData.grossIncome} onChange={(e) => setFormData({ ...formData, grossIncome: e.target.value })} disabled={isLocked} />
                          </div>
                          <div className="space-y-2">
                            <Label>Net Income ($)</Label>
                            <Input
                              type="number"
                              placeholder="0.00"
                              value={isFiverrPayment ? fiverrNet.toFixed(2) : formData.netIncome}
                              onChange={(e) => setFormData({ ...formData, netIncome: e.target.value })}
                              disabled={isLocked || isFiverrPayment}
                            />
                          </div>
                        </div>

                        {formData.paymentType === "outside" && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Outside Payment Method</Label>
                              <Select
                                value={formData.outsidePaymentMethod}
                                onValueChange={(v) => setFormData({ ...formData, outsidePaymentMethod: v })}
                                disabled={isLocked}
                              >
                                <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                  <SelectItem value="crypto">Crypto</SelectItem>
                                  <SelectItem value="wise">Wise</SelectItem>
                                  <SelectItem value="revolut">Revolut</SelectItem>
                                  <SelectItem value="skrill">Skrill</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {formData.outsidePaymentMethod === "other" && (
                              <div className="space-y-2">
                                <Label>Specify Method</Label>
                                <Input
                                  placeholder="e.g. PayPal"
                                  value={formData.outsidePaymentMethodOther}
                                  onChange={(e) => setFormData({ ...formData, outsidePaymentMethodOther: e.target.value })}
                                  disabled={isLocked}
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {isFiverrPayment && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Fiverr Fee (20%)</Label>
                              <Input type="number" value={fiverrFee.toFixed(2)} disabled />
                            </div>
                            <div className="space-y-2">
                              <Label>Amount Remaining</Label>
                              <Input type="number" value={fiverrNet.toFixed(2)} disabled />
                            </div>
                          </div>
                        )}

                        {/* Cancelled Orders (Fiverr only) */}
                        {isFiverrPayment && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Cancelled Orders (count)</Label>
                              <Input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={formData.cancelledOrdersCount}
                                onChange={(e) => setFormData({ ...formData, cancelledOrdersCount: e.target.value })}
                                disabled={isLocked}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Cancelled Order Amount Received ($)</Label>
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                placeholder="0.00"
                                value={formData.cancelledOrderAmountReceived}
                                onChange={(e) => setFormData({ ...formData, cancelledOrderAmountReceived: e.target.value })}
                                disabled={isLocked}
                              />
                              <p className="text-xs text-muted-foreground">
                                For cancelled Fiverr orders, enter the actual amount you received (if any).
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Order Type</Label>
                            <Select value={formData.orderType} onValueChange={(v) => setFormData({ ...formData, orderType: v })} disabled={isLocked}>
                              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="new">New Order</SelectItem>
                                <SelectItem value="repeat">Repeat Client</SelectItem>
                                <SelectItem value="upsell">Upsell</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Delivery Days</Label>
                            <Input type="number" placeholder="0" value={formData.deliveryDays} onChange={(e) => setFormData({ ...formData, deliveryDays: e.target.value })} disabled={isLocked} />
                          </div>
                          <div className="space-y-2">
                            <Label>Work Type</Label>
                            <Select value={formData.workType} onValueChange={(v) => setFormData({ ...formData, workType: v })} disabled={isLocked}>
                              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="design">Design</SelectItem>
                                <SelectItem value="writing">Writing</SelectItem>
                                <SelectItem value="development">Development</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </>
                    )}

                    {section.id === "prospecting" && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Daily Contacts</Label>
                            <Input type="number" placeholder="0" value={formData.dailyContacts} onChange={(e) => setFormData({ ...formData, dailyContacts: e.target.value })} disabled={isLocked} />
                          </div>
                          <div className="space-y-2">
                            <Label>Follow-ups</Label>
                            <Input type="number" placeholder="0" value={formData.followUps} onChange={(e) => setFormData({ ...formData, followUps: e.target.value })} disabled={isLocked} />
                          </div>
                          <div className="space-y-2">
                            <Label>Expected Conversions</Label>
                            <Input type="number" placeholder="0" value={formData.expectedConversions} onChange={(e) => setFormData({ ...formData, expectedConversions: e.target.value })} disabled={isLocked} />
                          </div>
                        </div>
                        <ActivityProofUploader
                          label="Proof Images"
                          files={prospectingProofFiles}
                          onFilesChange={setProspectingProofFiles}
                          previewUrls={prospectingPreviewUrls}
                          savedPaths={(todayActivity?.prospecting_proof_images as string[] | null) || []}
                          disabled={isLocked}
                          removingPath={removingImagePath}
                          onRemoveSaved={(path) => handleRemoveSavedImage("prospecting", path)}
                        />
                      </>
                    )}

                    {section.id === "skills" && (
                      <>
                        <div className="space-y-2">
                          <Label>Skill Learned</Label>
                          <Input placeholder="e.g., Advanced Excel formulas" value={formData.skillLearned} onChange={(e) => setFormData({ ...formData, skillLearned: e.target.value })} disabled={isLocked} />
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea placeholder="Describe what you learned..." value={formData.skillDescription} onChange={(e) => setFormData({ ...formData, skillDescription: e.target.value })} disabled={isLocked} />
                        </div>
                        <div className="space-y-2">
                          <Label>New things learned today</Label>
                          <Textarea
                            placeholder="What did you learn or develop today? (rolled into weekly & monthly summaries)"
                            value={formData.newThingsLearned}
                            onChange={(e) => setFormData({ ...formData, newThingsLearned: e.target.value })}
                            disabled={isLocked}
                          />
                        </div>
                        <ActivityProofUploader
                          label="Proof Images"
                          files={skillProofFiles}
                          onFilesChange={setSkillProofFiles}
                          previewUrls={skillPreviewUrls}
                          savedPaths={(todayActivity?.skill_proof_images as string[] | null) || []}
                          legacySinglePath={todayActivity?.skill_proof_image}
                          disabled={isLocked}
                          removingPath={removingImagePath}
                          onRemoveSaved={(path) => handleRemoveSavedImage("skill", path)}
                        />
                      </>
                    )}

                    {section.id === "training" && isTrainer && (
                      <>
                        <div className="space-y-2">
                          <Label>Skill Taught</Label>
                          <Input placeholder="e.g., Prospecting techniques" value={formData.skillTaught} onChange={(e) => setFormData({ ...formData, skillTaught: e.target.value })} disabled={isLocked} />
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <Checkbox id="isTheory" checked={formData.isTheory} onCheckedChange={(c) => setFormData({ ...formData, isTheory: !!c })} />
                            <Label htmlFor="isTheory">Theory</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox id="isPractical" checked={formData.isPractical} onCheckedChange={(c) => setFormData({ ...formData, isPractical: !!c })} />
                            <Label htmlFor="isPractical">Practical</Label>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Students Trained</Label>
                            <Input type="number" placeholder="0" value={formData.studentsTrained} onChange={(e) => setFormData({ ...formData, studentsTrained: e.target.value })} disabled={isLocked} />
                          </div>
                          <div className="space-y-2">
                            <Label>Duration (minutes)</Label>
                            <Input type="number" placeholder="0" value={formData.trainingDuration} onChange={(e) => setFormData({ ...formData, trainingDuration: e.target.value })} disabled={isLocked} />
                          </div>
                          <div className="space-y-2">
                            <Label>Submissions Reviewed</Label>
                            <Input type="number" placeholder="0" value={formData.submissionsReviewed} onChange={(e) => setFormData({ ...formData, submissionsReviewed: e.target.value })} disabled={isLocked} />
                          </div>
                        </div>
                      </>
                    )}

                    {section.id === "tags" && (
                      <div className="space-y-3">
                        <Label>Daily tags</Label>
                        {formData.dailyTagBoxes.map((boxValue, index) => {
                          const normalized = normalizeTag(boxValue);
                          const isUsed =
                            normalized.length > 0 && usedTagsElsewhere.has(normalized);
                          const isDuplicate =
                            normalized.length > 0 &&
                            formData.dailyTagBoxes.some(
                              (other, i) => i !== index && normalizeTag(other) === normalized
                            );
                          return (
                            <div key={index} className="flex items-center gap-2">
                              <Input
                                placeholder={`Tag ${index + 1}`}
                                value={boxValue}
                                onChange={(e) => {
                                  const next = [...formData.dailyTagBoxes];
                                  next[index] = e.target.value;
                                  setFormData({ ...formData, dailyTagBoxes: next });
                                }}
                                disabled={isLocked}
                                aria-invalid={isUsed || isDuplicate}
                                className={
                                  isUsed || isDuplicate ? "border-destructive focus-visible:ring-destructive" : ""
                                }
                              />
                              {formData.dailyTagBoxes.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  disabled={isLocked}
                                  onClick={() => {
                                    const next = formData.dailyTagBoxes.filter((_, i) => i !== index);
                                    setFormData({
                                      ...formData,
                                      dailyTagBoxes: next.length > 0 ? next : [""],
                                    });
                                  }}
                                  aria-label="Remove tag box"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          );
                        })}
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isLocked || formData.dailyTagBoxes.length >= 10}
                            onClick={() =>
                              setFormData({
                                ...formData,
                                dailyTagBoxes: [...formData.dailyTagBoxes, ""],
                              })
                            }
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add tag
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            One tag per box, up to 10. Each tag can only be used once (per office).
                          </span>
                        </div>
                        {usedTagsElsewhere.size > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Already used: {[...usedTagsElsewhere].slice(0, 12).join(", ")}
                            {usedTagsElsewhere.size > 12 ? "…" : ""}
                          </p>
                        )}
                      </div>
                    )}

                    {section.id === "other" && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="otherActivities">Other Activities (optional)</Label>
                          <Textarea
                            id="otherActivities"
                            placeholder="Write any other activities you did today that are not listed above..."
                            className="min-h-[120px]"
                            value={formData.otherActivities}
                            onChange={(e) => setFormData({ ...formData, otherActivities: e.target.value })}
                            disabled={isLocked}
                          />
                        </div>
                        <ActivityProofUploader
                          label="Proof Images (optional)"
                          files={otherActivitiesProofFiles}
                          onFilesChange={setOtherActivitiesProofFiles}
                          previewUrls={otherPreviewUrls}
                          savedPaths={(todayActivity?.other_activities_proof_images as string[] | null) || []}
                          legacySinglePath={todayActivity?.other_activities_proof_image}
                          disabled={isLocked}
                          removingPath={removingImagePath}
                          onRemoveSaved={(path) => handleRemoveSavedImage("other", path)}
                        />
                      </>
                    )}
                  </GlassCardContent>
                </CollapsibleContent>
              </GlassCard>
            </Collapsible>
          ))}
        </div>

        {/* Submit Button */}
        <div className="sticky bottom-0 z-10 -mx-2 sm:mx-0 px-2 sm:px-0 py-3 sm:py-0 mt-4 sm:mt-0 bg-background/95 backdrop-blur-sm border-t border-border/50 sm:border-0 sm:bg-transparent sm:backdrop-blur-none flex justify-end gap-4">
          <Button
            className="w-full sm:w-auto min-h-11"
            onClick={handleSubmit}
            disabled={isLocked || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : todayActivity ? (
              "Update Report"
            ) : (
              "Submit Report"
            )}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
