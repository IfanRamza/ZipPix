import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { calculateReduction, cn, formatBytes } from "@/lib/utils";
import { ArrowRight, Info, Shield, TrendingDown } from "lucide-react";

interface StatsDisplayProps {
  originalSize: number;
  compressedSize: number;
  originalDimensions: { width: number; height: number };
  compressedDimensions?: { width: number; height: number };
  isCompressing?: boolean;
}

export function StatsDisplay({
  originalSize,
  compressedSize,
  originalDimensions,
  compressedDimensions,
  isCompressing = false,
}: StatsDisplayProps) {
  const reduction = calculateReduction(originalSize, compressedSize);
  const isReduction = reduction > 0;

  return (
    <Card className="border-border/50 bg-linear-to-br from-background/60 to-background/40 backdrop-blur-xl rounded animate-in fade-in duration-300">
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 gap-6 relative">
          {/* Divider Arrow */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground/20">
            <ArrowRight className="w-6 h-6" />
          </div>

          {/* Original */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Original
            </p>
            <p className="text-2xl font-bold tracking-tight">
              {formatBytes(originalSize)}
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              {originalDimensions.width} × {originalDimensions.height}
            </p>
          </div>

          {/* Compressed */}
          <div className="space-y-1 text-right">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Compressed
            </p>
            <p className="text-2xl font-bold tracking-tight bg-linear-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              {isCompressing ? "..." : formatBytes(compressedSize)}
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              {compressedDimensions
                ? `${compressedDimensions.width} × ${compressedDimensions.height}`
                : `${originalDimensions.width} × ${originalDimensions.height}`}
            </p>
          </div>
        </div>

        <Separator className="my-4 bg-border/50" />

        {/* Reduction Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown
              className={cn(
                "w-4 h-4",
                isReduction ? "text-green-400" : "text-red-400"
              )}
            />
            <span className="text-sm font-medium">Size Reduction</span>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "rounded-sm font-mono text-sm border-none",
              isReduction
                ? "bg-green-500/10 text-green-400 ring-1 ring-green-500/20"
                : "bg-red-500/10 text-red-400 ring-1 ring-red-500/20"
            )}
          >
            {isCompressing ? "..." : `${reduction.toFixed(1)}%`}
          </Badge>
        </div>

        {/* Privacy Indicator */}
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground bg-cyan-500/5 p-2 rounded-sm border border-cyan-500/10">
          <Shield className="w-3.5 h-3.5 text-cyan-400" />
          <span>Metadata removed & privacy protected</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3 h-3 hover:text-foreground transition-colors" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs text-xs">
                All sensitive metadata (GPS, EXIF, Creator info) has been
                automatically stripped.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
