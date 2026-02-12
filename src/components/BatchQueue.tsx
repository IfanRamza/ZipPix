import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useBatchStore } from '@/store/batchStore';
import { useImageStore } from '@/store/imageStore';
import type { BatchItem } from '@/types';
import { AlertCircle, ArrowRight, CheckCircle, FileImage, Loader2, Trash2 } from 'lucide-react';
import { memo, useEffect, useState } from 'react';

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
    'image/jpeg': 'JPG',
    'image/png': 'PNG',
    'image/webp': 'WebP',
    'image/avif': 'AVIF',
    'image/gif': 'GIF',
  };
  return formats[type] || type.split('/')[1]?.toUpperCase() || 'IMG';
}

// Get output format label
function getOutputFormatLabel(format: string): string {
  const formats: Record<string, string> = {
    jpeg: 'JPG',
    png: 'PNG',
    webp: 'WebP',
    avif: 'AVIF',
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
  } | null>(item.width && item.height ? { width: item.width, height: item.height } : null);

  // Load dimensions asynchronously when not available from props
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
    }
  }, [item.id, item.previewUrl, item.width, item.height, onDimensionsLoad]);

  const statusIcon = {
    queued: <FileImage className='text-muted-foreground h-4 w-4' />,
    processing: <Loader2 className='h-4 w-4 animate-spin text-cyan-400' />,
    complete: <CheckCircle className='h-4 w-4 text-green-400' />,
    error: <AlertCircle className='h-4 w-4 text-red-400' />,
  };

  const inputFormat = getFormatLabel(item.file.type);
  const outputFormatLabel = getOutputFormatLabel(outputFormat);
  const dimensions =
    localDimensions ||
    (item.width && item.height ? { width: item.width, height: item.height } : null);

  // Build status text based on status
  const getStatusText = () => {
    switch (item.status) {
      case 'queued':
        return 'Queued';
      case 'processing':
        return `${item.progress}%`;
      case 'complete':
        return `${((item.compressedSize || 0) / 1024).toFixed(1)} KB`;
      case 'error':
        return item.error || 'Error';
      default:
        return '';
    }
  };

  return (
    <div className='bg-background/40 border-border/50 flex items-center gap-3 rounded border p-3'>
      {/* Thumbnail */}
      <div className='bg-muted h-12 w-12 shrink-0 overflow-hidden rounded'>
        <img src={item.previewUrl} alt={item.file.name} className='h-full w-full object-cover' />
      </div>

      {/* Info */}
      <div className='min-w-0 flex-1 space-y-1'>
        <Input
          value={item.outputFilename}
          onChange={(e) => onRename(item.id, e.target.value)}
          disabled={disabled || item.status === 'processing'}
          className='hover:border-border h-7 border-transparent bg-transparent font-mono text-sm focus:border-cyan-500'
        />
        <div className='text-muted-foreground flex flex-wrap items-center gap-2 text-xs'>
          {statusIcon[item.status]}
          <span>{getStatusText()}</span>
          <span className='text-muted-foreground/50'>•</span>

          {/* Format conversion display */}
          {item.status === 'complete' ? (
            <span className='flex items-center gap-1 text-green-400'>
              {inputFormat} <ArrowRight className='h-3 w-3' /> {outputFormatLabel}
            </span>
          ) : (
            <span className='text-muted-foreground/70'>{inputFormat}</span>
          )}

          {dimensions && (
            <>
              <span className='text-muted-foreground/50'>•</span>
              <span className='text-muted-foreground/70'>
                {dimensions.width}×{dimensions.height}
              </span>
            </>
          )}
          <span className='text-muted-foreground/50'>•</span>
          <span className='text-muted-foreground/70'>{(item.file.size / 1024).toFixed(0)} KB</span>
        </div>
      </div>

      {/* Progress Bar (for processing) */}
      {item.status === 'processing' && (
        <div className='bg-muted h-1.5 w-16 overflow-hidden rounded-full'>
          <div
            className='h-full bg-cyan-500 transition-all duration-300'
            style={{ width: `${item.progress}%` }}
          />
        </div>
      )}

      {/* Remove Button */}
      <Button
        variant='ghost'
        size='icon'
        onClick={() => onRemove(item.id)}
        disabled={disabled || item.status === 'processing'}
        className='text-muted-foreground h-8 w-8 cursor-pointer hover:text-red-400'
      >
        <Trash2 className='h-4 w-4' />
      </Button>
    </div>
  );
});

export function BatchQueue() {
  const { items, isProcessing, removeItem, updateItemFilename, updateItemDimensions, clearAll } =
    useBatchStore();
  const { settings } = useImageStore();

  if (items.length === 0) {
    return (
      <Card className='bg-background/40 border-border/50 p-8 text-center'>
        <p className='text-muted-foreground'>No images in queue</p>
        <p className='text-muted-foreground/70 mt-1 text-sm'>Upload images to get started</p>
      </Card>
    );
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h3 className='text-sm font-medium'>
          Queue ({items.length} image{items.length !== 1 ? 's' : ''})
        </h3>
        <Button
          variant='ghost'
          size='sm'
          onClick={clearAll}
          disabled={isProcessing}
          className='text-muted-foreground cursor-pointer text-xs hover:text-red-400'
        >
          Clear All
        </Button>
      </div>

      <div className='max-h-[400px] space-y-2 overflow-y-auto pr-2'>
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
