import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className='flex min-h-dvh flex-col'>
      <Navbar />
      <main className={cn('mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6', className)}>
        {children}
      </main>
      <Footer />
    </div>
  );
}

export function Hero({
  eyebrow,
  title,
  subtitle,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 space-y-4 text-center duration-700',
        className,
      )}
    >
      {eyebrow && <p className='text-brand text-[17px] font-semibold'>{eyebrow}</p>}
      <h1 className='text-[40px] leading-[1.05] font-semibold tracking-[-0.025em] text-balance sm:text-[56px] lg:text-[64px]'>
        {title}
      </h1>
      {subtitle && (
        <p className='text-muted-foreground mx-auto max-w-xl text-[19px] leading-snug text-balance sm:text-[21px]'>
          {subtitle}
        </p>
      )}
    </div>
  );
}
