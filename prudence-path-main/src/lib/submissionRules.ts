import { supabase } from "@/integrations/supabase/client";

export async function fetchUserIsSuperAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();
  return Boolean(data);
}

type CanVerifyArgs = {
  verifierCanVerify: boolean;
  submitterIsSuperAdmin: boolean;
  verifierUserId?: string | null;
  submitterUserId?: string | null;
  verifierRole?: string | null;
};

/**
 * Who may approve/reject a submission:
 * - Only super_admin / trainer (via verifierCanVerify)
 * - Nobody may verify a super_admin's submission
 * - Trainers may not verify their own submission (super_admin can)
 */
export function canVerifySubmission({
  verifierCanVerify,
  submitterIsSuperAdmin,
  verifierUserId,
  submitterUserId,
  verifierRole,
}: CanVerifyArgs): boolean {
  if (!verifierCanVerify) return false;
  if (submitterIsSuperAdmin) return false;
  if (
    verifierRole === "trainer" &&
    verifierUserId &&
    submitterUserId &&
    verifierUserId === submitterUserId
  ) {
    return false;
  }
  return true;
}

/** On resubmit after rejection, reset to pending for trainer re-review. */
export function verificationFieldsOnResubmit(existing: {
  verified_at: string | null;
  is_verified: boolean | null;
}): Record<string, unknown> {
  const wasRejected =
    existing.verified_at != null && existing.is_verified !== true;
  if (!wasRejected) return {};
  return {
    is_verified: false,
    verified_at: null,
    verified_by: null,
    verification_feedback: null,
  };
}
