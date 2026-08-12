#!/usr/bin/env bash
# Apply branded HTML from supabase/templates/email/ via Supabase Management API.
# Usage: SUPABASE_ACCESS_TOKEN=... ./scripts/deploy-email-templates.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_REF="${PROJECT_REF:-xpvabdfleomjpytvvjux}"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Set SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens)" >&2
  exit 1
fi

read_html() {
  jq -Rs . "$1"
}

# Build JSON payload with all templates + subjects
payload=$(jq -n \
  --arg sub_confirm "Welcome to THE PRUDENCE — Confirm your email" \
  --argjson html_confirm "$(read_html "$ROOT/supabase/templates/email/confirm-signup.html")" \
  --arg sub_invite "You're invited to THE PRUDENCE" \
  --argjson html_invite "$(read_html "$ROOT/supabase/templates/email/invite-user.html")" \
  --arg sub_magic "Your THE PRUDENCE sign-in link" \
  --argjson html_magic "$(read_html "$ROOT/supabase/templates/email/magic-link.html")" \
  --arg sub_email_change "Confirm your new email — THE PRUDENCE" \
  --argjson html_email_change "$(read_html "$ROOT/supabase/templates/email/change-email.html")" \
  --arg sub_recovery "Reset your THE PRUDENCE password" \
  --argjson html_recovery "$(read_html "$ROOT/supabase/templates/email/reset-password.html")" \
  --arg sub_reauth "Verify your identity — THE PRUDENCE" \
  --argjson html_reauth "$(read_html "$ROOT/supabase/templates/email/reauthentication.html")" \
  --arg sub_pw_changed "Your THE PRUDENCE password was changed" \
  --argjson html_pw_changed "$(read_html "$ROOT/supabase/templates/email/password-changed.html")" \
  --arg sub_email_changed "Your THE PRUDENCE email was updated" \
  --argjson html_email_changed "$(read_html "$ROOT/supabase/templates/email/email-changed.html")" \
  --arg sub_phone_changed "Your THE PRUDENCE phone number was updated" \
  --argjson html_phone_changed "$(read_html "$ROOT/supabase/templates/email/phone-changed.html")" \
  --arg sub_identity_linked "New sign-in method linked — THE PRUDENCE" \
  --argjson html_identity_linked "$(read_html "$ROOT/supabase/templates/email/identity-linked.html")" \
  --arg sub_identity_unlinked "Sign-in method removed — THE PRUDENCE" \
  --argjson html_identity_unlinked "$(read_html "$ROOT/supabase/templates/email/identity-unlinked.html")" \
  --arg sub_mfa_added "Two-factor authentication added — THE PRUDENCE" \
  --argjson html_mfa_added "$(read_html "$ROOT/supabase/templates/email/mfa-added.html")" \
  --arg sub_mfa_removed "Two-factor authentication removed — THE PRUDENCE" \
  --argjson html_mfa_removed "$(read_html "$ROOT/supabase/templates/email/mfa-removed.html")" \
  '{
    mailer_subjects_confirmation: $sub_confirm,
    mailer_templates_confirmation_content: $html_confirm,
    mailer_subjects_invite: $sub_invite,
    mailer_templates_invite_content: $html_invite,
    mailer_subjects_magic_link: $sub_magic,
    mailer_templates_magic_link_content: $html_magic,
    mailer_subjects_email_change: $sub_email_change,
    mailer_templates_email_change_content: $html_email_change,
    mailer_subjects_recovery: $sub_recovery,
    mailer_templates_recovery_content: $html_recovery,
    mailer_subjects_reauthentication: $sub_reauth,
    mailer_templates_reauthentication_content: $html_reauth,
    mailer_notifications_password_changed_enabled: true,
    mailer_subjects_password_changed_notification: $sub_pw_changed,
    mailer_templates_password_changed_notification_content: $html_pw_changed,
    mailer_notifications_email_changed_enabled: true,
    mailer_subjects_email_changed_notification: $sub_email_changed,
    mailer_templates_email_changed_notification_content: $html_email_changed,
    mailer_notifications_phone_changed_enabled: true,
    mailer_subjects_phone_changed_notification: $sub_phone_changed,
    mailer_templates_phone_changed_notification_content: $html_phone_changed,
    mailer_notifications_identity_linked_enabled: true,
    mailer_subjects_identity_linked_notification: $sub_identity_linked,
    mailer_templates_identity_linked_notification_content: $html_identity_linked,
    mailer_notifications_identity_unlinked_enabled: true,
    mailer_subjects_identity_unlinked_notification: $sub_identity_unlinked,
    mailer_templates_identity_unlinked_notification_content: $html_identity_unlinked,
    mailer_notifications_mfa_factor_enrolled_enabled: true,
    mailer_subjects_mfa_factor_enrolled_notification: $sub_mfa_added,
    mailer_templates_mfa_factor_enrolled_notification_content: $html_mfa_added,
    mailer_notifications_mfa_factor_unenrolled_enabled: true,
    mailer_subjects_mfa_factor_unenrolled_notification: $sub_mfa_removed,
    mailer_templates_mfa_factor_unenrolled_notification_content: $html_mfa_removed
  }')

echo "PATCH auth email templates for project $PROJECT_REF ..."
http_code=$(curl -sS -o /tmp/supabase-email-patch.json -w "%{http_code}" \
  -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$payload")

if [[ "$http_code" =~ ^2 ]]; then
  echo "OK ($http_code) — all 13 templates + security notification toggles applied."
else
  echo "FAILED ($http_code):" >&2
  cat /tmp/supabase-email-patch.json >&2
  exit 1
fi
