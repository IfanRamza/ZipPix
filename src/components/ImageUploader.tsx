import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn, validateFileType } from '@/lib/utils';
import { AlertCircle, Upload } from 'lucide-react';
import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from 'react';

interface ImageUploaderProps {
  onUpload: (file: File) => void;
  maxSize?: number; // in bytes
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function ImageUploader({ onUpload, maxSize = MAX_FILE_SIZE }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setIsVerifying(true);

      // Validate type
      if (!validateFileType(file)) {
        setError('Unsupported file format. Please use JPEG, PNG, WebP, AVIF, or GIF.');
        setIsVerifying(false);
        return;
      }

      // Security: Validate Magic Bytes
      try {
        const { validateFileSignature } = await import('@/lib/security');
        const isValidSignature = await validateFileSignature(file);

        if (!isValidSignature) {
          setError(
            'Security Alert: File content does not match its extension. Please allow valid image files only.',
          );
          setIsVerifying(false);
          return;
        }
      } catch (e) {
        // Reject files that fail validation (e.g., 0 byte, corrupted)
        console.warn('Signature validation failed', e);
        setError('File validation failed. The file may be corrupted or empty.');
        setIsVerifying(false);
        return;
      }

      // Validate size
      if (file.size > maxSize) {
        setError(`File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit.`);
        setIsVerifying(false);
        return;
      }

      setIsVerifying(false);
      onUpload(file);
    },
    [maxSize, onUpload],
  );

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isVerifying) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (isVerifying) return;

    if (e.dataTransfer.files?.[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      processFile(e.target.files[0]);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className='animate-in fade-in mx-auto w-full max-w-2xl duration-500'>
      <Card
        className={cn(
          'bg-background/40 cursor-pointer rounded border-2 border-dashed backdrop-blur-xl transition-all duration-300',
          isDragging
            ? 'scale-[1.02] border-cyan-500 bg-cyan-500/5'
            : 'border-border/50 hover:border-cyan-500/50',
          error && 'border-red-500/50',
          isVerifying && 'cursor-wait opacity-80',
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isVerifying && fileInputRef.current?.click()}
      >
        <CardContent className='flex flex-col items-center justify-center px-4 py-16'>
          <input
            type='file'
            ref={fileInputRef}
            className='hidden'
            accept='image/jpeg,image/png,image/webp,image/avif,image/gif'
            onChange={handleFileSelect}
            disabled={isVerifying}
          />

          <div
            className={cn(
              'mb-6 flex h-20 w-20 items-center justify-center rounded-full transition-colors',
              isDragging ? 'bg-cyan-500/20' : 'bg-linear-to-br from-cyan-500/10 to-blue-500/10',
            )}
          >
            {isVerifying ? (
              <LoadingSpinner size={40} className='text-cyan-400' />
            ) : (
              <Upload
                className={cn(
                  'h-10 w-10 transition-all',
                  isDragging ? 'scale-110 text-cyan-400' : 'text-cyan-500/80',
                )}
              />
            )}
          </div>

          <h3 className='mb-2 text-xl font-semibold'>
            {isVerifying ? 'Verifying file...' : isDragging ? 'Drop it!' : 'Drop your image here'}
          </h3>
          <p className='text-muted-foreground mb-8 text-center'>
            {isVerifying ? 'Checking magic bytes & details' : 'or click to browse'}
          </p>

          <Button
            size='lg'
            onClick={(e) => {
              e.stopPropagation();
              if (isVerifying) return;
              fileInputRef.current?.click();
            }}
            disabled={isVerifying}
            className='min-w-[200px] cursor-pointer rounded-sm bg-linear-to-r from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/25 hover:opacity-90'
          >
            {isVerifying ? (
              <>
                <LoadingSpinner className='mr-2 text-white' size={16} />
                Verifying...
              </>
            ) : (
              'Select Image'
            )}
          </Button>

          {error && (
            <div className='animate-in fade-in mt-6 flex items-center gap-2 rounded-sm bg-red-500/10 px-4 py-2 text-red-400'>
              <AlertCircle className='h-4 w-4' />
              <span className='text-sm font-medium'>{error}</span>
            </div>
          )}

          <div className='text-muted-foreground mt-12 flex flex-wrap justify-center gap-2 text-xs'>
            {['JPEG', 'PNG', 'WebP', 'AVIF', 'GIF'].map((fmt) => (
              <Badge
                key={fmt}
                variant='outline'
                className='border-border/50 bg-background/50 rounded-sm'
              >
                {fmt}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
