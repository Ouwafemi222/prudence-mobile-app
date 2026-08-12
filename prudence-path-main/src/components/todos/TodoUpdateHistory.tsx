import { Loader2, History } from "lucide-react";
import { cn } from "@/lib/utils";

export type TodoLogEntry = {
  id: string;
  plan: string;
  created_at: string;
};

type TodoUpdateHistoryProps = {
  logs: TodoLogEntry[];
  loading?: boolean;
  className?: string;
  emptyMessage?: string;
};

function formatLogTime(iso: string) {
  return new Date(iso).toLocaleString("en-NG", {
    timeZone: "Africa/Lagos",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TodoUpdateHistory({
  logs,
  loading,
  className,
  emptyMessage = "No saved versions yet. Your first save will appear here.",
}: TodoUpdateHistoryProps) {
  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground py-4", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading update history…
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground py-2", className)}>{emptyMessage}</p>
    );
  }

  const ordered = [...logs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <History className="h-4 w-4 text-primary" />
        Update history
        <span className="text-xs font-normal text-muted-foreground">({ordered.length} version{ordered.length === 1 ? "" : "s"})</span>
      </div>
      <ol className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {ordered.map((entry, index) => {
          const versionNumber = ordered.length - index;
          const isLatest = index === 0;
          return (
            <li
              key={entry.id}
              className={cn(
                "rounded-xl border p-4",
                isLatest ? "border-primary/30 bg-primary/5" : "border-border/50 bg-background/40",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="text-xs font-semibold text-foreground">
                  Version {versionNumber}
                  {isLatest && (
                    <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">
                      Latest
                    </span>
                  )}
                </span>
                <time className="text-xs text-muted-foreground">{formatLogTime(entry.created_at)}</time>
              </div>
              <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
                {entry.plan.trim() || "(empty plan)"}
              </pre>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
