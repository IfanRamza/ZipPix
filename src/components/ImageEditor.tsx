import { Button } from '@/components/ui/button';
import { Group, GroupRow } from '@/components/ui/group';
import { SegmentedControl } from '@/components/ui/segmented';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { preloadBackgroundRemovalModel } from '@/lib/backgroundRemover';
import { buildCssFilter, hasGeometryEdits } from '@/lib/editPipeline';
import { renderPreview } from '@/lib/image';
import { cn } from '@/lib/utils';
import { useImageStore } from '@/store/imageStore';
import { DEFAULT_EDIT_STATE, type EditState } from '@/types';
import {
  RotateCcw,
  RotateCw,
  TrianglesCenterlineDashedHorizontal,
  TrianglesCenterlineDashedVertical,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop, type Crop as CropType } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageEditorProps {
  file: File;
  imageUrl: string;
  onClose: () => void;
}

type Tool = 'adjust' | 'crop';

const ASPECT_PRESETS: { label: string; value?: number }[] = [
  { label: 'Free' },
  { label: 'Square', value: 1 },
  { label: '16:9', value: 16 / 9 },
  { label: '4:3', value: 4 / 3 },
  { label: '4:5', value: 4 / 5 },
  { label: '9:16', value: 9 / 16 },
];

const ADJUSTMENTS = [
  { key: 'brightness', label: 'Brightness' },
  { key: 'contrast', label: 'Contrast' },
  { key: 'saturation', label: 'Saturation' },
] as const;

/** Geometry-only preview (crop/rotate/flip), downscaled; colour is applied via CSS */
function useGeometryPreview(file: File, imageUrl: string, edit: EditState) {
  const geometry = useMemo(
    () => ({
      ...DEFAULT_EDIT_STATE,
      crop: edit.crop,
      rotation: edit.rotation,
      flipHorizontal: edit.flipHorizontal,
      flipVertical: edit.flipVertical,
    }),
    [edit.crop, edit.rotation, edit.flipHorizontal, edit.flipVertical],
  );
  const needsRender = hasGeometryEdits(geometry);
  const [url, setUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!needsRender) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      renderPreview(file, geometry, 1600)
        .then((result) => {
          if (cancelled) return URL.revokeObjectURL(result.url);
          if (urlRef.current) URL.revokeObjectURL(urlRef.current);
          urlRef.current = result.url;
          setUrl(result.url);
        })
        .catch((error) => console.error('Preview failed', error));
    }, 60);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [file, geometry, needsRender]);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  return needsRender ? (url ?? imageUrl) : imageUrl;
}

export default function ImageEditor({ file, imageUrl, onClose }: ImageEditorProps) {
  const storedEdit = useImageStore((s) => s.editState);
  const updateEditState = useImageStore((s) => s.updateEditState);

  const [edit, setEdit] = useState<EditState>(storedEdit);
  const [tool, setTool] = useState<Tool>('adjust');
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<CropType>();
  const [aspect, setAspect] = useState<number | undefined>();
  const cropImgRef = useRef<HTMLImageElement>(null);

  const previewUrl = useGeometryPreview(file, imageUrl, edit);
  const cssFilter = buildCssFilter(edit);

  // Opening the editor is a strong intent signal: warm up the AI model now
  useEffect(() => preloadBackgroundRemovalModel(), []);

  // Escape closes, like a native sheet
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const patch = (p: Partial<EditState>) => setEdit((prev) => ({ ...prev, ...p }));

  const rotate = (dir: 1 | -1) =>
    setEdit((prev) => ({
      ...prev,
      rotation: ((((prev.rotation + dir * 90) % 360) + 360) % 360) as EditState['rotation'],
    }));

  const enterCrop = () => {
    setTool('crop');
    setCrop({ unit: '%', x: 5, y: 5, width: 90, height: 90 });
    setAspect(undefined);
  };

  /** Current crop selection in source-image pixels */
  const selectedCrop = (): EditState['crop'] => {
    const img = cropImgRef.current;
    if (!completedCrop || !img || completedCrop.width <= 0 || completedCrop.height <= 0) {
      return undefined;
    }
    const sx = img.naturalWidth / img.width;
    const sy = img.naturalHeight / img.height;
    return {
      x: Math.round(completedCrop.x * sx),
      y: Math.round(completedCrop.y * sy),
      width: Math.max(1, Math.round(completedCrop.width * sx)),
      height: Math.max(1, Math.round(completedCrop.height * sy)),
    };
  };

  const commitCrop = () => {
    const next = selectedCrop();
    if (next) patch({ crop: next });
    setTool('adjust');
  };

  const changeAspect = (label: string) => {
    const preset = ASPECT_PRESETS.find((p) => p.label === label);
    setAspect(preset?.value);
    const img = cropImgRef.current;
    if (img && preset?.value) {
      const next = centerCrop(
        makeAspectCrop({ unit: '%', width: 90 }, preset.value, img.width, img.height),
        img.width,
        img.height,
      );
      setCrop(next);
      setCompletedCrop({
        unit: 'px',
        x: (next.x / 100) * img.width,
        y: (next.y / 100) * img.height,
        width: (next.width / 100) * img.width,
        height: (next.height / 100) * img.height,
      });
    }
  };

  const done = () => {
    const finalCrop = tool === 'crop' ? (selectedCrop() ?? edit.crop) : edit.crop;
    updateEditState({ ...edit, crop: finalCrop });
    onClose();
  };

  const aspectLabel = ASPECT_PRESETS.find((p) => p.value === aspect)?.label ?? 'Free';

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-label='Edit image'
      className='motion-safe:animate-in motion-safe:fade-in editor-theme text-foreground fixed inset-0 z-50 flex flex-col bg-black duration-200'
    >
      {/* Top bar */}
      <div className='flex h-13 shrink-0 items-center justify-between px-3 sm:px-5'>
        <Button variant='ghost' onClick={onClose}>
          Cancel
        </Button>
        <SegmentedControl<Tool>
          label='Editing tool'
          value={tool}
          onChange={(t) => (t === 'crop' ? enterCrop() : commitCrop())}
          options={[
            { value: 'adjust', label: 'Adjust' },
            { value: 'crop', label: 'Crop' },
          ]}
          className='w-48 bg-white/12 [&_[aria-checked=true]]:bg-[#636366] [&_[aria-checked=true]]:text-white [&_button]:text-white/80'
        />
        <Button onClick={done} className='font-semibold'>
          Done
        </Button>
      </div>

      <div className='flex min-h-0 flex-1 flex-col md:flex-row'>
        {/* Canvas */}
        <div className='flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4 md:p-8'>
          {tool === 'crop' ? (
            <ReactCrop
              crop={crop}
              onChange={(_, percent) => setCrop(percent)}
              onComplete={(px) => setCompletedCrop(px)}
              aspect={aspect}
              keepSelection
              className='max-h-full'
            >
              <img
                ref={cropImgRef}
                src={imageUrl}
                alt='Crop area'
                className='block max-h-[calc(100dvh-20rem)] max-w-full object-contain md:max-h-[calc(100dvh-8rem)]'
                onLoad={(e) => {
                  const img = e.currentTarget;
                  setCompletedCrop({
                    unit: 'px',
                    x: img.width * 0.05,
                    y: img.height * 0.05,
                    width: img.width * 0.9,
                    height: img.height * 0.9,
                  });
                }}
              />
            </ReactCrop>
          ) : (
            <img
              src={previewUrl}
              alt='Edited preview'
              style={{ filter: cssFilter === 'none' ? undefined : cssFilter }}
              className='max-h-full max-w-full rounded-lg object-contain shadow-2xl'
            />
          )}
        </div>

        {/* Inspector */}
        <aside className='border-hairline max-h-[42dvh] shrink-0 overflow-y-auto border-t p-4 md:max-h-none md:w-80 md:border-t-0 md:border-l md:p-5'>
          {tool === 'crop' ? (
            <div className='space-y-5'>
              <Group title='Aspect ratio'>
                <div className='grid grid-cols-3 gap-2 p-3'>
                  {ASPECT_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type='button'
                      aria-pressed={aspectLabel === p.label}
                      onClick={() => changeAspect(p.label)}
                      className={cn(
                        'rounded-full py-1.5 text-[13px] font-medium transition-colors',
                        aspectLabel === p.label
                          ? 'bg-primary text-white'
                          : 'bg-white/10 hover:bg-white/15',
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </Group>
              <div className='flex gap-2'>
                <Button variant='secondary' className='flex-1' onClick={() => setTool('adjust')}>
                  Cancel crop
                </Button>
                <Button className='flex-1' onClick={commitCrop}>
                  Apply crop
                </Button>
              </div>
              {edit.crop && (
                <button
                  type='button'
                  onClick={() => {
                    patch({ crop: undefined });
                    setTool('adjust');
                  }}
                  className='text-link w-full text-center text-[13px] hover:underline'
                >
                  Remove existing crop
                </button>
              )}
            </div>
          ) : (
            <div className='space-y-5'>
              <Group title='Transform'>
                <div className='grid grid-cols-4 gap-2 p-3'>
                  <ToolButton label='Rotate left' onClick={() => rotate(-1)}>
                    <RotateCcw />
                  </ToolButton>
                  <ToolButton label='Rotate right' onClick={() => rotate(1)}>
                    <RotateCw />
                  </ToolButton>
                  <ToolButton
                    label='Flip horizontal'
                    active={edit.flipHorizontal}
                    onClick={() => patch({ flipHorizontal: !edit.flipHorizontal })}
                  >
                    <TrianglesCenterlineDashedVertical />
                  </ToolButton>
                  <ToolButton
                    label='Flip vertical'
                    active={edit.flipVertical}
                    onClick={() => patch({ flipVertical: !edit.flipVertical })}
                  >
                    <TrianglesCenterlineDashedHorizontal />
                  </ToolButton>
                </div>
              </Group>

              <Group title='Light & Color'>
                {ADJUSTMENTS.map(({ key, label }) => (
                  <div key={key} className='space-y-1 px-4 py-3'>
                    <div className='flex justify-between text-[13px]'>
                      <span>{label}</span>
                      <button
                        type='button'
                        onClick={() => patch({ [key]: 0 })}
                        className={cn('tabular text-white/60', edit[key] !== 0 && 'text-primary')}
                        aria-label={`Reset ${label.toLowerCase()}`}
                      >
                        {edit[key] > 0 ? '+' : ''}
                        {edit[key]}
                      </button>
                    </div>
                    <Slider
                      aria-label={label}
                      value={[edit[key]]}
                      onValueChange={([v]) => patch({ [key]: v })}
                      min={-100}
                      max={100}
                      step={1}
                    />
                  </div>
                ))}
              </Group>

              <Group
                title='Background'
                footer='Runs an AI model on your device. The first use downloads it (~40 MB).'
              >
                <GroupRow label='Remove background' htmlFor='remove-bg'>
                  <Switch
                    id='remove-bg'
                    checked={edit.removeBackground}
                    onCheckedChange={(checked) => patch({ removeBackground: checked })}
                  />
                </GroupRow>
              </Group>

              <button
                type='button'
                onClick={() => setEdit(DEFAULT_EDIT_STATE)}
                className='w-full text-center text-[15px] text-[#ff453a] hover:underline'
              >
                Revert to original
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function ToolButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type='button'
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'focus-visible:ring-ring flex h-11 items-center justify-center rounded-xl transition-colors outline-none focus-visible:ring-2 [&_svg]:size-5',
        active ? 'bg-primary text-white' : 'bg-white/10 hover:bg-white/15',
      )}
    >
      {children}
    </button>
  );
}
