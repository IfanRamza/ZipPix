import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useImageStore } from '@/store/imageStore';
import { DEFAULT_EDIT_STATE, type EditState } from '@/types';
import {
  Check,
  Contrast,
  Crop,
  Eraser,
  FlipHorizontal,
  FlipVertical,
  Palette,
  RotateCcw,
  RotateCw,
  Sun,
  Undo2,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ReactCrop, { centerCrop, type Crop as CropType, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageEditorProps {
  imageUrl: string;
  onClose: () => void;
}

// Aspect ratio presets
const ASPECT_PRESETS = [
  { label: 'Free', value: undefined, icon: '🔓' },
  { label: '1:1', value: 1, icon: '⬜' },
  { label: '16:9', value: 16 / 9, icon: '🖥️' },
  { label: '9:16', value: 9 / 16, icon: '📱' },
  { label: '4:5', value: 4 / 5, icon: '📷' },
  { label: '4:3', value: 4 / 3, icon: '🖼️' },
];

// Generate preview URL from canvas with all edits applied
async function generatePreview(imageUrl: string, editState: EditState): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const { crop, rotation, flipHorizontal, flipVertical, brightness, contrast, saturation } =
        editState;

      // Determine source dimensions (after crop)
      const srcX = crop?.x ?? 0;
      const srcY = crop?.y ?? 0;
      const srcW = crop?.width ?? img.naturalWidth;
      const srcH = crop?.height ?? img.naturalHeight;

      // Determine if rotated 90 or 270 (dimensions swap)
      const isRotatedSideways = rotation === 90 || rotation === 270;
      const finalWidth = isRotatedSideways ? srcH : srcW;
      const finalHeight = isRotatedSideways ? srcW : srcH;

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = finalWidth;
      canvas.height = finalHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Apply transformations
      ctx.save();
      ctx.translate(finalWidth / 2, finalHeight / 2);

      // Apply rotation
      if (rotation !== 0) {
        ctx.rotate((rotation * Math.PI) / 180);
      }

      // Apply flips
      const scaleX = flipHorizontal ? -1 : 1;
      const scaleY = flipVertical ? -1 : 1;
      ctx.scale(scaleX, scaleY);

      // Draw the cropped portion centered
      ctx.drawImage(img, srcX, srcY, srcW, srcH, -srcW / 2, -srcH / 2, srcW, srcH);

      ctx.restore();

      // Apply color filters if any
      if (brightness !== 0 || contrast !== 0 || saturation !== 0) {
        const imageData = ctx.getImageData(0, 0, finalWidth, finalHeight);
        const data = imageData.data;

        const brightnessFactor = brightness / 100;
        const contrastFactor = (contrast + 100) / 100;
        const saturationFactor = (saturation + 100) / 100;

        for (let i = 0; i < data.length; i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];

          // Brightness
          r += 255 * brightnessFactor;
          g += 255 * brightnessFactor;
          b += 255 * brightnessFactor;

          // Contrast
          r = (r - 128) * contrastFactor + 128;
          g = (g - 128) * contrastFactor + 128;
          b = (b - 128) * contrastFactor + 128;

          // Saturation
          const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
          r = gray + saturationFactor * (r - gray);
          g = gray + saturationFactor * (g - gray);
          b = gray + saturationFactor * (b - gray);

          // Clamp
          data[i] = Math.max(0, Math.min(255, r));
          data[i + 1] = Math.max(0, Math.min(255, g));
          data[i + 2] = Math.max(0, Math.min(255, b));
        }

        ctx.putImageData(imageData, 0, 0);
      }

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

function hasAnyEdits(editState: EditState): boolean {
  return !!(
    editState.crop ||
    editState.rotation !== 0 ||
    editState.flipHorizontal ||
    editState.flipVertical ||
    editState.brightness !== 0 ||
    editState.contrast !== 0 ||
    editState.saturation !== 0 ||
    editState.removeBackground
  );
}

export function ImageEditor({ imageUrl, onClose }: ImageEditorProps) {
  // Get edit state from store
  const { editState, updateEditState } = useImageStore();

  // Local state for UI (synced to store on apply)
  const [localState, setLocalState] = useState<EditState>(editState);

  // Preview URL (generated from canvas for accurate crop preview)
  const [previewUrl, setPreviewUrl] = useState<string>(imageUrl);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  // Crop mode state
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
  const [customWidth, setCustomWidth] = useState('');
  const [customHeight, setCustomHeight] = useState('');

  // Sync local state from store when opening
  useEffect(() => {
    setLocalState(editState);
  }, [editState]);

  // Generate preview whenever localState changes (debounced)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (hasAnyEdits(localState)) {
        setIsGeneratingPreview(true);
        try {
          const url = await generatePreview(imageUrl, localState);
          setPreviewUrl(url);
        } catch (error) {
          console.error('Failed to generate preview:', error);
        } finally {
          setIsGeneratingPreview(false);
        }
      } else {
        setPreviewUrl(imageUrl);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [localState, imageUrl]);

  const handleRotate = (direction: 'cw' | 'ccw') => {
    setLocalState((prev) => {
      const rotations: (0 | 90 | 180 | 270)[] = [0, 90, 180, 270];
      const currentIndex = rotations.indexOf(prev.rotation);
      const newIndex = direction === 'cw' ? (currentIndex + 1) % 4 : (currentIndex - 1 + 4) % 4;
      return { ...prev, rotation: rotations[newIndex] };
    });
  };

  const handleFlip = (axis: 'horizontal' | 'vertical') => {
    setLocalState((prev) => ({
      ...prev,
      flipHorizontal: axis === 'horizontal' ? !prev.flipHorizontal : prev.flipHorizontal,
      flipVertical: axis === 'vertical' ? !prev.flipVertical : prev.flipVertical,
    }));
  };

  const handleLocalReset = () => {
    setLocalState(DEFAULT_EDIT_STATE);
    setPreviewUrl(imageUrl);
    setCrop(undefined);
    setCompletedCrop(undefined);
    setCustomWidth('');
    setCustomHeight('');
  };

  // Initialize crop when entering crop mode
  const handleEnterCropMode = () => {
    setIsCropMode(true);
    // Use percentage-based crop so it works regardless of image dimensions.
    // completedCrop (pixel-based) will be set in the crop image's onLoad.
    const percentCrop: CropType = { unit: '%', x: 10, y: 10, width: 80, height: 80 };
    setCrop(percentCrop);
    setCompletedCrop(undefined);
  };

  // Apply crop to local state
  const handleApplyCrop = () => {
    if (completedCrop && imgRef.current) {
      const img = imgRef.current;
      const scaleX = img.naturalWidth / img.width;
      const scaleY = img.naturalHeight / img.height;

      setLocalState((prev) => ({
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
        makeAspectCrop({ unit: 'px', width: width * 0.8 }, newAspect, width, height),
        width,
        height,
      );
      setCrop(newCrop);
      setCompletedCrop(newCrop);
    }
  };

  // Apply edits to store (non-destructive - just saves state)
  const handleApply = () => {
    updateEditState(localState);
    onClose();
  };

  // Cancel without saving
  const handleCancel = () => {
    onClose();
  };

  return (
    <div className='fixed inset-0 z-50 flex flex-col bg-linear-to-br from-[#0a0f14] via-[#12171d] to-[#0a0f14]'>
      {/* Header */}
      <div className='border-border/50 bg-background/40 flex items-center justify-between border-b p-4 backdrop-blur-xl'>
        <h2 className='text-lg font-semibold'>
          {isCropMode ? 'Crop Image' : 'Edit Image'}
          {isGeneratingPreview && (
            <span className='text-muted-foreground ml-2 text-sm'>(updating...)</span>
          )}
        </h2>
        <div className='flex gap-2'>
          {isCropMode ? (
            <>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setIsCropMode(false)}
                className='cursor-pointer'
              >
                <X className='mr-1 h-4 w-4' />
                Cancel
              </Button>
              <Button
                size='sm'
                onClick={handleApplyCrop}
                className='cursor-pointer bg-cyan-500 hover:bg-cyan-600'
              >
                <Check className='mr-1 h-4 w-4' />
                Apply Crop
              </Button>
            </>
          ) : (
            <>
              <Button
                variant='ghost'
                size='sm'
                onClick={handleLocalReset}
                className='cursor-pointer'
              >
                <Undo2 className='mr-1 h-4 w-4' />
                Reset
              </Button>
              <Button variant='ghost' size='sm' onClick={handleCancel} className='cursor-pointer'>
                <X className='mr-1 h-4 w-4' />
                Cancel
              </Button>
              <Button
                size='sm'
                onClick={handleApply}
                className='cursor-pointer bg-cyan-500 hover:bg-cyan-600'
              >
                <Check className='mr-1 h-4 w-4' />
                Apply
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className='flex flex-1 overflow-hidden'>
        {/* Preview */}
        <div className='flex flex-1 items-center justify-center overflow-hidden p-8'>
          {isCropMode ? (
            <div className='flex max-h-full max-w-full items-center justify-center overflow-hidden'>
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspect}
                style={{ maxHeight: '70vh', maxWidth: '100%' }}
              >
                <img
                  ref={imgRef}
                  src={imageUrl}
                  alt='Crop'
                  style={{
                    maxHeight: '70vh',
                    maxWidth: '100%',
                    objectFit: 'contain',
                  }}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    setImageNaturalSize({
                      width: img.naturalWidth,
                      height: img.naturalHeight,
                    });
                    // Initialize completedCrop with pixel values from the correct image
                    if (crop && crop.unit === '%') {
                      const pxCrop: CropType = {
                        unit: 'px',
                        x: (crop.x / 100) * img.width,
                        y: (crop.y / 100) * img.height,
                        width: (crop.width / 100) * img.width,
                        height: (crop.height / 100) * img.height,
                      };
                      setCompletedCrop(pxCrop);
                    }
                  }}
                />
              </ReactCrop>
            </div>
          ) : (
            <img
              ref={imgRef}
              src={previewUrl}
              alt='Preview'
              className='max-h-full max-w-full rounded object-contain shadow-2xl transition-all duration-200'
              onLoad={(e) => {
                const img = e.currentTarget;
                if (!hasAnyEdits(localState)) {
                  setImageNaturalSize({
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                  });
                }
              }}
            />
          )}
        </div>

        {/* Controls Sidebar */}
        <div className='border-border/50 w-80 space-y-6 overflow-y-auto border-l p-4'>
          {isCropMode ? (
            <>
              {/* Crop Controls */}
              <Card className='bg-background/40 border-border/50'>
                <CardContent className='space-y-4 p-4'>
                  <Label className='text-sm font-medium'>Aspect Ratio</Label>
                  <div className='grid grid-cols-3 gap-2'>
                    {ASPECT_PRESETS.map((preset) => (
                      <Button
                        key={preset.label}
                        variant={aspect === preset.value ? 'default' : 'outline'}
                        size='sm'
                        onClick={() => handleAspectChange(preset.value)}
                        className='cursor-pointer text-xs'
                      >
                        {preset.icon} {preset.label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Custom Size Input */}
              <Card className='bg-background/40 border-border/50'>
                <CardContent className='space-y-3 p-4'>
                  <Label className='text-sm font-medium'>Custom Size (px)</Label>
                  <div className='grid grid-cols-2 gap-2'>
                    <div>
                      <span className='text-muted-foreground text-[10px] uppercase'>Width</span>
                      <Input
                        type='number'
                        placeholder='Width'
                        value={customWidth}
                        onChange={(e) => {
                          setCustomWidth(e.target.value);
                          const w = parseInt(e.target.value);
                          const h = parseInt(customHeight);
                          if (w && h && imgRef.current) {
                            const scaleX = imgRef.current.width / imgRef.current.naturalWidth;
                            const scaleY = imgRef.current.height / imgRef.current.naturalHeight;
                            setCrop({
                              unit: 'px',
                              x: 0,
                              y: 0,
                              width: w * scaleX,
                              height: h * scaleY,
                            });
                            setAspect(undefined);
                          }
                        }}
                        className='h-8 font-mono text-sm'
                      />
                    </div>
                    <div>
                      <span className='text-muted-foreground text-[10px] uppercase'>Height</span>
                      <Input
                        type='number'
                        placeholder='Height'
                        value={customHeight}
                        onChange={(e) => {
                          setCustomHeight(e.target.value);
                          const w = parseInt(customWidth);
                          const h = parseInt(e.target.value);
                          if (w && h && imgRef.current) {
                            const scaleX = imgRef.current.width / imgRef.current.naturalWidth;
                            const scaleY = imgRef.current.height / imgRef.current.naturalHeight;
                            setCrop({
                              unit: 'px',
                              x: 0,
                              y: 0,
                              width: w * scaleX,
                              height: h * scaleY,
                            });
                            setAspect(undefined);
                          }
                        }}
                        className='h-8 font-mono text-sm'
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Crop Info */}
              <Card className='bg-background/40 border-border/50'>
                <CardContent className='space-y-2 p-4'>
                  <Label className='text-sm font-medium'>Crop Info</Label>
                  <div className='text-muted-foreground space-y-1 text-xs'>
                    <p>
                      Original: {imageNaturalSize.width} × {imageNaturalSize.height} px
                    </p>
                    {completedCrop && imgRef.current && (
                      <p className='text-cyan-400'>
                        Crop Area:{' '}
                        {Math.round(
                          completedCrop.width *
                            (imgRef.current.naturalWidth / imgRef.current.width),
                        )}{' '}
                        ×{' '}
                        {Math.round(
                          completedCrop.height *
                            (imgRef.current.naturalHeight / imgRef.current.height),
                        )}{' '}
                        px
                      </p>
                    )}
                  </div>
                  <p className='text-muted-foreground mt-2 text-center text-xs'>
                    Drag corners to adjust crop area
                  </p>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card className='bg-background/40 border-border/50 flex h-full flex-col'>
                <CardContent className='flex-1 space-y-5 overflow-y-auto p-4'>
                  {/* Crop */}
                  <div className='space-y-2'>
                    <Label className='text-sm font-medium'>Crop</Label>
                    <Button
                      variant='outline'
                      className='w-full cursor-pointer'
                      onClick={handleEnterCropMode}
                    >
                      <Crop className='mr-2 h-4 w-4' />
                      Crop Image
                    </Button>
                    {localState.crop && (
                      <p className='text-center text-xs text-green-400'>
                        ✓ Crop: {localState.crop.width}×{localState.crop.height} px
                      </p>
                    )}
                  </div>

                  <div className='border-border/30 border-t' />

                  {/* Remove Background */}
                  <div className='space-y-2'>
                    <Label className='text-sm font-medium'>Background</Label>
                    <Button
                      variant={localState.removeBackground ? 'default' : 'outline'}
                      className={`w-full cursor-pointer ${
                        localState.removeBackground
                          ? 'bg-violet-600 text-white hover:bg-violet-700'
                          : ''
                      }`}
                      onClick={() =>
                        setLocalState((prev) => ({
                          ...prev,
                          removeBackground: !prev.removeBackground,
                        }))
                      }
                    >
                      <Eraser className='mr-2 h-4 w-4' />
                      {localState.removeBackground ? 'BG Removal On' : 'Remove Background'}
                    </Button>
                    {localState.removeBackground && (
                      <p className='text-center text-xs text-violet-400'>
                        ✓ Background will be removed (AI-powered)
                      </p>
                    )}
                  </div>

                  <div className='border-border/30 border-t' />

                  {/* Transform */}
                  <div className='space-y-3'>
                    <Label className='text-sm font-medium'>Transform</Label>

                    <div className='flex gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => handleRotate('ccw')}
                        className='flex-1 cursor-pointer'
                      >
                        <RotateCcw className='mr-1 h-4 w-4' />
                        Left
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => handleRotate('cw')}
                        className='flex-1 cursor-pointer'
                      >
                        <RotateCw className='mr-1 h-4 w-4' />
                        Right
                      </Button>
                    </div>

                    <div className='flex gap-2'>
                      <Button
                        variant={localState.flipHorizontal ? 'default' : 'outline'}
                        size='sm'
                        onClick={() => handleFlip('horizontal')}
                        className='flex-1 cursor-pointer'
                      >
                        <FlipHorizontal className='mr-1 h-4 w-4' />
                        Flip H
                      </Button>
                      <Button
                        variant={localState.flipVertical ? 'default' : 'outline'}
                        size='sm'
                        onClick={() => handleFlip('vertical')}
                        className='flex-1 cursor-pointer'
                      >
                        <FlipVertical className='mr-1 h-4 w-4' />
                        Flip V
                      </Button>
                    </div>
                  </div>

                  <div className='border-border/30 border-t' />

                  {/* Adjustments */}
                  <div className='space-y-4'>
                    <Label className='text-sm font-medium'>Adjustments</Label>

                    {/* Brightness */}
                    <div className='space-y-2'>
                      <div className='flex items-center justify-between text-xs'>
                        <span className='flex items-center gap-1'>
                          <Sun className='h-3 w-3' /> Brightness
                        </span>
                        <span className='text-muted-foreground font-mono'>
                          {localState.brightness > 0 ? '+' : ''}
                          {localState.brightness}
                        </span>
                      </div>
                      <Slider
                        value={[localState.brightness]}
                        onValueChange={([v]) =>
                          setLocalState((prev) => ({ ...prev, brightness: v }))
                        }
                        min={-100}
                        max={100}
                        step={1}
                      />
                    </div>

                    {/* Contrast */}
                    <div className='space-y-2'>
                      <div className='flex items-center justify-between text-xs'>
                        <span className='flex items-center gap-1'>
                          <Contrast className='h-3 w-3' /> Contrast
                        </span>
                        <span className='text-muted-foreground font-mono'>
                          {localState.contrast > 0 ? '+' : ''}
                          {localState.contrast}
                        </span>
                      </div>
                      <Slider
                        value={[localState.contrast]}
                        onValueChange={([v]) => setLocalState((prev) => ({ ...prev, contrast: v }))}
                        min={-100}
                        max={100}
                        step={1}
                      />
                    </div>

                    {/* Saturation */}
                    <div className='space-y-2'>
                      <div className='flex items-center justify-between text-xs'>
                        <span className='flex items-center gap-1'>
                          <Palette className='h-3 w-3' /> Saturation
                        </span>
                        <span className='text-muted-foreground font-mono'>
                          {localState.saturation > 0 ? '+' : ''}
                          {localState.saturation}
                        </span>
                      </div>
                      <Slider
                        value={[localState.saturation]}
                        onValueChange={([v]) =>
                          setLocalState((prev) => ({ ...prev, saturation: v }))
                        }
                        min={-100}
                        max={100}
                        step={1}
                      />
                    </div>
                  </div>
                </CardContent>

                {/* Status Info */}
                <div className='border-border/30 border-t p-4'>
                  <p className='text-muted-foreground text-center text-xs'>
                    Rotation: {localState.rotation}° | Flip: {localState.flipHorizontal ? 'H' : ''}
                    {localState.flipVertical ? 'V' : ''}
                    {!localState.flipHorizontal && !localState.flipVertical ? 'None' : ''}
                  </p>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
