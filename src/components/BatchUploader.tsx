import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBatchStats, useBatchStore } from "@/store/batchStore";
import { AlertTriangle, ImagePlus, Upload, XCircle } from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface BatchUploaderProps {
  compact?: boolean;
}

export function BatchUploader({ compact = false }: BatchUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [showRejectionWarning, setShowRejectionWarning] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blockedCount, setBlockedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addItems } = useBatchStore();
  const { canAddMore, remainingSlots, total, maxSize } = useBatchStats();

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;

      const validFiles = Array.from(files).filter((file) =>
        file.type.startsWith("image/")
      );

      if (validFiles.length === 0) return;

      // If first upload and more than max, block entirely
      if (total === 0 && validFiles.length > maxSize) {
        setBlockedCount(validFiles.length);
        setShowBlockDialog(true);
        return;
      }

      // Check if trying to add more than allowed
      if (!canAddMore) {
        setRejectedCount(validFiles.length);
        setShowRejectionWarning(true);
        setTimeout(() => setShowRejectionWarning(false), 4000);
        return;
      }

      const result = addItems(validFiles);

      if (result.rejected > 0) {
        setRejectedCount(result.rejected);
        setShowRejectionWarning(true);
        setTimeout(() => setShowRejectionWarning(false), 4000);
      }
    },
    [addItems, canAddMore, total, maxSize]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    if (canAddMore) {
      fileInputRef.current?.click();
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
        />
        {showRejectionWarning && (
          <span className="text-xs text-amber-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {rejectedCount} file{rejectedCount !== 1 ? "s" : ""} rejected (max{" "}
            {maxSize})
          </span>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={!canAddMore}
          className="cursor-pointer"
        >
          <ImagePlus className="w-4 h-4 mr-2" />
          Add Images ({remainingSlots} left)
        </Button>

        {/* Block Dialog for compact mode */}
        <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-400">
                <XCircle className="w-5 h-5" />
                Too Many Images
              </DialogTitle>
              <DialogDescription className="text-base">
                You tried to upload <strong>{blockedCount}</strong> images, but
                the maximum allowed is <strong>{maxSize}</strong>.
                <br />
                <br />
                Please select fewer images and try again.
              </DialogDescription>
            </DialogHeader>
            <Button
              onClick={() => setShowBlockDialog(false)}
              className="mt-2 cursor-pointer"
            >
              OK
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Card
        className={`
          relative overflow-hidden border-2 border-dashed transition-all duration-300 cursor-pointer
          ${
            isDragging
              ? "border-cyan-400 bg-cyan-500/10 scale-[1.02]"
              : "border-border/50 bg-background/40 hover:border-cyan-500/50"
          }
          ${!canAddMore ? "opacity-50 cursor-not-allowed" : ""}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="p-8 text-center space-y-4">
          <div
            className={`
              mx-auto w-16 h-16 rounded-full flex items-center justify-center transition-all
              ${
                isDragging
                  ? "bg-cyan-500/20 text-cyan-400 scale-110"
                  : "bg-muted text-muted-foreground"
              }
            `}
          >
            <Upload className="w-8 h-8" />
          </div>

          <div>
            <p className="text-lg font-medium">
              {total > 0
                ? `Add up to ${remainingSlots} more images`
                : `Drop up to ${maxSize} images here`}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Supports JPEG, PNG, WebP, AVIF
          </p>
        </div>
      </Card>

      {/* Rejection Warning */}
      {showRejectionWarning && (
        <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded text-amber-400 text-sm animate-in fade-in duration-200">
          <AlertTriangle className="w-4 h-4" />
          <span>
            {rejectedCount} image{rejectedCount !== 1 ? "s" : ""} rejected.
            Maximum {maxSize} images allowed.
          </span>
        </div>
      )}

      {/* Block Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <XCircle className="w-5 h-5" />
              Too Many Images
            </DialogTitle>
            <DialogDescription className="text-base">
              You tried to upload <strong>{blockedCount}</strong> images, but
              the maximum allowed is <strong>{maxSize}</strong>.
              <br />
              <br />
              Please select fewer images and try again.
            </DialogDescription>
          </DialogHeader>
          <Button
            onClick={() => setShowBlockDialog(false)}
            className="mt-2 cursor-pointer"
          >
            OK
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
