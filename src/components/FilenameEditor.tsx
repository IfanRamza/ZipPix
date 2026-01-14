import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { strictSanitizeFilename } from "@/lib/security";
import type { SupportedFormat } from "@/types";
import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

interface FilenameEditorProps {
  originalFilename: string;
  format: SupportedFormat;
  onChange?: (filename: string) => void;
}

export function FilenameEditor({
  originalFilename,
  format,
  onChange,
}: FilenameEditorProps) {
  const [filename, setFilename] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  // Generate filename when original or format changes
  useEffect(() => {
    const lastDot = originalFilename.lastIndexOf(".");
    const base =
      lastDot > 0 ? originalFilename.slice(0, lastDot) : originalFilename;
    const newFilename = strictSanitizeFilename(`${base}_compressed.${format}`);
    setFilename(newFilename);
    onChange?.(newFilename);
  }, [originalFilename, format, onChange]);

  const handleChange = (value: string) => {
    setFilename(value);
  };

  const handleBlur = () => {
    // Sanitize on blur
    const sanitized = strictSanitizeFilename(filename);
    // Ensure correct extension
    const lastDot = sanitized.lastIndexOf(".");
    const base = lastDot > 0 ? sanitized.slice(0, lastDot) : sanitized;
    const finalFilename = `${base}.${format}`;
    setFilename(finalFilename);
    onChange?.(finalFilename);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(filename);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <div className="space-y-2 w-full animate-in fade-in">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Output Filename
      </Label>
      <div className="flex gap-2">
        <Input
          value={filename}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          className="font-mono text-sm flex-1"
        />
        <Button
          size="icon"
          variant="outline"
          onClick={handleCopy}
          title="Copy filename"
          className="shrink-0"
        >
          {isCopied ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
