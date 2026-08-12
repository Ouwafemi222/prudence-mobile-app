import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ImageDropzone } from "@/components/ui/image-dropzone";
import { ProofImage } from "@/components/ui/proof-image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ActivityProofUploaderProps = {
  label: string;
  files: File[];
  onFilesChange: (files: File[]) => void;
  previewUrls: string[];
  savedPaths: string[];
  legacySinglePath?: string | null;
  disabled?: boolean;
  removingPath: string | null;
  onRemoveSaved: (path: string) => void;
};

function PendingProofPreview({
  url,
  alt,
  label,
}: {
  url: string;
  alt: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  if (!url) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full rounded-lg overflow-hidden border border-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/40"
        aria-label={`Preview ${alt}`}
      >
        <img alt={alt} className="rounded-lg w-full max-h-56 object-cover cursor-zoom-in" src={url} />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-card w-[calc(100%-2rem)] max-w-3xl max-h-[90dvh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription className="sr-only">Pending upload preview</DialogDescription>
          </DialogHeader>
          <img alt={alt} className="w-full max-h-[75dvh] object-contain rounded-lg mx-auto" src={url} />
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ActivityProofUploader({
  label,
  files,
  onFilesChange,
  previewUrls,
  savedPaths,
  legacySinglePath,
  disabled,
  removingPath,
  onRemoveSaved,
}: ActivityProofUploaderProps) {
  const allSaved = [
    ...(savedPaths || []),
    ...(legacySinglePath && !savedPaths?.length ? [legacySinglePath] : []),
  ];

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <ImageDropzone
        files={files}
        onFilesChange={onFilesChange}
        disabled={disabled}
        multiple
        enableCamera
        label="Drop images, take a photo, or choose from your device"
        helperText="Images upload when you submit your daily report — not before."
      />

      {allSaved.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Saved on server — tap to preview</p>
          {allSaved.map((img, idx) => (
            <div
              key={`saved-${img}-${idx}`}
              className="relative p-3 rounded-lg bg-accent/20 border border-border/40"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs text-muted-foreground">Proof {idx + 1}</p>
                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-8 w-8"
                    onClick={() => onRemoveSaved(img)}
                    disabled={!!removingPath}
                    aria-label="Remove saved image"
                  >
                    {removingPath === img ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
              <ProofImage
                path={img}
                alt={`${label} ${idx + 1}`}
                label={`${label} proof ${idx + 1}`}
                thumbnailClassName="max-h-56"
              />
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-primary">Ready to upload on submit — tap to preview</p>
          {files.map((file, idx) => (
            <div key={`pending-${file.name}-${idx}`} className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-foreground truncate">{file.name}</span>
                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => onFilesChange(files.filter((_, i) => i !== idx))}
                    aria-label="Remove pending image"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <PendingProofPreview
                url={previewUrls[idx] || ""}
                alt={`Pending ${label} ${idx + 1}`}
                label={`${label} proof ${idx + 1} (pending)`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
