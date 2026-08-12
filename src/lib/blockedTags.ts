import { supabase } from "../integrations/supabase/client";
import { normalizeTag } from "./activityTypes";

/** Lifetime-blocked tags for this user/office. Today's report is never blocked. */
export async function fetchBlockedTags(options: {
  userId: string;
  officeId?: string | null;
  currentActivityId?: string | null;
  currentActivityDate?: string | null;
}): Promise<string[]> {
  const blocked = new Set<string>();
  const allowedToday = new Set<string>();

  let activityQuery = supabase
    .from("daily_activities")
    .select("id, activity_date, submission_tags")
    .eq("user_id", options.userId);
  if (options.officeId) activityQuery = activityQuery.eq("office_id", options.officeId);

  const { data: activities } = await activityQuery;
  for (const activity of activities || []) {
    const tags = ((activity.submission_tags || []) as unknown[]).map((raw) => normalizeTag(String(raw))).filter(Boolean);
    const isToday =
      (options.currentActivityId && activity.id === options.currentActivityId) ||
      (options.currentActivityDate && activity.activity_date === options.currentActivityDate);
    if (isToday) {
      for (const tag of tags) allowedToday.add(tag);
      continue;
    }
    for (const tag of tags) blocked.add(tag);
  }

  let registryQuery = supabase
    .from("user_submission_tags")
    .select("tag, first_activity_id, first_used_date")
    .eq("user_id", options.userId);
  if (options.officeId) registryQuery = registryQuery.eq("office_id", options.officeId);

  const { data: registry } = await registryQuery;
  for (const row of registry || []) {
    const tag = normalizeTag(String(row.tag || ""));
    if (!tag || allowedToday.has(tag)) continue;
    const sameActivity = Boolean(options.currentActivityId && row.first_activity_id === options.currentActivityId);
    const sameDay = Boolean(options.currentActivityDate && row.first_used_date === options.currentActivityDate);
    if (sameActivity || sameDay) {
      allowedToday.add(tag);
      continue;
    }
    blocked.add(tag);
  }

  for (const tag of allowedToday) blocked.delete(tag);
  return [...blocked].sort();
}

export function tagReuseError(tag: string, blocked: string[], allowedOnThisReport: string[]): string | null {
  const normalized = normalizeTag(tag);
  if (!normalized) return null;
  if (allowedOnThisReport.includes(normalized)) return null;
  if (blocked.includes(normalized)) return `Tag "${normalized}" was already used on another day. Each tag can only be used once.`;
  return null;
}
