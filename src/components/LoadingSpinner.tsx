import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  className?: string;
  size?: number;
}

/** Apple-style activity indicator (12 fading spokes) */
export function LoadingSpinner({ className, size = 20 }: LoadingSpinnerProps) {
  return (
    <svg
      viewBox='0 0 24 24'
      width={size}
      height={size}
      role='status'
      aria-label='Loading'
      className={cn('animate-spin text-current [animation-duration:900ms]', className)}
    >
      {Array.from({ length: 12 }, (_, i) => (
        <rect
          key={i}
          x='11'
          y='2'
          width='2'
          height='6'
          rx='1'
          fill='currentColor'
          opacity={0.15 + (i / 12) * 0.85}
          transform={`rotate(${i * 30} 12 12)`}
        />
      ))}
    </svg>
  );
}

export function PageLoading() {
  return (
    <div className='text-muted-foreground flex min-h-[60dvh] items-center justify-center'>
      <LoadingSpinner size={28} />
    </div>
  );
}
