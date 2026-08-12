/** Branded HTML wrapper for transactional notification emails. */
export function buildNotificationEmail(options: {
  title: string;
  message: string;
  /** Optional HTML body (trusted server content). When set, replaces plain message paragraph. */
  messageHtml?: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): string {
  const { title, message, messageHtml, ctaLabel, ctaUrl } = options;
  const bodyBlock = messageHtml
    ? messageHtml
    : `<p style="margin:0;font-size:15px;line-height:1.6;color:#404040;">${escapeHtml(message)}</p>`;
  const ctaBlock =
    ctaLabel && ctaUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0;"><tr><td align="center"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#5B52EB 0%,#A855F7 100%);color:#EEF2FF;text-decoration:none;font-weight:700;font-size:15px;border-radius:12px;">${escapeHtml(ctaLabel)}</a></td></tr></table>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background-color:#F5F5F5;font-family:'Lato',Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(180deg,#F5F3FF 0%,#F5F5F5 40%,#F5F5F5 100%);">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#FAFAFA;border-radius:20px;border:1px solid #D4D4D4;box-shadow:0 8px 32px rgba(0,0,0,0.08);overflow:hidden;">
<tr><td align="center" style="padding:36px 32px 28px;background:linear-gradient(135deg,#5B52EB 0%,#A855F7 100%);">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:16px;font-size:28px;font-weight:700;color:#EEF2FF;line-height:56px;">P</td></tr></table>
<h1 style="margin:16px 0 6px;font-size:22px;font-weight:700;color:#FFFFFF;letter-spacing:0.04em;">THE PRUDENCE</h1>
<p style="margin:0;font-size:12px;color:rgba(255,255,255,0.88);">Prudence Office Accountability &amp; Training System</p>
</td></tr>
<tr><td style="padding:36px 32px;">
<h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#171717;font-family:'EB Garamond',Georgia,serif;">${escapeHtml(title)}</h2>
${bodyBlock}
${ctaBlock}
</td></tr>
<tr><td style="padding:20px 32px 28px;border-top:1px solid #E5E5E5;text-align:center;">
<p style="margin:0;font-size:12px;color:#737373;">&copy; THE PRUDENCE</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function getSiteUrl(): string | undefined {
  const url = Deno.env.get("SITE_URL") || Deno.env.get("APP_URL");
  return url?.replace(/\/$/, "") || undefined;
}

export function absoluteAppLink(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  const base = getSiteUrl();
  if (!base) return undefined;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
