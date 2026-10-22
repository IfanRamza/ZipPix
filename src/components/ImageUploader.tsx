import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { validateFileSignature } from '@/lib/security';
import { cn, validateFileType } from '@/lib/utils';
import { AlertCircle, ImageUp } from 'lucide-react';
import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from 'react';

interface ImageUploaderProps {
  onUpload: (file: File) => void | Promise<void>;
  maxSize?: number; // in bytes
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,image/avif,image/gif';

export function ImageUploader({ onUpload, maxSize = MAX_FILE_SIZE }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);

      // Cheap checks first, before reading any bytes
      if (!validateFileType(file)) {
        setError('Unsupported format. Use JPEG, PNG, WebP, AVIF or GIF.');
        return;
      }
      if (file.size > maxSize) {
        setError(`File is larger than ${Math.round(maxSize / 1024 / 1024)} MB.`);
        return;
      }

      setIsVerifying(true);
      try {
        // Security: verify magic bytes so a renamed file can't masquerade as an image
        if (!(await validateFileSignature(file))) {
          setError("This file's contents don't match an image format.");
          return;
        }
        await onUpload(file);
      } catch (e) {
        console.warn('Upload failed', e);
        setError('This image could not be opened. It may be corrupted or empty.');
      } finally {
        setIsVerifying(false);
      }
    },
    [maxSize, onUpload],
  );

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isVerifying) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!isVerifying && file) processFile(file);
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const openPicker = () => !isVerifying && fileInputRef.current?.click();

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={openPicker}
      className={cn(
        'group bg-card shadow-card relative cursor-pointer rounded-[28px] p-2 transition-all duration-300',
        isDragging && 'ring-primary scale-[1.01] ring-4',
        isVerifying && 'cursor-wait',
      )}
    >
      <input
        type='file'
        ref={fileInputRef}
        className='hidden'
        accept={ACCEPTED_TYPES}
        onChange={handleFileSelect}
        disabled={isVerifying}
        aria-label='Choose an image'
      />

      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-[22px] border-2 border-dashed px-6 py-14 text-center transition-colors sm:py-20',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-hairline group-hover:border-primary/40',
        )}
      >
        <div
          className={cn(
            'mb-6 flex size-16 items-center justify-center rounded-2xl transition-all duration-300',
            isDragging
              ? 'bg-primary scale-110 text-white'
              : 'bg-brand text-white shadow-lg shadow-fuchsia-500/20 group-hover:scale-105',
          )}
        >
          {isVerifying ? <LoadingSpinner size={28} /> : <ImageUp className='size-8' />}
        </div>

        <h2 className='text-[24px] font-semibold tracking-tight'>
          {isVerifying ? 'Opening…' : isDragging ? 'Drop to start' : 'Drop your image here'}
        </h2>
        <p className='text-muted-foreground mt-1 mb-7 text-[15px]'>
          JPEG, PNG, WebP, AVIF or GIF — up to {Math.round(maxSize / 1024 / 1024)} MB
        </p>

        <Button
          size='lg'
          onClick={(e) => {
            e.stopPropagation();
            openPicker();
          }}
          disabled={isVerifying}
          className='min-w-44'
        >
          Select Image
        </Button>

        {error && (
          <div
            role='alert'
            className='bg-destructive/10 text-destructive motion-safe:animate-in motion-safe:fade-in mt-6 flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium'
          >
            <AlertCircle className='size-4' />
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
