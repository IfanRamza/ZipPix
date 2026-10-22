import { cn } from '@/lib/utils';
import { Layers, ShieldCheck, Sparkles, Zap } from 'lucide-react';

// Each feature owns one hue so the grid reads at a glance; white glyphs keep it simple
const FEATURES = [
  {
    icon: ShieldCheck,
    tint: 'from-[#10b981] to-[#059669]',
    title: 'Private',
    body: 'Runs on your device. Metadata is stripped.',
  },
  {
    icon: Zap,
    tint: 'from-[#f59e0b] to-[#ea580c]',
    title: 'Fast',
    body: 'Off the main thread, in parallel.',
  },
  {
    icon: Sparkles,
    tint: 'from-[#d946ef] to-[#9333ea]',
    title: 'AI cutout',
    body: 'Remove backgrounds in one tap.',
  },
  {
    icon: Layers,
    tint: 'from-[#6366f1] to-[#2563eb]',
    title: 'Batch',
    body: 'Up to 20 images, one ZIP.',
  },
];

export function FeatureGrid({ className }: { className?: string }) {
  return (
    <section
      aria-label='Features'
      className={cn('grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4', className)}
    >
      {FEATURES.map(({ icon: Icon, tint, title, body }) => (
        <div key={title} className='bg-card shadow-card rounded-3xl p-5'>
          <div
            className={cn(
              'mb-4 inline-flex size-10 items-center justify-center rounded-xl bg-linear-to-br text-white shadow-sm',
              tint,
            )}
          >
            <Icon className='size-5' />
          </div>
          <h2 className='text-[17px] font-semibold tracking-tight'>{title}</h2>
          <p className='text-muted-foreground mt-1 text-[14px] leading-snug'>{body}</p>
        </div>
      ))}
    </section>
  );
}
