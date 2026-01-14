import { Button } from "@/components/ui/button";
import { Download, Loader2, Trash2 } from "lucide-react";

interface ActionButtonsProps {
  onDownload: () => void;
  onRemove: () => void;
  isProcessing?: boolean;
  canDownload?: boolean;
}

export function ActionButtons({
  onDownload,
  onRemove,
  isProcessing = false,
  canDownload = true,
}: ActionButtonsProps) {
  return (
    <div className="flex gap-4 w-full">
      <Button
        variant="destructive"
        size="lg"
        onClick={onRemove}
        className="flex-1 rounded-sm shadow-sm"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Remove Image
      </Button>

      <Button
        size="lg"
        onClick={onDownload}
        disabled={isProcessing || !canDownload}
        className="flex-2 rounded-sm bg-linear-to-r from-cyan-500 to-blue-500 hover:opacity-90 shadow-lg shadow-cyan-500/25"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Compressing...
          </>
        ) : (
          <>
            <Download className="w-4 h-4 mr-2" />
            Download
          </>
        )}
      </Button>
    </div>
  );
}
