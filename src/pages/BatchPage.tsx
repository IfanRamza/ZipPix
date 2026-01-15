import { BatchControls } from "@/components/BatchControls";
import { BatchQueue } from "@/components/BatchQueue";
import { BatchUploader } from "@/components/BatchUploader";
import { ControlPanel } from "@/components/ControlPanel";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { useBatchProcessor } from "@/hooks/useBatchProcessor";
import { useBatchStats } from "@/store/batchStore";
import { useImageStore } from "@/store/imageStore";
import { useEffect } from "react";

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
      format: "webp",
      quality: 85,
      maintainAspectRatio: true,
      stripMetadata: true,
      effort: 4,
      progressive: true,
      chromaSubsampling: "4:2:0",
      width: undefined,
      height: undefined,
    });
  };

  // Default dimensions for the control panel (since we don't have a single image)
  const defaultDimensions = { width: 1920, height: 1080 };

  return (
    <div className="min-h-screen flex flex-col bg-linear-to-br from-[#0a0f14] via-[#12171d] to-[#0a0f14]">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-linear-to-r from-white to-white/60 bg-clip-text text-transparent">
              Batch Processing
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Compress up to 20 images at once with shared settings. Download
              all as a single ZIP file.
            </p>
          </div>

          {/* Upload Area */}
          {stats.total === 0 ? (
            <BatchUploader />
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {stats.total} image{stats.total !== 1 ? "s" : ""} in queue
              </p>
              <BatchUploader compact />
            </div>
          )}

          {/* Main Layout */}
          {stats.total > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
              {/* Left Column: Controls (on desktop, above queue) + Queue */}
              <div className="lg:col-span-2 space-y-6">
                {/* Stats & Controls - On Desktop, show above queue */}
                <div className="hidden lg:block">
                  <BatchControls
                    onStartProcessing={start}
                    isProcessorBusy={isProcessorBusy}
                  />
                </div>

                {/* Queue */}
                <BatchQueue />
              </div>

              {/* Right Column: Settings (on desktop) */}
              <div className="space-y-6">
                <ControlPanel
                  settings={settings}
                  onSettingsChange={updateSettings}
                  originalDimensions={defaultDimensions}
                  onReset={handleResetSettings}
                  batchMode
                />

                {/* Controls - On Mobile, show below settings */}
                <div className="lg:hidden">
                  <BatchControls
                    onStartProcessing={start}
                    isProcessorBusy={isProcessorBusy}
                  />
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
