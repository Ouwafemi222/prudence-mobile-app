import { buildNotificationEmail } from "./email-layout.ts";

export type SendEmailParams = {
  to: string;
  subject: string;
  title: string;
  message: string;
  messageHtml?: string;
  ctaLabel?: string;
  ctaUrl?: string;
};

export function getResendConfig() {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
  const fromName = Deno.env.get("RESEND_FROM_NAME") || "THE PRUDENCE";

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY in Edge Function secrets.");
  }
  if (!fromEmail) {
    throw new Error("Missing RESEND_FROM_EMAIL in Edge Function secrets.");
  }

  return { apiKey, from: `${fromName} <${fromEmail}>` };
}

export async function sendResendEmail(params: SendEmailParams): Promise<{ id?: string }> {
  const { apiKey, from } = getResendConfig();
  const html = buildNotificationEmail({
    title: params.title,
    message: params.message,
    messageHtml: params.messageHtml,
    ctaLabel: params.ctaLabel,
    ctaUrl: params.ctaUrl,
  });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      html,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = (body as { message?: string }).message || response.statusText;
    throw new Error(`Resend API error (${response.status}): ${msg}`);
  }

  return body as { id?: string };
}
