import TextareaAutosize from 'react-textarea-autosize';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Textarea({
  className,
  rows,
  minRows = rows ?? 2,
  maxRows = Math.max(minRows, 12),
  ...props
}: ComponentProps<typeof TextareaAutosize>) {
  return (
    <TextareaAutosize
      {...props}
      data-slot="textarea"
      className={cn('auto-textarea', className)}
      minRows={minRows}
      maxRows={maxRows}
    />
  );
}
