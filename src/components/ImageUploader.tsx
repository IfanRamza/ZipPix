import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, validateFileType } from "@/lib/utils";
import { AlertCircle, Upload } from "lucide-react";
import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";

interface ImageUploaderProps {
  onUpload: (file: File) => void;
  maxSize?: number; // in bytes
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function ImageUploader({
  onUpload,
  maxSize = MAX_FILE_SIZE,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setIsVerifying(true);

      // Validate type
      if (!validateFileType(file)) {
        setError(
          "Unsupported file format. Please use JPEG, PNG, WebP, AVIF, or GIF."
        );
        setIsVerifying(false);
        return;
      }

      // Security: Validate Magic Bytes
      try {
        const { validateFileSignature } = await import("@/lib/security");
        const isValidSignature = await validateFileSignature(file);

        if (!isValidSignature) {
          setError(
            "Security Alert: File content does not match its extension. Please allow valid image files only."
          );
          setIsVerifying(false);
          return;
        }
      } catch (e) {
        // Fallback or ignore if validation fails technically (e.g. 0 byte file)
        console.warn("Signature validation failed", e);
      }

      // Validate size
      if (file.size > maxSize) {
        setError(
          `File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit.`
        );
        setIsVerifying(false);
        return;
      }

      setIsVerifying(false);
      onUpload(file);
    },
    [maxSize, onUpload]
  );

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isVerifying) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (isVerifying) return;

    if (e.dataTransfer.files?.[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      processFile(e.target.files[0]);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto animate-in fade-in duration-500">
      <Card
        className={cn(
          "rounded border-2 border-dashed bg-background/40 backdrop-blur-xl transition-all duration-300 cursor-pointer",
          isDragging
            ? "border-cyan-500 bg-cyan-500/5 scale-[1.02]"
            : "border-border/50 hover:border-cyan-500/50",
          error && "border-red-500/50",
          isVerifying && "cursor-wait opacity-80"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isVerifying && fileInputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center py-16 px-4">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
            onChange={handleFileSelect}
            disabled={isVerifying}
          />

          <div
            className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-colors",
              isDragging
                ? "bg-cyan-500/20"
                : "bg-linear-to-br from-cyan-500/10 to-blue-500/10"
            )}
          >
            {isVerifying ? (
              <LoadingSpinner size={40} className="text-cyan-400" />
            ) : (
              <Upload
                className={cn(
                  "w-10 h-10 transition-all",
                  isDragging ? "text-cyan-400 scale-110" : "text-cyan-500/80"
                )}
              />
            )}
          </div>

          <h3 className="text-xl font-semibold mb-2">
            {isVerifying
              ? "Verifying file..."
              : isDragging
              ? "Drop it!"
              : "Drop your image here"}
          </h3>
          <p className="text-muted-foreground text-center mb-8">
            {isVerifying
              ? "Checking magic bytes & details"
              : "or click to browse"}
          </p>

          <Button
            size="lg"
            onClick={(e) => {
              e.stopPropagation();
              if (isVerifying) return;
              fileInputRef.current?.click();
            }}
            disabled={isVerifying}
            className="rounded-sm bg-linear-to-r from-cyan-500 to-blue-500 hover:opacity-90 shadow-lg shadow-cyan-500/25 min-w-[200px]"
          >
            {isVerifying ? (
              <>
                <LoadingSpinner className="mr-2 text-white" size={16} />
                Verifying...
              </>
            ) : (
              "Select Image"
            )}
          </Button>

          {error && (
            <div className="mt-6 flex items-center gap-2 text-red-400 animate-in fade-in bg-red-500/10 px-4 py-2 rounded-sm">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          <div className="mt-12 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
            {["JPEG", "PNG", "WebP", "AVIF", "GIF"].map((fmt) => (
              <Badge
                key={fmt}
                variant="outline"
                className="rounded-sm border-border/50 bg-background/50"
              >
                {fmt}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
