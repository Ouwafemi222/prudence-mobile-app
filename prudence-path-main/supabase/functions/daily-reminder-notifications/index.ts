import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { notifyUser } from "../_shared/notify.ts";

Deno.serve(async () => {
  try {
    const supabase = createAdminClient();
    const todayStr = new Date().toISOString().split("T")[0];

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, full_name, username")
      .eq("approval_status", "approved");

    if (profilesError) throw profilesError;
    if (!profiles?.length) {
      return json({ message: "No users to notify", count: 0, emails_sent: 0 });
    }

    const { data: todaySubmissions, error: submissionsError } = await supabase
      .from("daily_activities")
      .select("user_id")
      .eq("activity_date", todayStr);

    if (submissionsError) throw submissionsError;

    const submittedUserIds = new Set((todaySubmissions ?? []).map((s) => s.user_id));
    const usersToNotify = profiles.filter((p) => !submittedUserIds.has(p.user_id));

    if (!usersToNotify.length) {
      return json({ message: "All users have submitted today", count: 0, emails_sent: 0 });
    }

    let emailsSent = 0;
    for (const user of usersToNotify) {
      const name = user.full_name || user.username;
      const message =
        `Hi ${name}, don't forget to submit your daily activity report today! The deadline is 11:59 PM (GMT+1).`;

      const result = await notifyUser(supabase, {
        user_id: user.user_id,
        title: "Daily Activity Reminder",
        message,
        type: "reminder",
        link: "/daily-activity",
        email_subject: "Reminder: Submit your daily activity — THE PRUDENCE",
        ctaLabel: "Submit daily activity",
      });
      if (result.email_sent) emailsSent++;
    }

    return json({
      message: "Daily reminders sent successfully",
      count: usersToNotify.length,
      emails_sent: emailsSent,
      users_notified: usersToNotify.map((u) => u.username),
    });
  } catch (error: unknown) {
    console.error("daily-reminder-notifications:", error);
    return json(
      {
        error: "Failed to send daily reminders",
        details: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
