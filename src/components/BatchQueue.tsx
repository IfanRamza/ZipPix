import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useBatchStore } from "@/store/batchStore";
import { useImageStore } from "@/store/imageStore";
import type { BatchItem } from "@/types";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  FileImage,
  Loader2,
  Trash2,
} from "lucide-react";
import { memo, useEffect, useState } from "react";

interface BatchQueueItemProps {
  item: BatchItem;
  onRemove: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDimensionsLoad: (id: string, width: number, height: number) => void;
  disabled?: boolean;
  outputFormat: string;
}

// Get format string from file type
function getFormatLabel(type: string): string {
  const formats: Record<string, string> = {
    "image/jpeg": "JPG",
    "image/png": "PNG",
    "image/webp": "WebP",
    "image/avif": "AVIF",
    "image/gif": "GIF",
  };
  return formats[type] || type.split("/")[1]?.toUpperCase() || "IMG";
}

// Get output format label
function getOutputFormatLabel(format: string): string {
  const formats: Record<string, string> = {
    jpeg: "JPG",
    png: "PNG",
    webp: "WebP",
    avif: "AVIF",
  };
  return formats[format] || format.toUpperCase();
}

const BatchQueueItem = memo(function BatchQueueItem({
  item,
  onRemove,
  onRename,
  onDimensionsLoad,
  disabled,
  outputFormat,
}: BatchQueueItemProps) {
  const [localDimensions, setLocalDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  // Load dimensions when item mounts
  useEffect(() => {
    if (!item.width || !item.height) {
      const img = new Image();
      img.onload = () => {
        setLocalDimensions({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
        onDimensionsLoad(item.id, img.naturalWidth, img.naturalHeight);
      };
      img.src = item.previewUrl;
    } else {
      setLocalDimensions({ width: item.width, height: item.height });
    }
  }, [item.id, item.previewUrl, item.width, item.height, onDimensionsLoad]);

  const statusIcon = {
    queued: <FileImage className="w-4 h-4 text-muted-foreground" />,
    processing: <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />,
    complete: <CheckCircle className="w-4 h-4 text-green-400" />,
    error: <AlertCircle className="w-4 h-4 text-red-400" />,
  };

  const inputFormat = getFormatLabel(item.file.type);
  const outputFormatLabel = getOutputFormatLabel(outputFormat);
  const dimensions =
    localDimensions ||
    (item.width && item.height
      ? { width: item.width, height: item.height }
      : null);

  // Build status text based on status
  const getStatusText = () => {
    switch (item.status) {
      case "queued":
        return "Queued";
      case "processing":
        return `${item.progress}%`;
      case "complete":
        return `${((item.compressedSize || 0) / 1024).toFixed(1)} KB`;
      case "error":
        return item.error || "Error";
      default:
        return "";
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-background/40 rounded border border-border/50">
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded overflow-hidden shrink-0 bg-muted">
        <img
          src={item.previewUrl}
          alt={item.file.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1">
        <Input
          value={item.outputFilename}
          onChange={(e) => onRename(item.id, e.target.value)}
          disabled={disabled || item.status === "processing"}
          className="h-7 text-sm font-mono bg-transparent border-transparent hover:border-border focus:border-cyan-500"
        />
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          {statusIcon[item.status]}
          <span>{getStatusText()}</span>
          <span className="text-muted-foreground/50">•</span>

          {/* Format conversion display */}
          {item.status === "complete" ? (
            <span className="flex items-center gap-1 text-green-400">
              {inputFormat} <ArrowRight className="w-3 h-3" />{" "}
              {outputFormatLabel}
            </span>
          ) : (
            <span className="text-muted-foreground/70">{inputFormat}</span>
          )}

          {dimensions && (
            <>
              <span className="text-muted-foreground/50">•</span>
              <span className="text-muted-foreground/70">
                {dimensions.width}×{dimensions.height}
              </span>
            </>
          )}
          <span className="text-muted-foreground/50">•</span>
          <span className="text-muted-foreground/70">
            {(item.file.size / 1024).toFixed(0)} KB
          </span>
        </div>
      </div>

      {/* Progress Bar (for processing) */}
      {item.status === "processing" && (
        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-500 transition-all duration-300"
            style={{ width: `${item.progress}%` }}
          />
        </div>
      )}

      {/* Remove Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(item.id)}
        disabled={disabled || item.status === "processing"}
        className="h-8 w-8 text-muted-foreground hover:text-red-400 cursor-pointer"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
});

export function BatchQueue() {
  const {
    items,
    isProcessing,
    removeItem,
    updateItemFilename,
    updateItemDimensions,
    clearAll,
  } = useBatchStore();
  const { settings } = useImageStore();

  if (items.length === 0) {
    return (
      <Card className="bg-background/40 border-border/50 p-8 text-center">
        <p className="text-muted-foreground">No images in queue</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Upload images to get started
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Queue ({items.length} image{items.length !== 1 ? "s" : ""})
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          disabled={isProcessing}
          className="text-xs text-muted-foreground hover:text-red-400 cursor-pointer"
        >
          Clear All
        </Button>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
        {items.map((item) => (
          <BatchQueueItem
            key={item.id}
            item={item}
            onRemove={removeItem}
            onRename={updateItemFilename}
            onDimensionsLoad={updateItemDimensions}
            disabled={isProcessing}
            outputFormat={settings.format}
          />
        ))}
      </div>
    </div>
  );
}
