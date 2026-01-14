import exifr from "exifr";

export interface ImageMetadata {
  make?: string;
  model?: string;
  software?: string;
  dateTime?: string;
  gps?: {
    latitude: number;
    longitude: number;
  };
  orientation?: number;
  exposureTime?: number;
  fNumber?: number;
  iso?: number;
  focalLength?: number;
  copyright?: string;
  artist?: string;
}

/**
 * Extract metadata from image file
 */
export async function extractMetadata(
  file: File
): Promise<ImageMetadata | null> {
  try {
    const data = await exifr.parse(file, {
      gps: true,
      exif: true,
      iptc: true,
      xmp: true,
    });

    if (!data) return null;

    return {
      make: data.Make,
      model: data.Model,
      software: data.Software,
      dateTime:
        data.DateTimeOriginal?.toISOString() || data.CreateDate?.toISOString(),
      gps:
        data.latitude && data.longitude
          ? {
              latitude: data.latitude,
              longitude: data.longitude,
            }
          : undefined,
      orientation: data.Orientation,
      exposureTime: data.ExposureTime,
      fNumber: data.FNumber,
      iso: data.ISO,
      focalLength: data.FocalLength,
      copyright: data.Copyright,
      artist: data.Artist,
    };
  } catch {
    return null;
  }
}

/**
 * Check if image has metadata
 */
export async function hasMetadata(file: File): Promise<boolean> {
  try {
    const data = await exifr.parse(file);
    return !!data && Object.keys(data).length > 0;
  } catch {
    return false;
  }
}

/**
 * Check if image has GPS data
 */
export async function hasGpsData(file: File): Promise<boolean> {
  try {
    const gps = await exifr.gps(file);
    return !!gps;
  } catch {
    return false;
  }
}

/**
 * Strip metadata by re-encoding image through canvas
 * This is the most reliable way to remove ALL metadata
 */
export async function stripMetadata(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context not available"));
          return;
        }

        // Drawing to canvas automatically strips metadata
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to strip metadata"));
            }
          },
          file.type,
          1.0 // Maximum quality to preserve image
        );
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

/**
 * Get a summary of metadata for display
 */
export async function getMetadataSummary(file: File): Promise<string[]> {
  const metadata = await extractMetadata(file);
  if (!metadata) return [];

  const summary: string[] = [];

  if (metadata.make || metadata.model) {
    summary.push(
      `Camera: ${[metadata.make, metadata.model].filter(Boolean).join(" ")}`
    );
  }
  if (metadata.dateTime) {
    summary.push(`Date: ${new Date(metadata.dateTime).toLocaleDateString()}`);
  }
  if (metadata.gps) {
    summary.push(
      `GPS: ${metadata.gps.latitude.toFixed(
        4
      )}, ${metadata.gps.longitude.toFixed(4)}`
    );
  }
  if (metadata.software) {
    summary.push(`Software: ${metadata.software}`);
  }
  if (metadata.copyright || metadata.artist) {
    summary.push(`Creator: ${metadata.artist || metadata.copyright}`);
  }

  return summary;
}
