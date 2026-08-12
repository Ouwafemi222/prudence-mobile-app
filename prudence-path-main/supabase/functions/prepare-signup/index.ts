import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { handleCors, jsonWithCors } from "../_shared/cors.ts";

/** Remove stale unconfirmed auth user for this email so signup can be retried. */
Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return jsonWithCors({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email = (body?.email as string | undefined)?.trim().toLowerCase();
    if (!email) {
      return jsonWithCors({ error: "Missing email" }, 400);
    }

    const supabase = createAdminClient();
    const { data: list, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listError) {
      console.error("listUsers:", listError);
      return jsonWithCors({ error: listError.message }, 500);
    }

    const stale = (list.users || []).filter(
      (u) =>
        u.email?.toLowerCase() === email &&
        !u.email_confirmed_at,
    );

    let removed = 0;
    for (const u of stale) {
      const { error: delError } = await supabase.auth.admin.deleteUser(u.id);
      if (!delError) removed += 1;
      else console.warn("deleteUser failed:", u.id, delError.message);
    }

    return jsonWithCors({ ok: true, removed });
  } catch (e: unknown) {
    console.error("prepare-signup:", e);
    return jsonWithCors(
      { error: e instanceof Error ? e.message : "Internal server error" },
      500,
    );
  }
});
