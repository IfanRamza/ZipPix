import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ArrowLeftRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface ComparisonSliderProps {
  originalUrl: string;
  compressedUrl: string | null;
  position?: number;
  onPositionChange?: (position: number) => void;
}

export function ComparisonSlider({
  originalUrl,
  compressedUrl,
  position = 50,
  onPositionChange,
}: ComparisonSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [localPosition, setLocalPosition] = useState(position);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    setLocalPosition(position);
  }, [position]);

  // Track container width for proper image sizing
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const updatePosition = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = (x / rect.width) * 100;
      setLocalPosition(percentage);
      onPositionChange?.(percentage);
    },
    [onPositionChange]
  );

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (isResizing) {
        updatePosition(e.clientX);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isResizing && e.touches[0]) {
        updatePosition(e.touches[0].clientX);
      }
    };

    const stopResizing = () => setIsResizing(false);

    if (isResizing) {
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", stopResizing);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", stopResizing);
    }

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", stopResizing);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", stopResizing);
    };
  }, [isResizing, updatePosition]);

  return (
    <Card className="relative overflow-hidden border-border/50 bg-background/40 backdrop-blur-xl rounded select-none group touch-none animate-in fade-in duration-300">
      <div
        ref={containerRef}
        className="relative w-full aspect-video cursor-ew-resize"
        onMouseDown={() => setIsResizing(true)}
        onTouchStart={() => setIsResizing(true)}
      >
        {/* Background: Compressed Image (Full width, always visible on right side) */}
        <div className="absolute inset-0 bg-black/20">
          {compressedUrl ? (
            <img
              src={compressedUrl}
              alt="Compressed"
              className="w-full h-full object-contain pointer-events-none"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-sm text-muted-foreground">
                Compressing...
              </span>
            </div>
          )}
        </div>

        {/* Foreground: Original Image (Clipped by slider position) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - localPosition}% 0 0)` }}
        >
          <img
            src={originalUrl}
            alt="Original"
            className="w-full h-full object-contain pointer-events-none"
            draggable={false}
          />
        </div>

        {/* Slider Handle */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-linear-to-b from-cyan-500/50 via-cyan-400 to-cyan-500/50 cursor-ew-resize z-10 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
          style={{ left: `${localPosition}%` }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background border-2 border-cyan-400 shadow-lg shadow-cyan-500/20 flex items-center justify-center transition-transform hover:scale-110 active:scale-95">
            <ArrowLeftRight className="w-5 h-5 text-cyan-400" />
          </div>
        </div>

        {/* Labels */}
        <Badge className="absolute top-4 left-4 bg-background/80 backdrop-blur rounded-sm pointer-events-none shadow-sm z-20">
          Original
        </Badge>
        <Badge className="absolute top-4 right-4 bg-background/80 backdrop-blur rounded-sm pointer-events-none shadow-sm z-20">
          Compressed
        </Badge>
      </div>
    </Card>
  );
}
