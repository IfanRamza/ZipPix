import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { validateFileSignature } from '@/lib/security';
import { validateFileType } from '@/lib/utils';
import { useBatchStats, useBatchStore } from '@/store/batchStore';
import { AlertTriangle, ImagePlus, Upload, XCircle } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

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
    async (files: FileList | null) => {
      if (!files) return;

      // Validate MIME type + magic bytes for each file
      const fileArray = Array.from(files).filter((file) => validateFileType(file));

      if (fileArray.length === 0) return;

      // Verify magic bytes for security (prevents extension spoofing)
      const verifiedFiles: File[] = [];
      for (const file of fileArray) {
        try {
          const isValid = await validateFileSignature(file);
          if (isValid) {
            verifiedFiles.push(file);
          }
        } catch {
          // Reject files that fail validation
        }
      }

      const signatureRejected = fileArray.length - verifiedFiles.length;

      if (verifiedFiles.length === 0) {
        if (signatureRejected > 0) {
          setRejectedCount(signatureRejected);
          setShowRejectionWarning(true);
          setTimeout(() => setShowRejectionWarning(false), 4000);
        }
        return;
      }

      // If first upload and more than max, block entirely
      if (total === 0 && verifiedFiles.length > maxSize) {
        setBlockedCount(verifiedFiles.length);
        setShowBlockDialog(true);
        return;
      }

      // Check if trying to add more than allowed
      if (!canAddMore) {
        setRejectedCount(verifiedFiles.length);
        setShowRejectionWarning(true);
        setTimeout(() => setShowRejectionWarning(false), 4000);
        return;
      }

      const result = addItems(verifiedFiles);

      const totalRejected = result.rejected + signatureRejected;
      if (totalRejected > 0) {
        setRejectedCount(totalRejected);
        setShowRejectionWarning(true);
        setTimeout(() => setShowRejectionWarning(false), 4000);
      }
    },
    [addItems, canAddMore, total, maxSize],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
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
      <div className='flex items-center gap-2'>
        <input
          type='file'
          ref={fileInputRef}
          className='hidden'
          accept='image/*'
          multiple
          onChange={(e) => handleFiles(e.target.files)}
        />
        {showRejectionWarning && (
          <span className='flex items-center gap-1 text-xs text-amber-400'>
            <AlertTriangle className='h-3 w-3' />
            {rejectedCount} file{rejectedCount !== 1 ? 's' : ''} rejected (max {maxSize})
          </span>
        )}
        <Button
          variant='outline'
          size='sm'
          onClick={handleClick}
          disabled={!canAddMore}
          className='cursor-pointer'
        >
          <ImagePlus className='mr-2 h-4 w-4' />
          Add Images ({remainingSlots} left)
        </Button>

        {/* Block Dialog for compact mode */}
        <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2 text-red-400'>
                <XCircle className='h-5 w-5' />
                Too Many Images
              </DialogTitle>
              <DialogDescription className='text-base'>
                You tried to upload <strong>{blockedCount}</strong> images, but the maximum allowed
                is <strong>{maxSize}</strong>.
                <br />
                <br />
                Please select fewer images and try again.
              </DialogDescription>
            </DialogHeader>
            <Button onClick={() => setShowBlockDialog(false)} className='mt-2 cursor-pointer'>
              OK
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className='space-y-2'>
      <Card
        className={`relative cursor-pointer overflow-hidden border-2 border-dashed transition-all duration-300 ${
          isDragging
            ? 'scale-[1.02] border-cyan-400 bg-cyan-500/10'
            : 'border-border/50 bg-background/40 hover:border-cyan-500/50'
        } ${!canAddMore ? 'cursor-not-allowed opacity-50' : ''} `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          type='file'
          ref={fileInputRef}
          className='hidden'
          accept='image/*'
          multiple
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className='space-y-4 p-8 text-center'>
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full transition-all ${
              isDragging
                ? 'scale-110 bg-cyan-500/20 text-cyan-400'
                : 'bg-muted text-muted-foreground'
            } `}
          >
            <Upload className='h-8 w-8' />
          </div>

          <div>
            <p className='text-lg font-medium'>
              {total > 0
                ? `Add up to ${remainingSlots} more images`
                : `Drop up to ${maxSize} images here`}
            </p>
            <p className='text-muted-foreground mt-1 text-sm'>or click to browse</p>
          </div>

          <p className='text-muted-foreground text-xs'>Supports JPEG, PNG, WebP, AVIF</p>
        </div>
      </Card>

      {/* Rejection Warning */}
      {showRejectionWarning && (
        <div className='animate-in fade-in flex items-center gap-2 rounded border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-400 duration-200'>
          <AlertTriangle className='h-4 w-4' />
          <span>
            {rejectedCount} image{rejectedCount !== 1 ? 's' : ''} rejected. Maximum {maxSize} images
            allowed.
          </span>
        </div>
      )}

      {/* Block Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-red-400'>
              <XCircle className='h-5 w-5' />
              Too Many Images
            </DialogTitle>
            <DialogDescription className='text-base'>
              You tried to upload <strong>{blockedCount}</strong> images, but the maximum allowed is{' '}
              <strong>{maxSize}</strong>.
              <br />
              <br />
              Please select fewer images and try again.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setShowBlockDialog(false)} className='mt-2 cursor-pointer'>
            OK
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
