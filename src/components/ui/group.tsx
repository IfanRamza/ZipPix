import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

/** iOS Settings-style inset grouped section */
export function Group({
  title,
  footer,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  footer?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-2', className)}>
      {(title || action) && (
        <div className='flex items-center justify-between px-4'>
          {title && (
            <h3 className='text-muted-foreground text-[13px] font-normal tracking-wide uppercase'>
              {title}
            </h3>
          )}
          {action}
        </div>
      )}
      <div className='bg-card shadow-card divide-hairline divide-y overflow-hidden rounded-2xl'>
        {children}
      </div>
      {footer && <p className='text-muted-foreground px-4 text-[13px] leading-snug'>{footer}</p>}
    </section>
  );
}

export function GroupRow({
  label,
  children,
  className,
  htmlFor,
}: {
  label?: ReactNode;
  children?: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cn('flex min-h-11 items-center justify-between gap-3 px-4 py-2.5', className)}>
      {label &&
        (htmlFor ? (
          <label htmlFor={htmlFor} className='text-[15px]'>
            {label}
          </label>
        ) : (
          <span className='text-[15px]'>{label}</span>
        ))}
      {children}
    </div>
  );
}
