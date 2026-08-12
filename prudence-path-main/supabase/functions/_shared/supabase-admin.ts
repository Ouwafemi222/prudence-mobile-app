import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

/** Service-role client. Uses PROJECT_URL + SERVICE_ROLE_KEY (dashboard secrets). */
export function createAdminClient(): SupabaseClient {
  const url = Deno.env.get("PROJECT_URL") ?? Deno.env.get("SUPABASE_URL");
  const serviceRoleKey =
    Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing PROJECT_URL or SERVICE_ROLE_KEY. Add them under Edge Functions → Secrets.",
    );
  }

  return createClient(url, serviceRoleKey);
}
