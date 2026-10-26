import { Group, GroupRow } from '@/components/ui/group';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/segmented';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { detectEncodeSupport, isLossless } from '@/lib/formats';
import { MAX_PALETTE_COLORS, MIN_PALETTE_COLORS } from '@/lib/palette';
import { MAX_TARGET_KB } from '@/lib/persistedSettings';
import { cn } from '@/lib/utils';
import type {
  AvifEffort,
  CompressedImageState,
  CompressionSettings,
  ImageDimensions,
  SupportedFormat,
} from '@/types';
import { useEffect, useRef, useState, type ReactNode } from 'react';

interface ControlPanelProps {
  settings: CompressionSettings;
  onSettingsChange: (settings: Partial<CompressionSettings>) => void;
  /** Size of the (edited) image. Enables custom dimensions when provided. */
  sourceDimensions?: ImageDimensions;
  onReset?: () => void;
  /** Latest encode result, used to explain what target-size mode picked */
  result?: Pick<CompressedImageState, 'quality' | 'targetMet' | 'reusedSource'>;
}

const DEFAULT_TARGET_KB = 200;

const PRESETS: { label: string; settings: Partial<CompressionSettings> }[] = [
  { label: 'Web', settings: { format: 'webp', quality: 82, webpLossless: undefined } },
  { label: 'Smallest', settings: { format: 'webp', quality: 60, webpLossless: undefined } },
  { label: 'Photo', settings: { format: 'jpeg', quality: 88 } },
  { label: 'Lossless', settings: { format: 'png', paletteColors: undefined } },
];

const SCALES = ['25', '50', '75', '100', '200'] as const;

const EFFORT_OPTIONS: { value: AvifEffort; label: string }[] = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'high', label: 'High' },
  { value: 'max', label: 'Max' },
];

const EFFORT_HINTS: Record<AvifEffort, string> = {
  balanced: '',
  high: 'High effort: ~3x slower, ~10% smaller.',
  max: 'Max effort: ~6x slower, ~20% smaller.',
};

const FORMAT_LABELS: Record<SupportedFormat, string> = {
  jpeg: 'JPEG',
  png: 'PNG',
  webp: 'WebP',
  avif: 'AVIF',
};

const FORMAT_HINTS: Record<SupportedFormat, string> = {
  jpeg: 'Best compatibility for photos. No transparency.',
  png: 'Transparency and sharp edges. Best for screenshots and graphics.',
  webp: 'Small files with transparency. Supported everywhere modern.',
  avif: 'Smallest files. Slower to encode; first use downloads a 3 MB encoder.',
};

function useEncodeSupport() {
  const [support, setSupport] = useState<Record<SupportedFormat, boolean> | null>(null);
  useEffect(() => {
    detectEncodeSupport().then(setSupport, () => undefined);
  }, []);
  return support;
}

/** Local value that commits upstream after the user pauses */
function useDebouncedCommit<T>(value: T, commit: (v: T) => void, delay = 150) {
  const [local, setLocal] = useState(value);
  const [prev, setPrev] = useState(value);
  const commitRef = useRef(commit);
  useEffect(() => {
    commitRef.current = commit;
  });
  if (value !== prev) {
    // Upstream changed (preset/reset): adopt it
    setPrev(value);
    setLocal(value);
  }
  useEffect(() => {
    if (local === value) return;
    const t = setTimeout(() => commitRef.current(local), delay);
    return () => clearTimeout(t);
  }, [local, value, delay]);
  // Commit right away (e.g. on blur) so a click straight after typing sees the new value
  const flush = () => {
    if (local !== value) commitRef.current(local);
  };
  return [local, setLocal, flush] as const;
}

export function ControlPanel({
  settings,
  onSettingsChange,
  sourceDimensions,
  onReset,
  result,
}: ControlPanelProps) {
  const support = useEncodeSupport();

  // Never sit on a format the browser would silently turn into PNG
  useEffect(() => {
    if (support && !support[settings.format]) onSettingsChange({ format: 'jpeg' });
  }, [support, settings.format, onSettingsChange]);

  const isCustom = !!(settings.width || settings.height);
  const [quality, setQuality] = useDebouncedCommit(settings.quality, (q) =>
    onSettingsChange({ quality: q }),
  );

  const lossless = isLossless(settings);
  const isPng = settings.format === 'png';
  const targetMode = !!settings.targetSize && !lossless;
  const [targetKb, setTargetKb, flushTargetKb] = useDebouncedCommit(
    String(Math.round((settings.targetSize ?? DEFAULT_TARGET_KB * 1024) / 1024)),
    (raw) => {
      const kb = parseInt(raw, 10);
      if (kb > 0) onSettingsChange({ targetSize: Math.min(kb, MAX_TARGET_KB) * 1024 });
    },
    400,
  );

  const [colors, setColors] = useDebouncedCommit(settings.paletteColors, (c) =>
    onSettingsChange({ paletteColors: c }),
  );

  let qualityFooter: ReactNode = 'Lower quality means a smaller file.';
  if (isPng && settings.paletteColors) {
    qualityFooter = 'Much smaller screenshots and graphics. Photos may show banding.';
  } else if (isPng) {
    qualityFooter = 'PNG is lossless. Reduce colours for a much smaller file.';
  } else if (lossless) {
    qualityFooter = 'Exact pixels, usually much smaller than PNG.';
  } else if (targetMode && !result?.quality) {
    qualityFooter = 'Picks the highest quality that fits.';
  } else if (targetMode && result?.reusedSource && result.targetMet) {
    qualityFooter = 'Your original already fits, so it is kept as-is.';
  } else if (targetMode && result?.targetMet) {
    qualityFooter = `Quality ${result.quality} is the highest that fits.`;
  } else if (targetMode) {
    qualityFooter = (
      <span className='text-warning'>
        Still too large at the lowest quality. Reduce the size
        {settings.format === 'avif' ? '' : ' or try AVIF'}.
      </span>
    );
  }

  const hasAdvanced = settings.format === 'jpeg' || settings.format === 'avif';
  const advancedFooter = [
    settings.fullChroma
      ? 'Sharp coloured text and edges (4:4:4); files are ~30–60% larger.'
      : 'Full colour detail keeps coloured text and edges crisp.',
    settings.format === 'avif' && EFFORT_HINTS[settings.avifEffort ?? 'balanced'],
  ]
    .filter(Boolean)
    .join(' ');

  const activePreset = PRESETS.find(
    (p) =>
      !settings.targetSize &&
      !(isPng && settings.paletteColors) &&
      !(settings.format === 'webp' && settings.webpLossless) &&
      p.settings.format === settings.format &&
      (p.settings.quality === undefined || p.settings.quality === settings.quality),
  )?.label;

  const formatOptions = (Object.keys(FORMAT_LABELS) as SupportedFormat[]).map((f) => ({
    value: f,
    label: FORMAT_LABELS[f],
    disabled: support ? !support[f] : false,
    title: support && !support[f] ? 'Your browser cannot encode this format' : undefined,
  }));

  const scaleValue = isCustom ? 'custom' : String(settings.scale);
  const scaleOptions = [
    ...SCALES.map((s) => ({ value: s as string, label: `${s}%` })),
    ...(sourceDimensions ? [{ value: 'custom', label: 'Custom' }] : []),
  ];

  const handleScale = (value: string) => {
    if (value === 'custom') {
      if (sourceDimensions) {
        onSettingsChange({ width: sourceDimensions.width, height: sourceDimensions.height });
      }
      return;
    }
    onSettingsChange({ scale: Number(value), width: undefined, height: undefined });
  };

  const handleDimension = (dim: 'width' | 'height', raw: string) => {
    const num = Math.max(0, Math.min(16384, parseInt(raw, 10) || 0)) || undefined;
    if (!settings.maintainAspectRatio || !sourceDimensions || !num) {
      onSettingsChange({ [dim]: num });
      return;
    }
    const aspect = sourceDimensions.width / sourceDimensions.height;
    onSettingsChange(
      dim === 'width'
        ? { width: num, height: Math.max(1, Math.round(num / aspect)) }
        : { height: num, width: Math.max(1, Math.round(num * aspect)) },
    );
  };

  return (
    <div className='space-y-6'>
      <Group
        title='Preset'
        action={
          onReset && (
            <button
              type='button'
              onClick={onReset}
              className='text-link text-[13px] hover:underline'
            >
              Reset
            </button>
          )
        }
      >
        <div className='flex flex-wrap gap-2 p-3'>
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type='button'
              aria-pressed={activePreset === preset.label}
              onClick={() => onSettingsChange({ ...preset.settings, targetSize: undefined })}
              className={cn(
                'focus-visible:ring-ring rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors outline-none focus-visible:ring-2',
                activePreset === preset.label
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary hover:bg-foreground/10',
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </Group>

      <Group title='Format' footer={FORMAT_HINTS[settings.format]}>
        <div className='p-3'>
          <SegmentedControl
            label='Output format'
            value={settings.format}
            options={formatOptions}
            onChange={(format) => onSettingsChange({ format })}
          />
        </div>
      </Group>

      <Group title='Quality' footer={qualityFooter}>
        {settings.format === 'webp' && (
          <GroupRow label='Lossless' htmlFor='webp-lossless'>
            <Switch
              id='webp-lossless'
              checked={!!settings.webpLossless}
              onCheckedChange={(checked) =>
                onSettingsChange({ webpLossless: checked || undefined })
              }
            />
          </GroupRow>
        )}
        {!lossless && (
          <div className='p-3'>
            <SegmentedControl
              label='Quality mode'
              size='sm'
              value={targetMode ? 'target' : 'quality'}
              options={[
                { value: 'quality', label: 'Quality' },
                { value: 'target', label: 'Target size' },
              ]}
              onChange={(mode) =>
                onSettingsChange({
                  targetSize: mode === 'target' ? DEFAULT_TARGET_KB * 1024 : undefined,
                })
              }
            />
          </div>
        )}
        {isPng ? (
          <>
            <GroupRow label='Reduce colours' htmlFor='reduce-palette'>
              <Switch
                id='reduce-palette'
                checked={!!settings.paletteColors}
                onCheckedChange={(checked) =>
                  onSettingsChange({ paletteColors: checked ? MAX_PALETTE_COLORS : undefined })
                }
              />
            </GroupRow>
            {colors !== undefined && (
              <div className='flex items-center gap-4 px-4 py-3'>
                <Slider
                  aria-label='Colours'
                  value={[colors]}
                  onValueChange={([v]) => setColors(v)}
                  min={MIN_PALETTE_COLORS}
                  max={MAX_PALETTE_COLORS}
                  step={1}
                />
                <span className='tabular w-10 text-right text-[15px] font-medium'>{colors}</span>
              </div>
            )}
          </>
        ) : lossless ? null : targetMode ? (
          <label className='flex items-center gap-3 px-4 py-3'>
            <span className='text-[15px]'>Max size</span>
            <Input
              type='number'
              inputMode='numeric'
              min={1}
              value={targetKb}
              onChange={(e) => setTargetKb(e.target.value)}
              onBlur={flushTargetKb}
              className='tabular ml-auto w-28 text-right'
              aria-label='Maximum file size in kilobytes'
            />
            <span className='text-muted-foreground text-[15px]'>KB</span>
          </label>
        ) : (
          <div className='flex items-center gap-4 px-4 py-3'>
            <Slider
              aria-label='Quality'
              value={[quality]}
              onValueChange={([v]) => setQuality(v)}
              min={1}
              max={100}
              step={1}
            />
            <span className='tabular w-10 text-right text-[15px] font-medium'>{quality}</span>
          </div>
        )}
      </Group>

      {hasAdvanced && (
        <Group title='Advanced' footer={advancedFooter}>
          <GroupRow label='Full colour detail' htmlFor='full-chroma'>
            <Switch
              id='full-chroma'
              checked={!!settings.fullChroma}
              onCheckedChange={(checked) => onSettingsChange({ fullChroma: checked || undefined })}
            />
          </GroupRow>
          {settings.format === 'avif' && (
            <div className='flex items-center gap-3 py-2.5 pr-3 pl-4'>
              <span className='text-[15px]' aria-hidden>
                Effort
              </span>
              <div className='flex-1'>
                <SegmentedControl
                  label='Encoding effort'
                  size='sm'
                  value={settings.avifEffort ?? 'balanced'}
                  options={EFFORT_OPTIONS}
                  onChange={(effort) =>
                    onSettingsChange({ avifEffort: effort === 'balanced' ? undefined : effort })
                  }
                />
              </div>
            </div>
          )}
        </Group>
      )}

      <Group title='Size'>
        <div className='p-3'>
          <SegmentedControl
            label='Resize'
            size='sm'
            value={scaleValue}
            options={scaleOptions}
            onChange={handleScale}
          />
        </div>
        {isCustom && sourceDimensions && (
          <>
            <div className='grid grid-cols-2 gap-3 px-4 py-3'>
              <label className='space-y-1'>
                <span className='text-muted-foreground text-[12px]'>Width</span>
                <Input
                  type='number'
                  inputMode='numeric'
                  min={1}
                  value={settings.width ?? ''}
                  onChange={(e) => handleDimension('width', e.target.value)}
                  className='tabular'
                />
              </label>
              <label className='space-y-1'>
                <span className='text-muted-foreground text-[12px]'>Height</span>
                <Input
                  type='number'
                  inputMode='numeric'
                  min={1}
                  value={settings.height ?? ''}
                  onChange={(e) => handleDimension('height', e.target.value)}
                  className='tabular'
                />
              </label>
            </div>
            <GroupRow label='Keep aspect ratio' htmlFor='keep-aspect'>
              <Switch
                id='keep-aspect'
                checked={settings.maintainAspectRatio}
                onCheckedChange={(checked) => onSettingsChange({ maintainAspectRatio: checked })}
              />
            </GroupRow>
          </>
        )}
      </Group>
    </div>
  );
}
