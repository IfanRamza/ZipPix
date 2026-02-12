import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import type { CompressionSettings, SupportedFormat } from '@/types';
import { Lock, RotateCcw, Settings2, Unlock } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ControlPanelProps {
  settings: CompressionSettings;
  onSettingsChange: (settings: Partial<CompressionSettings>) => void;
  originalDimensions?: { width: number; height: number };
  onReset?: () => void;
  batchMode?: boolean; // Hide custom dimensions in batch mode
}

export function ControlPanel({
  settings,
  onSettingsChange,
  originalDimensions,
  onReset,
  batchMode = false,
}: ControlPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Local state for inputs to allow smooth editing/sliding
  const [localQuality, setLocalQuality] = useState(settings.quality);
  const [localEffort, setLocalEffort] = useState(settings.effort || 4);
  const [widthInput, setWidthInput] = useState(settings.width?.toString() || '');
  const [heightInput, setHeightInput] = useState(settings.height?.toString() || '');

  // Sync upstream changes to local state
  useEffect(() => {
    setLocalQuality(settings.quality);
  }, [settings.quality]);

  useEffect(() => {
    setLocalEffort(settings.effort || 4);
  }, [settings.effort]);

  useEffect(() => {
    if (originalDimensions && !settings.width && !settings.height) {
      setWidthInput(originalDimensions.width.toString());
      setHeightInput(originalDimensions.height.toString());
    }
  }, [originalDimensions, settings.width, settings.height]);

  // Debounce Quality Updates
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuality !== settings.quality) {
        onSettingsChange({ quality: localQuality });
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [localQuality, settings.quality, onSettingsChange]);

  // Debounce Effort Updates
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localEffort !== (settings.effort || 4)) {
        onSettingsChange({ effort: localEffort });
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [localEffort, settings.effort, onSettingsChange]);

  const handleFormatChange = (value: string) => {
    onSettingsChange({ format: value as SupportedFormat });
  };

  const handleQualityChange = (value: number[]) => {
    // Update local immediately for smooth UI, debounced effect will trigger update
    setLocalQuality(value[0]);
  };

  const handleResizeChange = (dim: 'width' | 'height', value: string) => {
    const num = parseInt(value) || undefined;

    if (dim === 'width') {
      setWidthInput(value);
      if (settings.maintainAspectRatio && originalDimensions && num) {
        const aspect = originalDimensions.width / originalDimensions.height;
        const newHeight = Math.round(num / aspect);
        setHeightInput(newHeight.toString());
        // Debounce or immediate? Resize usually expects immediate feedback but debounce is safer for performance
        // For inputs, we can debounce too, but let's keep it direct for now as it's not a slider stream
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

  // Determine current preset value based on dimensions
  const getPresetValue = () => {
    if (!originalDimensions || !settings.width) return 'custom';

    // Check for exact matches with small tolerance for rounding
    const currentRatio = settings.width / originalDimensions.width;
    const presets = [0.25, 0.5, 0.75, 1, 2, 4];

    for (const ratio of presets) {
      // 1% tolerance
      if (Math.abs(currentRatio - ratio) < 0.01) {
        return (ratio * 100).toString();
      }
    }

    return 'custom';
  };

  return (
    <Card className='border-border/50 bg-background/40 animate-in fade-in h-fit rounded backdrop-blur-xl duration-300'>
      <CardContent className='space-y-8 p-6'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <h2 className='flex items-center gap-2 text-lg font-semibold'>
            <Settings2 className='h-5 w-5 text-cyan-400' />
            Settings
          </h2>
          <Button
            variant='ghost'
            size='sm'
            onClick={handleReset}
            className='text-muted-foreground h-8 text-xs'
          >
            <RotateCcw className='mr-1 h-3.5 w-3.5' />
            Reset
          </Button>
        </div>

        {/* Preset Buttons */}
        <div className='space-y-3'>
          <Label>Quick Presets</Label>
          <div className='grid grid-cols-2 gap-2'>
            <Button
              variant='outline'
              size='sm'
              className='h-8 text-xs'
              onClick={() => onSettingsChange({ format: 'webp', quality: 85 })}
            >
              🌐 Web
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='h-8 text-xs'
              onClick={() => onSettingsChange({ format: 'png', quality: 95 })}
            >
              🖨️ Print
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='h-8 text-xs'
              onClick={() => onSettingsChange({ format: 'png', quality: 100 })}
            >
              📦 Archive
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='h-8 text-xs'
              onClick={() => onSettingsChange({ format: 'webp', quality: 60 })}
            >
              ⚡ Max Compress
            </Button>
          </div>
        </div>

        {/* Format Selection */}
        <div className='space-y-3'>
          <Label>Output Format</Label>
          <Select value={settings.format} onValueChange={handleFormatChange}>
            <SelectTrigger className='w-full'>
              <SelectValue placeholder='Select format' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='jpeg'>JPEG - Photos</SelectItem>
              <SelectItem value='png'>PNG - Graphics</SelectItem>
              <SelectItem value='webp'>WebP - Modern</SelectItem>
              <SelectItem value='avif'>AVIF - Best Compression</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quality Slider */}
        <div className='space-y-4'>
          <div className='flex justify-between'>
            <Label>Quality</Label>
            <span className='text-muted-foreground font-mono text-sm'>{localQuality}%</span>
          </div>
          <Slider
            value={[localQuality]}
            onValueChange={handleQualityChange}
            max={100}
            min={1}
            step={1}
            className='py-1'
          />
        </div>

        {/* Resize */}
        <div className='space-y-3'>
          <div className='flex items-center justify-between'>
            <Label>Resize</Label>
            <Button variant='ghost' size='icon' onClick={toggleAspectRatio} className='h-6 w-6'>
              {settings.maintainAspectRatio ? (
                <Lock className='h-3 w-3' />
              ) : (
                <Unlock className='h-3 w-3' />
              )}
            </Button>
          </div>

          <Select
            value={getPresetValue()}
            onValueChange={(val) => {
              if (!val || val === 'custom' || !originalDimensions) return;
              const percent = parseInt(val, 10);
              if (isNaN(percent)) return;

              const ratio = percent / 100;
              const newWidth = Math.round(originalDimensions.width * ratio);
              const newHeight = Math.round(originalDimensions.height * ratio);

              setWidthInput(newWidth.toString());
              setHeightInput(newHeight.toString());
              onSettingsChange({ width: newWidth, height: newHeight });
            }}
          >
            <SelectTrigger className='mb-2 h-8 w-full text-xs'>
              <SelectValue placeholder='Scale Preset (e.g. 50%)' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='25'>25% (Thumbnail)</SelectItem>
              <SelectItem value='50'>50% (Half Size)</SelectItem>
              <SelectItem value='75'>75% (Reduced)</SelectItem>
              <SelectItem value='100'>100% (Original)</SelectItem>
              <SelectItem value='200'>200% (2x Upscale)</SelectItem>
              <SelectItem value='400'>400% (4x Upscale)</SelectItem>
              {!batchMode && <SelectItem value='custom'>Custom Dimensions</SelectItem>}
            </SelectContent>
          </Select>

          {/* Custom dimension inputs - hidden in batch mode */}
          {!batchMode && (
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-1'>
                <span className='text-muted-foreground text-[10px] uppercase'>Width</span>
                <Input
                  type='number'
                  value={widthInput}
                  onChange={(e) => handleResizeChange('width', e.target.value)}
                  className='h-9 font-mono text-sm'
                />
              </div>
              <div className='space-y-1'>
                <span className='text-muted-foreground text-[10px] uppercase'>Height</span>
                <Input
                  type='number'
                  value={heightInput}
                  onChange={(e) => handleResizeChange('height', e.target.value)}
                  className='h-9 font-mono text-sm'
                />
              </div>
            </div>
          )}
        </div>

        {/* Advanced Settings Toggle */}
        <div className='pt-2'>
          <Button
            variant='outline'
            className='w-full text-xs'
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
          </Button>

          {showAdvanced && (
            <div className='bg-background/50 border-border/50 animate-in fade-in mt-4 space-y-5 rounded border p-4'>
              {/* Strip Metadata */}
              <div className='flex items-center justify-between'>
                <Label htmlFor='strip-meta' className='text-sm'>
                  Strip Metadata
                </Label>
                <Switch
                  id='strip-meta'
                  checked={settings.stripMetadata}
                  onCheckedChange={(checked) => onSettingsChange({ stripMetadata: checked })}
                />
              </div>

              {/* Effort/Speed Slider */}
              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <Label className='text-sm'>Compression Effort</Label>
                  <span className='text-muted-foreground font-mono text-xs'>{localEffort}/6</span>
                </div>
                <Slider
                  value={[localEffort]}
                  onValueChange={(value) => setLocalEffort(value[0])}
                  min={0}
                  max={6}
                  step={1}
                  className='py-1'
                />
                <p className='text-muted-foreground text-xs'>
                  Higher = smaller file, slower processing
                </p>
              </div>

              {/* Progressive JPEG - Only show for JPEG */}
              {settings.format === 'jpeg' && (
                <div className='flex items-center justify-between'>
                  <div>
                    <Label htmlFor='progressive' className='text-sm'>
                      Progressive JPEG
                    </Label>
                    <p className='text-muted-foreground mt-0.5 text-xs'>
                      Loads gradually instead of line by line
                    </p>
                  </div>
                  <Switch
                    id='progressive'
                    checked={settings.progressive}
                    onCheckedChange={(checked) => onSettingsChange({ progressive: checked })}
                  />
                </div>
              )}

              {/* Chroma Subsampling - Only for JPEG/WebP */}
              {(settings.format === 'jpeg' || settings.format === 'webp') && (
                <div className='space-y-2'>
                  <Label className='text-sm'>Chroma Subsampling</Label>
                  <Select
                    value={settings.chromaSubsampling}
                    onValueChange={(value) =>
                      onSettingsChange({
                        chromaSubsampling: value as '4:4:4' | '4:2:2' | '4:2:0',
                      })
                    }
                  >
                    <SelectTrigger className='h-8 w-full text-xs'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='4:4:4'>4:4:4 - Best quality</SelectItem>
                      <SelectItem value='4:2:2'>4:2:2 - Balanced</SelectItem>
                      <SelectItem value='4:2:0'>4:2:0 - Smallest size</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className='text-muted-foreground text-xs'>
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
