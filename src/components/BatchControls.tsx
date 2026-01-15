import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useBatchStats, useBatchStore } from "@/store/batchStore";
import { useImageStore } from "@/store/imageStore";
import JSZip from "jszip";
import { Download, Loader2, Pause, Play } from "lucide-react";

interface BatchControlsProps {
  onStartProcessing: () => void;
  isProcessorBusy?: boolean;
}

export function BatchControls({
  onStartProcessing,
  isProcessorBusy = false,
}: BatchControlsProps) {
  const {
    isProcessing,
    isPaused,
    items,
    pauseProcessing,
    resumeProcessing,
    reset,
  } = useBatchStore();
  const { settings } = useImageStore();
  const stats = useBatchStats();

  const allComplete = stats.complete === stats.total && stats.total > 0;
  const hasErrors = stats.errors > 0;
  const canStart = stats.total > 0 && !isProcessing && !allComplete;
  const canDownload = stats.complete > 0;

  const handleDownloadZip = async () => {
    const zip = new JSZip();

    items.forEach((item) => {
      if (item.compressedBlob && item.status === "complete") {
        const filename = `${item.outputFilename}.${settings.format}`;
        zip.file(filename, item.compressedBlob);
      }
    });

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `zippix_batch_${Date.now()}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="bg-background/40 border-border/50">
      <CardContent className="p-4 space-y-4">
        {/* Progress Summary */}
        <div className="text-center">
          <div className="text-3xl font-bold text-cyan-400">
            {stats.complete}/{stats.total}
          </div>
          <div className="text-xs text-muted-foreground">Images Processed</div>
          {hasErrors && (
            <div className="text-xs text-red-400 mt-1">
              {stats.errors} error{stats.errors !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-cyan-500 to-blue-500 transition-all duration-300"
            style={{
              width: `${
                stats.total > 0 ? (stats.complete / stats.total) * 100 : 0
              }%`,
            }}
          />
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {!isProcessing && !allComplete && (
            <Button
              className="w-full bg-linear-to-r from-cyan-500 to-blue-500 hover:opacity-90 cursor-pointer"
              onClick={onStartProcessing}
              disabled={!canStart || isProcessorBusy}
            >
              <Play className="w-4 h-4 mr-2" />
              Start Processing
            </Button>
          )}

          {isProcessing && (
            <Button
              className="w-full cursor-pointer"
              variant={isPaused ? "default" : "outline"}
              onClick={isPaused ? resumeProcessing : pauseProcessing}
            >
              {isPaused ? (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </>
              )}
            </Button>
          )}

          {/* Download and Remove in same row */}
          {(canDownload || (stats.total > 0 && !isProcessing)) && (
            <div className="flex gap-2">
              {canDownload && (
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 cursor-pointer"
                  onClick={handleDownloadZip}
                  disabled={isProcessing && !isPaused}
                >
                  {isProcessorBusy && !isPaused ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Download ZIP
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
