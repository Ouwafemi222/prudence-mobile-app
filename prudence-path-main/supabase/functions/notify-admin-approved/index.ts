import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { sendAdminEmail } from "../_shared/admin-notify.ts";
import { handleCors, jsonWithCors } from "../_shared/cors.ts";

const STAFF_ROLES = new Set(["super_admin", "trainer"]);

const ROLE_LABELS: Record<string, string> = {
  member: "Member",
  pro: "Pro",
  sponsor: "Sponsor",
  trainer: "Trainer",
  super_admin: "Super Admin",
};

/** Email admin when a member account is approved (with team / sponsor details). */
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

    const { data: callerRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);
    const canNotify = callerRoles?.some((r) => STAFF_ROLES.has(r.role)) ?? false;
    if (!canNotify) {
      return jsonWithCors({ error: "Forbidden" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const memberUserId = body?.member_user_id as string | undefined;
    if (!memberUserId) {
      return jsonWithCors({ error: "member_user_id is required" }, 400);
    }

    const { data: member, error: profileError } = await supabase
      .from("profiles")
      .select(
        "username, full_name, email, sponsor_username, approval_status, assigned_group_id, assigned_trainer_id",
      )
      .eq("user_id", memberUserId)
      .single();

    if (profileError || !member) {
      return jsonWithCors({ error: "Member profile not found" }, 404);
    }

    let groupName = "—";
    if (member.assigned_group_id) {
      const { data: group } = await supabase
        .from("groups")
        .select("name")
        .eq("id", member.assigned_group_id)
        .maybeSingle();
      groupName = group?.name || member.assigned_group_id;
    }

    let trainerName = "—";
    if (member.assigned_trainer_id) {
      const { data: trainer } = await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("user_id", member.assigned_trainer_id)
        .maybeSingle();
      trainerName = trainer
        ? `${trainer.full_name} (@${trainer.username})`
        : member.assigned_trainer_id;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", memberUserId);
    const role = roles?.[0]?.role ?? "member";

    const { data: approver } = await supabase
      .from("profiles")
      .select("full_name, username")
      .eq("user_id", caller.id)
      .maybeSingle();

    const email =
      member.email?.trim() ||
      (await supabase.auth.admin.getUserById(memberUserId)).data.user?.email ||
      "—";

    const result = await sendAdminEmail({
      subject: "Member approved — THE PRUDENCE",
      title: "User account approved",
      message: "A trainer has approved a new member. Summary below.",
      details: [
        { label: "Member", value: `${member.full_name} (@${member.username})` },
        { label: "Email", value: email },
        { label: "Role", value: ROLE_LABELS[role] ?? role },
        { label: "Team / Group", value: groupName },
        { label: "Assigned trainer", value: trainerName },
        {
          label: "Sponsor",
          value: member.sponsor_username ? `@${member.sponsor_username}` : "None",
        },
        {
          label: "Approved by",
          value: approver ? `${approver.full_name} (@${approver.username})` : "Staff",
        },
      ],
      ctaLabel: "View Teams",
      ctaPath: "/teams",
    });

    return jsonWithCors({ ok: true, ...result });
  } catch (e: unknown) {
    console.error("notify-admin-approved:", e);
    return jsonWithCors(
      { error: e instanceof Error ? e.message : "Internal server error" },
      500,
    );
  }
});
