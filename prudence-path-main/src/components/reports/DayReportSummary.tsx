import { Badge } from "@/components/ui/badge";
import { BookOpen, Briefcase, ExternalLink, GraduationCap } from "lucide-react";
import { ProofImageGrid } from "@/components/ui/proof-image";
import type { ActivityRow } from "@/lib/activityTypes";
import {
  accountLinksFrom,
  getActivityProofSections,
  gigLinksFrom,
} from "@/lib/activityTypes";

export type ActivityDayRow = ActivityRow & {
  new_things_learned?: string | null;
};

function LinkList({ title, links }: { title: string; links: string[] }) {
  if (!links.length) return null;
  return (
    <div className="rounded-lg bg-accent/25 border border-border/40 p-2 space-y-1">
      <p className="text-xs font-semibold text-foreground flex items-center gap-1">
        <ExternalLink className="h-3 w-3" />
        {title}
      </p>
      {links.map((link, idx) => (
        <a
          key={`${title}-${idx}-${link}`}
          href={link.startsWith("http") ? link : `https://${link}`}
          target="_blank"
          rel="noreferrer"
          className="block text-xs text-primary hover:underline break-all"
        >
          {link}
        </a>
      ))}
    </div>
  );
}

function ProofSection({ label, paths }: { label: string; paths: string[] }) {
  if (!paths.length) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <ProofImageGrid paths={paths} altPrefix={label} thumbnailClassName="h-20" />
    </div>
  );
}

export function DayReportSummary({ activity }: { activity: ActivityDayRow | undefined }) {
  if (!activity?.submitted_at) {
    return <p className="text-sm text-muted-foreground">No report submitted for this day.</p>;
  }

  const proofs = getActivityProofSections(activity);
  const gigLinks = gigLinksFrom(activity);
  const accountLinks = accountLinksFrom(activity);
  const hasAnyProof = Object.values(proofs).some((arr) => arr.length > 0);

  const statusLabel = activity.is_verified
    ? "Approved"
    : activity.verified_at
      ? "Rejected"
      : "Pending";

  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap gap-2">
        <Badge variant={activity.is_verified ? "default" : "secondary"}>{statusLabel}</Badge>
        {(activity.submission_tags || []).map((tag) => (
          <Badge key={tag} variant="outline" className="text-xs">
            {tag}
          </Badge>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 text-muted-foreground">
        <span>
          <BookOpen className="inline h-3 w-3 mr-1" />
          {activity.pages_read ?? 0} pages
        </span>
        <span>
          <Briefcase className="inline h-3 w-3 mr-1" />
          {activity.gigs_created ?? 0} gigs
        </span>
        <span>{activity.accounts_created ?? 0} accounts</span>
        <span>${Number(activity.net_income ?? 0).toFixed(2)} net</span>
        <span>{activity.daily_contacts ?? 0} contacts</span>
        <span>{activity.follow_ups ?? 0} follow-ups</span>
        <span>{activity.expected_conversions ?? 0} expected converts</span>
      </div>
      {activity.new_things_learned?.trim() && (
        <p className="text-muted-foreground whitespace-pre-wrap">
          <span className="font-medium text-foreground">Learned: </span>
          {activity.new_things_learned}
        </p>
      )}
      {activity.reading_notes?.trim() && (
        <p className="text-muted-foreground whitespace-pre-wrap">
          <span className="font-medium text-foreground">Reading: </span>
          {activity.reading_notes}
        </p>
      )}
      {(activity.skill_learned || activity.skill_description) && (
        <div className="text-muted-foreground whitespace-pre-wrap space-y-1">
          <p className="font-medium text-foreground flex items-center gap-1">
            <GraduationCap className="h-3 w-3" />
            Skills
          </p>
          {activity.skill_learned && <p>Skill: {activity.skill_learned}</p>}
          {activity.skill_description?.trim() && <p>{activity.skill_description}</p>}
        </div>
      )}
      {(activity.gig_notes?.trim() || gigLinks.length > 0 || proofs.gig.length > 0) && (
        <div className="rounded-lg bg-accent/25 border border-border/40 p-2 space-y-2">
          <p className="text-xs font-semibold text-foreground">Gigs</p>
          {activity.gig_notes?.trim() && (
            <p className="text-muted-foreground whitespace-pre-wrap">
              <span className="font-medium text-foreground">Notes: </span>
              {activity.gig_notes}
            </p>
          )}
          <LinkList title="Gig links" links={gigLinks} />
          <ProofSection label="Gig proof" paths={proofs.gig} />
        </div>
      )}
      {(activity.account_notes?.trim() || accountLinks.length > 0 || proofs.account.length > 0) && (
        <div className="rounded-lg bg-accent/25 border border-border/40 p-2 space-y-2">
          <p className="text-xs font-semibold text-foreground">Accounts</p>
          {activity.account_notes?.trim() && (
            <p className="text-muted-foreground whitespace-pre-wrap">
              <span className="font-medium text-foreground">Notes: </span>
              {activity.account_notes}
            </p>
          )}
          <LinkList title="Account links" links={accountLinks} />
          <ProofSection label="Account proof" paths={proofs.account} />
        </div>
      )}
      {activity.other_activities?.trim() && (
        <p className="text-muted-foreground whitespace-pre-wrap">
          <span className="font-medium text-foreground">Other: </span>
          {activity.other_activities}
        </p>
      )}
      {hasAnyProof &&
        (proofs.reading.length > 0 ||
          proofs.prospecting.length > 0 ||
          proofs.skill.length > 0 ||
          proofs.other.length > 0) && (
        <div className="space-y-2 pt-1 border-t border-border/40">
          <ProofSection label="Reading proof" paths={proofs.reading} />
          <ProofSection label="Prospecting proof" paths={proofs.prospecting} />
          <ProofSection label="Skill proof" paths={proofs.skill} />
          <ProofSection label="Other proof" paths={proofs.other} />
        </div>
      )}
    </div>
  );
}
