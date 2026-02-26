import { Button } from '@/components/ui/button';
import { Download, Eraser, Loader2 } from 'lucide-react';

interface ActionButtonsProps {
  onDownload: () => void;
  isProcessing?: boolean;
  isRemovingBackground?: boolean;
  canDownload?: boolean;
}

export function ActionButtons({
  onDownload,
  isProcessing = false,
  isRemovingBackground = false,
  canDownload = true,
}: ActionButtonsProps) {
  const isDisabled = isProcessing || isRemovingBackground || !canDownload;

  return (
    <Button
      size='lg'
      onClick={onDownload}
      disabled={isDisabled}
      className='w-full cursor-pointer rounded-sm bg-linear-to-r from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/25 hover:opacity-90'
    >
      {isRemovingBackground ? (
        <>
          <Eraser className='mr-2 h-4 w-4 animate-pulse' />
          Removing Background...
        </>
      ) : isProcessing ? (
        <>
          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          Compressing...
        </>
      ) : (
        <>
          <Download className='mr-2 h-4 w-4' />
          Download
        </>
      )}
    </Button>
  );
}
