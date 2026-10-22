import { formatLabel } from '@/lib/formats';
import { calculateReduction, cn, formatBytes } from '@/lib/utils';
import type { ImageDimensions } from '@/types';
import { ArrowRight } from 'lucide-react';

interface StatsDisplayProps {
  originalSize: number;
  compressedSize?: number;
  originalDimensions: ImageDimensions;
  compressedDimensions?: ImageDimensions;
  originalFormat: string;
  compressedFormat?: string;
  isCompressing?: boolean;
}

export function StatsDisplay({
  originalSize,
  compressedSize,
  originalDimensions,
  compressedDimensions,
  originalFormat,
  compressedFormat,
  isCompressing = false,
}: StatsDisplayProps) {
  const ready = compressedSize !== undefined;
  const reduction = ready ? calculateReduction(originalSize, compressedSize) : 0;
  const smaller = reduction > 0;

  return (
    <div className='bg-card shadow-card grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-3xl p-5 sm:grid-cols-[1fr_auto_1fr_auto] sm:gap-6 sm:p-6'>
      <Stat
        label='Original'
        value={formatBytes(originalSize)}
        detail={`${formatLabel(originalFormat)} · ${originalDimensions.width}×${originalDimensions.height}`}
      />

      <ArrowRight className='text-muted-foreground/50 size-5' aria-hidden />

      <Stat
        label='Compressed'
        value={ready ? formatBytes(compressedSize) : '—'}
        detail={
          compressedDimensions && compressedFormat
            ? `${formatLabel(compressedFormat)} · ${compressedDimensions.width}×${compressedDimensions.height}`
            : 'Processing…'
        }
        dim={isCompressing}
      />

      <div
        aria-live='polite'
        className={cn(
          'col-span-3 flex items-baseline justify-center gap-1.5 rounded-2xl px-4 py-3 transition-opacity sm:col-span-1 sm:block sm:min-w-28 sm:text-right',
          smaller ? 'bg-success/10 text-success' : 'bg-secondary text-muted-foreground',
          isCompressing && 'opacity-50',
        )}
      >
        <p className='tabular text-[28px] leading-none font-semibold tracking-tight'>
          {ready ? `${smaller ? '−' : '+'}${formatReduction(reduction)}%` : '—'}
        </p>
        <p className='text-[12px] font-medium sm:mt-1'>{smaller ? 'smaller' : 'size change'}</p>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  detail,
  dim,
}: {
  label: string;
  value: string;
  detail: string;
  dim?: boolean;
}) {
  return (
    <div className={cn('min-w-0 transition-opacity', dim && 'opacity-50')}>
      <p className='text-muted-foreground text-[12px] font-medium'>{label}</p>
      <p className='tabular truncate text-[22px] font-semibold tracking-tight sm:text-[28px]'>
        {value}
      </p>
      <p className='text-muted-foreground tabular truncate text-[12px]'>{detail}</p>
    </div>
  );
}

/** Whole percent, but never round a real saving up to a misleading "100%" or down to "0%" */
function formatReduction(reduction: number): string {
  const abs = Math.abs(reduction);
  if (abs > 99 && abs < 100) return abs.toFixed(1).replace('100.0', '99.9');
  if (abs > 0 && abs < 1) return abs.toFixed(1);
  return abs.toFixed(0);
}
