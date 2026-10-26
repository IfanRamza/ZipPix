import * as SliderPrimitive from '@radix-ui/react-slider';
import * as React from 'react';

import { cn } from '@/lib/utils';

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const count = (Array.isArray(value) ? value : (defaultValue ?? [min])).length;

  return (
    <SliderPrimitive.Root
      data-slot='slider'
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        'relative flex h-7 w-full touch-none items-center select-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track className='bg-secondary relative h-1 grow overflow-hidden rounded-full'>
        <SliderPrimitive.Range className='bg-primary absolute h-full' />
      </SliderPrimitive.Track>
      {Array.from({ length: count }, (_, index) => (
        <SliderPrimitive.Thumb
          key={index}
          aria-label={props['aria-label']}
          className='focus-visible:ring-ring block size-6 rounded-full bg-white shadow-[0_0.5px_4px_rgb(0_0_0/0.12),0_6px_13px_rgb(0_0_0/0.12)] ring-black/5 transition-transform outline-none focus-visible:ring-4 active:scale-110'
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };
