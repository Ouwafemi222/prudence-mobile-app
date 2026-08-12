import { absoluteAppLink, buildNotificationEmail } from "./email-layout.ts";
import { sendResendEmail } from "./resend.ts";

export const DEFAULT_ADMIN_EMAIL = "agboola378@gmail.com";

export function getAdminEmail(): string {
  return (Deno.env.get("ADMIN_EMAIL") || DEFAULT_ADMIN_EMAIL).trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const detailListStyle =
  "margin:16px 0 0;padding:0;list-style:none;font-size:15px;line-height:1.7;color:#404040;";

export function buildDetailsListHtml(
  rows: { label: string; value: string }[],
): string {
  const items = rows
    .map(
      (r) =>
        `<li style="margin:0 0 8px;"><strong style="color:#171717;">${escapeHtml(r.label)}:</strong> ${escapeHtml(r.value)}</li>`,
    )
    .join("");
  return `<ul style="${detailListStyle}">${items}</ul>`;
}

export async function sendAdminEmail(options: {
  subject: string;
  title: string;
  message: string;
  details?: { label: string; value: string }[];
  ctaLabel?: string;
  ctaPath?: string;
}): Promise<{ email_sent: boolean; email_error?: string }> {
  const messageHtml =
    `<p style="margin:0;font-size:15px;line-height:1.6;color:#404040;">${escapeHtml(options.message)}</p>` +
    (options.details?.length ? buildDetailsListHtml(options.details) : "");

  try {
    await sendResendEmail({
      to: getAdminEmail(),
      subject: options.subject,
      title: options.title,
      message: options.message,
      messageHtml,
      ctaLabel: options.ctaLabel ?? "Open THE PRUDENCE",
      ctaUrl: absoluteAppLink(options.ctaPath ?? "/teams"),
    });
    return { email_sent: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("sendAdminEmail:", msg);
    return { email_sent: false, email_error: msg };
  }
}
