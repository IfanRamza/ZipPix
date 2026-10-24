import { useEffect, useRef } from 'react';

/** Keyboard hint matching the user's platform */
export const PASTE_SHORTCUT =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘V' : 'Ctrl+V';

/**
 * Clipboard images arrive as "image.png"; give them a name that is
 * distinguishable once downloaded.
 */
function namePasted(file: File, index: number): File {
  if (!/^image\.\w+$/i.test(file.name)) return file;
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const ext = file.name.split('.').pop();
  const suffix = index > 0 ? `-${index + 1}` : '';
  return new File([file], `pasted-${stamp}${suffix}.${ext}`, {
    type: file.type,
    lastModified: file.lastModified,
  });
}

/**
 * Accept images pasted anywhere on the page (Ctrl/⌘+V).
 * Pastes into text fields are left alone so renaming a file still works.
 */
export function usePasteImages(onFiles: (files: File[]) => void, enabled = true) {
  const onFilesRef = useRef(onFiles);
  useEffect(() => {
    onFilesRef.current = onFiles;
  });

  useEffect(() => {
    if (!enabled) return;
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target;
      if (
        target instanceof Element &&
        target.closest('input, textarea, [contenteditable="true"]')
      ) {
        return;
      }

      const files = Array.from(e.clipboardData?.files ?? []).filter((f) =>
        f.type.startsWith('image/'),
      );
      if (!files.length) return;
      e.preventDefault();
      onFilesRef.current(files.map(namePasted));
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [enabled]);
}
