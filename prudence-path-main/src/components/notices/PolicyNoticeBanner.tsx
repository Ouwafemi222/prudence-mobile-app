import { Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDismissedNotice } from "@/hooks/useDismissedNotice";
import { cn } from "@/lib/utils";

type PolicyNoticeBannerProps = {
  noticeId: string;
  title: string;
  children: React.ReactNode;
  className?: string;
};

export function PolicyNoticeBanner({ noticeId, title, children, className }: PolicyNoticeBannerProps) {
  const { dismissed, dismiss } = useDismissedNotice(noticeId);

  if (dismissed) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm",
        className,
      )}
      role="status"
    >
      <Info className="h-5 w-5 shrink-0 mt-0.5 text-primary" aria-hidden />
      <div className="flex-1 min-w-0 space-y-1">
        <p className="font-semibold text-foreground">{title}</p>
        <div className="text-muted-foreground leading-relaxed">{children}</div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={dismiss}
        aria-label="Dismiss notice"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
