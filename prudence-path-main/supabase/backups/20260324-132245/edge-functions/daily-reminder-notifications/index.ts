import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req: Request) => {
  try {
    // DEPRECATED BACKUP — use supabase/functions/daily-reminder-notifications (env secrets)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const { createClient } = await import("jsr:@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get current date (UTC)
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Get all approved users who haven't submitted today
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, full_name, username")
      .eq("approval_status", "approved");
    
    if (profilesError) throw profilesError;
    
    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users to notify", count: 0 }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Check which users have submitted today
    const { data: todaySubmissions, error: submissionsError } = await supabase
      .from("daily_activities")
      .select("user_id")
      .eq("activity_date", todayStr);
    
    if (submissionsError) throw submissionsError;
    
    const submittedUserIds = new Set(
      (todaySubmissions || []).map((s) => s.user_id)
    );
    
    // Find users who haven't submitted
    const usersToNotify = profiles.filter(
      (p) => !submittedUserIds.has(p.user_id)
    );
    
    if (usersToNotify.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "All users have submitted today", 
          count: 0 
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Create notifications for users who haven't submitted
    const notifications = usersToNotify.map((user) => ({
      user_id: user.user_id,
      title: "Daily Activity Reminder",
      message: `Hi ${user.full_name || user.username}, don't forget to submit your daily activity report today! The deadline is 10 PM (GMT+1).`,
      type: "reminder",
      is_read: false,
    }));
    
    const { error: insertError } = await supabase
      .from("notifications")
      .insert(notifications);
    
    if (insertError) throw insertError;
    
    return new Response(
      JSON.stringify({
        message: "Daily reminders sent successfully",
        count: notifications.length,
        users_notified: usersToNotify.map((u) => u.username),
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in daily-reminder-notifications:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to send daily reminders",
        details: error.message 
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
