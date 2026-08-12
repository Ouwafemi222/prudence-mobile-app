import { supabase } from "../integrations/supabase/client";
import { scopeToUserOffice } from "./tenantScope";

export type OfficeGroup = {
  id: string;
  name: string;
  trainer_ids: string[] | null;
};

export type ApprovedTrainee = {
  user_id: string;
  full_name: string;
  username: string;
  assigned_group_id: string | null;
  avatar_url?: string | null;
};

/** Groups this reviewer can see. Pros only get their assigned group. */
export async function fetchAccessibleGroups(options: {
  officeId: string | null;
  isSuperAdmin: boolean;
  isProOnly: boolean;
  assignedGroupId?: string | null;
}): Promise<OfficeGroup[]> {
  let query = supabase.from("groups").select("id, name, trainer_ids").order("name");
  query = scopeToUserOffice(query, options.officeId, options.isSuperAdmin);
  if (options.isProOnly) {
    if (!options.assignedGroupId) return [];
    query = query.eq("id", options.assignedGroupId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as OfficeGroup[];
}

/**
 * Approved trainees (and assigned trainers) for a group filter.
 * Fetches from profiles/groups — does not invent members from daily submissions.
 */
export async function fetchApprovedGroupRoster(options: {
  officeId: string | null;
  isSuperAdmin: boolean;
  groupId: string;
  groups: OfficeGroup[];
}): Promise<ApprovedTrainee[]> {
  let profilesQuery = supabase
    .from("profiles")
    .select("user_id, full_name, username, assigned_group_id, avatar_url")
    .eq("approval_status", "approved");
  profilesQuery = scopeToUserOffice(profilesQuery, options.officeId, options.isSuperAdmin);

  if (options.groupId !== "all") {
    profilesQuery = profilesQuery.eq("assigned_group_id", options.groupId);
  }

  const { data, error } = await profilesQuery;
  if (error) throw error;
  const trainees = (data || []) as ApprovedTrainee[];

  if (options.groupId === "all") return trainees;

  const group = options.groups.find((g) => g.id === options.groupId);
  const trainerIds = (group?.trainer_ids || []).filter(Boolean);
  if (trainerIds.length === 0) return trainees;

  const missing = trainerIds.filter((id) => !trainees.some((t) => t.user_id === id));
  if (missing.length === 0) return trainees;

  let trainerQuery = supabase
    .from("profiles")
    .select("user_id, full_name, username, assigned_group_id, avatar_url")
    .eq("approval_status", "approved")
    .in("user_id", missing);
  trainerQuery = scopeToUserOffice(trainerQuery, options.officeId, options.isSuperAdmin);
  const { data: trainers } = await trainerQuery;
  return [...trainees, ...((trainers || []) as ApprovedTrainee[])];
}
