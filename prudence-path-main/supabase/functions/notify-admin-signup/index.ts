import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { sendAdminEmail } from "../_shared/admin-notify.ts";
import { handleCors, jsonWithCors } from "../_shared/cors.ts";

/** Email admin when a new member completes signup and is pending approval. */
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
    const {
      data: { user: caller },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !caller) {
      return jsonWithCors({ error: "Invalid token" }, 401);
    }

    const { data: member, error: profileError } = await supabase
      .from("profiles")
      .select("username, full_name, email, sponsor_username, approval_status")
      .eq("user_id", caller.id)
      .single();

    if (profileError || !member) {
      return jsonWithCors({ error: "Profile not found" }, 404);
    }

    if (member.approval_status !== "pending") {
      return jsonWithCors({ ok: true, skipped: true, reason: "not_pending" });
    }

    const email =
      member.email?.trim() ||
      (await supabase.auth.admin.getUserById(caller.id)).data.user?.email ||
      "—";

    const result = await sendAdminEmail({
      subject: "New signup pending approval — THE PRUDENCE",
      title: "New member signup",
      message:
        "A new user has registered and is waiting for trainer approval. Review their details below.",
      details: [
        { label: "Full name", value: member.full_name || "—" },
        { label: "Username", value: `@${member.username}` },
        { label: "Email", value: email },
        {
          label: "Sponsor",
          value: member.sponsor_username ? `@${member.sponsor_username}` : "None",
        },
        { label: "Status", value: "Pending approval" },
      ],
      ctaLabel: "Review in Teams",
      ctaPath: "/teams",
    });

    return jsonWithCors({ ok: true, ...result });
  } catch (e: unknown) {
    console.error("notify-admin-signup:", e);
    return jsonWithCors(
      { error: e instanceof Error ? e.message : "Internal server error" },
      500,
    );
  }
});
