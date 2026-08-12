import { supabase } from "@/integrations/supabase/client";

export type ActivityRow = {
  id: string;
  user_id: string;
  activity_date: string;
  is_verified: boolean | null;
  verified_at: string | null;
  verification_feedback: string | null;
  pages_read: number | null;
  reading_notes: string | null;
  reading_proof_image: string | null;
  reading_proof_images: string[] | null;
  gigs_created: number | null;
  gig_platform: string | null;
  gig_service: string | null;
  gig_link: string | null;
  gig_links: string[] | null;
  gig_notes: string | null;
  gig_proof_images: string[] | null;
  accounts_created: number | null;
  account_platform: string | null;
  account_service: string | null;
  account_country: string | null;
  account_links: string[] | null;
  account_notes: string | null;
  account_proof_images: string[] | null;
  gross_income: number | null;
  net_income: number | null;
  income_platform: string | null;
  order_type: string | null;
  delivery_days: number | null;
  work_type: string | null;
  daily_contacts: number | null;
  follow_ups: number | null;
  expected_conversions: number | null;
  skill_learned: string | null;
  skill_description: string | null;
  skill_proof_image: string | null;
  skill_proof_images: string[] | null;
  skill_taught: string | null;
  is_theory: boolean | null;
  is_practical: boolean | null;
  students_trained: number | null;
  training_duration_minutes: number | null;
  submissions_reviewed: number | null;
  submitted_at: string | null;
  other_activities: string | null;
  other_activities_proof_image: string | null;
  other_activities_proof_images: string[] | null;
  payment_type: string | null;
  outside_payment_method: string | null;
  outside_payment_method_other: string | null;
  fiverr_fee: number | null;
  cancelled_orders_count: number | null;
  cancelled_order_amount_received: number | null;
  submission_tags: string[] | null;
  prospecting_proof_images: string[] | null;
};

export type ProfileMini = {
  user_id: string;
  full_name: string;
  username: string;
  avatar_url?: string | null;
};

export type ActivityComment = {
  id: string;
  activity_id: string;
  author_user_id: string;
  comment: string;
  created_at: string;
  authorProfile?: ProfileMini;
};

export function getPublicImageUrl(path: string | null): string | null {
  if (!path) return null;
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}

export function normalizeTag(value: string): string {
  return value.trim().toLowerCase();
}

const MAX_TAGS_PER_REPORT = 10;

/** Parse one tag per input box; case-insensitive dedupe. */
export function parseTagBoxes(boxes: string[]): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const box of boxes) {
    const t = normalizeTag(box);
    if (!t || seen.has(t)) continue;
    seen.add(t);
    tags.push(t);
    if (tags.length >= MAX_TAGS_PER_REPORT) break;
  }
  return tags;
}

export function hasDuplicateTagsInBoxes(boxes: string[]): boolean {
  const seen = new Set<string>();
  for (const box of boxes) {
    const t = normalizeTag(box);
    if (!t) continue;
    if (seen.has(t)) return true;
    seen.add(t);
  }
  return false;
}

export function formatTagsToBoxes(tags: string[] | null | undefined): string[] {
  const list = (tags || []).map((t) => normalizeTag(t)).filter(Boolean);
  return list.length > 0 ? list : [""];
}

/** @deprecated Use parseTagBoxes */
export function parseTagsInput(value: string): string[] {
  return parseTagBoxes(value.split(","));
}

/** @deprecated Use formatTagsToBoxes */
export function formatTagsForInput(tags: string[] | null | undefined): string {
  return (tags || []).join(", ");
}

/** Merge array + legacy single storage path for proof images. */
export function proofPathsFrom(
  images: string[] | null | undefined,
  legacySingle: string | null | undefined,
): string[] {
  const list = [...(images || [])];
  if (legacySingle && !list.includes(legacySingle)) list.push(legacySingle);
  return list;
}

export function gigLinksFrom(activity: {
  gig_links?: string[] | null;
  gig_link?: string | null;
}): string[] {
  return proofPathsFrom(
    activity.gig_links,
    activity.gig_link,
  ).filter(Boolean);
}

export function accountLinksFrom(activity: {
  account_links?: string[] | null;
}): string[] {
  return (activity.account_links || []).filter(Boolean);
}

export type ActivityProofSections = {
  reading: string[];
  skill: string[];
  gig: string[];
  account: string[];
  prospecting: string[];
  other: string[];
};

export function getActivityProofSections(
  activity: Pick<
    ActivityRow,
    | "reading_proof_images"
    | "reading_proof_image"
    | "skill_proof_images"
    | "skill_proof_image"
    | "gig_proof_images"
    | "account_proof_images"
    | "prospecting_proof_images"
    | "other_activities_proof_images"
    | "other_activities_proof_image"
  >,
): ActivityProofSections {
  return {
    reading: proofPathsFrom(activity.reading_proof_images, activity.reading_proof_image),
    skill: proofPathsFrom(activity.skill_proof_images, activity.skill_proof_image),
    gig: activity.gig_proof_images || [],
    account: activity.account_proof_images || [],
    prospecting: activity.prospecting_proof_images || [],
    other: proofPathsFrom(
      activity.other_activities_proof_images,
      activity.other_activities_proof_image,
    ),
  };
}
