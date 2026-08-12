import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req: Request) => {
  try {
    const supabaseUrl = "https://xpvabdfleomjpytvvjux.supabase.co";
    const supabaseServiceKey = "REDACTED_IN_BACKUP_USE_MCP_GET_EDGE_FUNCTION_FOR_RAW";
    const { createClient } = await import("jsr:@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, full_name, username")
      .eq("approval_status", "approved");

    if (profilesError) throw profilesError;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "No users to check", count: 0 }), { headers: { "Content-Type": "application/json" } });
    }

    const { data: yesterdaySubmissions, error: submissionsError } = await supabase
      .from("daily_activities")
      .select("user_id")
      .eq("activity_date", yesterdayStr);

    if (submissionsError) throw submissionsError;

    const submittedUserIds = new Set((yesterdaySubmissions || []).map((s) => s.user_id));
    const usersWhoMissed = profiles.filter((p) => !submittedUserIds.has(p.user_id));

    if (usersWhoMissed.length === 0) {
      return new Response(JSON.stringify({ message: "All users submitted yesterday", count: 0 }), { headers: { "Content-Type": "application/json" } });
    }

    const notifications = usersWhoMissed.map((user) => ({
      user_id: user.user_id,
      title: "Missed Daily Submission",
      message: `You missed submitting your daily activity report for ${yesterdayStr}. Please submit it as soon as possible.`,
      type: "alert",
      is_read: false,
    }));

    const { error: insertError } = await supabase.from("notifications").insert(notifications);
    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({
        message: "Missed submission alerts sent successfully",
        count: notifications.length,
        users_notified: usersWhoMissed.map((u) => u.username),
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: "Failed to send missed submission alerts", details: error.message }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
});
