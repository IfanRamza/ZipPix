import { Input } from '@/components/ui/input';
import { getFileExtension } from '@/lib/formats';
import { strictSanitizeFilename } from '@/lib/security';
import { defaultOutputBase } from '@/lib/utils';
import type { SupportedFormat } from '@/types';
import { useState } from 'react';

interface FilenameEditorProps {
  originalFilename: string;
  format: SupportedFormat;
  onChange: (filename: string) => void;
}

function baseName(name: string) {
  const lastDot = name.lastIndexOf('.');
  return lastDot > 0 ? name.slice(0, lastDot) : name;
}

/** Edits the base name; the extension always follows the output format */
export function FilenameEditor({ originalFilename, format, onChange }: FilenameEditorProps) {
  const [base, setBase] = useState(() => defaultOutputBase(originalFilename));
  const ext = getFileExtension(format);

  const commit = () => {
    const safe = baseName(strictSanitizeFilename(`${base}.${ext}`));
    setBase(safe);
    onChange(safe);
  };

  return (
    <label className='block space-y-1.5'>
      <span className='text-muted-foreground px-1 text-[13px]'>File name</span>
      <div className='bg-secondary focus-within:ring-ring flex items-center rounded-xl pr-3 focus-within:ring-4'>
        <Input
          value={base}
          onChange={(e) => setBase(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          spellCheck={false}
          className='bg-transparent focus-visible:ring-0'
        />
        <span className='text-muted-foreground text-[15px]'>.{ext}</span>
      </div>
    </label>
  );
}
