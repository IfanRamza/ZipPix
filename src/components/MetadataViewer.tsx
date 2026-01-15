import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ParsedMetadata } from "@/lib/metadataParser";
import { hasSignificantMetadata } from "@/lib/metadataParser";
import {
  Calendar,
  Camera,
  ChevronDown,
  ChevronUp,
  MapPin,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { useState } from "react";

interface MetadataViewerProps {
  metadata: ParsedMetadata | null;
  willBeStripped?: boolean;
}

export function MetadataViewer({
  metadata,
  willBeStripped = true,
}: MetadataViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!hasSignificantMetadata(metadata)) {
    return (
      <Card className="border-border/50 bg-background/40 backdrop-blur-xl">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <ShieldAlert className="w-4 h-4 text-green-400" />
            <span>No metadata detected in this image</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-background/40 backdrop-blur-xl">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <Button
          variant="ghost"
          className="w-full flex items-center justify-between p-0 h-auto hover:bg-transparent"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span className="font-medium text-sm">Metadata Detected</span>
            {willBeStripped && (
              <Badge
                variant="outline"
                className="text-xs border-amber-500/50 text-amber-400"
              >
                Will be stripped
              </Badge>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </Button>

        {/* Collapsed Summary */}
        {!isExpanded && (
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {metadata?.camera?.make && (
              <span className="flex items-center gap-1">
                <Camera className="w-3 h-3" />
                {metadata.camera.make}
              </span>
            )}
            {metadata?.location?.latitude && (
              <span className="flex items-center gap-1 text-red-400">
                <MapPin className="w-3 h-3" />
                GPS Data
              </span>
            )}
            {metadata?.dateTime && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Date Info
              </span>
            )}
          </div>
        )}

        {/* Expanded Details */}
        {isExpanded && (
          <div className="space-y-4 pt-2 border-t border-border/50 animate-in fade-in slide-in-from-top-2">
            {/* Camera Info */}
            {metadata?.camera &&
              (metadata.camera.make || metadata.camera.model) && (
                <MetadataSection
                  icon={<Camera className="w-4 h-4" />}
                  title="Camera"
                >
                  {metadata.camera.make && (
                    <MetadataRow label="Make" value={metadata.camera.make} />
                  )}
                  {metadata.camera.model && (
                    <MetadataRow label="Model" value={metadata.camera.model} />
                  )}
                  {metadata.camera.lens && (
                    <MetadataRow label="Lens" value={metadata.camera.lens} />
                  )}
                  {metadata.camera.iso && (
                    <MetadataRow
                      label="ISO"
                      value={metadata.camera.iso.toString()}
                    />
                  )}
                  {metadata.camera.aperture && (
                    <MetadataRow
                      label="Aperture"
                      value={metadata.camera.aperture}
                    />
                  )}
                  {metadata.camera.shutterSpeed && (
                    <MetadataRow
                      label="Shutter"
                      value={metadata.camera.shutterSpeed}
                    />
                  )}
                </MetadataSection>
              )}

            {/* Location - Warning Style */}
            {metadata?.location?.latitude && (
              <MetadataSection
                icon={<MapPin className="w-4 h-4 text-red-400" />}
                title="Location (Privacy Risk)"
                warning
              >
                <MetadataRow
                  label="GPS"
                  value={`${metadata.location.latitude?.toFixed(
                    4
                  )}°, ${metadata.location.longitude?.toFixed(4)}°`}
                />
                {metadata.location.altitude && (
                  <MetadataRow
                    label="Altitude"
                    value={`${metadata.location.altitude}m`}
                  />
                )}
              </MetadataSection>
            )}

            {/* Date/Time */}
            {metadata?.dateTime && (
              <MetadataSection
                icon={<Calendar className="w-4 h-4" />}
                title="Date & Time"
              >
                <MetadataRow
                  label="Taken"
                  value={new Date(metadata.dateTime).toLocaleString()}
                />
              </MetadataSection>
            )}

            {/* Software */}
            {metadata?.software &&
              (metadata.software.software || metadata.software.artist) && (
                <MetadataSection
                  icon={<Wrench className="w-4 h-4" />}
                  title="Software & Author"
                >
                  {metadata.software.software && (
                    <MetadataRow
                      label="Software"
                      value={metadata.software.software}
                    />
                  )}
                  {metadata.software.artist && (
                    <MetadataRow
                      label="Artist"
                      value={metadata.software.artist}
                    />
                  )}
                  {metadata.software.copyright && (
                    <MetadataRow
                      label="Copyright"
                      value={metadata.software.copyright}
                    />
                  )}
                </MetadataSection>
              )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper Components
function MetadataSection({
  icon,
  title,
  warning,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  warning?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`space-y-2 p-3 rounded ${
        warning ? "bg-red-500/10 border border-red-500/20" : "bg-background/50"
      }`}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {title}
      </div>
      <div className="space-y-1 pl-6">{children}</div>
    </div>
  );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground truncate max-w-[200px]">
        {value}
      </span>
    </div>
  );
}
