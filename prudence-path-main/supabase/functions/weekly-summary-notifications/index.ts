import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { notifyUser } from "../_shared/notify.ts";

/** Sunday-start week (matches app Nigeria week). */
function weekStartIso(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().split("T")[0];
}

Deno.serve(async () => {
  try {
    const supabase = createAdminClient();
    const weekStart = weekStartIso(new Date());
    const weekEnd = new Date(`${weekStart}T00:00:00Z`);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    const weekEndStr = weekEnd.toISOString().split("T")[0];

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, full_name, username")
      .eq("approval_status", "approved");

    if (profilesError) throw profilesError;
    if (!profiles?.length) {
      return json({ message: "No users to notify", count: 0, emails_sent: 0 });
    }

    let notified = 0;
    let emailsSent = 0;

    for (const profile of profiles) {
      const { error: genError } = await supabase.rpc("generate_weekly_report", {
        p_user_id: profile.user_id,
        p_week_start_date: weekStart,
      });

      if (genError) {
        console.error(`generate_weekly_report failed for ${profile.username}:`, genError);
        continue;
      }

      const { data: report, error: reportError } = await supabase
        .from("weekly_reports")
        .select("submission_count, consistency_score, total_pages_read, total_net_income")
        .eq("user_id", profile.user_id)
        .eq("week_start_date", weekStart)
        .maybeSingle();

      if (reportError || !report) continue;

      const name = profile.full_name || profile.username;
      const consistency = report.consistency_score ?? 0;
      const submissions = report.submission_count ?? 0;
      const message =
        `Hi ${name}, your week (${weekStart} – ${weekEndStr}): ${submissions}/7 daily submissions, ${consistency}% consistency, ${report.total_pages_read ?? 0} pages read, ₦${Number(report.total_net_income ?? 0).toLocaleString()} net income. View your full report in the app.`;

      const result = await notifyUser(supabase, {
        user_id: profile.user_id,
        title: "Your Weekly Summary",
        message,
        type: "summary",
        link: "/weekly-reports",
        email_subject: "Your weekly summary — THE PRUDENCE",
        ctaLabel: "View weekly report",
      });

      notified++;
      if (result.email_sent) emailsSent++;
    }

    return json({
      message: "Weekly summary notifications sent successfully",
      count: notified,
      emails_sent: emailsSent,
      week: `${weekStart} to ${weekEndStr}`,
    });
  } catch (error: unknown) {
    console.error("weekly-summary-notifications:", error);
    return json(
      {
        error: "Failed to send weekly summaries",
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
