import { supabase } from "../integrations/supabase/client";
import { showToastOrAlert } from "./androidToast";

export type NotifyUserPayload = {
  user_id: string;
  title: string;
  message: string;
  type?: string;
  link?: string | null;
  email_subject?: string;
  ctaLabel?: string;
  /** When true, sends Resend email (submission approve/reject, account decisions). */
  sendEmail?: boolean;
};

export type NotifyUserResponse = {
  ok: boolean;
  notification_created: boolean;
  email_sent: boolean;
  email?: string | null;
  email_error?: string;
  invoke_error?: string;
};

/** Creates in-app notification; email only when sendEmail is true. Never throws — check `ok` / `invoke_error`. */
export async function notifyUser(payload: NotifyUserPayload): Promise<NotifyUserResponse> {
  const { sendEmail, ...rest } = payload;
  const { data, error } = await supabase.functions.invoke("notify-user", {
    body: {
      type: "alert",
      ...rest,
      send_email: sendEmail === true,
    },
  });

  if (error) {
    return {
      ok: false,
      notification_created: false,
      email_sent: false,
      invoke_error: error.message,
    };
  }

  if (data && typeof data === "object" && "error" in data) {
    return {
      ok: false,
      notification_created: false,
      email_sent: false,
      invoke_error: String((data as { error: string }).error),
    };
  }

  const d = (data || {}) as NotifyUserResponse & { ok?: boolean };
  return {
    ok: d.ok !== false && Boolean(d.notification_created),
    notification_created: Boolean(d.notification_created),
    email_sent: Boolean(d.email_sent),
    email: d.email ?? null,
    email_error: d.email_error,
  };
}

export function toastAfterAction(
  successMessage: string,
  notifyResult: NotifyUserResponse,
  options?: { expectedEmail?: boolean },
) {
  showToastOrAlert(successMessage);

  if (notifyResult.invoke_error) {
    showToastOrAlert(`Saved, but notification could not be sent: ${notifyResult.invoke_error}`);
    return;
  }

  if (!notifyResult.notification_created) {
    showToastOrAlert("Saved, but in-app notification was not created");
    return;
  }

  if (options?.expectedEmail && !notifyResult.email_sent) {
    showToastOrAlert(
      notifyResult.email_error || "Saved. In-app notification sent; email was not sent.",
    );
  }
}
