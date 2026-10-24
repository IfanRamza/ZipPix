import { ComparisonSlider } from '@/components/ComparisonSlider';
import { ControlPanel } from '@/components/ControlPanel';
import { FeatureGrid } from '@/components/FeatureGrid';
import { FilenameEditor } from '@/components/FilenameEditor';
import { ACCEPTED_TYPES, ImageUploader } from '@/components/ImageUploader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { MetadataViewer } from '@/components/MetadataViewer';
import { Hero, PageShell } from '@/components/PageShell';
import { StatsDisplay } from '@/components/StatsDisplay';
import { Button } from '@/components/ui/button';
import { useCompressionWorker } from '@/hooks/useCompressionWorker';
import { usePasteImages } from '@/hooks/usePasteImages';
import { getEditedSize } from '@/lib/editPipeline';
import { formatLabel, getFileExtension } from '@/lib/formats';
import { downloadFile } from '@/lib/image';
import { prepareImage, sourceOf, verifyImageFiles } from '@/lib/intake';
import { cn, defaultOutputBase } from '@/lib/utils';
import { useBatchStore } from '@/store/batchStore';
import { useImageStore } from '@/store/imageStore';
import type { EditState } from '@/types';
import { AlertTriangle, Download, ImagePlus, Info, SlidersHorizontal, Undo2 } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';

// The editor pulls in react-image-crop; load it only when opened
const ImageEditor = lazy(() => import('@/components/ImageEditor'));

function describeEdits(edit: EditState): string[] {
  const chips: string[] = [];
  if (edit.crop) chips.push(`Cropped ${edit.crop.width}×${edit.crop.height}`);
  if (edit.rotation) chips.push(`Rotated ${edit.rotation}°`);
  if (edit.flipHorizontal || edit.flipVertical) chips.push('Flipped');
  if (edit.brightness || edit.contrast || edit.saturation) chips.push('Adjusted');
  if (edit.removeBackground) chips.push('Background removed');
  return chips;
}

export function HomePage() {
  const { originalImage, editState, compressed, settings, status } = useImageStore(
    useShallow((s) => ({
      originalImage: s.originalImage,
      editState: s.editState,
      compressed: s.compressed,
      settings: s.settings,
      status: s.status,
    })),
  );
  const { setOriginalImage, updateSettings, resetSettings, resetEdits } = useImageStore(
    useShallow((s) => ({
      setOriginalImage: s.setOriginalImage,
      updateSettings: s.updateSettings,
      resetSettings: s.resetSettings,
      resetEdits: s.resetEdits,
    })),
  );

  const [isEditing, setIsEditing] = useState(false);
  const [outputBase, setOutputBase] = useState(() =>
    originalImage ? defaultOutputBase(originalImage.file.name) : '',
  );
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { compress } = useCompressionWorker();

  // Re-compress whenever the image, settings or edits change
  useEffect(() => {
    if (originalImage) compress(originalImage, settings, editState);
  }, [originalImage, settings, editState, compress]);

  const handleUpload = async (file: File) => {
    await setOriginalImage(file);
    setOutputBase(defaultOutputBase(file.name));
  };

  const handleReplace = async (file?: File) => {
    if (!file) return;
    try {
      const result = await prepareImage(file);
      if (result.ok) await handleUpload(result.file);
    } catch (error) {
      console.warn('Could not open image', error);
    }
  };

  // Several images at once: hand them to batch mode instead of dropping all but one
  const sendToBatch = async (files: File[]) => {
    const { verified } = await verifyImageFiles(files);
    if (!verified.length) return;
    useBatchStore.getState().addItems(verified);
    navigate('/batch');
  };

  // With an image open, pasting replaces it (the uploader handles paste before that)
  usePasteImages(
    (files) => void (files.length > 1 ? sendToBatch(files) : handleReplace(files[0])),
    !!originalImage && !isEditing,
  );

  const editedSize = useMemo(
    () => (originalImage ? getEditedSize(originalImage.dimensions, editState) : undefined),
    [originalImage, editState],
  );

  if (!originalImage) {
    return (
      <PageShell className='relative isolate pt-14 pb-20 sm:pt-20'>
        <div aria-hidden className='hero-glow absolute inset-x-0 top-0 -z-10 h-130' />
        <Hero
          title={
            <>
              Smaller images.
              <br />
              <span className='text-brand'>Nothing uploaded.</span>
            </>
          }
          subtitle='Compress, resize and convert right in your browser.'
        />
        <div className='motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 mx-auto mt-10 max-w-2xl duration-700'>
          <ImageUploader onUpload={handleUpload} onMultiple={sendToBatch} />
        </div>
        <FeatureGrid className='mx-auto mt-16 max-w-4xl' />
      </PageShell>
    );
  }

  const ext = getFileExtension(compressed?.format ?? settings.format);
  const formatMismatch = compressed && compressed.format !== settings.format;
  const busy = status.isCompressing || status.isRemovingBackground;
  const edits = describeEdits(editState);

  return (
    <PageShell className='py-6 sm:py-10'>
      {isEditing && (
        <Suspense
          fallback={
            <div className='fixed inset-0 z-50 flex items-center justify-center bg-black text-white'>
              <LoadingSpinner size={28} />
            </div>
          }
        >
          <ImageEditor
            file={originalImage.file}
            imageUrl={originalImage.previewUrl}
            onClose={() => setIsEditing(false)}
          />
        </Suspense>
      )}

      <input
        ref={replaceInputRef}
        type='file'
        className='hidden'
        accept={ACCEPTED_TYPES}
        aria-label='Choose another image'
        onChange={(e) => {
          handleReplace(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {/* Header */}
      <div className='mb-6 flex flex-wrap items-end justify-between gap-4'>
        <div className='min-w-0'>
          <h1 className='truncate text-[28px] font-semibold tracking-tight sm:text-[34px]'>
            {originalImage.file.name}
          </h1>
          <div className='mt-1 flex flex-wrap gap-1.5'>
            {edits.length === 0 ? (
              <span className='text-muted-foreground text-[15px]'>No edits</span>
            ) : (
              edits.map((chip) => (
                <span
                  key={chip}
                  className='bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-[12px] font-medium'
                >
                  {chip}
                </span>
              ))
            )}
          </div>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button variant='secondary' onClick={() => setIsEditing(true)}>
            <SlidersHorizontal />
            Edit
          </Button>
          {edits.length > 0 && (
            <Button variant='secondary' onClick={resetEdits}>
              <Undo2 />
              Revert
            </Button>
          )}
          <Button variant='secondary' onClick={() => replaceInputRef.current?.click()}>
            <ImagePlus />
            New Image
          </Button>
        </div>
      </div>

      <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8'>
        {/* Preview column */}
        <div className='min-w-0 space-y-4'>
          <ComparisonSlider
            original={originalImage}
            editState={editState}
            compressedUrl={compressed?.url ?? null}
            isCompressing={status.isCompressing}
            isRemovingBackground={status.isRemovingBackground}
          />
          <StatsDisplay
            originalSize={originalImage.size}
            compressedSize={compressed?.size}
            originalDimensions={originalImage.dimensions}
            compressedDimensions={compressed?.dimensions}
            originalFormat={sourceOf(originalImage.file).type}
            compressedFormat={compressed?.format}
            isCompressing={busy}
          />
          <MetadataViewer metadata={originalImage.metadata ?? null} />
        </div>

        {/* Inspector column */}
        <aside className='space-y-6 lg:sticky lg:top-20 lg:self-start'>
          <ControlPanel
            settings={settings}
            onSettingsChange={updateSettings}
            sourceDimensions={editedSize}
            onReset={resetSettings}
            result={compressed ?? undefined}
          />

          <div className='bg-card shadow-card space-y-4 rounded-3xl p-4'>
            <FilenameEditor
              key={originalImage.id}
              originalFilename={originalImage.file.name}
              format={compressed?.format ?? settings.format}
              onChange={setOutputBase}
            />
            <Button
              size='lg'
              className='w-full'
              disabled={!compressed || busy}
              onClick={() => compressed && downloadFile(compressed.url, `${outputBase}.${ext}`)}
            >
              {busy ? <LoadingSpinner size={18} /> : <Download className='size-5' />}
              {status.isRemovingBackground
                ? 'Removing background…'
                : busy
                  ? 'Compressing…'
                  : 'Download'}
            </Button>
          </div>

          {formatMismatch && (
            <Notice>
              Your browser can’t encode {formatLabel(settings.format)}, so this file was saved as{' '}
              {formatLabel(compressed.format)}.
            </Notice>
          )}
          {compressed?.reusedSource ? (
            <Notice tone='info'>
              Re-encoding wouldn’t make this image smaller, so your original file is kept. It has no
              metadata to strip.
            </Notice>
          ) : (
            compressed &&
            !busy &&
            compressed.size > originalImage.size && (
              <Notice>
                This file is larger than the original. Try a lower quality or another format.
              </Notice>
            )
          )}
          {status.error && <Notice tone='error'>{status.error}</Notice>}
        </aside>
      </div>
    </PageShell>
  );
}

function Notice({
  children,
  tone = 'warning',
}: {
  children: React.ReactNode;
  tone?: 'info' | 'warning' | 'error';
}) {
  const Icon = tone === 'info' ? Info : AlertTriangle;
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex gap-2 rounded-2xl p-4 text-[13px]', NOTICE_TONES[tone])}
    >
      <Icon className='size-4 shrink-0' />
      <span>{children}</span>
    </div>
  );
}

const NOTICE_TONES = {
  info: 'bg-secondary text-muted-foreground',
  warning: 'bg-warning/10 text-warning',
  error: 'bg-destructive/10 text-destructive',
};
