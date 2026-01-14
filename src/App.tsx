import { ActionButtons } from "@/components/ActionButtons";
import { ComparisonSlider } from "@/components/ComparisonSlider";
import { ControlPanel } from "@/components/ControlPanel";
import { FilenameEditor } from "@/components/FilenameEditor";
import { Footer } from "@/components/Footer";
import { ImageUploader } from "@/components/ImageUploader";
import { PageLoading } from "@/components/LoadingSpinner";
import { Navbar } from "@/components/Navbar";
import { StatsDisplay } from "@/components/StatsDisplay";
import { useCompressionWorker } from "@/hooks/useCompressionWorker";
import { useImageStore } from "@/store/imageStore";
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Route, Routes } from "react-router-dom";

// Lazy load page components
const PrivacyPolicy = lazy(() =>
  import("./pages/PrivacyPolicy").then((module) => ({
    default: module.PrivacyPolicy,
  }))
);
const TermsOfService = lazy(() =>
  import("./pages/TermsOfService").then((module) => ({
    default: module.TermsOfService,
  }))
);

function HomePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [outputFilename, setOutputFilename] = useState("");

  const {
    originalImage,
    compressedUrl,
    compressedSize,
    settings,
    status,
    sliderPosition,
    setOriginalImage,
    updateSettings,
    reset,
    setSliderPosition,
  } = useImageStore();

  const { compress } = useCompressionWorker();

  // Trigger compression when image or settings change
  useEffect(() => {
    if (originalImage) {
      compress(originalImage.file, settings);
    }
  }, [originalImage, settings, compress]);

  const handleUpload = useCallback(
    async (file: File) => {
      await setOriginalImage(file);
    },
    [setOriginalImage]
  );

  const handleNavbarUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDownload = () => {
    if (!compressedUrl) return;

    const link = document.createElement("a");
    link.href = compressedUrl;
    link.download = outputFilename || `compressed.${settings.format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetSettings = () => {
    if (originalImage) {
      updateSettings({
        format: "webp",
        quality: 85,
        width: originalImage.dimensions.width,
        height: originalImage.dimensions.height,
        maintainAspectRatio: true,
        stripMetadata: true,
        effort: 4,
        progressive: true,
        chromaSubsampling: "4:2:0",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-linear-to-br from-[#0a0f14] via-[#12171d] to-[#0a0f14]">
      <Navbar onUploadClick={handleNavbarUploadClick} />

      {/* Hidden file input for navbar upload button */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
      />

      <main className="flex-1 container mx-auto px-4 py-8">
        {!originalImage ? (
          // Empty State - Upload Zone
          <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
            <div className="w-full max-w-2xl space-y-8">
              <div className="text-center space-y-4">
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-linear-to-r from-white to-white/60 bg-clip-text text-transparent">
                  Compress images.
                  <br />
                  Protect privacy.
                </h2>
                <p className="text-xl text-muted-foreground max-w-lg mx-auto">
                  Secure, client-side image compression. No data ever leaves
                  your device.
                </p>
              </div>
              <ImageUploader onUpload={handleUpload} />
            </div>
          </div>
        ) : (
          // Editor State
          <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
            {/* Left Column: Preview */}
            <div className="lg:col-span-2 space-y-6">
              <StatsDisplay
                originalSize={originalImage.size}
                compressedSize={compressedSize}
                originalDimensions={originalImage.dimensions}
                compressedDimensions={
                  settings.width && settings.height
                    ? { width: settings.width, height: settings.height }
                    : undefined
                }
                originalFormat={originalImage.file.type}
                compressedFormat={settings.format}
                isCompressing={status.isCompressing}
                stripMetadata={settings.stripMetadata}
              />
              <ComparisonSlider
                originalUrl={originalImage.previewUrl}
                compressedUrl={compressedUrl}
                position={sliderPosition}
                onPositionChange={setSliderPosition}
              />
            </div>

            {/* Right Column: Controls */}
            <div className="space-y-6">
              <ControlPanel
                settings={settings}
                onSettingsChange={updateSettings}
                originalDimensions={originalImage.dimensions}
                onReset={handleResetSettings}
              />

              <div className="bg-background/40 backdrop-blur-xl border border-border/50 rounded p-6 space-y-6">
                <FilenameEditor
                  originalFilename={originalImage.file.name}
                  format={settings.format}
                  onChange={setOutputFilename}
                />
                <ActionButtons
                  onDownload={handleDownload}
                  onRemove={reset}
                  isProcessing={status.isCompressing}
                  canDownload={!!compressedUrl}
                />
              </div>

              {status.error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded p-4 text-red-400 text-sm">
                  {status.error}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

const App = () => {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
      </Routes>
    </Suspense>
  );
};

export default App;
