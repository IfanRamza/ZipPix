import { cn } from '@/lib/utils';
import { useRef, type KeyboardEvent, type ReactNode } from 'react';

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
  title?: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  label: string;
  className?: string;
  size?: 'sm' | 'default';
}

/** iOS-style segmented control with radio-group semantics and arrow-key navigation */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
  size = 'default',
}: SegmentedControlProps<T>) {
  const groupRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    const enabled = options.filter((o) => !o.disabled);
    const index = enabled.findIndex((o) => o.value === value);
    const delta = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1;
    const next = enabled[(index + delta + enabled.length) % enabled.length];
    onChange(next.value);
    groupRef.current
      ?.querySelector<HTMLButtonElement>(`[data-value="${CSS.escape(next.value)}"]`)
      ?.focus();
  };

  return (
    <div
      ref={groupRef}
      role='radiogroup'
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={cn('bg-secondary grid auto-cols-fr grid-flow-col rounded-[10px] p-0.5', className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type='button'
            role='radio'
            aria-checked={selected}
            data-value={option.value}
            tabIndex={selected ? 0 : -1}
            disabled={option.disabled}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={cn(
              'focus-visible:ring-ring rounded-[8px] px-2 font-medium whitespace-nowrap transition-all duration-200 outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-35',
              size === 'sm' ? 'h-7 text-[12px]' : 'h-8 text-[13px]',
              selected
                ? 'bg-card text-foreground shadow-[0_3px_8px_rgb(0_0_0/0.12),0_3px_1px_rgb(0_0_0/0.04)] dark:bg-[#636366]'
                : 'text-foreground/80 hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
