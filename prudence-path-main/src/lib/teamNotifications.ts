import { notifyUser } from "@/lib/notifyUser";
import { fetchSponsorUplines } from "@/lib/sponsorUplines";

const ROLE_LABELS: Record<string, string> = {
  member: "Member",
  pro: "Pro",
  sponsor: "Sponsor",
  trainer: "Trainer",
  super_admin: "Super Admin",
};

function roleLabel(role: string) {
  return ROLE_LABELS[role] ?? role;
}

export async function notifyRoleChanged(
  userId: string,
  newRole: string,
  previousRole: string,
) {
  if (newRole === previousRole) return;

  await notifyUser({
    user_id: userId,
    title: "Your Role Was Updated",
    message: `Your role on THE PRUDENCE has been changed from ${roleLabel(previousRole)} to ${roleLabel(newRole)}.`,
    type: "alert",
    link: "/profile",
    email_subject: "Your THE PRUDENCE role was updated",
    ctaLabel: "View profile",
  });
}

/** Notify direct sponsor only (in-app + email when sendEmail). */
export async function notifyDirectSponsorOfMember(options: {
  memberUsername: string;
  memberFullName: string;
  sponsorUsername: string | null | undefined;
  isNewMember?: boolean;
  sendEmail?: boolean;
}) {
  const {
    memberUsername,
    memberFullName,
    sponsorUsername,
    isNewMember = true,
    sendEmail = false,
  } = options;
  const uplines = await fetchSponsorUplines(sponsorUsername);
  const direct = uplines.find((u) => u.depth === 1);
  if (!direct) return;

  const title = isNewMember ? "New Member on Your Team" : "New Downline Assigned";
  const message = isNewMember
    ? `@${memberUsername} (${memberFullName}) joined your team and was approved.`
    : `@${memberUsername} (${memberFullName}) was assigned as your direct downline.`;

  await notifyUser({
    user_id: direct.user_id,
    title,
    message,
    type: "team",
    link: "/sponsor-dashboard",
    email_subject: `${title} — THE PRUDENCE`,
    ctaLabel: "View sponsor dashboard",
    sendEmail,
  });
}

/** In-app only for upline sponsors (depth 2+); direct sponsor uses notifyDirectSponsorOfMember. */
export async function notifySponsorUplinesOfMember(options: {
  memberUsername: string;
  memberFullName: string;
  sponsorUsername: string | null | undefined;
  isNewMember?: boolean;
}) {
  const { memberUsername, memberFullName, sponsorUsername, isNewMember = true } = options;
  const uplines = await fetchSponsorUplines(sponsorUsername);
  const indirect = uplines.filter((u) => u.depth > 1);
  if (!indirect.length) return;

  const title = isNewMember ? "New Member in Your Network" : "New Downline Assigned";

  for (const upline of indirect) {
    const message = isNewMember
      ? `@${memberUsername} (${memberFullName}) joined your network (level ${upline.depth} downline).`
      : `@${memberUsername} (${memberFullName}) was assigned under your network (level ${upline.depth}).`;

    await notifyUser({
      user_id: upline.user_id,
      title,
      message,
      type: "team",
      link: "/teams",
      email_subject: `${title} — THE PRUDENCE`,
      ctaLabel: "View team",
    });
  }
}
