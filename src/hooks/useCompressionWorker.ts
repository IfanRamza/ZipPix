import { useImageStore } from "@/store/imageStore";
import type { CompressionSettings, EditState } from "@/types";
import { useCallback, useEffect, useRef } from "react";

interface CompressionResponse {
  type: "SUCCESS" | "ERROR" | "PROGRESS";
  id: string;
  blob?: Blob;
  error?: string;
  progress?: number;
}

/**
 * Hook for using compression worker with non-destructive edit support
 */
export function useCompressionWorker() {
  const workerRef = useRef<Worker | null>(null);
  const { setCompressedImage, setError, setProcessing } = useImageStore();

  // Initialize worker
  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../workers/compression.worker.ts", import.meta.url),
      { type: "module" }
    );

    workerRef.current.onmessage = (
      event: MessageEvent<CompressionResponse>
    ) => {
      const { type, blob, error } = event.data;

      switch (type) {
        case "SUCCESS":
          if (blob) {
            setCompressedImage(blob);
          }
          break;
        case "ERROR":
          setError(error || "Compression failed");
          break;
        case "PROGRESS":
          // Could update progress state here
          break;
      }
    };

    workerRef.current.onerror = (error) => {
      setError(`Worker error: ${error.message}`);
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, [setCompressedImage, setError]);

  // Compress function with edit state support
  const compress = useCallback(
    async (
      file: File,
      settings: CompressionSettings,
      editState?: EditState
    ) => {
      if (!workerRef.current) {
        setError("Worker not initialized");
        return;
      }

      setProcessing(true);

      try {
        const arrayBuffer = await file.arrayBuffer();

        workerRef.current.postMessage({
          type: "COMPRESS",
          id: Date.now().toString(),
          imageData: arrayBuffer,
          fileName: file.name,
          fileType: file.type,
          settings,
          editState, // Pass edit state to worker
        });
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Failed to read file"
        );
      }
    },
    [setError, setProcessing]
  );

  return { compress };
}
