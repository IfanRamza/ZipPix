import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  className?: string;
  size?: number;
}

export function LoadingSpinner({ className, size = 24 }: LoadingSpinnerProps) {
  return <Loader2 className={cn('animate-spin text-cyan-400', className)} size={size} />;
}

interface PageLoadingProps {
  message?: string;
}

export function PageLoading({ message = 'Loading...' }: PageLoadingProps) {
  return (
    <div className='animate-in fade-in flex min-h-[50vh] flex-col items-center justify-center gap-4 duration-300'>
      <LoadingSpinner size={48} />
      <p className='text-muted-foreground text-sm font-medium'>{message}</p>
    </div>
  );
}
