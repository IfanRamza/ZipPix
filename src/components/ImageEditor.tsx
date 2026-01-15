import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  Crop,
  FlipHorizontal,
  FlipVertical,
  Palette,
  RotateCcw,
  RotateCw,
  Sun,
  Undo2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactCrop, {
  centerCrop,
  type Crop as CropType,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

interface ImageEditorProps {
  imageUrl: string;
  format: SupportedFormat;
  quality: number;
  onApply: (editedBlob: Blob) => void;
  onCancel: () => void;
}

// Aspect ratio presets
const ASPECT_PRESETS = [
  { label: "Free", value: undefined, icon: "🔓" },
  { label: "1:1", value: 1, icon: "⬜" },
  { label: "16:9", value: 16 / 9, icon: "🖥️" },
  { label: "9:16", value: 9 / 16, icon: "📱" },
  { label: "4:5", value: 4 / 5, icon: "📷" },
  { label: "4:3", value: 4 / 3, icon: "🖼️" },
];

export function ImageEditor({
  imageUrl,
  format,
  quality,
  onApply,
  onCancel,
}: ImageEditorProps) {
  const [state, setState] = useState<EditorState>(DEFAULT_EDITOR_STATE);
  const [isProcessing, setIsProcessing] = useState(false);

  // Crop state
  const [isCropMode, setIsCropMode] = useState(false);
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<CropType>();
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const imgRef = useRef<HTMLImageElement>(null);

  // Image dimensions
  const [imageNaturalSize, setImageNaturalSize] = useState({
    width: 0,
    height: 0,
  });
  const [customWidth, setCustomWidth] = useState("");
  const [customHeight, setCustomHeight] = useState("");

  // Local filter values for debouncing
  const [localBrightness, setLocalBrightness] = useState(0);
  const [localContrast, setLocalContrast] = useState(0);
  const [localSaturation, setLocalSaturation] = useState(0);

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
    setCrop(undefined);
    setCompletedCrop(undefined);
    setIsCropMode(false);
  };

  // Initialize crop when entering crop mode
  const handleEnterCropMode = () => {
    setIsCropMode(true);
    if (imgRef.current && aspect) {
      const { width, height } = imgRef.current;
      const newCrop = centerCrop(
        makeAspectCrop({ unit: "%", width: 80 }, aspect, width, height),
        width,
        height
      );
      setCrop(newCrop);
    } else {
      // Default freeform crop
      setCrop({ unit: "%", x: 10, y: 10, width: 80, height: 80 });
    }
  };

  // Apply crop to state
  const handleApplyCrop = () => {
    if (completedCrop && imgRef.current) {
      const img = imgRef.current;
      const scaleX = img.naturalWidth / img.width;
      const scaleY = img.naturalHeight / img.height;

      setState((prev) => ({
        ...prev,
        crop: {
          x: Math.round(completedCrop.x * scaleX),
          y: Math.round(completedCrop.y * scaleY),
          width: Math.round(completedCrop.width * scaleX),
          height: Math.round(completedCrop.height * scaleY),
        },
      }));
    }
    setIsCropMode(false);
    setCrop(undefined);
  };

  // Handle aspect ratio change
  const handleAspectChange = (newAspect: number | undefined) => {
    setAspect(newAspect);
    if (imgRef.current && newAspect) {
      const { width, height } = imgRef.current;
      const newCrop = centerCrop(
        makeAspectCrop({ unit: "%", width: 80 }, newAspect, width, height),
        width,
        height
      );
      setCrop(newCrop);
    }
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

  // Generate preview with transformations (non-crop)
  const getPreviewStyle = useCallback(() => {
    const transforms: string[] = [];

    if (state.rotation !== 0) {
      transforms.push(`rotate(${state.rotation}deg)`);
    }
    if (state.flipHorizontal) {
      transforms.push("scaleX(-1)");
    }
    if (state.flipVertical) {
      transforms.push("scaleY(-1)");
    }

    const filters: string[] = [];
    if (state.brightness !== 0) {
      filters.push(`brightness(${1 + state.brightness / 100})`);
    }
    if (state.contrast !== 0) {
      filters.push(`contrast(${1 + state.contrast / 100})`);
    }
    if (state.saturation !== 0) {
      filters.push(`saturate(${1 + state.saturation / 100})`);
    }

    return {
      transform: transforms.length > 0 ? transforms.join(" ") : undefined,
      filter: filters.length > 0 ? filters.join(" ") : undefined,
    };
  }, [state]);

  return (
    <div className="fixed inset-0 z-50 bg-linear-to-br from-[#0a0f14] via-[#12171d] to-[#0a0f14] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-background/40 backdrop-blur-xl">
        <h2 className="text-lg font-semibold">
          {isCropMode ? "Crop Image" : "Edit Image"}
        </h2>
        <div className="flex gap-2">
          {isCropMode ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCropMode(false)}
                className="cursor-pointer"
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApplyCrop}
                className="bg-cyan-500 hover:bg-cyan-600 cursor-pointer"
              >
                <Check className="w-4 h-4 mr-1" />
                Apply Crop
              </Button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Preview */}
        <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
          {isCropMode ? (
            <div className="max-w-full max-h-full overflow-hidden flex items-center justify-center">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspect}
                style={{ maxHeight: "70vh", maxWidth: "100%" }}
              >
                <img
                  ref={imgRef}
                  src={imageUrl}
                  alt="Crop"
                  style={{
                    maxHeight: "70vh",
                    maxWidth: "100%",
                    objectFit: "contain",
                  }}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    setImageNaturalSize({
                      width: img.naturalWidth,
                      height: img.naturalHeight,
                    });
                  }}
                />
              </ReactCrop>
            </div>
          ) : (
            <img
              ref={imgRef}
              src={imageUrl}
              alt="Preview"
              className="max-w-full max-h-full object-contain rounded shadow-2xl transition-all duration-200"
              style={getPreviewStyle()}
            />
          )}
        </div>

        {/* Controls Sidebar */}
        <div className="w-80 border-l border-border/50 p-4 overflow-y-auto space-y-6">
          {isCropMode ? (
            <>
              {/* Crop Controls */}
              <Card className="bg-background/40 border-border/50">
                <CardContent className="p-4 space-y-4">
                  <Label className="text-sm font-medium">Aspect Ratio</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {ASPECT_PRESETS.map((preset) => (
                      <Button
                        key={preset.label}
                        variant={
                          aspect === preset.value ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => handleAspectChange(preset.value)}
                        className="text-xs cursor-pointer"
                      >
                        {preset.icon} {preset.label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Custom Size Input */}
              <Card className="bg-background/40 border-border/50">
                <CardContent className="p-4 space-y-3">
                  <Label className="text-sm font-medium">
                    Custom Size (px)
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase">
                        Width
                      </span>
                      <Input
                        type="number"
                        placeholder="Width"
                        value={customWidth}
                        onChange={(e) => {
                          setCustomWidth(e.target.value);
                          const w = parseInt(e.target.value);
                          const h = parseInt(customHeight);
                          if (w && h && imgRef.current) {
                            const scaleX =
                              imgRef.current.width /
                              imgRef.current.naturalWidth;
                            const scaleY =
                              imgRef.current.height /
                              imgRef.current.naturalHeight;
                            setCrop({
                              unit: "px",
                              x: 0,
                              y: 0,
                              width: w * scaleX,
                              height: h * scaleY,
                            });
                            setAspect(undefined);
                          }
                        }}
                        className="h-8 font-mono text-sm"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase">
                        Height
                      </span>
                      <Input
                        type="number"
                        placeholder="Height"
                        value={customHeight}
                        onChange={(e) => {
                          setCustomHeight(e.target.value);
                          const w = parseInt(customWidth);
                          const h = parseInt(e.target.value);
                          if (w && h && imgRef.current) {
                            const scaleX =
                              imgRef.current.width /
                              imgRef.current.naturalWidth;
                            const scaleY =
                              imgRef.current.height /
                              imgRef.current.naturalHeight;
                            setCrop({
                              unit: "px",
                              x: 0,
                              y: 0,
                              width: w * scaleX,
                              height: h * scaleY,
                            });
                            setAspect(undefined);
                          }
                        }}
                        className="h-8 font-mono text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Crop Info */}
              <Card className="bg-background/40 border-border/50">
                <CardContent className="p-4 space-y-2">
                  <Label className="text-sm font-medium">Crop Info</Label>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>
                      Original: {imageNaturalSize.width} ×{" "}
                      {imageNaturalSize.height} px
                    </p>
                    {completedCrop && imgRef.current && (
                      <p className="text-cyan-400">
                        Crop Area:{" "}
                        {Math.round(
                          completedCrop.width *
                            (imgRef.current.naturalWidth / imgRef.current.width)
                        )}{" "}
                        ×{" "}
                        {Math.round(
                          completedCrop.height *
                            (imgRef.current.naturalHeight /
                              imgRef.current.height)
                        )}{" "}
                        px
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Drag corners to adjust crop area
                  </p>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              {/* Crop Button */}
              <Card className="bg-background/40 border-border/50">
                <CardContent className="p-4">
                  <Button
                    variant="outline"
                    className="w-full cursor-pointer"
                    onClick={handleEnterCropMode}
                  >
                    <Crop className="w-4 h-4 mr-2" />
                    Crop Image
                  </Button>
                  {state.crop && (
                    <p className="text-xs text-green-400 text-center mt-2">
                      ✓ Crop applied ({state.crop.width}x{state.crop.height})
                    </p>
                  )}
                </CardContent>
              </Card>

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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
