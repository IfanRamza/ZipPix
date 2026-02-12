import exifr from 'exifr';

export interface ParsedMetadata {
  camera?: {
    make?: string;
    model?: string;
    lens?: string;
    iso?: number;
    aperture?: string;
    shutterSpeed?: string;
  };
  location?: {
    latitude?: number;
    longitude?: number;
    altitude?: number;
  };
  dateTime?: string;
  software?: {
    software?: string;
    copyright?: string;
    artist?: string;
  };
  dimensions?: {
    width?: number;
    height?: number;
  };
  raw?: Record<string, unknown>;
}

/**
 * Parse EXIF/IPTC/XMP metadata from an image file
 */
export async function parseMetadata(file: File): Promise<ParsedMetadata | null> {
  try {
    const data = await exifr.parse(file, {
      // Include all metadata segments
      tiff: true,
      exif: true,
      gps: true,
      ifd1: true,
      iptc: true,
      xmp: true,
      icc: false, // Skip color profiles for performance
    });

    if (!data) return null;

    const metadata: ParsedMetadata = {
      camera: {
        make: data.Make,
        model: data.Model,
        lens: data.LensModel || data.Lens,
        iso: data.ISO,
        aperture: data.FNumber ? `f/${data.FNumber}` : undefined,
        shutterSpeed: data.ExposureTime ? `1/${Math.round(1 / data.ExposureTime)}s` : undefined,
      },
      location:
        data.latitude || data.longitude
          ? {
              latitude: data.latitude,
              longitude: data.longitude,
              altitude: data.GPSAltitude,
            }
          : undefined,
      dateTime: data.DateTimeOriginal?.toISOString?.() || data.CreateDate?.toISOString?.(),
      software: {
        software: data.Software,
        copyright: data.Copyright,
        artist: data.Artist,
      },
      dimensions: {
        width: data.ImageWidth || data.ExifImageWidth,
        height: data.ImageHeight || data.ExifImageHeight,
      },
      raw: data,
    };

    // Clean up empty objects
    if (!metadata.camera?.make && !metadata.camera?.model) {
      metadata.camera = undefined;
    }
    if (!metadata.software?.software && !metadata.software?.copyright) {
      metadata.software = undefined;
    }

    return metadata;
  } catch (error) {
    console.warn('Failed to parse metadata:', error);
    return null;
  }
}

/**
 * Check if metadata contains any significant data worth displaying
 */
export function hasSignificantMetadata(metadata: ParsedMetadata | null): boolean {
  if (!metadata) return false;
  return !!(
    metadata.camera?.make ||
    metadata.camera?.model ||
    metadata.location?.latitude ||
    metadata.dateTime ||
    metadata.software?.software
  );
}
