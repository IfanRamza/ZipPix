import { ACCEPTED_TYPES } from '@/components/ImageUploader';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { PASTE_SHORTCUT, usePasteImages } from '@/hooks/usePasteImages';
import { verifyImageFiles } from '@/lib/intake';
import { cn } from '@/lib/utils';
import { useBatchStats, useBatchStore } from '@/store/batchStore';
import { AlertTriangle, ImagePlus, Images } from 'lucide-react';
import { useRef, useState, type DragEvent } from 'react';

interface BatchUploaderProps {
  compact?: boolean;
}

export function BatchUploader({ compact = false }: BatchUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addItems = useBatchStore((s) => s.addItems);
  const { canAddMore, remainingSlots, maxSize } = useBatchStats();

  const showNotice = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(null), 5000);
  };

  const handleFiles = async (list: FileList | File[] | null) => {
    if (!list?.length) return;
    const { verified, invalid } = await verifyImageFiles(Array.from(list));

    const { added, rejected } = addItems(verified);
    const parts: string[] = [];
    if (invalid > 0) parts.push(`${invalid} unsupported or invalid`);
    if (rejected > 0) parts.push(`${rejected} over the ${maxSize}-image limit`);
    if (parts.length) showNotice(`Added ${added}. Skipped ${parts.join(', ')}.`);
  };

  usePasteImages((files) => {
    if (canAddMore) void handleFiles(files);
    else showNotice(`The batch is full (${maxSize} images).`);
  });

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (canAddMore) void handleFiles(e.dataTransfer.files);
  };

  const input = (
    <input
      type='file'
      ref={fileInputRef}
      className='hidden'
      accept={ACCEPTED_TYPES}
      multiple
      aria-label='Choose images'
      onChange={(e) => {
        handleFiles(e.target.files);
        e.target.value = '';
      }}
    />
  );

  const noticeEl = notice && (
    <p role='status' className='text-warning flex items-center gap-1.5 text-[13px]'>
      <AlertTriangle className='size-4 shrink-0' />
      {notice}
    </p>
  );

  if (compact) {
    return (
      <div className='flex flex-wrap items-center justify-end gap-3'>
        {input}
        {noticeEl}
        <Button
          variant='secondary'
          onClick={() => fileInputRef.current?.click()}
          disabled={!canAddMore}
        >
          <ImagePlus />
          Add Images
          <span className='text-muted-foreground tabular'>({remainingSlots} left)</span>
        </Button>
      </div>
    );
  }

  return (
    <div className='space-y-3'>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
        }}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'group bg-card shadow-card cursor-pointer rounded-[28px] p-2 transition-all duration-300',
          isDragging && 'ring-primary scale-[1.01] ring-4',
        )}
      >
        {input}
        <div
          className={cn(
            'flex flex-col items-center rounded-[22px] border-2 border-dashed px-6 py-14 text-center transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-hairline group-hover:border-primary/40',
          )}
        >
          <div className='bg-brand mb-5 flex size-16 items-center justify-center rounded-2xl text-white shadow-lg shadow-fuchsia-500/20 transition-transform group-hover:scale-105'>
            <Images className='size-8' />
          </div>
          <h2 className='text-[24px] font-semibold tracking-tight'>Drop up to {maxSize} images</h2>
          <p className='text-muted-foreground mt-1 mb-7 text-[15px]'>
            JPEG, PNG, WebP, AVIF or GIF · or paste with <Kbd>{PASTE_SHORTCUT}</Kbd>
          </p>
          <Button
            size='lg'
            className='min-w-44'
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            Select Images
          </Button>
        </div>
      </div>
      {noticeEl}
    </div>
  );
}
