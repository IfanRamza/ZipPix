import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { downloadFile } from '@/lib/image';
import { calculateReduction, formatBytes } from '@/lib/utils';
import { buildZip } from '@/lib/zip';
import { useBatchStats, useBatchStore } from '@/store/batchStore';
import { Download, Pause, Play } from 'lucide-react';
import { useState } from 'react';

interface BatchControlsProps {
  onStart: () => void;
}

export function BatchControls({ onStart }: BatchControlsProps) {
  const isProcessing = useBatchStore((s) => s.isProcessing);
  const isPaused = useBatchStore((s) => s.isPaused);
  const pauseProcessing = useBatchStore((s) => s.pauseProcessing);
  const resumeProcessing = useBatchStore((s) => s.resumeProcessing);
  const stats = useBatchStats();
  const [isZipping, setIsZipping] = useState(false);

  const done = stats.complete + stats.errors;
  const progress = stats.total ? (done / stats.total) * 100 : 0;
  const hasPending = stats.queued > 0 || stats.errors > 0;
  const saved = calculateReduction(stats.originalBytes, stats.compressedBytes);

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const entries = useBatchStore
        .getState()
        .items.filter((i) => i.status === 'complete' && i.compressedBlob)
        .map((i) => ({ name: i.outputFilename, blob: i.compressedBlob! }));
      downloadFile(await buildZip(entries), `zippix_${new Date().toISOString().slice(0, 10)}.zip`);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className='bg-card shadow-card space-y-5 rounded-3xl p-5'>
      <div className='flex items-end justify-between gap-4'>
        <div>
          <p className='text-muted-foreground text-[12px] font-medium'>Processed</p>
          <p className='tabular text-[34px] leading-tight font-semibold tracking-tight'>
            {stats.complete}
            <span className='text-muted-foreground'>/{stats.total}</span>
          </p>
        </div>
        {stats.complete > 0 && (
          <div className='text-right'>
            <p className='text-muted-foreground text-[12px] font-medium'>Saved</p>
            <p className='text-success tabular text-[22px] font-semibold tracking-tight'>
              {saved > 0 ? `−${saved.toFixed(0)}%` : '0%'}
            </p>
            <p className='text-muted-foreground tabular text-[12px]'>
              {formatBytes(stats.originalBytes, 1)} → {formatBytes(stats.compressedBytes, 1)}
            </p>
          </div>
        )}
      </div>

      <div
        role='progressbar'
        aria-label='Batch progress'
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        className='bg-secondary h-1.5 overflow-hidden rounded-full'
      >
        <div
          className='bg-primary h-full rounded-full transition-[width] duration-500 ease-out'
          style={{ width: `${progress}%` }}
        />
      </div>

      {stats.overTarget > 0 && (
        <p className='text-warning text-[13px]'>
          {stats.overTarget === 1 ? '1 image is' : `${stats.overTarget} images are`} still over the
          target size at the lowest quality. Reduce the size or try AVIF.
        </p>
      )}

      {stats.errors > 0 && !isProcessing && (
        <p className='text-destructive text-[13px]'>
          {stats.errors} failed — start again to retry.
        </p>
      )}

      <div className='flex flex-col gap-2'>
        {isProcessing ? (
          <Button
            size='lg'
            variant='secondary'
            onClick={isPaused ? resumeProcessing : pauseProcessing}
          >
            {isPaused ? <Play /> : <Pause />}
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
        ) : (
          hasPending && (
            <Button size='lg' onClick={onStart}>
              <Play />
              {stats.complete > 0 ? 'Process Remaining' : 'Start Processing'}
            </Button>
          )
        )}
        {stats.complete > 0 && (
          <Button
            size='lg'
            variant={hasPending || isProcessing ? 'secondary' : 'default'}
            onClick={handleDownloadZip}
            disabled={isZipping || (isProcessing && !isPaused)}
          >
            {isZipping ? <LoadingSpinner size={18} /> : <Download />}
            Download ZIP
          </Button>
        )}
      </div>
    </div>
  );
}
