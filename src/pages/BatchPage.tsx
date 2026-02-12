import { BatchControls } from '@/components/BatchControls';
import { BatchQueue } from '@/components/BatchQueue';
import { BatchUploader } from '@/components/BatchUploader';
import { ControlPanel } from '@/components/ControlPanel';
import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { useBatchProcessor } from '@/hooks/useBatchProcessor';
import { useBatchStats } from '@/store/batchStore';
import { useImageStore } from '@/store/imageStore';
import { useEffect } from 'react';

export function BatchPage() {
  const { settings, updateSettings } = useImageStore();
  const stats = useBatchStats();
  const { start, isProcessing: isProcessorBusy } = useBatchProcessor();

  // Set default resize to 100% on mount
  useEffect(() => {
    // Only set if not already set
    if (!settings.width || !settings.height) {
      updateSettings({ width: undefined, height: undefined });
    }
  }, []);

  const handleResetSettings = () => {
    updateSettings({
      format: 'webp',
      quality: 85,
      maintainAspectRatio: true,
      stripMetadata: true,
      effort: 4,
      progressive: true,
      chromaSubsampling: '4:2:0',
      width: undefined,
      height: undefined,
    });
  };

  // Default dimensions for the control panel (since we don't have a single image)
  const defaultDimensions = { width: 1920, height: 1080 };

  return (
    <div className='flex min-h-screen flex-col bg-linear-to-br from-[#0a0f14] via-[#12171d] to-[#0a0f14]'>
      <Navbar />

      <main className='container mx-auto flex-1 px-4 py-8'>
        <div className='mx-auto max-w-6xl space-y-8'>
          {/* Header */}
          <div className='space-y-4 text-center'>
            <h1 className='bg-linear-to-r from-white to-white/60 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent md:text-4xl'>
              Batch Processing
            </h1>
            <p className='text-muted-foreground mx-auto max-w-lg'>
              Compress up to 20 images at once with shared settings. Download all as a single ZIP
              file.
            </p>
          </div>

          {/* Upload Area */}
          {stats.total === 0 ? (
            <BatchUploader />
          ) : (
            <div className='flex items-center justify-between'>
              <p className='text-muted-foreground text-sm'>
                {stats.total} image{stats.total !== 1 ? 's' : ''} in queue
              </p>
              <BatchUploader compact />
            </div>
          )}

          {/* Main Layout */}
          {stats.total > 0 && (
            <div className='animate-in fade-in grid grid-cols-1 gap-8 duration-300 lg:grid-cols-3'>
              {/* Left Column: Controls (on desktop, above queue) + Queue */}
              <div className='space-y-6 lg:col-span-2'>
                {/* Stats & Controls - On Desktop, show above queue */}
                <div className='hidden lg:block'>
                  <BatchControls onStartProcessing={start} isProcessorBusy={isProcessorBusy} />
                </div>

                {/* Queue */}
                <BatchQueue />
              </div>

              {/* Right Column: Settings (on desktop) */}
              <div className='space-y-6'>
                <ControlPanel
                  settings={settings}
                  onSettingsChange={updateSettings}
                  originalDimensions={defaultDimensions}
                  onReset={handleResetSettings}
                  batchMode
                />

                {/* Controls - On Mobile, show below settings */}
                <div className='lg:hidden'>
                  <BatchControls onStartProcessing={start} isProcessorBusy={isProcessorBusy} />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
