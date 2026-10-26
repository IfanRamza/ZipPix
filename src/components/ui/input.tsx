import * as React from 'react';

import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot='input'
      className={cn(
        'bg-secondary placeholder:text-muted-foreground h-10 w-full min-w-0 rounded-xl px-3 text-[15px] transition-shadow outline-none disabled:pointer-events-none disabled:opacity-50',
        'focus-visible:ring-ring focus-visible:ring-4',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
