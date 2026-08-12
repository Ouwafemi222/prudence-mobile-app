import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { handleCors, jsonWithCors } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return jsonWithCors({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonWithCors({ error: "Missing or invalid Authorization header" }, 401);
    }

    const supabaseAdmin = createAdminClient();

    const body = await req.json().catch(() => ({}));
    const targetUserId = body?.user_id as string | undefined;
    if (!targetUserId || typeof targetUserId !== "string") {
      return jsonWithCors({ error: "Missing or invalid user_id in body" }, 400);
    }

    const token = authHeader.slice(7);
    const { data: { user: caller }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !caller) {
      return jsonWithCors({ error: "Invalid token" }, 401);
    }

    if (caller.id === targetUserId) {
      return jsonWithCors({ error: "You cannot delete your own account" }, 400);
    }

    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const isSuperAdmin = roles?.some((r) => r.role === "super_admin") ?? false;
    if (!isSuperAdmin) {
      return jsonWithCors({ error: "Only super admins can delete users" }, 403);
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
    if (deleteError) {
      console.error("deleteUser error:", deleteError);
      return jsonWithCors({ error: deleteError.message }, 400);
    }

    return jsonWithCors({ success: true });
  } catch (e: unknown) {
    console.error("delete-user error:", e);
    return jsonWithCors(
      { error: e instanceof Error ? e.message : "Internal server error" },
      500,
    );
  }
});
