import { supabase } from "@/integrations/supabase/client";

export type SponsorUpline = {
  user_id: string;
  username: string;
  full_name: string;
  depth: number;
};

/** Walk sponsor_username chain upward (direct sponsor = depth 1). */
export async function fetchSponsorUplines(
  sponsorUsername: string | null | undefined,
  maxDepth = 20,
): Promise<SponsorUpline[]> {
  const uplines: SponsorUpline[] = [];
  let current = sponsorUsername?.trim().toLowerCase() || null;
  let depth = 1;

  while (current && depth <= maxDepth) {
    const { data: sponsor, error } = await supabase
      .from("profiles")
      .select("user_id, username, full_name, sponsor_username")
      .eq("username", current)
      .maybeSingle();

    if (error || !sponsor) break;

    uplines.push({
      user_id: sponsor.user_id,
      username: sponsor.username,
      full_name: sponsor.full_name,
      depth,
    });

    current = sponsor.sponsor_username?.trim().toLowerCase() || null;
    depth += 1;
  }

  return uplines;
}
