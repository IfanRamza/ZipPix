import { BatchControls } from '@/components/BatchControls';
import { BatchQueue } from '@/components/BatchQueue';
import { BatchUploader } from '@/components/BatchUploader';
import { ControlPanel } from '@/components/ControlPanel';
import { Hero, PageShell } from '@/components/PageShell';
import { useBatchProcessor } from '@/hooks/useBatchProcessor';
import { useBatchStats, useBatchStore } from '@/store/batchStore';

export function BatchPage() {
  const settings = useBatchStore((s) => s.settings);
  const updateSettings = useBatchStore((s) => s.updateSettings);
  const resetSettings = useBatchStore((s) => s.resetSettings);
  const { total } = useBatchStats();
  const { start, isProcessing } = useBatchProcessor();

  if (total === 0) {
    return (
      <PageShell className='relative isolate pt-14 pb-20 sm:pt-20'>
        <div aria-hidden className='hero-glow absolute inset-x-0 top-0 -z-10 h-130' />
        <Hero
          title={
            <>
              Many images.
              <br />
              <span className='text-brand'>One ZIP.</span>
            </>
          }
          subtitle='Up to 20 images, same settings, processed in parallel.'
        />
        <div className='mx-auto mt-10 max-w-2xl'>
          <BatchUploader />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className='py-6 sm:py-10'>
      <div className='mb-6 flex flex-wrap items-end justify-between gap-4'>
        <h1 className='text-[28px] font-semibold tracking-tight sm:text-[34px]'>Batch</h1>
        <BatchUploader compact />
      </div>

      <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8'>
        <div className='min-w-0 space-y-6'>
          <BatchControls onStart={start} />
          <BatchQueue />
        </div>
        <aside className='lg:sticky lg:top-20 lg:self-start'>
          <fieldset disabled={isProcessing} className='disabled:opacity-60'>
            <legend className='sr-only'>Batch settings</legend>
            <ControlPanel
              settings={settings}
              onSettingsChange={updateSettings}
              onReset={resetSettings}
            />
          </fieldset>
        </aside>
      </div>
    </PageShell>
  );
}
