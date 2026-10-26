import type { ParsedMetadata } from '@/lib/metadataParser';
import { hasSignificantMetadata } from '@/lib/metadataParser';
import { cn } from '@/lib/utils';
import { Calendar, Camera, ChevronDown, MapPin, ShieldCheck, Wrench } from 'lucide-react';
import { useState, type ReactNode } from 'react';

interface MetadataViewerProps {
  metadata: ParsedMetadata | null;
}

export function MetadataViewer({ metadata }: MetadataViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!metadata || !hasSignificantMetadata(metadata)) {
    return (
      <div className='bg-card shadow-card flex items-center gap-3 rounded-2xl px-4 py-3.5 text-[15px]'>
        <ShieldCheck className='text-success size-5' />
        <span>No personal metadata found in this image.</span>
      </div>
    );
  }

  const { camera, location, dateTime, software } = metadata;
  const hasGps = location?.latitude !== undefined;

  return (
    <div className='bg-card shadow-card overflow-hidden rounded-2xl'>
      <button
        type='button'
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((v) => !v)}
        className='hover:bg-secondary/50 focus-visible:ring-ring flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors outline-none focus-visible:ring-4 focus-visible:ring-inset'
      >
        <ShieldCheck className='text-success size-5 shrink-0' />
        <span className='min-w-0 flex-1'>
          <span className='block text-[15px] font-medium'>Metadata will be removed</span>
          <span className='text-muted-foreground block truncate text-[13px]'>
            {[
              camera?.make && 'Camera',
              hasGps && 'GPS location',
              dateTime && 'Date',
              software && 'Software',
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'text-muted-foreground size-4 transition-transform',
            isExpanded && 'rotate-180',
          )}
        />
      </button>

      {isExpanded && (
        <div className='divide-hairline border-hairline motion-safe:animate-in motion-safe:fade-in divide-y border-t'>
          {camera && (
            <Section icon={<Camera />} title='Camera'>
              <Row label='Make' value={camera.make} />
              <Row label='Model' value={camera.model} />
              <Row label='Lens' value={camera.lens} />
              <Row label='ISO' value={camera.iso?.toString()} />
              <Row label='Aperture' value={camera.aperture} />
              <Row label='Shutter' value={camera.shutterSpeed} />
            </Section>
          )}
          {hasGps && (
            <Section icon={<MapPin />} title='Location' warning>
              <Row
                label='GPS'
                value={`${location!.latitude?.toFixed(4)}°, ${location!.longitude?.toFixed(4)}°`}
              />
              <Row
                label='Altitude'
                value={location!.altitude ? `${location!.altitude} m` : undefined}
              />
            </Section>
          )}
          {dateTime && (
            <Section icon={<Calendar />} title='Date & Time'>
              <Row label='Taken' value={new Date(dateTime).toLocaleString()} />
            </Section>
          )}
          {software && (
            <Section icon={<Wrench />} title='Software & Author'>
              <Row label='Software' value={software.software} />
              <Row label='Artist' value={software.artist} />
              <Row label='Copyright' value={software.copyright} />
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  warning,
  children,
}: {
  icon: ReactNode;
  title: string;
  warning?: boolean;
  children: ReactNode;
}) {
  return (
    <div className='space-y-1.5 px-4 py-3'>
      <div
        className={cn(
          'flex items-center gap-2 text-[13px] font-semibold [&_svg]:size-4',
          warning && 'text-destructive',
        )}
      >
        {icon}
        {title}
        {warning && <span className='font-normal'>· privacy risk</span>}
      </div>
      <dl className='space-y-1 pl-6'>{children}</dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className='flex justify-between gap-4 text-[13px]'>
      <dt className='text-muted-foreground'>{label}</dt>
      <dd className='max-w-[60%] truncate text-right'>{value}</dd>
    </div>
  );
}
