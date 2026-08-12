import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { absoluteAppLink } from "./email-layout.ts";
import { sendResendEmail } from "./resend.ts";

export type NotifyUserParams = {
  user_id: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  /** Email subject; defaults to title */
  email_subject?: string;
  ctaLabel?: string;
  /** Resend is limited — only submission approve/reject should set this true */
  send_email?: boolean;
};

export type NotifyUserResult = {
  notification_created: boolean;
  email_sent: boolean;
  email?: string | null;
  email_error?: string;
};

/** Resolve recipient email from profiles.email, then auth.users. */
export async function resolveUserEmail(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("user_id", userId)
    .maybeSingle();

  if (profile?.email?.trim()) {
    return profile.email.trim();
  }

  const { data: authData, error } = await supabase.auth.admin.getUserById(userId);
  if (error) {
    console.error("resolveUserEmail auth.admin.getUserById:", error);
    return null;
  }

  return authData.user?.email?.trim() || null;
}

/** Insert in-app notification and send matching email via Resend. */
export async function notifyUser(
  supabase: SupabaseClient,
  params: NotifyUserParams,
): Promise<NotifyUserResult> {
  const result: NotifyUserResult = {
    notification_created: false,
    email_sent: false,
    email: null,
  };

  const { error: insertError } = await supabase.from("notifications").insert({
    user_id: params.user_id,
    title: params.title,
    message: params.message,
    type: params.type,
    link: params.link ?? null,
    is_read: false,
  });

  if (insertError) {
    throw new Error(`Failed to create notification: ${insertError.message}`);
  }
  result.notification_created = true;

  try {
    const { data: tokens } = await supabase
      .from("expo_push_tokens")
      .select("expo_push_token")
      .eq("user_id", params.user_id);
    const messages = (tokens || [])
      .map((row: { expo_push_token?: string | null }) => row.expo_push_token)
      .filter((token): token is string => Boolean(token?.startsWith("ExponentPushToken")))
      .map((token) => ({
        to: token,
        title: "THE PRUDENCE",
        subtitle: params.title,
        body: params.message,
        sound: "default",
        channelId: "prudence",
        data: { link: params.link ?? null, type: params.type },
      }));
    if (messages.length > 0) {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(messages),
      });
    }
  } catch (e) {
    console.error("notifyUser expo push:", e);
  }

  const email = await resolveUserEmail(supabase, params.user_id);
  result.email = email;

  if (!email) {
    result.email_error = "No email address for user";
    return result;
  }

  if (!params.send_email) {
    return result;
  }

  try {
    const ctaUrl = absoluteAppLink(params.link);
    await sendResendEmail({
      to: email,
      subject: params.email_subject ?? params.title,
      title: params.title,
      message: params.message,
      ctaLabel: params.ctaLabel ?? (ctaUrl ? "Open in THE PRUDENCE" : undefined),
      ctaUrl,
    });
    result.email_sent = true;
  } catch (e) {
    result.email_error = e instanceof Error ? e.message : String(e);
    console.error("notifyUser sendResendEmail:", result.email_error);
  }

  return result;
}
