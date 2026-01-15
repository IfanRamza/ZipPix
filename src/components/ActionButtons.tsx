import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

interface ActionButtonsProps {
  onDownload: () => void;
  isProcessing?: boolean;
  canDownload?: boolean;
}

export function ActionButtons({
  onDownload,
  isProcessing = false,
  canDownload = true,
}: ActionButtonsProps) {
  return (
    <Button
      size="lg"
      onClick={onDownload}
      disabled={isProcessing || !canDownload}
      className="w-full rounded-sm cursor-pointer bg-gradient-to-r from-cyan-500 to-blue-500 hover:opacity-90 shadow-lg shadow-cyan-500/25"
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
  );
}
