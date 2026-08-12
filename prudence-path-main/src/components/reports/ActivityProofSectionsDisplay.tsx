import { ProofImageGrid } from "@/components/ui/proof-image";
import type { ActivityRow } from "@/lib/activityTypes";
import { getActivityProofSections } from "@/lib/activityTypes";
import { cn } from "@/lib/utils";

const PROOF_SECTIONS = [
  { key: "reading", label: "Reading proof" },
  { key: "gig", label: "Gig proof" },
  { key: "account", label: "Account proof" },
  { key: "prospecting", label: "Prospecting proof" },
  { key: "skill", label: "Skill proof" },
  { key: "other", label: "Other proof" },
] as const;

type ProofActivity = Pick<
  ActivityRow,
  | "reading_proof_images"
  | "reading_proof_image"
  | "skill_proof_images"
  | "skill_proof_image"
  | "gig_proof_images"
  | "account_proof_images"
  | "prospecting_proof_images"
  | "other_activities_proof_images"
  | "other_activities_proof_image"
>;

export function countActivityProofImages(activity: ProofActivity): number {
  const proofs = getActivityProofSections(activity);
  return Object.values(proofs).reduce((sum, paths) => sum + paths.length, 0);
}

type ActivityProofSectionsDisplayProps = {
  activity: ProofActivity;
  thumbnailClassName?: string;
  className?: string;
  titleClassName?: string;
};

export function ActivityProofSectionsDisplay({
  activity,
  thumbnailClassName = "max-h-64",
  className,
  titleClassName = "text-sm font-semibold text-foreground mb-2",
}: ActivityProofSectionsDisplayProps) {
  const proofs = getActivityProofSections(activity);
  const sections = PROOF_SECTIONS.map(({ key, label }) => ({
    label,
    paths: proofs[key],
  })).filter((section) => section.paths.length > 0);

  if (!sections.length) return null;

  return (
    <div className={cn("space-y-4", className)}>
      {sections.map(({ label, paths }) => (
        <div key={label}>
          <p className={titleClassName}>
            {label} ({paths.length})
          </p>
          <ProofImageGrid paths={paths} altPrefix={label} thumbnailClassName={thumbnailClassName} />
        </div>
      ))}
    </div>
  );
}
