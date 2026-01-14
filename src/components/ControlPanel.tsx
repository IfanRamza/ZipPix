import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { CompressionSettings, SupportedFormat } from "@/types";
import { Lock, RotateCcw, Settings2, Unlock } from "lucide-react";
import { useEffect, useState } from "react";

interface ControlPanelProps {
  settings: CompressionSettings;
  onSettingsChange: (settings: Partial<CompressionSettings>) => void;
  originalDimensions?: { width: number; height: number };
  onReset?: () => void;
}

export function ControlPanel({
  settings,
  onSettingsChange,
  originalDimensions,
  onReset,
}: ControlPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [widthInput, setWidthInput] = useState(
    settings.width?.toString() || ""
  );
  const [heightInput, setHeightInput] = useState(
    settings.height?.toString() || ""
  );

  useEffect(() => {
    if (originalDimensions && !settings.width && !settings.height) {
      setWidthInput(originalDimensions.width.toString());
      setHeightInput(originalDimensions.height.toString());
    }
  }, [originalDimensions, settings.width, settings.height]);

  const handleFormatChange = (value: string) => {
    onSettingsChange({ format: value as SupportedFormat });
  };

  const handleQualityChange = (value: number[]) => {
    onSettingsChange({ quality: value[0] });
  };

  const handleResizeChange = (dim: "width" | "height", value: string) => {
    const num = parseInt(value) || undefined;

    if (dim === "width") {
      setWidthInput(value);
      if (settings.maintainAspectRatio && originalDimensions && num) {
        const aspect = originalDimensions.width / originalDimensions.height;
        const newHeight = Math.round(num / aspect);
        setHeightInput(newHeight.toString());
        onSettingsChange({ width: num, height: newHeight });
      } else {
        onSettingsChange({ width: num });
      }
    } else {
      setHeightInput(value);
      if (settings.maintainAspectRatio && originalDimensions && num) {
        const aspect = originalDimensions.width / originalDimensions.height;
        const newWidth = Math.round(num * aspect);
        setWidthInput(newWidth.toString());
        onSettingsChange({ width: newWidth, height: num });
      } else {
        onSettingsChange({ height: num });
      }
    }
  };

  const toggleAspectRatio = () => {
    onSettingsChange({ maintainAspectRatio: !settings.maintainAspectRatio });
  };

  const handleReset = () => {
    if (originalDimensions) {
      setWidthInput(originalDimensions.width.toString());
      setHeightInput(originalDimensions.height.toString());
    }
    onReset?.();
  };

  return (
    <Card className="border-border/50 bg-background/40 backdrop-blur-xl rounded h-fit animate-in fade-in duration-300">
      <CardContent className="p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-cyan-400" />
            Settings
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-8 text-xs text-muted-foreground"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reset
          </Button>
        </div>

        {/* Preset Buttons */}
        <div className="space-y-3">
          <Label>Quick Presets</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => onSettingsChange({ format: "webp", quality: 85 })}
            >
              🌐 Web
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => onSettingsChange({ format: "png", quality: 95 })}
            >
              🖨️ Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => onSettingsChange({ format: "png", quality: 100 })}
            >
              📦 Archive
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => onSettingsChange({ format: "webp", quality: 60 })}
            >
              ⚡ Max Compress
            </Button>
          </div>
        </div>

        {/* Format Selection */}
        <div className="space-y-3">
          <Label>Output Format</Label>
          <Select value={settings.format} onValueChange={handleFormatChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="jpeg">JPEG - Photos</SelectItem>
              <SelectItem value="png">PNG - Graphics</SelectItem>
              <SelectItem value="webp">WebP - Modern</SelectItem>
              <SelectItem value="avif">AVIF - Best Compression</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quality Slider */}
        <div className="space-y-4">
          <div className="flex justify-between">
            <Label>Quality</Label>
            <span className="text-sm font-mono text-muted-foreground">
              {settings.quality}%
            </span>
          </div>
          <Slider
            value={[settings.quality]}
            onValueChange={handleQualityChange}
            max={100}
            min={1}
            step={1}
            className="py-1"
          />
        </div>

        {/* Resize */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Resize</Label>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleAspectRatio}
              className="h-6 w-6"
            >
              {settings.maintainAspectRatio ? (
                <Lock className="w-3 h-3" />
              ) : (
                <Unlock className="w-3 h-3" />
              )}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase">
                Width
              </span>
              <Input
                type="number"
                value={widthInput}
                onChange={(e) => handleResizeChange("width", e.target.value)}
                className="h-9 font-mono text-sm"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase">
                Height
              </span>
              <Input
                type="number"
                value={heightInput}
                onChange={(e) => handleResizeChange("height", e.target.value)}
                className="h-9 font-mono text-sm"
              />
            </div>
          </div>
        </div>

        {/* Advanced Settings Toggle */}
        <div className="pt-2">
          <Button
            variant="outline"
            className="w-full text-xs"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? "Hide Advanced Options" : "Show Advanced Options"}
          </Button>

          {showAdvanced && (
            <div className="mt-4 space-y-5 p-4 bg-background/50 rounded border border-border/50 animate-in fade-in">
              {/* Strip Metadata */}
              <div className="flex items-center justify-between">
                <Label htmlFor="strip-meta" className="text-sm">
                  Strip Metadata
                </Label>
                <Switch
                  id="strip-meta"
                  checked={settings.stripMetadata}
                  onCheckedChange={(checked) =>
                    onSettingsChange({ stripMetadata: checked })
                  }
                />
              </div>

              {/* Effort/Speed Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm">Compression Effort</Label>
                  <span className="text-xs font-mono text-muted-foreground">
                    {settings.effort}/10
                  </span>
                </div>
                <Slider
                  value={[settings.effort]}
                  onValueChange={(value) =>
                    onSettingsChange({ effort: value[0] })
                  }
                  min={0}
                  max={10}
                  step={1}
                  className="py-1"
                />
                <p className="text-xs text-muted-foreground">
                  Higher = smaller file, slower processing
                </p>
              </div>

              {/* Progressive JPEG - Only show for JPEG */}
              {settings.format === "jpeg" && (
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="progressive" className="text-sm">
                      Progressive JPEG
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Loads gradually instead of line by line
                    </p>
                  </div>
                  <Switch
                    id="progressive"
                    checked={settings.progressive}
                    onCheckedChange={(checked) =>
                      onSettingsChange({ progressive: checked })
                    }
                  />
                </div>
              )}

              {/* Chroma Subsampling - Only for JPEG/WebP */}
              {(settings.format === "jpeg" || settings.format === "webp") && (
                <div className="space-y-2">
                  <Label className="text-sm">Chroma Subsampling</Label>
                  <Select
                    value={settings.chromaSubsampling}
                    onValueChange={(value) =>
                      onSettingsChange({
                        chromaSubsampling: value as "4:4:4" | "4:2:2" | "4:2:0",
                      })
                    }
                  >
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4:4:4">
                        4:4:4 - Best quality
                      </SelectItem>
                      <SelectItem value="4:2:2">4:2:2 - Balanced</SelectItem>
                      <SelectItem value="4:2:0">
                        4:2:0 - Smallest size
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Reduces color resolution for smaller files
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
