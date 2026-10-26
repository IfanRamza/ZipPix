import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

/** Keyboard shortcut chip */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'bg-secondary text-foreground rounded-md px-1.5 py-0.5 font-sans text-[12px] font-medium',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
