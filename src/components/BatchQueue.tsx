import { LoadingSpinner } from '@/components/LoadingSpinner';
import { formatLabel } from '@/lib/formats';
import { calculateReduction, cn, formatBytes } from '@/lib/utils';
import { useBatchStore } from '@/store/batchStore';
import type { BatchItem } from '@/types';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { memo } from 'react';
import { useShallow } from 'zustand/react/shallow';

interface BatchQueueItemProps {
  item: BatchItem;
  locked: boolean;
  onRemove: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

const BatchQueueItem = memo(function BatchQueueItem({
  item,
  locked,
  onRemove,
  onRename,
}: BatchQueueItemProps) {
  const reduction =
    item.status === 'complete' && item.compressedSize !== undefined
      ? calculateReduction(item.file.size, item.compressedSize)
      : null;

  return (
    <li className='flex items-center gap-3 px-4 py-3'>
      <div className='bg-secondary size-12 shrink-0 overflow-hidden rounded-xl'>
        {item.thumbnailUrl && (
          <img src={item.thumbnailUrl} alt='' className='size-full object-cover' decoding='async' />
        )}
      </div>

      <div className='min-w-0 flex-1'>
        <input
          value={item.outputFilename}
          onChange={(e) => onRename(item.id, e.target.value)}
          disabled={locked || item.status === 'processing'}
          aria-label={`Output name for ${item.file.name}`}
          spellCheck={false}
          className='focus-visible:bg-secondary -ml-1 w-full truncate rounded-md bg-transparent px-1 text-[15px] font-medium outline-none disabled:opacity-100'
        />
        <p className='text-muted-foreground tabular truncate text-[12px]'>
          {formatLabel(item.file.type)}
          {item.width && ` · ${item.width}×${item.height}`}
          {' · '}
          {formatBytes(item.file.size, 1)}
          {item.status === 'complete' && item.compressedSize !== undefined && (
            <>
              {' → '}
              <span className='text-foreground'>{formatBytes(item.compressedSize, 1)}</span>
            </>
          )}
          {item.status === 'error' && <span className='text-destructive'> · {item.error}</span>}
        </p>
      </div>

      <div className='flex shrink-0 items-center gap-2'>
        {item.status === 'processing' && (
          <LoadingSpinner size={18} className='text-muted-foreground' />
        )}
        {item.status === 'complete' && reduction !== null && (
          <span
            className={cn(
              'tabular flex items-center gap-1 text-[13px] font-semibold',
              reduction > 0 ? 'text-success' : 'text-muted-foreground',
            )}
          >
            <CheckCircle2 className='size-4' />
            {reduction > 0 ? `−${reduction.toFixed(0)}%` : 'Done'}
          </span>
        )}
        {item.status === 'error' && <AlertCircle className='text-destructive size-4' />}
        <button
          type='button'
          onClick={() => onRemove(item.id)}
          disabled={locked || item.status === 'processing'}
          aria-label={`Remove ${item.file.name}`}
          className='text-muted-foreground hover:bg-secondary hover:text-foreground flex size-7 items-center justify-center rounded-full transition-colors disabled:opacity-30'
        >
          <X className='size-4' />
        </button>
      </div>
    </li>
  );
});

export function BatchQueue() {
  const { items, isProcessing, removeItem, updateItemFilename, clearAll } = useBatchStore(
    useShallow((s) => ({
      items: s.items,
      isProcessing: s.isProcessing,
      removeItem: s.removeItem,
      updateItemFilename: s.updateItemFilename,
      clearAll: s.clearAll,
    })),
  );

  return (
    <section className='space-y-2'>
      <div className='flex items-center justify-between px-4'>
        <h2 className='text-muted-foreground text-[13px] tracking-wide uppercase'>
          Queue · {items.length}
        </h2>
        <button
          type='button'
          onClick={clearAll}
          disabled={isProcessing}
          className='text-link text-[13px] hover:underline disabled:opacity-40'
        >
          Clear All
        </button>
      </div>
      <ul className='bg-card shadow-card divide-hairline max-h-[560px] divide-y overflow-y-auto rounded-2xl'>
        {items.map((item) => (
          <BatchQueueItem
            key={item.id}
            item={item}
            locked={isProcessing}
            onRemove={removeItem}
            onRename={updateItemFilename}
          />
        ))}
      </ul>
    </section>
  );
}
