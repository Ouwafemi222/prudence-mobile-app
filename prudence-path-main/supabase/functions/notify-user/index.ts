import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { notifyUser } from "../_shared/notify.ts";
import { handleCors, jsonWithCors } from "../_shared/cors.ts";

const STAFF_ROLES = new Set(["super_admin", "office_admin", "trainer", "pro", "sponsor"]);

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

    const body = await req.json().catch(() => ({}));
    const user_id = body?.user_id as string | undefined;
    const title = body?.title as string | undefined;
    const message = body?.message as string | undefined;
    const type = (body?.type as string | undefined) || "alert";
    const link = body?.link as string | null | undefined;
    const email_subject = body?.email_subject as string | undefined;
    const ctaLabel = body?.ctaLabel as string | undefined;
    const send_email = body?.send_email === true;

    if (!user_id || !title || !message) {
      return jsonWithCors({ error: "user_id, title, and message are required" }, 400);
    }

    if (caller.id !== user_id) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", caller.id);

      const canNotify = roles?.some((r) => STAFF_ROLES.has(r.role)) ?? false;
      if (!canNotify) {
        return jsonWithCors({ error: "Forbidden" }, 403);
      }
    }

    const result = await notifyUser(supabase, {
      user_id,
      title,
      message,
      type,
      link,
      email_subject,
      ctaLabel,
      send_email,
    });

    return jsonWithCors({ ok: true, ...result });
  } catch (e: unknown) {
    console.error("notify-user:", e);
    return jsonWithCors(
      { error: e instanceof Error ? e.message : "Internal server error" },
      500,
    );
  }
});
