import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { strictSanitizeFilename } from '@/lib/security';
import type { SupportedFormat } from '@/types';
import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';

interface FilenameEditorProps {
  originalFilename: string;
  format: SupportedFormat;
  onChange?: (filename: string) => void;
}

export function FilenameEditor({ originalFilename, format, onChange }: FilenameEditorProps) {
  const [filename, setFilename] = useState(() => {
    const lastDot = originalFilename.lastIndexOf('.');
    const base = lastDot > 0 ? originalFilename.slice(0, lastDot) : originalFilename;
    return strictSanitizeFilename(`${base}_compressed.${format}`);
  });
  const [isCopied, setIsCopied] = useState(false);

  // Generate filename when original or format changes
  useEffect(() => {
    const lastDot = originalFilename.lastIndexOf('.');
    const base = lastDot > 0 ? originalFilename.slice(0, lastDot) : originalFilename;
    const newFilename = strictSanitizeFilename(`${base}_compressed.${format}`);
    setFilename(newFilename);
    onChange?.(newFilename);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originalFilename, format]);

  const handleChange = (value: string) => {
    setFilename(value);
  };

  const handleBlur = () => {
    // Sanitize on blur
    const sanitized = strictSanitizeFilename(filename);
    // Ensure correct extension
    const lastDot = sanitized.lastIndexOf('.');
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
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className='animate-in fade-in w-full space-y-2'>
      <Label className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
        Output Filename
      </Label>
      <div className='flex gap-2'>
        <Input
          value={filename}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          className='flex-1 font-mono text-sm'
        />
        <Button
          size='icon'
          variant='outline'
          onClick={handleCopy}
          title='Copy filename'
          className='shrink-0'
        >
          {isCopied ? <Check className='h-4 w-4 text-green-400' /> : <Copy className='h-4 w-4' />}
        </Button>
      </div>
    </div>
  );
}
