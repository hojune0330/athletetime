import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// ── TRAINORACLE badge ───────────────────────────────────────────────
// Square corners, hairline borders, mono-ish labels. Color is information,
// never decoration — semantic variants carry meaning.
const badgeVariants = cva(
  'inline-flex items-center rounded-sm border px-2 py-0.5 text-mono-xs font-semibold uppercase tracking-wider-2 transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'border-line bg-surface text-ink-2',
        success: 'border-transparent bg-[#E8F0EB] text-ok',
        warning: 'border-transparent bg-[#F7EDE0] text-warn',
        destructive: 'border-transparent bg-[#F4DEDE] text-err',
        info: 'border-transparent bg-[#E3E9F7] text-info',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
