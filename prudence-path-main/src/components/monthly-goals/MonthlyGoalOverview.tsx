import { Progress } from "@/components/ui/progress";
import { ProofImageGrid } from "@/components/ui/proof-image";
import { getGoalBookImagePaths } from "@/lib/monthlyGoalWindow";

export type MonthlyGoalRow = {
  month_year: string;
  target_pages: number | null;
  target_gigs: number | null;
  target_accounts: number | null;
  target_income: number | null;
  target_contacts: number | null;
  target_tags: number | null;
  target_conversions: number | null;
  things_to_learn: string | null;
  goal_book_image?: string | null;
  goal_book_images?: string[] | null;
  actual_pages: number | null;
  actual_gigs: number | null;
  actual_accounts: number | null;
  actual_income: number | null;
  actual_contacts: number | null;
  actual_tags: number | null;
  actual_conversions: number | null;
  actual_things_learned: string | null;
  consistency_score: number | null;
};

type MonthlyGoalOverviewProps = {
  goal: MonthlyGoalRow;
  compact?: boolean;
};

export function MonthlyGoalOverview({ goal, compact }: MonthlyGoalOverviewProps) {
  const bookPaths = getGoalBookImagePaths(goal);
  const metricRows = [
    { label: "Pages", actual: goal.actual_pages || 0, target: goal.target_pages || 0 },
    { label: "Gigs", actual: goal.actual_gigs || 0, target: goal.target_gigs || 0 },
    { label: "Accounts", actual: goal.actual_accounts || 0, target: goal.target_accounts || 0 },
    {
      label: "Net income",
      actual: Number(goal.actual_income || 0),
      target: Number(goal.target_income || 0),
      format: (n: number) => `$${n.toLocaleString()}`,
    },
    { label: "Contacts", actual: goal.actual_contacts || 0, target: goal.target_contacts || 0 },
    { label: "Tags", actual: goal.actual_tags || 0, target: goal.target_tags || 0 },
    {
      label: "Converts (expected)",
      actual: goal.actual_conversions || 0,
      target: goal.target_conversions || 0,
    },
  ];

  return (
    <div className="space-y-4">
      <div className={compact ? "grid grid-cols-2 gap-3" : "grid grid-cols-1 sm:grid-cols-2 gap-4"}>
        {metricRows.map((row) => {
          const fmt = row.format ?? ((n: number) => String(n));
          const pct = row.target ? Math.min((row.actual / row.target) * 100, 100) : 0;
          return (
            <div key={row.label}>
              <p className="text-xs text-muted-foreground mb-1">{row.label}</p>
              <p className="text-lg font-bold text-foreground">
                {fmt(row.actual)} / {fmt(row.target)}
              </p>
              <Progress value={pct} className="h-1 mt-1" />
            </div>
          );
        })}
        <div>
          <p className="text-xs text-muted-foreground mb-1">Consistency</p>
          <p className="text-lg font-bold text-foreground">
            {(goal.consistency_score || 0).toFixed(1)}%
          </p>
        </div>
      </div>

      {goal.things_to_learn && (
        <div className="pt-4 border-t">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Things to learn / develop</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{goal.things_to_learn}</p>
        </div>
      )}

      {goal.actual_things_learned && (
        <div className="pt-4 border-t">
          <p className="text-xs font-semibold text-muted-foreground mb-2">
            Learned this month (from daily reports)
          </p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{goal.actual_things_learned}</p>
        </div>
      )}

      {bookPaths.length > 0 && (
        <div className="pt-4 border-t space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">
            Goals book photos ({bookPaths.length})
          </p>
          <ProofImageGrid
            paths={bookPaths}
            altPrefix="Goals book"
            thumbnailClassName="max-h-48 object-contain"
          />
        </div>
      )}
    </div>
  );
}
