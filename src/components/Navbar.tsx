import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Upload } from "lucide-react";

interface NavbarProps {
  onUploadClick?: () => void;
}

export function Navbar({ onUploadClick }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-xl">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-linear-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <ImageIcon className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-linear-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            ZipPix
          </h1>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={onUploadClick}
            className="rounded-sm bg-linear-to-r from-cyan-500 to-blue-500 hover:opacity-90 shadow-lg shadow-cyan-500/20 transition-all hover:scale-105"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Image
          </Button>
        </div>
      </div>
    </header>
  );
}
