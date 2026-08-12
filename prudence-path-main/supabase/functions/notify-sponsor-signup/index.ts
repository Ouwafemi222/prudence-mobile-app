import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { notifyUser } from "../_shared/notify.ts";
import { handleCors, jsonWithCors } from "../_shared/cors.ts";

/** Notify direct sponsor when someone signs up under them (pending approval). */
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return jsonWithCors({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonWithCors({ error: "Unauthorized" }, 401);
    }

    const supabase = createAdminClient();
    const token = authHeader.slice(7);
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !caller) {
      return jsonWithCors({ error: "Invalid token" }, 401);
    }

    const { data: member, error: profileError } = await supabase
      .from("profiles")
      .select("username, full_name, sponsor_username")
      .eq("user_id", caller.id)
      .single();

    if (profileError || !member) {
      return jsonWithCors({ error: "Profile not found" }, 404);
    }

    const sponsorUsername = member.sponsor_username?.trim().toLowerCase();
    if (!sponsorUsername) {
      return jsonWithCors({ ok: true, notified: false, reason: "no_sponsor" });
    }

    const { data: sponsor, error: sponsorError } = await supabase
      .from("profiles")
      .select("user_id, username, full_name")
      .eq("username", sponsorUsername)
      .maybeSingle();

    if (sponsorError || !sponsor) {
      return jsonWithCors({ ok: true, notified: false, reason: "sponsor_not_found" });
    }

    const result = await notifyUser(supabase, {
      user_id: sponsor.user_id,
      title: "New Signup Under You",
      message: `@${member.username} (${member.full_name}) signed up using your sponsor link and is pending approval.`,
      type: "team",
      link: "/sponsor-dashboard",
      email_subject: "New team signup — THE PRUDENCE",
      ctaLabel: "View sponsor dashboard",
      send_email: true,
    });

    return jsonWithCors({ ok: true, notified: true, sponsor: sponsor.username, ...result });
  } catch (e: unknown) {
    console.error("notify-sponsor-signup:", e);
    return jsonWithCors(
      { error: e instanceof Error ? e.message : "Internal server error" },
      500,
    );
  }
});
