import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Layers, Upload } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

interface NavbarProps {
  onUploadClick?: () => void;
  showBatchLink?: boolean;
}

export function Navbar({ onUploadClick }: NavbarProps) {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isBatch = location.pathname === "/batch";

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-xl">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded bg-linear-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <ImageIcon className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-linear-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            ZipPix
          </h1>
        </Link>

        {/* Mode Switcher & Actions */}
        <div className="flex items-center gap-3">
          {/* Mode Toggle */}
          <div className="flex items-center bg-background/50 rounded-lg p-1 border border-border/50">
            <Link to="/">
              <Button
                variant={isHome ? "default" : "ghost"}
                size="sm"
                className={`rounded cursor-pointer ${
                  isHome ? "bg-cyan-500/20 text-cyan-400" : ""
                }`}
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Single
              </Button>
            </Link>
            <Link to="/batch">
              <Button
                variant={isBatch ? "default" : "ghost"}
                size="sm"
                className={`rounded cursor-pointer ${
                  isBatch ? "bg-cyan-500/20 text-cyan-400" : ""
                }`}
              >
                <Layers className="w-4 h-4 mr-2" />
                Batch
              </Button>
            </Link>
          </div>

          {/* Upload Button (only on home) */}
          {isHome && onUploadClick && (
            <Button
              size="sm"
              onClick={onUploadClick}
              className="rounded-sm bg-linear-to-r from-cyan-500 to-blue-500 hover:opacity-90 shadow-lg shadow-cyan-500/20 transition-all hover:scale-105 cursor-pointer"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Image
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
