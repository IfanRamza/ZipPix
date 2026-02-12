import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { calculateReduction, cn, formatBytes } from '@/lib/utils';
import { ArrowRight, Info, Shield, TrendingDown } from 'lucide-react';

interface StatsDisplayProps {
  originalSize: number;
  compressedSize: number;
  originalDimensions: { width: number; height: number };
  compressedDimensions?: { width: number; height: number };
  originalFormat?: string;
  compressedFormat?: string;
  isCompressing?: boolean;
  stripMetadata?: boolean;
}

// Format display helper
function formatTypeLabel(format: string): string {
  const labels: Record<string, string> = {
    'image/jpeg': 'JPEG',
    'image/png': 'PNG',
    'image/webp': 'WebP',
    'image/avif': 'AVIF',
    'image/gif': 'GIF',
    jpeg: 'JPEG',
    png: 'PNG',
    webp: 'WebP',
    avif: 'AVIF',
  };
  return labels[format] || format.toUpperCase();
}

export function StatsDisplay({
  originalSize,
  compressedSize,
  originalDimensions,
  compressedDimensions,
  originalFormat,
  compressedFormat,
  isCompressing = false,
  stripMetadata = true,
}: StatsDisplayProps) {
  const reduction = calculateReduction(originalSize, compressedSize);
  const isReduction = reduction > 0;

  return (
    <Card className='border-border/50 from-background/60 to-background/40 animate-in fade-in rounded bg-linear-to-br backdrop-blur-xl duration-300'>
      <CardContent className='pt-6'>
        <div className='relative grid grid-cols-2 gap-6'>
          {/* Divider Arrow */}
          <div className='text-muted-foreground/20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'>
            <ArrowRight className='h-6 w-6' />
          </div>

          {/* Original */}
          <div className='space-y-1'>
            <div className='flex items-center gap-2'>
              <p className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
                Original
              </p>
              {originalFormat && (
                <Badge
                  variant='outline'
                  className='bg-background/50 h-4 rounded-sm px-1.5 text-[10px]'
                >
                  {formatTypeLabel(originalFormat)}
                </Badge>
              )}
            </div>
            <p className='text-2xl font-bold tracking-tight'>{formatBytes(originalSize)}</p>
            <p className='text-muted-foreground font-mono text-xs'>
              {originalDimensions.width} × {originalDimensions.height}
            </p>
          </div>

          {/* Compressed */}
          <div className='space-y-1 text-right'>
            <div className='flex items-center justify-end gap-2'>
              <p className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
                Compressed
              </p>
              {compressedFormat && (
                <Badge
                  variant='outline'
                  className='h-4 rounded-sm border-cyan-500/20 bg-cyan-500/10 px-1.5 text-[10px] text-cyan-400'
                >
                  {formatTypeLabel(compressedFormat)}
                </Badge>
              )}
            </div>
            <p className='bg-linear-to-r from-cyan-400 to-blue-500 bg-clip-text text-2xl font-bold tracking-tight text-transparent'>
              {isCompressing ? '...' : formatBytes(compressedSize)}
            </p>
            <p className='text-muted-foreground font-mono text-xs'>
              {compressedDimensions
                ? `${compressedDimensions.width} × ${compressedDimensions.height}`
                : `${originalDimensions.width} × ${originalDimensions.height}`}
            </p>
          </div>
        </div>

        <Separator className='bg-border/50 my-4' />

        {/* Reduction Stats */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <TrendingDown
              className={cn('h-4 w-4', isReduction ? 'text-green-400' : 'text-red-400')}
            />
            <span className='text-sm font-medium'>Size Reduction</span>
          </div>
          <Badge
            variant='outline'
            className={cn(
              'rounded-sm border-none font-mono text-sm',
              isReduction
                ? 'bg-green-500/10 text-green-400 ring-1 ring-green-500/20'
                : 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20',
            )}
          >
            {isCompressing ? '...' : `${reduction.toFixed(1)}%`}
          </Badge>
        </div>

        {/* Privacy Indicator - Only show when stripMetadata is enabled */}
        {stripMetadata && (
          <div className='text-muted-foreground mt-4 flex items-center gap-2 rounded-sm border border-cyan-500/10 bg-cyan-500/5 p-2 text-xs'>
            <Shield className='h-3.5 w-3.5 text-cyan-400' />
            <span>Metadata removed & privacy protected</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className='hover:text-foreground h-3 w-3 transition-colors' />
                </TooltipTrigger>
                <TooltipContent side='right' className='max-w-xs text-xs'>
                  All sensitive metadata (GPS, EXIF, Creator info) has been automatically stripped.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
