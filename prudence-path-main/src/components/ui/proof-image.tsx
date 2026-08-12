import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getPublicImageUrl } from "@/lib/activityTypes";
import { cn } from "@/lib/utils";
import { Loader2, X } from "lucide-react";

type ProofImageProps = {
  path: string | null | undefined;
  alt?: string;
  className?: string;
  thumbnailClassName?: string;
  label?: string;
  /** Show remove control (e.g. daily report / monthly goals while editable). */
  onRemove?: () => void;
  removing?: boolean;
  removeDisabled?: boolean;
};

/** Clickable proof thumbnail that opens an in-app full-size preview. */
export function ProofImage({
  path,
  alt = "Proof image",
  className,
  thumbnailClassName,
  label,
  onRemove,
  removing,
  removeDisabled,
}: ProofImageProps) {
  const [open, setOpen] = useState(false);
  const url = getPublicImageUrl(path ?? null);

  if (!url) return null;

  const preview = (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "block w-full rounded-lg overflow-hidden border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/40",
          className,
        )}
        aria-label={label ?? `View ${alt}`}
      >
        <img
          src={url}
          alt={alt}
          className={cn("w-full object-cover cursor-zoom-in", thumbnailClassName ?? "h-20")}
        />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-card w-[calc(100%-2rem)] max-w-3xl max-h-[90dvh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{label ?? "Image preview"}</DialogTitle>
            <DialogDescription className="sr-only">Full size proof image</DialogDescription>
          </DialogHeader>
          <img
            src={url}
            alt={alt}
            className="w-full max-h-[75dvh] object-contain rounded-lg mx-auto"
          />
        </DialogContent>
      </Dialog>
    </>
  );

  if (!onRemove) return preview;

  return (
    <div className="relative p-3 rounded-lg bg-accent/20 border border-border/40">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs text-muted-foreground">{label ?? "Saved image"}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          disabled={removing || removeDisabled}
          aria-label="Remove image"
        >
          {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
        </Button>
      </div>
      {preview}
    </div>
  );
}

type ProofImageGridProps = {
  paths: (string | null | undefined)[];
  altPrefix?: string;
  thumbnailClassName?: string;
  className?: string;
  onRemovePath?: (path: string) => void;
  removingPath?: string | null;
  removeDisabled?: boolean;
};

export function ProofImageGrid({
  paths,
  altPrefix = "Proof",
  thumbnailClassName,
  className,
  onRemovePath,
  removingPath,
  removeDisabled,
}: ProofImageGridProps) {
  const list = paths.filter(Boolean) as string[];
  if (!list.length) return null;

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 gap-2", className)}>
      {list.map((path, idx) => (
        <ProofImage
          key={`${path}-${idx}`}
          path={path}
          alt={`${altPrefix} ${idx + 1}`}
          label={`${altPrefix} ${idx + 1}`}
          thumbnailClassName={thumbnailClassName}
          onRemove={onRemovePath ? () => onRemovePath(path) : undefined}
          removing={removingPath === path}
          removeDisabled={removeDisabled}
        />
      ))}
    </div>
  );
}
