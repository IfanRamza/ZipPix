import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  applyTransformations,
  canvasToBlob,
  DEFAULT_EDITOR_STATE,
  type EditorState,
  loadImage,
} from "@/lib/imageEditor";
import { getMimeType } from "@/lib/imageProcessor";
import type { SupportedFormat } from "@/types";
import {
  Check,
  Contrast,
  FlipHorizontal,
  FlipVertical,
  Palette,
  RotateCcw,
  RotateCw,
  Sun,
  Undo2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface ImageEditorProps {
  imageUrl: string;
  format: SupportedFormat;
  quality: number;
  onApply: (editedBlob: Blob) => void;
  onCancel: () => void;
}

export function ImageEditor({
  imageUrl,
  format,
  quality,
  onApply,
  onCancel,
}: ImageEditorProps) {
  const [state, setState] = useState<EditorState>(DEFAULT_EDITOR_STATE);
  const [previewUrl, setPreviewUrl] = useState<string>(imageUrl);
  const [isProcessing, setIsProcessing] = useState(false);

  // Local filter values for debouncing
  const [localBrightness, setLocalBrightness] = useState(0);
  const [localContrast, setLocalContrast] = useState(0);
  const [localSaturation, setLocalSaturation] = useState(0);

  // Generate preview when state changes
  const updatePreview = useCallback(async () => {
    try {
      const img = await loadImage(imageUrl);
      const canvas = applyTransformations(img, state);
      const blob = await canvasToBlob(
        canvas,
        getMimeType(format),
        quality / 100
      );

      // Revoke old preview URL
      if (previewUrl !== imageUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setPreviewUrl(URL.createObjectURL(blob));
    } catch (error) {
      console.error("Failed to update preview:", error);
    }
  }, [imageUrl, state, format, quality, previewUrl]);

  // Debounced filter update
  useEffect(() => {
    const timer = setTimeout(() => {
      setState((prev) => ({
        ...prev,
        brightness: localBrightness,
        contrast: localContrast,
        saturation: localSaturation,
      }));
    }, 150);
    return () => clearTimeout(timer);
  }, [localBrightness, localContrast, localSaturation]);

  // Update preview when state changes
  useEffect(() => {
    updatePreview();
  }, [state]);

  const handleRotate = (direction: "cw" | "ccw") => {
    setState((prev) => {
      const rotations: (0 | 90 | 180 | 270)[] = [0, 90, 180, 270];
      const currentIndex = rotations.indexOf(prev.rotation);
      const newIndex =
        direction === "cw"
          ? (currentIndex + 1) % 4
          : (currentIndex - 1 + 4) % 4;
      return { ...prev, rotation: rotations[newIndex] };
    });
  };

  const handleFlip = (axis: "horizontal" | "vertical") => {
    setState((prev) => ({
      ...prev,
      flipHorizontal:
        axis === "horizontal" ? !prev.flipHorizontal : prev.flipHorizontal,
      flipVertical:
        axis === "vertical" ? !prev.flipVertical : prev.flipVertical,
    }));
  };

  const handleReset = () => {
    setState(DEFAULT_EDITOR_STATE);
    setLocalBrightness(0);
    setLocalContrast(0);
    setLocalSaturation(0);
  };

  const handleApply = async () => {
    setIsProcessing(true);
    try {
      const img = await loadImage(imageUrl);
      const canvas = applyTransformations(img, state);
      const blob = await canvasToBlob(
        canvas,
        getMimeType(format),
        quality / 100
      );
      onApply(blob);
    } catch (error) {
      console.error("Failed to apply edits:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-[#0a0f14] via-[#12171d] to-[#0a0f14] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-background/40 backdrop-blur-xl">
        <h2 className="text-lg font-semibold">Edit Image</h2>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="cursor-pointer"
          >
            <Undo2 className="w-4 h-4 mr-1" />
            Reset
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="cursor-pointer"
          >
            <X className="w-4 h-4 mr-1" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleApply}
            disabled={isProcessing}
            className="bg-cyan-500 hover:bg-cyan-600 cursor-pointer"
          >
            <Check className="w-4 h-4 mr-1" />
            Apply
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Preview */}
        <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
          <img
            src={previewUrl}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded shadow-2xl"
          />
        </div>

        {/* Controls Sidebar */}
        <div className="w-80 border-l border-border/50 p-4 overflow-y-auto space-y-6">
          {/* Transform Controls */}
          <Card className="bg-background/40 border-border/50">
            <CardContent className="p-4 space-y-4">
              <Label className="text-sm font-medium">Transform</Label>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRotate("ccw")}
                  className="flex-1 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Left
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRotate("cw")}
                  className="flex-1 cursor-pointer"
                >
                  <RotateCw className="w-4 h-4 mr-1" />
                  Right
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant={state.flipHorizontal ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFlip("horizontal")}
                  className="flex-1 cursor-pointer"
                >
                  <FlipHorizontal className="w-4 h-4 mr-1" />
                  Flip H
                </Button>
                <Button
                  variant={state.flipVertical ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFlip("vertical")}
                  className="flex-1 cursor-pointer"
                >
                  <FlipVertical className="w-4 h-4 mr-1" />
                  Flip V
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Filter Controls */}
          <Card className="bg-background/40 border-border/50">
            <CardContent className="p-4 space-y-5">
              <Label className="text-sm font-medium">Adjustments</Label>

              {/* Brightness */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <Sun className="w-3 h-3" /> Brightness
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {localBrightness > 0 ? "+" : ""}
                    {localBrightness}
                  </span>
                </div>
                <Slider
                  value={[localBrightness]}
                  onValueChange={([v]) => setLocalBrightness(v)}
                  min={-100}
                  max={100}
                  step={1}
                />
              </div>

              {/* Contrast */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <Contrast className="w-3 h-3" /> Contrast
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {localContrast > 0 ? "+" : ""}
                    {localContrast}
                  </span>
                </div>
                <Slider
                  value={[localContrast]}
                  onValueChange={([v]) => setLocalContrast(v)}
                  min={-100}
                  max={100}
                  step={1}
                />
              </div>

              {/* Saturation */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <Palette className="w-3 h-3" /> Saturation
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {localSaturation > 0 ? "+" : ""}
                    {localSaturation}
                  </span>
                </div>
                <Slider
                  value={[localSaturation]}
                  onValueChange={([v]) => setLocalSaturation(v)}
                  min={-100}
                  max={100}
                  step={1}
                />
              </div>
            </CardContent>
          </Card>

          {/* Info */}
          <p className="text-xs text-muted-foreground text-center">
            Rotation: {state.rotation}° | Flip:{" "}
            {state.flipHorizontal ? "H" : ""}
            {state.flipVertical ? "V" : ""}
            {!state.flipHorizontal && !state.flipVertical ? "None" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
