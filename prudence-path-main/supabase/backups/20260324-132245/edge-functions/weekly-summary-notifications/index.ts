import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async () => {
  try {
    const supabaseUrl = "https://xpvabdfleomjpytvvjux.supabase.co";
    const supabaseServiceKey = "REDACTED_IN_BACKUP_USE_MCP_GET_EDGE_FUNCTION_FOR_RAW";
    const { createClient } = await import("jsr:@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    const lastWeekStart = new Date(today);
    lastWeekStart.setDate(today.getDate() - 7 - today.getDay() + 1);
    if (lastWeekStart.getDay() === 0) lastWeekStart.setDate(lastWeekStart.getDate() - 6);
    const lastWeekStartStr = lastWeekStart.toISOString().split('T')[0];

    const lastWeekEnd = new Date(lastWeekStart);
    lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
    const lastWeekEndStr = lastWeekEnd.toISOString().split('T')[0];

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, full_name, username")
      .eq("approval_status", "approved");

    if (profilesError) throw profilesError;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "No users to notify", count: 0 }), { headers: { "Content-Type": "application/json" } });
    }

    return new Response(
      JSON.stringify({
        message: "Weekly summary function backup placeholder",
        users_considered: profiles.length,
        week: `${lastWeekStartStr} to ${lastWeekEndStr}`,
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: "Failed to process weekly summary", details: error.message }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
});
