import { useCallback, useRef, useState } from "react";
import { Camera, ImagePlus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ImageDropzoneProps = {
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
  multiple?: boolean;
  label?: string;
  className?: string;
  enableCamera?: boolean;
  helperText?: string;
};

export function ImageDropzone({
  files,
  onFilesChange,
  disabled = false,
  multiple = true,
  label = "Drop images here or tap to upload",
  className,
  enableCamera = true,
  helperText = "Photos are saved when you submit your daily report.",
}: ImageDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef(files);
  filesRef.current = files;
  const [dragOver, setDragOver] = useState(false);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const list = Array.from(incoming).filter((f) => f.type.startsWith("image/"));
      if (!list.length) return;
      const prev = filesRef.current;
      onFilesChange(multiple ? [...prev, ...list] : [list[0]]);
    },
    [multiple, onFilesChange],
  );

  const openPicker = useCallback(
    (mode: "gallery" | "camera") => {
      if (disabled) return;
      const input = fileInputRef.current;
      if (!input) return;

      input.value = "";

      if (mode === "camera") {
        input.setAttribute("capture", "environment");
      } else {
        input.removeAttribute("capture");
      }

      input.click();
    },
    [disabled],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    addFiles(e.dataTransfer.files);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Hidden input outside the clickable drop zone to avoid double-opens on mobile */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        disabled={disabled}
        onChange={(e) => {
          if (e.target.files?.length) {
            addFiles(e.target.files);
          }
          e.target.value = "";
        }}
      />

      <div
        role="presentation"
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-4 sm:p-6 text-center transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-border",
          disabled && "opacity-50",
        )}
      >
        <Upload className="h-7 w-7 sm:h-8 sm:w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">{label}</p>
        {helperText && (
          <p className="text-xs text-muted-foreground mt-2 max-w-sm mx-auto">{helperText}</p>
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3"
          disabled={disabled}
          onClick={() => openPicker("gallery")}
        >
          <ImagePlus className="h-4 w-4 mr-2 shrink-0" />
          Browse files
        </Button>
      </div>

      {enableCamera && (
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={disabled}
            onClick={() => openPicker("camera")}
          >
            <Camera className="h-4 w-4 mr-2 shrink-0" />
            Take photo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={disabled}
            onClick={() => openPicker("gallery")}
          >
            <ImagePlus className="h-4 w-4 mr-2 shrink-0" />
            Choose from device
          </Button>
        </div>
      )}

      {files.length > 0 && (
        <ul className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            Pending upload ({files.length}) — saved on report submit
          </p>
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center justify-between text-sm gap-2">
              <span className="truncate text-foreground">{f.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 h-8 w-8"
                disabled={disabled}
                onClick={() => onFilesChange(files.filter((_, idx) => idx !== i))}
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
