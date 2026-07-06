import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// ── TRAINORACLE button ──────────────────────────────────────────────
// Square corners (radius 0–4px), hairline borders, Deep Teal brand,
// flat surfaces. shadcn-compatible API (variant/size/asChild) so it
// blends with CLI-added components.
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-body-sm font-semibold tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // Primary action — solid Deep Teal
        default: 'bg-primary text-primary-foreground hover:bg-brand-600 active:bg-brand-700',
        // Destructive
        destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
        // Outline — hairline, fills to faint surface on hover
        outline: 'border border-line bg-surface text-ink hover:border-line-2 hover:bg-surface-2',
        // Secondary — warm neutral surface
        secondary: 'bg-secondary text-secondary-foreground hover:bg-hair',
        // Ghost — text-only, faint hover wash
        ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
        // Link — teal underline
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3 text-caption',
        lg: 'h-12 px-6 text-body',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
