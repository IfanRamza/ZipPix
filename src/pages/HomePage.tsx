import { ActionButtons } from "@/components/ActionButtons";
import { ComparisonSlider } from "@/components/ComparisonSlider";
import { ControlPanel } from "@/components/ControlPanel";
import { FilenameEditor } from "@/components/FilenameEditor";
import { Footer } from "@/components/Footer";
import { ImageEditor } from "@/components/ImageEditor";
import { ImageUploader } from "@/components/ImageUploader";
import { MetadataViewer } from "@/components/MetadataViewer";
import { Navbar } from "@/components/Navbar";
import { StatsDisplay } from "@/components/StatsDisplay";
import { Button } from "@/components/ui/button";
import { useCompressionWorker } from "@/hooks/useCompressionWorker";
import { useImageStore } from "@/store/imageStore";
import { Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export function HomePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [outputFilename, setOutputFilename] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const {
    originalImage,
    editState,
    compressedUrl,
    compressedSize,
    settings,
    status,
    sliderPosition,
    setOriginalImage,
    updateSettings,
    reset,
    resetEdits,
    hasEdits,
    setSliderPosition,
  } = useImageStore();

  const { compress } = useCompressionWorker();

  // Trigger compression when image, settings, or editState changes
  useEffect(() => {
    if (originalImage) {
      compress(originalImage.file, settings, editState);
    }
  }, [originalImage, settings, editState, compress]);

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

  // Get edit indicators for display
  const getEditIndicators = () => {
    const indicators: string[] = [];
    if (editState.crop) {
      indicators.push(
        `Cropped: ${editState.crop.width}×${editState.crop.height}`
      );
    }
    if (editState.rotation !== 0) {
      indicators.push(`Rotated: ${editState.rotation}°`);
    }
    if (editState.flipHorizontal || editState.flipVertical) {
      const flip = [
        editState.flipHorizontal && "H",
        editState.flipVertical && "V",
      ]
        .filter(Boolean)
        .join("+");
      indicators.push(`Flipped: ${flip}`);
    }
    if (
      editState.brightness !== 0 ||
      editState.contrast !== 0 ||
      editState.saturation !== 0
    ) {
      indicators.push("Filters applied");
    }
    return indicators;
  };

  const editIndicators = getEditIndicators();

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

      {/* Image Editor Modal */}
      {isEditing && originalImage && (
        <ImageEditor
          imageUrl={originalImage.previewUrl}
          onClose={() => setIsEditing(false)}
        />
      )}

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

              {/* Quick Actions Bar - Aligned Right */}
              <div className="flex gap-3 justify-end flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="rounded-sm cursor-pointer"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit Image
                </Button>
                {hasEdits() && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetEdits}
                    className="rounded-sm cursor-pointer text-amber-400 border-amber-500/50 hover:bg-amber-500/10"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset to Original
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={reset}
                  className="rounded-sm cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove
                </Button>
              </div>

              {/* Edit Indicators */}
              {editIndicators.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {editIndicators.map((indicator, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-full"
                    >
                      {indicator}
                    </span>
                  ))}
                </div>
              )}

              <ComparisonSlider
                originalUrl={originalImage.previewUrl}
                compressedUrl={compressedUrl}
                position={sliderPosition}
                onPositionChange={setSliderPosition}
              />
              <MetadataViewer
                metadata={originalImage.metadata ?? null}
                willBeStripped={settings.stripMetadata}
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
