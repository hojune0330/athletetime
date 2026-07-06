import * as React from 'react';
import { cn } from '@/lib/utils';

// ── TRAINORACLE input ───────────────────────────────────────────────
// 4px corners, hairline border, brand focus ring, warm surface.
type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-10 w-full rounded-md border border-line bg-surface px-3 py-2 text-body text-ink transition-colors',
        'placeholder:text-ink-4',
        'focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-ring/30',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'file:border-0 file:bg-transparent file:text-body-sm file:font-medium',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
