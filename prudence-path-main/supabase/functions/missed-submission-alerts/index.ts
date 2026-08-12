import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { notifyUser } from "../_shared/notify.ts";

Deno.serve(async () => {
  try {
    const supabase = createAdminClient();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, full_name, username")
      .eq("approval_status", "approved");

    if (profilesError) throw profilesError;
    if (!profiles?.length) {
      return json({ message: "No users to check", count: 0, emails_sent: 0 });
    }

    const { data: yesterdaySubmissions, error: submissionsError } = await supabase
      .from("daily_activities")
      .select("user_id")
      .eq("activity_date", yesterdayStr);

    if (submissionsError) throw submissionsError;

    const submittedUserIds = new Set((yesterdaySubmissions ?? []).map((s) => s.user_id));
    const usersWhoMissed = profiles.filter((p) => !submittedUserIds.has(p.user_id));

    if (!usersWhoMissed.length) {
      return json({ message: "All users submitted yesterday", count: 0, emails_sent: 0 });
    }

    let emailsSent = 0;
    for (const user of usersWhoMissed) {
      const message =
        `You missed submitting your daily activity report for ${yesterdayStr}. Please submit it as soon as possible.`;

      const result = await notifyUser(supabase, {
        user_id: user.user_id,
        title: "Missed Daily Submission",
        message,
        type: "alert",
        link: "/daily-activity",
        email_subject: "Missed daily submission — THE PRUDENCE",
        ctaLabel: "Submit now",
      });
      if (result.email_sent) emailsSent++;
    }

    return json({
      message: "Missed submission alerts sent successfully",
      count: usersWhoMissed.length,
      emails_sent: emailsSent,
      users_notified: usersWhoMissed.map((u) => u.username),
    });
  } catch (error: unknown) {
    console.error("missed-submission-alerts:", error);
    return json(
      {
        error: "Failed to send missed submission alerts",
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
